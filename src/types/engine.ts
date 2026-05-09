import type { GameState } from "./state";
import type { ActionDef, Context } from "./config";

export interface Engine {
  getState(): GameState;
  getAvailableActions(ctx?: Context): ActionDef[];
  applyAction(id: string, ctx?: Context): GameState;
  tick(): GameState;
  undo(): GameState;
}
