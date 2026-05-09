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

/**
 * Creates a new game engine instance from a `GameConfig`.
 *
 * The engine is the single runtime object you interact with. It encapsulates all
 * mutable state and exposes five methods: `getState`, `getAvailableActions`,
 * `applyAction`, `tick`, and `undo`.
 *
 * The engine itself contains no game-specific knowledge. All rules, events,
 * attributes, and logic come from the config you provide. Swap the config and
 * you get an entirely different game.
 *
 * @param config - A `GameConfig` object that fully describes your game.
 * @returns An `Engine` instance ready to play.
 *
 * @example
 * import { createEngine } from "axiom-engine";
 *
 * const engine = createEngine({
 *   initialState: () => ({ health: 80, money: 500 }),
 *   attributes: {
 *     health: { min: 0, max: 100, default: 75 },
 *     money:  { min: 0, max: 99999, default: 0 },
 *   },
 *   passiveModifiers: [{ id: "bills", delta: { money: -50 } }],
 *   actions: [
 *     {
 *       id: "work",
 *       label: "Go to work",
 *       text: "You worked a full day.",
 *       effects: [() => ({ money: 100 })],
 *     },
 *   ],
 *   events: [],
 *   restrictions: [],
 *   probabilityModifiers: [],
 *   tickOrder: ["passiveModifierPhase"],
 * });
 *
 * engine.tick();                     // bills deducted
 * engine.applyAction("work");        // money += 100
 * console.log(engine.getState().money); // 550
 */
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
