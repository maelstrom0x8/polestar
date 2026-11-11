import { describe, expect, it } from "vitest";
import { isDirectSubAccount, parseEvent, parseEvents, voterStatus } from "../src/index.js";

describe("events", () => {
  it("parses the contract's log lines", () => {
    expect(parseEvent("ProjectFunded round_id=3 project_id=1 stage=Mes amount=300000000000000000000000")).toEqual({
      type: "ProjectFunded",
      data: { round_id: "3", project_id: "1", stage: "Mes", amount: "300000000000000000000000" },
    });
    expect(parseEvent("RoundFunded round_id=0 budget=1 opens_at=10 closes_at=20 voter_namespace=none")?.data.voter_namespace).toBe("none");
  });

  it("ignores lines that are not Polestar events", () => {
    expect(parseEvents(["hello world", "AllocationFinalized round_id=2 total_funded=5 remaining=0", "Unknown x=1"])).toEqual([
      { type: "AllocationFinalized", data: { round_id: "2", total_funded: "5", remaining: "0" } },
    ]);
  });
});

describe("eligibility", () => {
  const open = { config: { opensAt: 100, tMin: 10 }, voterNamespace: null };
  const guild = { config: { opensAt: 100, tMin: 0 }, voterNamespace: "guild.testnet" };

  it("mirrors the contract's timing checks", () => {
    expect(voterStatus(open, "a.testnet", null)).toBe("not-registered");
    expect(voterStatus(open, "a.testnet", 90)).toBe("eligible");
    expect(voterStatus(open, "a.testnet", 95)).toBe("too-late");
    expect(voterStatus(open, "a.testnet", 100)).toBe("too-late");
  });

  it("applies the namespace before timing", () => {
    expect(voterStatus(guild, "priya.guild.testnet", 50)).toBe("eligible");
    expect(voterStatus(guild, "priya.testnet", 50)).toBe("not-member");
    expect(voterStatus(guild, "priya.testnet", null)).toBe("not-member");
  });

  it("accepts only direct sub-accounts", () => {
    expect(isDirectSubAccount("a.guild.testnet", "guild.testnet")).toBe(true);
    expect(isDirectSubAccount("guild.testnet", "guild.testnet")).toBe(false);
    expect(isDirectSubAccount("b.a.guild.testnet", "guild.testnet")).toBe(false);
    expect(isDirectSubAccount("fakeguild.testnet", "guild.testnet")).toBe(false);
  });
});
