import { describe, expect, it } from "vitest";
import { TGAS, contractJson, polestarCalls } from "../src/index.js";

const calls = polestarCalls("budgeting.polestar-dev.testnet");

describe("polestarCalls", () => {
  it("encodes register_project amounts as decimal strings and derives the cost", () => {
    const tx = calls.registerProject({
      roundId: 7,
      recipient: "team.testnet",
      title: "Tool library",
      summary: "Shared tools",
      milestones: [150_000_000_000_000_000_000_000n, 150_000_000_000_000_000_000_000n],
      deposit: 50_000_000_000_000_000_000_000n,
    });
    expect(tx.receiverId).toBe("budgeting.polestar-dev.testnet");
    expect(tx.method).toBe("register_project");
    expect(tx.deposit).toBe(50_000_000_000_000_000_000_000n);
    expect(tx.gas).toBe(100n * TGAS);
    expect(contractJson(tx.args)).toBe(
      '{"round_id":7,"recipient":"team.testnet","title":"Tool library","summary":"Shared tools","cost":"300000000000000000000000","milestone_amounts":["150000000000000000000000","150000000000000000000000"]}',
    );
  });

  it("refuses a project with no milestones", () => {
    expect(() =>
      calls.registerProject({ roundId: 1, recipient: "a.testnet", title: "t", summary: "s", milestones: [], deposit: 1n }),
    ).toThrow(RangeError);
  });

  it("sorts and de-duplicates ballot project ids", () => {
    expect(calls.submitBallot(3, [5, 1, 5, 2]).args).toEqual({ round_id: 3, approved: [1, 2, 5] });
  });

  it("builds the batched counting call and bounds max_steps", () => {
    expect(calls.processAllocationSteps(4).args).toEqual({ round_id: 4, max_steps: 100 });
    expect(calls.processAllocationSteps(4, 1).args).toEqual({ round_id: 4, max_steps: 1 });
    expect(() => calls.processAllocationSteps(4, 0)).toThrow(RangeError);
    expect(() => calls.processAllocationSteps(4, 1.5)).toThrow(RangeError);
  });

  it("maps the lifecycle calls to the contract's method names", () => {
    expect(calls.registerVoter().method).toBe("register_voter");
    expect(calls.startVoting(1).method).toBe("open_declaration");
    expect(calls.startVoting(1).gas).toBe(30n * TGAS);
    expect(calls.endVoting(1).method).toBe("close_declaration");
    expect(calls.processAllocationStep(1).method).toBe("process_allocation_step");
  });
});
