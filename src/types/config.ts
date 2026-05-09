import type { GameState, StateDelta, HistoryEntry } from "./state";

export type Context = Record<string, unknown>;

export type EffectFn = (state: GameState, ctx?: Context) => StateDelta;
export type ConditionFn = (state: GameState, ctx?: Context) => boolean;
// Returns true when the action IS forbidden (must not proceed).
export type RestrictionFn = (state: GameState) => boolean;
export type ProbabilityModifierFn = (
  state: GameState,
  baseProbability: number,
  event: EventDef
) => number;

export interface PhaseResult {
  state: GameState;
  entries: HistoryEntry[];
}

export type TickPhaseHandler = (
  state: GameState,
  config: GameConfig,
  tick: number
) => PhaseResult;

export interface AttributeDef {
  min: number;
  max: number;
  default: number;
}

export interface EventDef {
  id: string;
  text: string | ((state: GameState) => string);
  // 'random' events are evaluated probabilistically each tick.
  // 'milestone' events fire deterministically whenever conditions pass.
  // Defaults to 'random' when omitted.
  triggerType?: "random" | "milestone";
  baseProbability?: number;
  conditions?: ConditionFn[];
  restrictions?: RestrictionFn[];
  cooldown?: number;
  effects: EffectFn[];
  /** IDs of events to queue after this one fires. Must match EventDef.id values in GameConfig.events. */
  followUps?: string[];
}

export interface ActionDef extends EventDef {
  label: string;
  triggerType?: never;
  baseProbability?: never;
}

export interface PassiveModifierDef {
  id: string;
  condition?: ConditionFn;
  delta: StateDelta | ((state: GameState) => StateDelta);
}

export interface GameConfig {
  /** Return only game-specific fields; engine fields (tick, history, cooldowns, meta) are added automatically by the engine. */
  initialState: () => Record<string, unknown>;
  attributes: Record<string, AttributeDef>;
  passiveModifiers: PassiveModifierDef[];
  actions: ActionDef[];
  events: EventDef[];
  restrictions: RestrictionFn[];
  probabilityModifiers: ProbabilityModifierFn[];
  tickOrder: string[];
  customPhases?: Record<string, TickPhaseHandler>;
  // Max number of undo snapshots retained. 0 disables undo. Defaults to 10.
  undoDepth?: number;
}
