import { describe, expect, it } from "vitest";
import { passesConditions } from "../../src/engine/conditionEvaluator";
import type { ConditionFn, EventDef } from "../../src/types/config";
import type { GameState } from "../../src/types/state";

const baseState: GameState = {
  tick: 0,
  history: [],
  cooldowns: {},
  meta: {},
  money: 100,
};

const event = (conditions?: ConditionFn[]): EventDef => ({
  id: "test_action",
  text: "Test",
  effects: [],
  conditions,
});

describe("passesConditions", () => {
  it("returns true when there are no conditions", () => {
    expect(passesConditions(baseState, event())).toBe(true);
  });

  it("returns true when all conditions pass", () => {
    const hasMoney: ConditionFn = s => (s.money as number) >= 50;
    expect(passesConditions(baseState, event([hasMoney]))).toBe(true);
  });

  it("returns false when any condition fails", () => {
    const needsMoreMoney: ConditionFn = s => (s.money as number) >= 200;
    expect(passesConditions(baseState, event([needsMoreMoney]))).toBe(false);
  });

  it("forwards ctx to each condition function", () => {
    let received: Record<string, unknown> | undefined;
    const captureCtx: ConditionFn = (_s, ctx) => {
      received = ctx;
      return true;
    };
    passesConditions(baseState, event([captureCtx]), { source: "player" });
    expect(received).toEqual({ source: "player" });
  });

  it("short-circuits on the first failing condition without calling later ones", () => {
    const calls: number[] = [];
    const fail: ConditionFn = () => {
      calls.push(1);
      return false;
    };
    const shouldNotRun: ConditionFn = () => {
      calls.push(2);
      return true;
    };
    passesConditions(baseState, event([fail, shouldNotRun]));
    expect(calls).toEqual([1]);
  });
});
