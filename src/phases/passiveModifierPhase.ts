import { applyDelta } from "../engine/stateManager";
import type { GameConfig, PhaseResult } from "../types/config";
import type { GameState, StateDelta } from "../types/state";

export function passiveModifierPhase(
  state: GameState,
  config: GameConfig,
  _tick: number
): PhaseResult {
  let current = state;

  for (const modifier of config.passiveModifiers) {
    if (modifier.condition && !modifier.condition(current)) continue;

    const delta: StateDelta =
      typeof modifier.delta === "function"
        ? modifier.delta(current)
        : modifier.delta;

    current = applyDelta(current, delta, config);
  }

  return { state: current, entries: [] };
}
