import { isOnCooldown } from "./cooldownManager";
import { passesConditions } from "./conditionEvaluator";
import { passesRestrictions } from "./restrictionEvaluator";
import type { EventDef, GameConfig } from "../types/config";
import type { GameState } from "../types/state";

export function resolveEventProbability(
  state: GameState,
  event: EventDef,
  config: GameConfig
): number {
  if (!passesRestrictions(state, event, config.restrictions)) return 0;
  if (!passesConditions(state, event)) return 0;
  if (isOnCooldown(state, event.id)) return 0;

  let probability = event.baseProbability ?? 0;
  for (const modifier of config.probabilityModifiers) {
    probability = modifier(state, probability, event);
  }

  return Math.min(1, Math.max(0, probability));
}

export function rollEvent(probability: number): boolean {
  return Math.random() < probability;
}
