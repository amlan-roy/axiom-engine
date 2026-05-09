import type { GameState } from "../types/state";

export function appendEntry(
  state: GameState,
  eventId: string,
  text: string
): GameState {
  return {
    ...state,
    history: [
      ...state.history,
      { tick: state.tick, text, eventId, timestamp: Date.now() },
    ],
  };
}
