import type { GameState } from "../types/state";

export function isOnCooldown(state: GameState, eventId: string): boolean {
  const expiry = state.cooldowns[eventId];
  return expiry !== undefined && state.tick < expiry;
}

export function setCooldown(
  state: GameState,
  eventId: string,
  duration: number
): GameState {
  return {
    ...state,
    cooldowns: { ...state.cooldowns, [eventId]: state.tick + duration },
  };
}

export function decrementCooldowns(state: GameState): GameState {
  const active: Record<string, number> = {};
  for (const [id, expiry] of Object.entries(state.cooldowns)) {
    if (state.tick < expiry) active[id] = expiry;
  }
  return { ...state, cooldowns: active };
}
