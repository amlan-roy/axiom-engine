import type { GameState, StateDelta, HistoryEntry } from "./state";

/**
 * An arbitrary bag of values forwarded to conditions and effects by the caller.
 * Useful for passing player input, UI context, or runtime parameters to game logic
 * without coupling them to `GameState`.
 *
 * @example
 * // Passing a target entity ID when applying an action
 * engine.applyAction("attack", { targetId: "goblin_01" });
 */
export type Context = Record<string, unknown>;

/**
 * A pure function that describes a state change.
 * Returns a `StateDelta` — the engine merges it into the live state.
 * Do not mutate `state` directly; always return a new delta.
 *
 * @param state - The current game state at the moment the effect fires.
 * @param ctx - Optional context forwarded from `applyAction` or the trigger site.
 * @returns A partial record of changes. Attribute keys are additive; others replace.
 *
 * @example
 * const healEffect: EffectFn = (state) => ({ health: 10 });
 * const spendGold: EffectFn = (_state, ctx) => ({ gold: -(ctx?.amount as number ?? 50) });
 */
export type EffectFn = (state: GameState, ctx?: Context) => StateDelta;

/**
 * A predicate that determines whether an event or action is currently available.
 * Conditions are transient — they may become true or false as state changes.
 * When a condition fails, the action is hidden from `getAvailableActions` and
 * `applyAction` throws.
 *
 * Contrast with `RestrictionFn`, which is permanent and silently filters actions.
 *
 * @param state - The current game state.
 * @param ctx - Optional context forwarded from the call site.
 * @returns `true` if the condition is satisfied (action is allowed).
 *
 * @example
 * const canAfford: ConditionFn = (state) => (state.money as number) >= 100;
 */
export type ConditionFn = (state: GameState, ctx?: Context) => boolean;

/**
 * A predicate that permanently forbids an action or event.
 * Returns `true` when the action **is forbidden** (counter-intuitive but consistent:
 * a restriction "fires" to block something).
 *
 * Restrictions differ from conditions in three ways:
 * 1. They are evaluated first — before conditions, cooldowns, or probability.
 * 2. They are intended to encode permanent, invariant rules (e.g. age gating,
 *    relationship type constraints) that should never appear in the UI.
 * 3. Actions blocked by a restriction are silently omitted from
 *    `getAvailableActions` and throw `"Action blocked by restriction: <id>"` if
 *    `applyAction` is called directly.
 *
 * @param state - The current game state.
 * @returns `true` when the action is **forbidden**.
 *
 * @example
 * // Permanently block any action for underage characters
 * const minorRestriction: RestrictionFn = (state) => (state.age as number) < 18;
 */
export type RestrictionFn = (state: GameState) => boolean;

/**
 * Adjusts the probability of an event after it passes all gate checks.
 * Modifiers are applied in the order they appear in `GameConfig.probabilityModifiers`
 * and receive the running probability (output of the previous modifier).
 * The final result is clamped to `[0, 1]`.
 *
 * @param state - The current game state.
 * @param baseProbability - The probability computed so far (starts from `EventDef.baseProbability`).
 * @param event - The event being evaluated.
 * @returns The adjusted probability. Must be a number; clamping is applied externally.
 *
 * @example
 * // Double the probability of all events when the character is stressed
 * const stressModifier: ProbabilityModifierFn = (state, p) =>
 *   (state.stress as number) > 80 ? p * 2 : p;
 */
export type ProbabilityModifierFn = (
  state: GameState,
  baseProbability: number,
  event: EventDef
) => number;

/**
 * The return value from a tick phase handler.
 * `state` is the mutated state after the phase completed.
 * `entries` contains any new history entries added during the phase — this
 * information is available for reactive use but the engine does not require it.
 */
export interface PhaseResult {
  state: GameState;
  entries: HistoryEntry[];
}

/**
 * A function that implements a single phase within a tick.
 * Called by the tick runner for each name in `GameConfig.tickOrder`.
 *
 * Built-in phase names: `"passiveModifierPhase"`, `"randomEventPhase"`, `"milestoneEventPhase"`.
 * Custom phases must be registered under `GameConfig.customPhases`.
 *
 * @param state - The state as it exists when this phase begins (includes all mutations from earlier phases this tick).
 * @param config - The full game configuration.
 * @param tick - The current tick number (already incremented for this tick).
 * @returns A `PhaseResult` with the mutated state and any new history entries.
 *
 * @example
 * const agingPhase: TickPhaseHandler = (state, config, _tick) => {
 *   const next = applyDelta(state, { age: 1 }, config);
 *   return { state: next, entries: [] };
 * };
 */
export type TickPhaseHandler = (
  state: GameState,
  config: GameConfig,
  tick: number
) => PhaseResult;

/**
 * Defines a numeric attribute that the engine tracks and clamps.
 * Every attribute key listed here will be present on `GameState` and managed
 * additively by `StateDelta`.
 *
 * @example
 * const healthAttr: AttributeDef = { min: 0, max: 100, default: 75 };
 */
export interface AttributeDef {
  /** Minimum allowed value. The engine will never let this attribute go below this. */
  min: number;
  /** Maximum allowed value. The engine will never let this attribute exceed this. */
  max: number;
  /** Value used when the attribute is not provided by `GameConfig.initialState`. */
  default: number;
}

/**
 * Defines a game event — something that can fire during a tick and change state.
 *
 * Events are divided into two kinds by `triggerType`:
 * - `"random"` (default): evaluated probabilistically each tick via the probability pipeline.
 * - `"milestone"`: fires deterministically whenever all conditions pass and no cooldown is active.
 *
 * Both kinds share the same gate chain before firing:
 * restrictions → conditions → cooldown check.
 * Random events additionally roll `baseProbability` through any `probabilityModifiers`.
 */
export interface EventDef {
  /** Unique identifier. Used in history entries and cooldown tracking. */
  id: string;
  /**
   * Displayed text when the event fires. Can be a static string or a function
   * that receives the state at the moment the event fires (before effects are applied).
   *
   * @example
   * text: (state) => `You lost ${state.money as number > 50 ? "a lot" : "a little"} money.`
   */
  text: string | ((state: GameState) => string);
  /**
   * `"random"` events roll against `baseProbability` each tick (default when omitted).
   * `"milestone"` events fire unconditionally whenever all conditions pass.
   */
  triggerType?: "random" | "milestone";
  /**
   * Base probability that this event fires on any given tick. Range: `[0, 1]`.
   * Only consulted for `triggerType: "random"` events.
   * Modified by `GameConfig.probabilityModifiers` before the final roll.
   */
  baseProbability?: number;
  /**
   * All conditions must return `true` for the event to be eligible.
   * Conditions are transient — they gate the event without permanently removing it.
   */
  conditions?: ConditionFn[];
  /**
   * If any restriction returns `true`, the event is silently skipped this tick.
   * Restrictions override conditions and are checked first.
   */
  restrictions?: RestrictionFn[];
  /**
   * Number of ticks to suppress this event after it fires.
   * The event becomes available again when `currentTick >= firedTick + cooldown`.
   */
  cooldown?: number;
  /**
   * One or more effects applied in sequence when the event fires.
   * Each receives the state as updated by all previous effects in this event.
   */
  effects: EffectFn[];

  /* Optional metadata for use in conditions, effects, or the UI. Not used by the engine. */
  meta?: Record<string, unknown>;
}

/**
 * Defines a player-triggered action. Extends `EventDef` for effects, conditions,
 * and restrictions, but is never evaluated probabilistically and never participates
 * in tick phases.
 *
 * Actions are surfaced via `engine.getAvailableActions()` and applied via
 * `engine.applyAction(id)`.
 */
export interface ActionDef extends EventDef {
  /** Human-readable label shown in the game UI. */
  label: string;
  /** Actions are player-triggered; triggerType does not apply. */
  triggerType?: never;
  /** Actions are player-triggered; probability does not apply. */
  baseProbability?: never;
  /** Actions are player-triggered; cooldowns do not apply. */
  cooldown?: never;
}

/**
 * A state change that is automatically applied every tick, optionally gated by a condition.
 * Passive modifiers are silent — they do not create history entries.
 * They run in the order they appear in `GameConfig.passiveModifiers`, and each
 * modifier sees the state as updated by all previous modifiers in the same tick.
 *
 * @example
 * // Character ages by 1 each tick
 * const aging: PassiveModifierDef = { id: "aging", delta: { age: 1 } };
 *
 * // Heal slowly when health is below 50
 * const naturalRegen: PassiveModifierDef = {
 *   id: "regen",
 *   condition: (s) => (s.health as number) < 50,
 *   delta: (s) => ({ health: (s.health as number) < 20 ? 3 : 1 }),
 * };
 */
export interface PassiveModifierDef {
  /** Unique identifier for debugging purposes. */
  id: string;
  /**
   * Optional gate. If provided, the modifier is skipped when this returns `false`.
   * Evaluated against the live state at modifier application time.
   */
  condition?: ConditionFn;
  /**
   * The state changes to apply. Can be a static `StateDelta` or a function
   * that computes the delta from the current state.
   * Attribute values in the delta are additive and clamped.
   */
  delta: StateDelta | ((state: GameState) => StateDelta);
}

/**
 * The complete description of a game. Pass this to `createEngine` to create a
 * running game instance.
 *
 * The engine reads this config at runtime and delegates all game-specific behavior
 * to the values defined here. Swapping the config creates a completely different game
 * on the same engine infrastructure.
 *
 * @example
 * const lifeSimConfig: GameConfig = {
 *   initialState: () => ({ health: 80, money: 500, age: 18 }),
 *   attributes: {
 *     health: { min: 0, max: 100, default: 75 },
 *     money:  { min: 0, max: 99999, default: 0 },
 *     age:    { min: 0, max: 120, default: 0 },
 *   },
 *   passiveModifiers: [
 *     { id: "aging", delta: { age: 1 } },
 *   ],
 *   actions: [...],
 *   events: [...],
 *   restrictions: [],
 *   probabilityModifiers: [],
 *   tickOrder: ["passiveModifierPhase", "randomEventPhase", "milestoneEventPhase"],
 * };
 */
export interface GameConfig {
  /**
   * Returns the initial game-specific state.
   * Only include game fields here — engine fields (`tick`, `history`, `cooldowns`, `meta`)
   * are added automatically. Any attribute values are clamped to their defined bounds;
   * attributes omitted here receive their `AttributeDef.default`.
   */
  initialState: () => Record<string, unknown>;

  /**
   * Numeric dimensions of the game world. Each key becomes a clamped attribute on
   * `GameState` managed additively by `StateDelta`.
   */
  attributes: Record<string, AttributeDef>;

  /**
   * Automatic per-tick state changes applied before events are evaluated.
   * Run in declaration order; each modifier sees the result of all prior modifiers.
   * Passive modifiers are silent — they do not create history entries.
   */
  passiveModifiers: PassiveModifierDef[];

  /**
   * Player-triggered interactions. Surfaced by `getAvailableActions` and
   * applied by `applyAction`. Actions are not evaluated during ticks.
   */
  actions: ActionDef[];

  /**
   * Random and milestone events evaluated each tick (in the `randomEventPhase`
   * and `milestoneEventPhase` respectively). Distinguish event kinds via `triggerType`.
   */
  events: EventDef[];

  /**
   * Global restrictions applied to every event and action before any other check.
   * If any restriction returns `true`, the event or action is silently blocked.
   * Use these for invariants that should never appear in the UI (e.g. age gates).
   */
  restrictions: RestrictionFn[];

  /**
   * Modifier functions applied in order to the base probability of each random event
   * after it clears all gate checks. The chain starts from `EventDef.baseProbability`.
   * Final result is clamped to `[0, 1]`.
   */
  probabilityModifiers: ProbabilityModifierFn[];

  /**
   * Ordered list of phase names to execute each tick.
   * Built-in names: `"passiveModifierPhase"`, `"randomEventPhase"`, `"milestoneEventPhase"`.
   * Custom phase names must be registered under `customPhases`.
   *
   * @example
   * tickOrder: ["passiveModifierPhase", "randomEventPhase", "milestoneEventPhase"]
   */
  tickOrder: string[];

  /**
   * Optional map of custom phase handlers keyed by name.
   * Register here any phase names you list in `tickOrder` that are not built-in.
   *
   * @example
   * customPhases: {
   *   electionCycle: (state, config, tick) => { ... }
   * }
   */
  customPhases?: Record<string, TickPhaseHandler>;

  /**
   * Maximum number of undo snapshots retained in memory.
   * When this limit is exceeded the oldest snapshot is dropped.
   * Set to `0` to disable undo entirely.
   * Defaults to `10`.
   */
  undoDepth?: number;
}
