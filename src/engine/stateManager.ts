import type { GameConfig } from "../types/config";
import type { GameState, StateDelta } from "../types/state";

const ENGINE_OWNED = new Set(["tick", "history", "cooldowns", "meta"]);

export function applyDelta(
  state: GameState,
  delta: StateDelta,
  config: GameConfig
): GameState {
  const next = { ...state };

  for (const key of Object.keys(delta)) {
    if (ENGINE_OWNED.has(key)) continue;

    const attrDef = config.attributes[key];
    if (attrDef !== undefined) {
      const current = (state[key] as number) ?? attrDef.default;
      const change = delta[key] as number;
      next[key] = Math.min(
        attrDef.max,
        Math.max(attrDef.min, current + change)
      );
    } else {
      next[key] = delta[key];
    }
  }

  return next;
}

export function buildInitialState(config: GameConfig): GameState {
  const gameState = config.initialState();
  const resolved: Record<string, number> = {};

  for (const [key, def] of Object.entries(config.attributes)) {
    const raw = gameState[key];
    if (typeof raw === "number") {
      resolved[key] = Math.min(def.max, Math.max(def.min, raw));
    } else {
      resolved[key] = def.default;
    }
  }

  return {
    ...gameState,
    ...resolved,
    tick: 0,
    history: [],
    cooldowns: {},
    meta: {},
  };
}
