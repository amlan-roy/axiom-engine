import { appendEntry } from "./historyManager";
import { applyDelta, buildInitialState } from "./stateManager";
import { passesConditions } from "./conditionEvaluator";
import { passesRestrictions } from "./restrictionEvaluator";
import { runTick } from "./tickRunner";
import type { GameConfig } from "../types/config";
import type { Engine } from "../types/engine";
import type { GameState } from "../types/state";

function resolveText(
  event: { text: string | ((s: GameState) => string) },
  state: GameState
): string {
  return typeof event.text === "function" ? event.text(state) : event.text;
}

export function createEngine(config: GameConfig): Engine {
  let state = buildInitialState(config);
  const undoDepth = config.undoDepth ?? 10;
  const snapshots: GameState[] = [];

  function pushSnapshot() {
    if (undoDepth === 0) return;
    snapshots.push({ ...state });
    if (snapshots.length > undoDepth) snapshots.shift();
  }

  return {
    getState(): GameState {
      return { ...state };
    },

    getAvailableActions(ctx) {
      return config.actions.filter(
        action =>
          passesRestrictions(state, action, config.restrictions) &&
          passesConditions(state, action, ctx)
      );
    },

    applyAction(id, ctx) {
      const action = config.actions.find(a => a.id === id);
      if (!action) throw new Error(`Action not found: ${id}`);

      if (!passesRestrictions(state, action, config.restrictions)) {
        throw new Error(`Action blocked by restriction: ${id}`);
      }
      if (!passesConditions(state, action, ctx)) {
        throw new Error(`Action conditions not met: ${id}`);
      }

      pushSnapshot();
      const text = resolveText(action, state);
      for (const effect of action.effects) {
        state = applyDelta(state, effect(state, ctx), config);
      }
      state = appendEntry(state, action.id, text);

      return { ...state };
    },

    tick() {
      pushSnapshot();
      state = runTick(state, config);
      return { ...state };
    },

    undo() {
      const prev = snapshots.pop();
      if (!prev) throw new Error("Nothing to undo");
      state = prev;
      return { ...state };
    },
  };
}
