import { describe, expect, it } from "vitest";
import { NOOP } from "../src/NOOP";

describe("NOOP", () => {
  it("should be a function", () => {
    expect(NOOP).toBeInstanceOf(Function);
  });
});
