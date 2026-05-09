import type { EventDef, RestrictionFn } from "../types/config";
import type { GameState } from "../types/state";

export function passesRestrictions(
  state: GameState,
  event: EventDef,
  globalRestrictions: RestrictionFn[]
): boolean {
  for (const restrict of globalRestrictions) {
    if (restrict(state)) return false;
  }
  for (const restrict of event.restrictions ?? []) {
    if (restrict(state)) return false;
  }
  return true;
}
