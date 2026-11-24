import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import {
  closestPattern,
  completedPatterns,
  fastestPatternIndex,
  winningPattern,
} from "@/lib/bingo-patterns";

const HOUSE_FEE_RATE = 0.15;
const DRAW_INTERVAL_MS = 3000;
const JOIN_WINDOW_MS = 60000;
const BET_TIERS = [5, 10, 20];

const asRows = (res) => (Array.isArray(res) ? res : (res?.items ?? []));
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Standard 75-ball card: 5 columns (B I N G O), centre cell free (stored as 0).
function buildCard() {
  const ranges = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75],
  ];
  const columns = ranges.map(([lo, hi]) => {
    const pool = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    return shuffle(pool).slice(0, 5);
  });
  const card = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      card.push(row * 5 + col === 12 ? 0 : columns[col][row]);
    }
  }
  return card;
}

function voucherCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `AFRO-${body.slice(0, 4)}-${body.slice(4)}`;
}

function publicRoom(room) {
  return {
    id: room.id,
    name: room.name || `${room.bet_amount} ETB Room`,
    bet_amount: room.bet_amount,
    status: room.status,
    players_count: room.players_count || 0,
    pot: round2(room.pot || 0),
    start_at: room.start_at || null,
    started_at: room.started_at || null,
    finished_at: room.finished_at || null,
    draw_interval_ms: room.draw_interval_ms || DRAW_INTERVAL_MS,
    drawn_numbers: room.drawn_numbers || [],
    winner_name: room.status === "finished" ? room.winner_name || null : null,
    winner_id: room.status === "finished" ? room.winner_id || null : null,
  };
}

const walletQuery = (userId) => ({ user_id: userId });

// One canonical wallet per player: always the oldest record, so two first-time
// calls racing each other still land on the same balance.
async function findWallet(admin, userId) {
  return asRows(await admin.entities.Wallet.filter(walletQuery(userId), { sort: "created_date", limit: 5 }))[0];
}

async function ensureWallet(admin, user) {
  const existing = await findWallet(admin, user.id);
  if (existing) return existing;
  await admin.entities.Wallet.create({
    user_id: user.id,
    display_name: user.full_name || (user.email || "").split("@")[0] || "Player",
    phone: "",
    balance: 0,
    total_won: 0,
    total_spent: 0,
    games_played: 0,
    games_won: 0,
    lock_version: 0,
  });
  const created = await findWallet(admin, user.id);
  return created;
}

/**
 * Server-authoritative wallet movement. The balance is only ever changed here,
 * through a compare-and-set on lock_version so two concurrent rounds can never
 * spend the same ETB twice.
 */
async function moveMoney(admin, user, { delta, inc = {}, txn }) {
  const wallet = await ensureWallet(admin, user);
  const balance = Number(wallet.balance) || 0;
  if (delta < 0 && balance + delta < -1e-9) {
    throw new Error("Not enough ETB in your wallet. Redeem a voucher to top up.");
  }
  const version = wallet.lock_version ?? 0;
  await admin.entities.Wallet.updateMany(
    { id: wallet.id, lock_version: version },
    { $inc: { balance: delta, lock_version: 1, ...inc } },
  );
  const after = await admin.entities.Wallet.get(wallet.id);
  if ((after.lock_version ?? 0) !== version + 1) {
    throw new Error("Your wallet is busy — please try again.");
  }
  const balanceAfter = round2(after.balance);
  await admin.entities.Transaction.create({
    user_id: user.id,
    user_name: after.display_name || user.full_name || "",
    type: txn.type,
    amount: round2(delta),
    balance_after: balanceAfter,
    description: txn.description || "",
    reference: txn.reference || "",
  });
  return after;
}

/**
 * Closes the round on the winning card and pays the pot. The compare-and-set on
 * lock_version means only the first claim settles a room, so the pot is paid
 * exactly once no matter how many players tap Bingo at the same moment.
 */
async function settleRound(admin, room, tickets, winnerTicket) {
  const version = room.lock_version ?? 0;
  await admin.entities.Room.updateMany(
    { id: room.id, lock_version: version },
    {
      $inc: { lock_version: 1 },
      $set: {
        status: "finished",
        finished_at: new Date().toISOString(),
        winner_id: winnerTicket ? winnerTicket.user_id : "",
        winner_name: winnerTicket ? winnerTicket.user_name : "",
      },
    },
  );
  const claimed = await admin.entities.Room.get(room.id);
  if ((claimed.lock_version ?? 0) !== version + 1) return null;
  if ((claimed.winner_id || "") !== (winnerTicket ? winnerTicket.user_id : "")) return null;

  if (winnerTicket) {
    const fresh = await admin.entities.Ticket.get(winnerTicket.id);
    if (fresh.is_winner) return null;
    const pot = round2(claimed.pot || 0);
    if (pot > 0) {
      await moveMoney(
        admin,
        { id: winnerTicket.user_id, full_name: winnerTicket.user_name, email: "" },
        {
          delta: pot,
          inc: { total_won: pot, games_won: 1 },
          txn: {
            type: "win",
            description: `Bingo — won the ${claimed.bet_amount} ETB room`,
            reference: claimed.id,
          },
        },
      );
      await admin.entities.Ticket.update(winnerTicket.id, { is_winner: true });
    }
  }

  // Stakes held in the play wallets were spent on this round.
  const playerIds = [...new Set(tickets.map((t) => t.user_id))];
  if (playerIds.length) {
    await admin.entities.Wallet.updateMany(
      { user_id: { $in: playerIds }, play_balance: { $gte: claimed.bet_amount } },
      { $inc: { play_balance: -claimed.bet_amount } },
    );
  }

  return claimed;
}

/**
 * The game engine. Draws are derived from the room's started_at, so every player
 * sees exactly the same numbers no matter who asks or when — the server decides,
 * not the client clock. Safe to call from any player's poll.
 */
async function advanceRoom(admin, roomId) {
  let room;
  try {
    room = await admin.entities.Room.get(roomId);
  } catch {
    return null;
  }
  if (!room) return null;
  const now = Date.now();

  if (room.status === "waiting") {
    const startAt = room.start_at ? new Date(room.start_at).getTime() : null;
    if (!startAt || startAt > now) return room;

    const tickets = asRows(await admin.entities.Ticket.filter({ room_id: room.id }));
    if (tickets.length === 0) return room;

    const sequence = shuffle(Array.from({ length: 75 }, (_, i) => i + 1));
    // The round ends on the earliest draw that completes a line, diagonal or the
    // four corners on any card — that card takes the pot.
    let best = null;
    for (const ticket of tickets) {
      const lastIndex = fastestPatternIndex(ticket.card || [], sequence);
      if (lastIndex === null) continue;
      if (!best || lastIndex < best.lastIndex) best = { ticket, lastIndex };
    }
    if (!best) return room;

    const players = tickets.length;
    room = await admin.entities.Room.update(room.id, {
      status: "live",
      started_at: new Date(now).toISOString(),
      draw_interval_ms: DRAW_INTERVAL_MS,
      draw_sequence: sequence,
      drawn_numbers: [],
      players_count: players,
      pot: round2(room.bet_amount * players * (1 - HOUSE_FEE_RATE)),
      winning_draw_count: best.lastIndex + 1,
      winner_id: best.ticket.user_id,
      winner_name: best.ticket.user_name,
    });
  }

  if (room.status !== "live") return room;

  const startedAt = new Date(room.started_at).getTime();
  const interval = room.draw_interval_ms || DRAW_INTERVAL_MS;
  const sequence = room.draw_sequence || [];
  const count = Math.min(sequence.length, Math.floor(Math.max(0, now - startedAt) / interval) + 1);
  const drawn = sequence.slice(0, count);

  const freshDraw = count !== (room.drawn_numbers || []).length;
  if (freshDraw) {
    room = await admin.entities.Room.update(room.id, { drawn_numbers: drawn });
  }
  // Nothing new since the last poll — read-only tick.
  if (!freshDraw) return room;

  const tickets = asRows(await admin.entities.Ticket.filter({ room_id: room.id }));
  const drawnSet = new Set(drawn);
  for (const ticket of tickets) {
    const marked = (ticket.card || [])
      .map((n, i) => (n === 0 || drawnSet.has(n) ? i : -1))
      .filter((i) => i >= 0);
    if (marked.length !== (ticket.marked || []).length) {
      await admin.entities.Ticket.update(ticket.id, { marked });
    }
  }

  // A round is settled by the first confirmed Bingo claim — not by the clock —
  // so a player marking by hand only wins once they actually tap Bingo. As a
  // safety net, if every ball is out and nobody has claimed, the card that
  // completed earliest takes the pot so a room can never run forever.
  if (count >= sequence.length) {
    let best = null;
    for (const ticket of tickets) {
      if (ticket.is_disqualified) continue;
      const lastIndex = fastestPatternIndex(ticket.card || [], sequence);
      if (lastIndex === null) continue;
      if (!best || lastIndex < best.lastIndex) best = { ticket, lastIndex };
    }
    const settled = await settleRound(admin, room, tickets, best ? best.ticket : null);
    if (settled) room = settled;
  }

  return room;
}

/* ---------------------------------- player --------------------------------- */

export const getHomeData = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const admin = context.getBase44().asServiceRole;
    const wallet = await ensureWallet(admin, context.user);

    const waiting = asRows(
      await admin.entities.Room.filter({ status: "waiting" }, { sort: "-created_date", limit: 20 }),
    );
    const liveRooms = asRows(await admin.entities.Room.filter({ status: "live" }, { limit: 20 }));

    const myTickets = asRows(
      await admin.entities.Ticket.filter({ user_id: context.user.id }, { sort: "-created_date", limit: 6 }),
    );
    const openIds = [...waiting, ...liveRooms].map((r) => r.id);
    const openRoom = myTickets.find((t) => openIds.includes(t.room_id) && !t.is_disqualified);
    const activeRoom = openRoom ? [...waiting, ...liveRooms].find((r) => r.id === openRoom.room_id) : null;

    return {
      balance: round2(wallet.balance),
      displayName: wallet.display_name || context.user.full_name || "Player",
      roomsByTier: BET_TIERS.map((bet) => ({
        bet,
        waiting: waiting.filter((r) => r.bet_amount === bet).length,
        players: waiting.filter((r) => r.bet_amount === bet).reduce((s, r) => s + (r.players_count || 0), 0),
      })),
      liveCount: liveRooms.length,
      activeRoom: activeRoom ? { id: activeRoom.id, bet_amount: activeRoom.bet_amount } : null,
    };
  });

export const joinRoom = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ betAmount: z.number() }))
  .handler(async ({ data, context }) => {
    const user = context.user;
    const admin = context.getBase44().asServiceRole;
    const bet = data.betAmount;
    if (!BET_TIERS.includes(bet)) throw new Error("That bet size is not available.");

    const now = Date.now();
    const waiting = asRows(
      await admin.entities.Room.filter(
        { status: "waiting", bet_amount: bet },
        { sort: "-created_date", limit: 10 },
      ),
    );

    // Already holding a seat in an open room at this tier — send them back there.
    const myTickets = asRows(await admin.entities.Ticket.filter({ user_id: user.id }, { limit: 20 }));
    const existing = waiting.find((r) =>
      myTickets.some((t) => t.room_id === r.id && !t.is_disqualified),
    );
    if (existing) return { roomId: existing.id, resumed: true };

    let room = waiting.find((r) => !r.start_at || new Date(r.start_at).getTime() > now);
    if (!room) {
      room = await admin.entities.Room.create({
        name: `${bet} ETB Room`,
        bet_amount: bet,
        entry_fee: bet,
        house_fee_percent: 15,
        status: "waiting",
        players_count: 0,
        pot: 0,
        draw_interval_ms: DRAW_INTERVAL_MS,
        lock_version: 0,
      });
    }

    await moveMoney(admin, user, {
      delta: -bet,
      inc: { total_spent: bet, games_played: 1, play_balance: bet },
      txn: { type: "entry", description: `Entry fee — ${bet} ETB room`, reference: room.id },
    });

    await admin.entities.Ticket.create({
      room_id: room.id,
      user_id: user.id,
      user_name: (await ensureWallet(admin, user)).display_name || user.full_name || "Player",
      card: buildCard(),
      marked: [],
      is_winner: false,
      joined_at: new Date(now).toISOString(),
    });

    const players = asRows(await admin.entities.Ticket.filter({ room_id: room.id })).length;
    await admin.entities.Room.update(room.id, {
      players_count: players,
      pot: round2(bet * players * (1 - HOUSE_FEE_RATE)),
      start_at: room.start_at || new Date(now + JOIN_WINDOW_MS).toISOString(),
    });

    return { roomId: room.id, resumed: false };
  });

export const getRoom = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ roomId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const admin = context.getBase44().asServiceRole;
    const room = await advanceRoom(admin, data.roomId);
    if (!room) return null;

    const tickets = asRows(await admin.entities.Ticket.filter({ room_id: room.id }));
    const mine = tickets.find((t) => t.user_id === context.user.id) || null;

    // Only the confirmed winner's card is ever exposed, and only once the round
    // has settled on the server — nobody else's card is revealed.
    const winnerTicket =
      room.status === "finished" && room.winner_id
      ? tickets.find((t) => t.user_id === room.winner_id && !t.is_disqualified) || null
      : null;
  const calledSet = new Set(room.drawn_numbers || []);
  const winnerShape = winnerTicket
    ? winningPattern(winnerTicket.card || [], room.drawn_numbers || [])
    : null;

  return {
    room: publicRoom(room),
    ticket: mine
      ? {
          card: mine.card || [],
          marked: mine.marked || [],
          is_winner: !!mine.is_winner,
          is_disqualified: !!mine.is_disqualified,
        }
      : null,
    winner: winnerTicket
      ? {
          name: winnerTicket.user_name,
          card: winnerTicket.card || [],
          marked: (winnerTicket.card || [])
            .map((n, i) => (n === 0 || calledSet.has(n) ? i : -1))
            .filter((i) => i >= 0),
          pattern: winnerShape
            ? { label: winnerShape.label, indices: winnerShape.indices }
            : null,
        }
      : null,
    players: tickets.map((t) => ({
      user_id: t.user_id,
      user_name: t.user_name,
      is_winner: !!t.is_winner,
      is_disqualified: !!t.is_disqualified,
      marked: (t.marked || []).length,
      is_me: t.user_id === context.user.id,
    })),
    now: Date.now(),
  };
});

export const getWallet = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const admin = context.getBase44().asServiceRole;
    const wallet = await ensureWallet(admin, context.user);
    const transactions = asRows(
      await admin.entities.Transaction.filter(
        { user_id: context.user.id },
        { sort: "-created_date", limit: 40 },
      ),
    );
    return {
      balance: round2(wallet.balance),
      playBalance: round2(wallet.play_balance),
      totalWon: round2(wallet.total_won),
      totalSpent: round2(wallet.total_spent),
      gamesPlayed: wallet.games_played || 0,
      gamesWon: wallet.games_won || 0,
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balance_after: t.balance_after,
        description: t.description,
        created_date: t.created_date,
      })),
    };
  });

export const redeemVoucher = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ code: z.string().min(3).max(40) }))
  .handler(async ({ data, context }) => {
    const user = context.user;
    const admin = context.getBase44().asServiceRole;
    const code = data.code.trim().toUpperCase();

    const voucher = asRows(await admin.entities.Voucher.filter({ code }, { limit: 1 }))[0];
    if (!voucher) throw new Error("That voucher code was not found.");
    if (voucher.status === "redeemed" && voucher.redeemed_by_id !== user.id) {
      throw new Error("This voucher has already been used.");
    }

    if (voucher.status === "active") {
      const version = voucher.lock_version ?? 0;
      await admin.entities.Voucher.updateMany(
        { id: voucher.id, lock_version: version },
        {
          $inc: { lock_version: 1 },
          $set: {
            status: "redeemed",
            redeemed_by_id: user.id,
            redeemed_by_name: user.full_name || user.email || "",
            redeemed_date: new Date().toISOString(),
          },
        },
      );
      const claimed = await admin.entities.Voucher.get(voucher.id);
      if (claimed.redeemed_by_id !== user.id) {
        throw new Error("This voucher has already been used.");
      }
    } else if (!voucher.redeemed_date) {
      throw new Error("This voucher has already been used.");
    } else {
      // Already redeemed by this player in an earlier attempt that stopped short.
      const already = asRows(
        await admin.entities.Transaction.filter(
          { user_id: user.id, reference: voucher.code, type: "voucher" },
          { limit: 1 },
        ),
      );
      if (already.length > 0) throw new Error("This voucher has already been added to your wallet.");
    }

    const wallet = await moveMoney(admin, user, {
      delta: Number(voucher.amount) || 0,
      txn: {
        type: "voucher",
        description: `Voucher ${voucher.code} redeemed`,
        reference: voucher.code,
      },
    });

    return { amount: Number(voucher.amount) || 0, balance: round2(wallet.balance) };
  });

export const getHistory = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const admin = context.getBase44().asServiceRole;
    const tickets = asRows(
      await admin.entities.Ticket.filter({ user_id: context.user.id }, { sort: "-created_date", limit: 50 }),
    );
    const roomIds = [...new Set(tickets.map((t) => t.room_id))];
    const rooms = roomIds.length
      ? asRows(await admin.entities.Room.filter({ id: { $in: roomIds } }))
      : [];
    const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r]));

    const rounds = tickets
      .map((t) => {
        const room = roomMap[t.room_id];
        if (!room) return null;
        return {
          id: t.id,
          room_id: room.id,
          bet_amount: room.bet_amount,
          status: room.status,
          pot: round2(room.pot || 0),
          is_winner: !!t.is_winner,
          winner_name: room.winner_name || null,
          date: room.finished_at || room.started_at || t.joined_at || t.created_date,
          marked: (t.marked || []).length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const transactions = asRows(
      await admin.entities.Transaction.filter(
        { user_id: context.user.id },
        { sort: "-created_date", limit: 50 },
      ),
    ).map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      balance_after: t.balance_after,
      description: t.description,
      created_date: t.created_date,
    }));

    return {
      rounds,
      transactions,
      stats: {
        played: rounds.filter((r) => r.status === "finished").length,
        won: rounds.filter((r) => r.is_winner).length,
      },
    };
  });

export const getProfile = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const admin = context.getBase44().asServiceRole;
    const wallet = await ensureWallet(admin, context.user);
    return {
      email: context.user.email || "",
      role: context.user.role || "user",
      displayName: wallet.display_name || context.user.full_name || "",
      phone: wallet.phone || "",
      balance: round2(wallet.balance),
      gamesPlayed: wallet.games_played || 0,
      gamesWon: wallet.games_won || 0,
      totalWon: round2(wallet.total_won),
      joined: context.user.created_date || null,
    };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ displayName: z.string().max(60), phone: z.string().max(30) }))
  .handler(async ({ data, context }) => {
    const admin = context.getBase44().asServiceRole;
    const wallet = await ensureWallet(admin, context.user);
    await admin.entities.Wallet.update(wallet.id, {
      display_name: data.displayName.trim() || wallet.display_name || "Player",
      phone: data.phone.trim(),
    });
    return { ok: true };
  });

/* ----------------------------------- entry --------------------------------- */

const OPEN_STATUSES = ["waiting", "live"];

async function openTables(admin, bet) {
  const rooms = asRows(
    await admin.entities.Room.filter(
      { bet_amount: bet, status: { $in: OPEN_STATUSES } },
      { sort: "-created_date", limit: 20 },
    ),
  );
  const roomIds = rooms.map((r) => r.id);
  const tickets = roomIds.length
    ? asRows(await admin.entities.Ticket.filter({ room_id: { $in: roomIds } }, { limit: 500 }))
    : [];
  return { rooms, tickets };
}

export const getEntryData = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ betAmount: z.number() }))
  .handler(async ({ data, context }) => {
    const admin = context.getBase44().asServiceRole;
    const bet = BET_TIERS.includes(data.betAmount) ? data.betAmount : BET_TIERS[1];
    const wallet = await ensureWallet(admin, context.user);
    const { rooms, tickets } = await openTables(admin, bet);

    const mine =
      tickets.find((t) => t.user_id === context.user.id && !t.is_disqualified) || null;
    const myRoom = mine ? rooms.find((r) => r.id === mine.room_id) || null : null;
    const waiting = rooms
      .filter((r) => r.status === "waiting" && r.start_at)
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

    return {
      betAmount: bet,
      balance: round2(wallet.balance),
      playBalance: round2(wallet.play_balance),
      taken: tickets.map((t) => t.seat_number).filter((n) => typeof n === "number" && n > 0),
      mySeat: mine && mine.seat_number ? mine.seat_number : null,
      roomId: myRoom ? myRoom.id : null,
      deadlineAt: (myRoom && myRoom.start_at) || (waiting[0] && waiting[0].start_at) || null,
      now: Date.now(),
    };
  });

export const takeSeat = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ betAmount: z.number(), seatNumber: z.number().int().min(1).max(100) }))
  .handler(async ({ data, context }) => {
    const user = context.user;
    const admin = context.getBase44().asServiceRole;
    const bet = data.betAmount;
    const seat = data.seatNumber;
    if (!BET_TIERS.includes(bet)) throw new Error("That bet size is not available.");

    const now = Date.now();
    const { rooms, tickets } = await openTables(admin, bet);

    const mine = tickets.find((t) => t.user_id === user.id && !t.is_disqualified);
    if (mine) return { roomId: mine.room_id, resumed: true };
    if (tickets.some((t) => t.seat_number === seat)) {
      throw new Error(`Seat ${seat} has just been taken. Pick another number.`);
    }

    let room = rooms
      .filter((r) => r.status === "waiting")
      .find((r) => !r.start_at || new Date(r.start_at).getTime() > now);
    if (!room) {
      room = await admin.entities.Room.create({
        name: `${bet} ETB Room`,
        bet_amount: bet,
        entry_fee: bet,
        house_fee_percent: 15,
        status: "waiting",
        players_count: 0,
        pot: 0,
        draw_interval_ms: DRAW_INTERVAL_MS,
        lock_version: 0,
      });
    }

    // The stake leaves the main wallet and is held in the play wallet.
    await moveMoney(admin, user, {
      delta: -bet,
      inc: { total_spent: bet, games_played: 1, play_balance: bet },
      txn: { type: "entry", description: `Seat ${seat} — ${bet} ETB room`, reference: room.id },
    });

    const wallet = await ensureWallet(admin, user);
    const created = await admin.entities.Ticket.create({
      room_id: room.id,
      seat_number: seat,
      user_id: user.id,
      user_name: wallet.display_name || user.full_name || "Player",
      card: buildCard(),
      marked: [],
      is_winner: false,
      joined_at: new Date(now).toISOString(),
    });

    // Two players can tap the same free seat at once — whoever lands second gives it up.
    const seated = asRows(
      await admin.entities.Ticket.filter({ room_id: room.id, seat_number: seat }, { limit: 5 }),
    );
    if (seated.length > 1) {
      await admin.entities.Ticket.delete(created.id);
      await moveMoney(admin, user, {
        delta: bet,
        inc: { total_spent: -bet, games_played: -1, play_balance: -bet },
        txn: { type: "credit", description: `Seat ${seat} was taken — stake refunded`, reference: room.id },
      });
      throw new Error(`Seat ${seat} has just been taken. Pick another number.`);
    }

    const players = asRows(await admin.entities.Ticket.filter({ room_id: room.id })).length;
    await admin.entities.Room.update(room.id, {
      players_count: players,
      pot: round2(bet * players * (1 - HOUSE_FEE_RATE)),
      start_at: room.start_at || new Date(now + JOIN_WINDOW_MS).toISOString(),
    });

    return { roomId: room.id, resumed: false };
  });

/**
 * A Bingo claim is only ever confirmed against the server's own draw record —
 * the client never decides whether a card is complete or who won.
 */
export const claimBingo = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ roomId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const admin = context.getBase44().asServiceRole;
    const room = await advanceRoom(admin, data.roomId);
    if (!room) throw new Error("That room is no longer available.");

    const tickets = asRows(await admin.entities.Ticket.filter({ room_id: room.id }));
    const mine = tickets.find((t) => t.user_id === context.user.id);
    if (!mine) throw new Error("You are not holding a card in this room.");
    if (mine.is_disqualified) throw new Error("You left this round, so this card can no longer win.");

    const drawn = new Set(room.drawn_numbers || []);
    const card = mine.card || [];
    // Only a full row, column, diagonal or the four corners counts as bingo.
    const complete = completedPatterns(card, drawn).length > 0;
    const { remaining } = closestPattern(card, drawn);
    const pot = round2(room.pot || 0);

    if (room.status !== "live") {
      return { complete, won: false, closed: true, remaining, pot, winnerName: room.winner_name || null };
    }
    if (!complete) {
      return { complete: false, won: false, closed: false, remaining, pot, winnerName: null };
    }

    // The claim is what closes the round; settleRound decides the winner.
    const settled = await settleRound(admin, room, tickets, mine);
    if (!settled) {
      const fresh = await admin.entities.Room.get(room.id);
      return {
        complete: true,
        won: false,
        closed: true,
        remaining: 0,
        pot,
        winnerName: fresh?.winner_name || null,
      };
    }

    return {
      complete: true,
      won: true,
      closed: false,
      remaining: 0,
      pot,
      winnerName: settled.winner_name || null,
    };
  });

/**
 * Leaving before the draw refunds the seat. Once the draw is under way the stake
 * stays on the table and the card is disqualified — the round carries on for
 * everyone else, but this card can no longer take the pot.
 */
export const leaveRoom = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ roomId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const user = context.user;
    const admin = context.getBase44().asServiceRole;

    let room;
    try {
      room = await admin.entities.Room.get(data.roomId);
    } catch {
      return { refunded: false, amount: 0 };
    }
    if (!room) return { refunded: false, amount: 0 };

    const mine = asRows(
      await admin.entities.Ticket.filter({ room_id: room.id, user_id: user.id }, { limit: 1 }),
    )[0];
    if (!mine) return { refunded: false, amount: 0 };

    if (room.status === "live") {
      await admin.entities.Ticket.update(mine.id, { is_disqualified: true });
      return { refunded: false, disqualified: true, amount: 0 };
    }
    if (room.status !== "waiting") return { refunded: false, disqualified: false, amount: 0 };

    await admin.entities.Ticket.delete(mine.id);

    const refund = round2(room.bet_amount);
    await moveMoney(admin, user, {
      delta: refund,
      inc: { total_spent: -refund, games_played: -1, play_balance: -refund },
      txn: {
        type: "credit",
        description: `Left the ${refund} ETB room before the draw — stake refunded`,
        reference: room.id,
      },
    });

    const players = asRows(await admin.entities.Ticket.filter({ room_id: room.id })).length;
    await admin.entities.Room.update(room.id, {
      players_count: players,
      pot: round2(room.bet_amount * players * (1 - HOUSE_FEE_RATE)),
    });

    return { refunded: true, disqualified: false, amount: refund };
  });

  /* ----------------------------------- admin --------------------------------- */
  
  function requireAdmin(context) {
    if (context.user?.role !== "admin") {
      const error = new Error("Admin access only.");
      error.status = 403;
      throw error;
    }
  }
  
  
export const adminOverview = createServerFn({ method: "POST" })
    .middleware([requireUser])
    .handler(async ({ context }) => {
      requireAdmin(context);
      const admin = context.getBase44().asServiceRole;
  
      const rooms = asRows(
        await admin.entities.Room.filter({}, { sort: "-created_date", limit: 25 }),
      );
      const vouchers = asRows(
        await admin.entities.Voucher.filter({}, { sort: "-created_date", limit: 20 }),
      );
      const transactions = asRows(
        await admin.entities.Transaction.filter({}, { sort: "-created_date", limit: 20 }),
      );
      const wallets = asRows(await admin.entities.Wallet.filter({}, { limit: 500 }));
  
      return {
        rooms: rooms.map(publicRoom),
        vouchers: vouchers.map((v) => ({
          id: v.id,
          code: v.code,
          amount: v.amount,
          status: v.status,
          redeemed_by_name: v.redeemed_by_name || null,
          redeemed_date: v.redeemed_date || null,
          created_date: v.created_date,
        })),
        transactions: transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          created_date: t.created_date,
        })),
        stats: {
          players: wallets.length,
          balances: round2(wallets.reduce((s, w) => s + (Number(w.balance) || 0), 0)),
          wagered: round2(wallets.reduce((s, w) => s + (Number(w.total_spent) || 0), 0)),
          paidOut: round2(wallets.reduce((s, w) => s + (Number(w.total_won) || 0), 0)),
          liveRooms: rooms.filter((r) => r.status === "live").length,
        },
      };
    });
  
export const adminCreateRoom = createServerFn({ method: "POST" })
    .middleware([requireUser])
    .validator(z.object({ betAmount: z.number(), startInMinutes: z.number().min(0).max(720) }))
    .handler(async ({ data, context }) => {
      requireAdmin(context);
      const admin = context.getBase44().asServiceRole;
      if (!BET_TIERS.includes(data.betAmount)) throw new Error("Pick 5, 10 or 20 ETB.");
  
      const room = await admin.entities.Room.create({
        name: `${data.betAmount} ETB Room`,
        bet_amount: data.betAmount,
        entry_fee: data.betAmount,
        house_fee_percent: 15,
        status: "waiting",
        players_count: 0,
        pot: 0,
        draw_interval_ms: DRAW_INTERVAL_MS,
        lock_version: 0,
        start_at: new Date(Date.now() + data.startInMinutes * 60000).toISOString(),
      });
      return { id: room.id };
    });
  
export const adminGenerateVouchers = createServerFn({ method: "POST" })
    .middleware([requireUser])
    .validator(
      z.object({ amount: z.number().min(1).max(100000), count: z.number().min(1).max(40), note: z.string().max(120).optional() }),
    )
    .handler(async ({ data, context }) => {
      requireAdmin(context);
      const admin = context.getBase44().asServiceRole;
  
      // Distinct codes, generated server-side only.
      const seen = new Set();
      const payload = [];
      while (payload.length < data.count) {
        const code = voucherCode();
        if (seen.has(code)) continue;
        seen.add(code);
        payload.push({
          code,
          amount: data.amount,
          status: "active",
          note: data.note || "",
          lock_version: 0,
        });
      }
      const created = await admin.entities.Voucher.bulkCreate(payload);
      return { codes: payload.map((p) => p.code), count: (created || payload).length };
    });
  
export const adminCreditWallet = createServerFn({ method: "POST" })
    .middleware([requireUser])
    .validator(z.object({ email: z.string().min(3).max(120), amount: z.number().min(1).max(100000) }))
    .handler(async ({ data, context }) => {
      requireAdmin(context);
      const admin = context.getBase44().asServiceRole;
      const email = data.email.trim().toLowerCase();
  
      const users = asRows(await admin.entities.User.filter({ email }));
      const target = users[0];
      if (!target) throw new Error("No player found with that email.");
  
      const wallet = await moveMoney(admin, target, {
        delta: data.amount,
        txn: {
          type: "credit",
          description: `Credit added by the house`,
          reference: "admin-credit",
        },
      });
      return { name: wallet.display_name || target.full_name || "", balance: round2(wallet.balance) };
    });