import { passiveModifierPhase } from "../phases/passiveModifierPhase";
import { randomEventPhase } from "../phases/randomEventPhase";
import { milestoneEventPhase } from "../phases/milestoneEventPhase";
import type { GameConfig, TickPhaseHandler } from "../types/config";
import type { GameState } from "../types/state";

const BUILT_IN_PHASES: Record<string, TickPhaseHandler> = {
  passiveModifierPhase,
  randomEventPhase,
  milestoneEventPhase,
};

export function runTick(state: GameState, config: GameConfig): GameState {
  let current: GameState = { ...state, tick: state.tick + 1 };

  for (const phaseName of config.tickOrder) {
    const handler =
      BUILT_IN_PHASES[phaseName] ?? config.customPhases?.[phaseName];

    if (!handler) {
      throw new Error(`Unknown tick phase: ${phaseName}`);
    }

    current = handler(current, config, current.tick).state;
  }

  return current;
}
