import { describe, expect, it, vi } from "vitest";
import { createEngine } from "../../src/engine/createEngine";
import type { GameConfig } from "../../src/types/config";

// A minimal life-sim config to validate end-to-end composition.
const lifeSimConfig: GameConfig = {
  initialState: () => ({ health: 70, happiness: 60, money: 200 }),
  attributes: {
    health: { min: 0, max: 100, default: 75 },
    happiness: { min: 0, max: 100, default: 50 },
    money: { min: 0, max: 99999, default: 0 },
  },
  passiveModifiers: [
    { id: "aging", delta: { health: -1 } },
    { id: "base_costs", delta: { money: -10 } },
  ],
  actions: [
    {
      id: "exercise",
      label: "Exercise",
      text: "You went for a run.",
      effects: [() => ({ health: 5, happiness: 2 })],
    },
    {
      id: "buy_medicine",
      label: "Buy medicine",
      text: "You bought medicine.",
      effects: [() => ({ health: 10, money: -50 })],
      conditions: [s => (s.money as number) >= 50],
    },
    {
      id: "illegal_shortcut",
      label: "Take illegal shortcut",
      text: "You took an illegal shortcut.",
      effects: [() => ({ money: 1000 })],
      restrictions: [() => true],
    },
  ],
  events: [
    {
      id: "flu",
      triggerType: "random",
      text: "You caught the flu.",
      baseProbability: 0.3,
      cooldown: 5,
      effects: [() => ({ health: -15, happiness: -10 })],
    },
    {
      id: "birthday",
      triggerType: "milestone",
      text: "Happy birthday! You feel motivated.",
      conditions: [
        s =>
          (s as { tick: number }).tick % 10 === 0 &&
          (s as { tick: number }).tick > 0,
      ],
      cooldown: 10,
      effects: [() => ({ happiness: 20 })],
    },
  ],
  restrictions: [],
  probabilityModifiers: [],
  tickOrder: [
    "passiveModifierPhase",
    "randomEventPhase",
    "milestoneEventPhase",
  ],
};

describe("Full engine integration", () => {
  it("initialises with the correct state from the config", () => {
    const engine = createEngine(lifeSimConfig);
    const state = engine.getState();
    expect(state.health).toBe(70);
    expect(state.happiness).toBe(60);
    expect(state.money).toBe(200);
    expect(state.tick).toBe(0);
  });

  it("applyAction: exercise increases health and happiness", () => {
    const engine = createEngine(lifeSimConfig);
    engine.applyAction("exercise");
    const state = engine.getState();
    expect(state.health).toBe(75);
    expect(state.happiness).toBe(62);
  });

  it("applyAction: buy_medicine is blocked when money is too low", () => {
    const config: GameConfig = {
      ...lifeSimConfig,
      initialState: () => ({ health: 70, happiness: 60, money: 30 }),
    };
    const engine = createEngine(config);
    expect(() => engine.applyAction("buy_medicine")).toThrow(
      "Action conditions not met: buy_medicine"
    );
  });

  it("applyAction: illegal_shortcut is always blocked by restriction", () => {
    const engine = createEngine(lifeSimConfig);
    expect(() => engine.applyAction("illegal_shortcut")).toThrow(
      "Action blocked by restriction: illegal_shortcut"
    );
  });

  it("tick: passive modifiers reduce health and money each tick", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // flu never fires
    const engine = createEngine(lifeSimConfig);
    engine.tick();
    const state = engine.getState();
    expect(state.health).toBe(69); // 70 - 1
    expect(state.money).toBe(190); // 200 - 10
    expect(state.tick).toBe(1);
    vi.restoreAllMocks();
  });

  it("tick: the flu random event fires and is logged with a cooldown", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1); // 0.1 < 0.3, fires
    const engine = createEngine(lifeSimConfig);
    engine.tick();
    const state = engine.getState();
    expect(state.health).toBeLessThan(70); // flu hit
    expect(state.history.some(e => e.eventId === "flu")).toBe(true);
    expect(state.cooldowns["flu"]).toBe(6); // tick 1 + cooldown 5
    vi.restoreAllMocks();
  });

  it("tick: flu cooldown prevents re-triggering on the next tick", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const engine = createEngine(lifeSimConfig);
    engine.tick(); // flu fires, cooldown set to 6
    const fluCountAfterTick1 = engine
      .getState()
      .history.filter(e => e.eventId === "flu").length;
    engine.tick(); // tick 2, cooldown not expired (2 < 6)
    const fluCountAfterTick2 = engine
      .getState()
      .history.filter(e => e.eventId === "flu").length;
    expect(fluCountAfterTick2).toBe(fluCountAfterTick1); // flu did not fire again
    vi.restoreAllMocks();
  });

  it("tick: birthday milestone fires at tick 10", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // suppress random events
    const engine = createEngine(lifeSimConfig);
    for (let i = 0; i < 10; i++) engine.tick();
    const state = engine.getState();
    expect(state.tick).toBe(10);
    expect(state.history.some(e => e.eventId === "birthday")).toBe(true);
    vi.restoreAllMocks();
  });

  it("getAvailableActions excludes illegal_shortcut at all times", () => {
    const engine = createEngine(lifeSimConfig);
    const ids = engine.getAvailableActions().map(a => a.id);
    expect(ids).not.toContain("illegal_shortcut");
  });

  it("full multi-tick sequence maintains consistent state", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const engine = createEngine(lifeSimConfig);
    engine.tick(); // tick 1
    engine.applyAction("exercise");
    engine.tick(); // tick 2
    const state = engine.getState();
    expect(state.tick).toBe(2);
    // health: 70 - 1 (tick1 aging) + 5 (exercise) - 1 (tick2 aging) = 73
    expect(state.health).toBe(73);
    vi.restoreAllMocks();
  });
});
