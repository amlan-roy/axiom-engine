import type { GameState } from "./state";
import type { ActionDef, Context } from "./config";

/**
 * The public API surface of a running game instance.
 * Obtain one by calling `createEngine(config)`.
 *
 * All methods that mutate state return the new `GameState` as a convenience,
 * identical to calling `getState()` immediately after.
 */
export interface Engine {
  /**
   * Returns a shallow copy of the current game state.
   *
   * Each call returns a new object — you can safely store the reference without
   * it being updated underneath you. The engine-owned fields (`tick`, `history`,
   * `cooldowns`, `meta`) and all game-specific fields are included.
   *
   * @returns A snapshot of the current `GameState`.
   *
   * @example
   * const { health, tick } = engine.getState();
   */
  getState(): GameState;

  /**
   * Returns the subset of `GameConfig.actions` that are currently available.
   *
   * An action is available when:
   * 1. No **global** restriction (in `GameConfig.restrictions`) fires for it.
   * 2. No **action-level** restriction fires for it.
   * 3. All of the action's **conditions** pass.
   *
   * Restricted actions are silently omitted. Condition-failing actions are also
   * excluded — unlike `applyAction`, which throws on failure.
   *
   * @param ctx - Optional context forwarded to each condition function.
   * @returns Array of `ActionDef` objects that may be applied right now.
   *
   * @example
   * const actions = engine.getAvailableActions();
   * // Render as buttons in your UI
   * actions.forEach(a => renderButton(a.id, a.label));
   */
  getAvailableActions(ctx?: Context): ActionDef[];

  /**
   * Applies a player-triggered action by ID.
   *
   * Before mutating state the engine validates:
   * 1. The action ID exists in `GameConfig.actions`.
   * 2. No restriction blocks it (throws `"Action blocked by restriction: <id>"`).
   * 3. All conditions pass (throws `"Action conditions not met: <id>"`).
   *
   * If all checks pass, a snapshot is taken for undo, then:
   * - All effects are applied in declaration order.
   * - A history entry is appended.
   *
   * @param id - The `ActionDef.id` to apply.
   * @param ctx - Optional context forwarded to effects and conditions.
   * @returns The updated `GameState` after the action.
   * @throws `"Action not found: <id>"` — no action with this ID exists in the config.
   * @throws `"Action blocked by restriction: <id>"` — a restriction forbids it.
   * @throws `"Action conditions not met: <id>"` — one or more conditions failed.
   *
   * @example
   * try {
   *   const state = engine.applyAction("buy_house");
   * } catch (e) {
   *   console.log("Cannot perform action:", e.message);
   * }
   */
  applyAction(id: string, ctx?: Context): GameState;

  /**
   * Advances the game by one time unit.
   *
   * A snapshot is taken first (enabling undo), then `state.tick` is incremented
   * and each phase in `GameConfig.tickOrder` is executed in order. Phases run
   * sequentially — each receives the state as mutated by all prior phases.
   *
   * Built-in phases:
   * - `"passiveModifierPhase"` — applies all `GameConfig.passiveModifiers`.
   * - `"randomEventPhase"` — evaluates random events through the probability pipeline.
   * - `"milestoneEventPhase"` — fires milestone events whose conditions are satisfied.
   *
   * @returns The updated `GameState` after all phases have run.
   *
   * @example
   * // Advance one year in a life simulator
   * const stateAfterYear = engine.tick();
   * console.log("Year:", stateAfterYear.tick);
   */
  tick(): GameState;

  /**
   * Restores the game state to what it was immediately before the last `tick()` or
   * `applyAction()` call.
   *
   * Undo is powered by a closure-private snapshot stack. Snapshots are NOT stored
   * in `GameState`, so they are not included in save files. The stack depth is
   * controlled by `GameConfig.undoDepth` (default `10`). Once the oldest snapshot
   * is evicted, that step can no longer be undone.
   *
   * Setting `GameConfig.undoDepth` to `0` disables undo entirely — calling `undo()`
   * will always throw.
   *
   * @returns The restored `GameState`.
   * @throws `"Nothing to undo"` — the snapshot stack is empty (no undoable operations
   *   have been performed, or the stack has been exhausted).
   *
   * @example
   * engine.applyAction("risky_investment");
   * if (engine.getState().money < 0) {
   *   engine.undo(); // revert the bad investment
   * }
   */
  undo(): GameState;
}
