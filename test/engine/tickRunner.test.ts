import { describe, expect, it, vi } from "vitest";
import { runTick } from "../../src/engine/tickRunner";
import type { GameConfig } from "../../src/types/config";
import type { GameState } from "../../src/types/state";

const baseState: GameState = {
  tick: 0,
  history: [],
  cooldowns: {},
  meta: {},
  health: 80,
};

const baseConfig: GameConfig = {
  initialState: () => ({}),
  attributes: { health: { min: 0, max: 100, default: 75 } },
  passiveModifiers: [],
  actions: [],
  events: [],
  restrictions: [],
  probabilityModifiers: [],
  tickOrder: [],
};

describe("runTick", () => {
  it("increments tick by 1", () => {
    const next = runTick(baseState, baseConfig);
    expect(next.tick).toBe(1);
  });

  it("runs passiveModifierPhase when it is listed in tickOrder", () => {
    const config: GameConfig = {
      ...baseConfig,
      passiveModifiers: [{ id: "age", delta: { health: -2 } }],
      tickOrder: ["passiveModifierPhase"],
    };
    const next = runTick(baseState, config);
    expect(next.health).toBe(78);
  });

  it("runs randomEventPhase when it is listed in tickOrder", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.01);
    const config: GameConfig = {
      ...baseConfig,
      events: [
        {
          id: "ev",
          text: "Event fired.",
          baseProbability: 1,
          effects: [() => ({ health: -5 })],
        },
      ],
      tickOrder: ["randomEventPhase"],
    };
    const next = runTick(baseState, config);
    expect(next.health).toBe(75);
    vi.restoreAllMocks();
  });

  it("runs milestoneEventPhase when it is listed in tickOrder", () => {
    const config: GameConfig = {
      ...baseConfig,
      events: [
        {
          id: "full",
          triggerType: "milestone",
          text: "Full health!",
          conditions: [s => (s.health as number) >= 80],
          effects: [() => ({})],
        },
      ],
      tickOrder: ["milestoneEventPhase"],
    };
    const next = runTick(baseState, config);
    expect(next.history).toHaveLength(1);
    expect(next.history[0].eventId).toBe("full");
  });

  it("executes phases in the exact order specified by tickOrder", () => {
    const calls: string[] = [];
    const config: GameConfig = {
      ...baseConfig,
      customPhases: {
        phaseA: s => {
          calls.push("A");
          return { state: s, entries: [] };
        },
        phaseB: s => {
          calls.push("B");
          return { state: s, entries: [] };
        },
      },
      tickOrder: ["phaseA", "phaseB"],
    };
    runTick(baseState, config);
    expect(calls).toEqual(["A", "B"]);
  });

  it("throws a descriptive error when tickOrder contains an unrecognised phase name", () => {
    const config: GameConfig = { ...baseConfig, tickOrder: ["unknownPhase"] };
    expect(() => runTick(baseState, config)).toThrow(
      "Unknown tick phase: unknownPhase"
    );
  });

  it("passes the state updated by earlier phases into later phases", () => {
    const config: GameConfig = {
      ...baseConfig,
      passiveModifiers: [{ id: "drain", delta: { health: -40 } }],
      events: [
        {
          id: "critical",
          triggerType: "milestone",
          text: "Critical health!",
          conditions: [s => (s.health as number) < 50],
          effects: [() => ({})],
        },
      ],
      tickOrder: ["passiveModifierPhase", "milestoneEventPhase"],
    };
    const next = runTick(baseState, config);
    // health 80 - 40 = 40, condition 40 < 50 = true, milestone fires
    expect(next.history).toHaveLength(1);
    expect(next.history[0].eventId).toBe("critical");
  });
});
