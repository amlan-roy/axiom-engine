export { createEngine } from "./engine/createEngine";
export type { Engine } from "./types/engine";
export type {
  GameConfig,
  AttributeDef,
  EventDef,
  ActionDef,
  PassiveModifierDef,
  PhaseResult,
  TickPhaseHandler,
  EffectFn,
  ConditionFn,
  RestrictionFn,
  ProbabilityModifierFn,
  Context,
} from "./types/config";
export type {
  GameState,
  StateDelta,
  HistoryEntry,
  Cooldowns,
} from "./types/state";
