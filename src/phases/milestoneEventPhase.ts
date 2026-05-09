import { isOnCooldown, setCooldown } from "../engine/cooldownManager";
import { passesConditions } from "../engine/conditionEvaluator";
import { passesRestrictions } from "../engine/restrictionEvaluator";
import { applyDelta } from "../engine/stateManager";
import { appendEntry } from "../engine/historyManager";
import type { EventDef, GameConfig, PhaseResult } from "../types/config";
import type { GameState } from "../types/state";

function resolveText(event: EventDef, state: GameState): string {
  return typeof event.text === "function" ? event.text(state) : event.text;
}

export function milestoneEventPhase(
  state: GameState,
  config: GameConfig,
  _tick: number
): PhaseResult {
  let current = state;
  const initialHistoryLength = state.history.length;

  for (const event of config.events) {
    if (event.triggerType !== "milestone") continue;
    if (!passesRestrictions(current, event, config.restrictions)) continue;
    if (!passesConditions(current, event)) continue;
    if (isOnCooldown(current, event.id)) continue;

    const text = resolveText(event, current);
    for (const effect of event.effects) {
      current = applyDelta(current, effect(current), config);
    }
    current = appendEntry(current, event.id, text);
    if (event.cooldown !== undefined) {
      current = setCooldown(current, event.id, event.cooldown);
    }
  }

  return {
    state: current,
    entries: current.history.slice(initialHistoryLength),
  };
}
