import { describe, expect, test } from "vite-plus/test";

import {
  assertDevelopmentStartAllowed,
  deriveAdmissionStatus,
} from "../.github/scripts/orchestration-policy.mjs";

describe("issue admission policy", () => {
  test("derives Backlog without an Iteration commitment", () => {
    expect(deriveAdmissionStatus(null)).toBe("Backlog");
    expect(deriveAdmissionStatus("")).toBe("Backlog");
  });

  test("derives Todo from an Iteration commitment", () => {
    expect(deriveAdmissionStatus("C1-W4 · Major Review")).toBe("Todo");
  });
});

describe("Development start policy", () => {
  test("allows committed Todo work", () => {
    expect(() =>
      assertDevelopmentStartAllowed({
        iteration: "6173d2fe",
        status: "Todo",
      }),
    ).not.toThrow();
  });

  test("allows an idempotent In progress replay", () => {
    expect(() =>
      assertDevelopmentStartAllowed({
        iteration: "6173d2fe",
        status: "In progress",
      }),
    ).not.toThrow();
  });

  test("fails closed without Iteration commitment", () => {
    expect(() =>
      assertDevelopmentStartAllowed({
        iteration: null,
        status: "Backlog",
      }),
    ).toThrow(/Iteration commitment/);
  });

  test("rejects terminal or inconsistent lifecycle states", () => {
    expect(() =>
      assertDevelopmentStartAllowed({
        iteration: "6173d2fe",
        status: "Done",
      }),
    ).toThrow(/Terminal/);

    expect(() =>
      assertDevelopmentStartAllowed({
        iteration: "6173d2fe",
        status: "Backlog",
      }),
    ).toThrow(/Todo or In progress/);
  });

  test("rejects archived Project items", () => {
    expect(() =>
      assertDevelopmentStartAllowed({
        iteration: "6173d2fe",
        status: "Todo",
        isArchived: true,
      }),
    ).toThrow(/Archived/);
  });
});
