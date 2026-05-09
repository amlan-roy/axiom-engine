import { describe, expect, it } from "vitest";
import { createEngine } from "../../src/engine/createEngine";
import type { GameConfig } from "../../src/types/config";

const baseConfig: GameConfig = {
  initialState: () => ({ health: 80, money: 100 }),
  attributes: {
    health: { min: 0, max: 100, default: 75 },
    money: { min: 0, max: 9999, default: 0 },
  },
  passiveModifiers: [],
  actions: [
    {
      id: "gym",
      label: "Go to gym",
      text: "You worked out.",
      effects: [() => ({ health: 5 })],
    },
    {
      id: "buy_food",
      label: "Buy food",
      text: "You bought food.",
      effects: [() => ({ health: 2, money: -20 })],
      conditions: [s => (s.money as number) >= 20],
    },
    {
      id: "illegal_action",
      label: "Do illegal thing",
      text: "You broke the law.",
      effects: [],
      restrictions: [() => true], // always forbidden
    },
  ],
  events: [],
  restrictions: [],
  probabilityModifiers: [],
  tickOrder: ["passiveModifierPhase"],
};

describe("createEngine", () => {
  it("returns an engine with the correct initial state", () => {
    const engine = createEngine(baseConfig);
    const state = engine.getState();
    expect(state.health).toBe(80);
    expect(state.money).toBe(100);
    expect(state.tick).toBe(0);
    expect(state.history).toEqual([]);
  });

  it("getState returns a new object reference each call (no shared mutable reference)", () => {
    const engine = createEngine(baseConfig);
    const a = engine.getState();
    const b = engine.getState();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it("getAvailableActions returns actions whose restrictions pass and conditions pass", () => {
    const engine = createEngine(baseConfig);
    const actions = engine.getAvailableActions();
    const ids = actions.map(a => a.id);
    expect(ids).toContain("gym");
    expect(ids).toContain("buy_food");
    expect(ids).not.toContain("illegal_action"); // restriction blocks it
  });

  it("getAvailableActions excludes actions whose conditions fail", () => {
    const config: GameConfig = {
      ...baseConfig,
      initialState: () => ({ health: 80, money: 5 }), // money too low
    };
    const engine = createEngine(config);
    const ids = engine.getAvailableActions().map(a => a.id);
    expect(ids).not.toContain("buy_food");
  });

  it("applyAction applies effects and returns updated state", () => {
    const engine = createEngine(baseConfig);
    const state = engine.applyAction("gym");
    expect(state.health).toBe(85); // 80 + 5
  });

  it("applyAction logs a history entry", () => {
    const engine = createEngine(baseConfig);
    engine.applyAction("gym");
    expect(engine.getState().history).toHaveLength(1);
    expect(engine.getState().history[0].eventId).toBe("gym");
    expect(engine.getState().history[0].text).toBe("You worked out.");
  });

  it("applyAction throws when the action id does not exist", () => {
    const engine = createEngine(baseConfig);
    expect(() => engine.applyAction("nonexistent")).toThrow(
      "Action not found: nonexistent"
    );
  });

  it("applyAction throws when the action is blocked by a restriction", () => {
    const engine = createEngine(baseConfig);
    expect(() => engine.applyAction("illegal_action")).toThrow(
      "Action blocked by restriction: illegal_action"
    );
  });

  it("applyAction throws when action conditions are not met", () => {
    const config: GameConfig = {
      ...baseConfig,
      initialState: () => ({ health: 80, money: 5 }),
    };
    const engine = createEngine(config);
    expect(() => engine.applyAction("buy_food")).toThrow(
      "Action conditions not met: buy_food"
    );
  });

  it("tick advances the tick counter and runs configured phases", () => {
    const config: GameConfig = {
      ...baseConfig,
      passiveModifiers: [{ id: "aging", delta: { health: -1 } }],
      tickOrder: ["passiveModifierPhase"],
    };
    const engine = createEngine(config);
    engine.tick();
    const state = engine.getState();
    expect(state.tick).toBe(1);
    expect(state.health).toBe(79); // 80 - 1
  });

  it("tick returns the updated state", () => {
    const engine = createEngine(baseConfig);
    const returned = engine.tick();
    expect(returned).toEqual(engine.getState());
  });

  it("state mutations from applyAction persist across subsequent calls", () => {
    const engine = createEngine(baseConfig);
    engine.applyAction("gym");
    engine.applyAction("gym");
    expect(engine.getState().history).toHaveLength(2);
    expect(engine.getState().health).toBe(90); // 80 + 5 + 5
  });
});
