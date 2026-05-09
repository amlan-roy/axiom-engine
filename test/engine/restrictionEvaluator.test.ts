import { describe, expect, it } from "vitest";
import { passesRestrictions } from "../../src/engine/restrictionEvaluator";
import type { EventDef, RestrictionFn } from "../../src/types/config";
import type { GameState } from "../../src/types/state";

const baseState: GameState = {
  tick: 0,
  history: [],
  cooldowns: {},
  meta: {},
  age: 20,
};

const event = (restrictions?: RestrictionFn[]): EventDef => ({
  id: "test_event",
  text: "Test event",
  effects: [],
  restrictions,
});

describe("passesRestrictions", () => {
  it("returns true when there are no global or event restrictions", () => {
    expect(passesRestrictions(baseState, event(), [])).toBe(true);
  });

  it("returns false when a global restriction fires (returns true = forbidden)", () => {
    const forbidAdults: RestrictionFn = s => (s.age as number) >= 18;
    expect(passesRestrictions(baseState, event(), [forbidAdults])).toBe(false);
  });

  it("returns false when an event-level restriction fires", () => {
    const forbidAdults: RestrictionFn = s => (s.age as number) >= 18;
    expect(passesRestrictions(baseState, event([forbidAdults]), [])).toBe(
      false
    );
  });

  it("returns true when all restrictions return false (nothing is forbidden)", () => {
    const notForbidden: RestrictionFn = () => false;
    expect(
      passesRestrictions(baseState, event([notForbidden]), [notForbidden])
    ).toBe(true);
  });

  it("evaluates global restrictions first and short-circuits before event restrictions", () => {
    const calls: string[] = [];
    const globalForbid: RestrictionFn = () => {
      calls.push("global");
      return true;
    };
    const eventCheck: RestrictionFn = () => {
      calls.push("event");
      return false;
    };
    passesRestrictions(baseState, event([eventCheck]), [globalForbid]);
    expect(calls).toEqual(["global"]); // event check never reached
  });
});
