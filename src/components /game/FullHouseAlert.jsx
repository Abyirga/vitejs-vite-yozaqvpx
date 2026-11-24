import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { amountEtb } from "@/lib/format";

/**
 * Fires the in-app alert the moment the player's own card completes a winning
 * pattern. Authoritative state only (server draw list), raised once per round —
 * even across the 1.5s polling ticks.
 */
export default function FullHouseAlert({ roomId, status, complete, won, autoMark = true, pot }) {
  const announced = useRef(null);
  const initialStatus = useRef(null);

  useEffect(() => {
    if (!roomId || !status) return;
    if (initialStatus.current === null) initialStatus.current = status;
    // Opened after the round had already settled — the summary screen covers it.
    if (initialStatus.current === "finished") return;
    if (!complete && !won) return;
    if (announced.current === roomId) return;

    announced.current = roomId;
    toast.success("Bingo — your pattern is complete!", {
      description: autoMark
        ? `${amountEtb(pot)} ETB is on its way to your wallet.`
        : "Tap the Bingo button now to claim the pot.",
      duration: 9000,
    });
  }, [roomId, status, complete, won, autoMark, pot]);

  return null;
}