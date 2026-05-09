import { setCooldown } from "../engine/cooldownManager";
import {
  resolveEventProbability,
  rollEvent,
} from "../engine/probabilityPipeline";
import { applyDelta } from "../engine/stateManager";
import { appendEntry } from "../engine/historyManager";
import type { EventDef, GameConfig, PhaseResult } from "../types/config";
import type { GameState } from "../types/state";

function resolveText(event: EventDef, state: GameState): string {
  return typeof event.text === "function" ? event.text(state) : event.text;
}

function fireEvent(
  state: GameState,
  event: EventDef,
  config: GameConfig
): GameState {
  let current = state;
  const text = resolveText(event, current);
  for (const effect of event.effects) {
    current = applyDelta(current, effect(current), config);
  }
  current = appendEntry(current, event.id, text);
  if (event.cooldown !== undefined) {
    current = setCooldown(current, event.id, event.cooldown);
  }
  return current;
}

export function randomEventPhase(
  state: GameState,
  config: GameConfig,
  _tick: number
): PhaseResult {
  let current = state;
  const initialHistoryLength = state.history.length;

  for (const event of config.events) {
    if (event.triggerType === "milestone") continue;

    const probability = resolveEventProbability(current, event, config);
    if (rollEvent(probability)) {
      current = fireEvent(current, event, config);
    }
  }

  return {
    state: current,
    entries: current.history.slice(initialHistoryLength),
  };
}
