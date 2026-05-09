import type { Context, EventDef } from "../types/config";
import type { GameState } from "../types/state";

export function passesConditions(
  state: GameState,
  event: EventDef,
  ctx?: Context
): boolean {
  for (const condition of event.conditions ?? []) {
    if (!condition(state, ctx)) return false;
  }
  return true;
}
