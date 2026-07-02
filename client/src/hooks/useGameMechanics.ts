import { trpc } from "@/lib/trpc";
import type { GameMechanicsSnapshot } from "@shared/gameMechanics";

/**
 * Live game-mechanics figures, straight from the server (game_variables +
 * structural constants). Render these instead of hardcoding numbers so the
 * mechanics pages never drift from the engine. Cached 5 min client-side to
 * match the server-side variable cache.
 */
export function useGameMechanics(): {
  mechanics: GameMechanicsSnapshot | undefined;
  isLoading: boolean;
} {
  const { data, isLoading } = trpc.game.getMechanics.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  return { mechanics: data, isLoading };
}
