import { describe, expect, it } from "vitest";
import {
  TGAS,
  approvalCount,
  base64ToUtf8,
  canSubmit,
  canVote,
  decodeProposalAction,
  governanceCalls,
  proposalBond,
  type DaoPolicy,
  type DaoProposal,
} from "../src/index.js";

const gov = governanceCalls("dao.polestar-dev.testnet", "budgeting.polestar-dev.testnet");
const bond = 10n ** 24n;

const policy: DaoPolicy = {
  roles: [
    { name: "all", kind: "Everyone", permissions: ["*:AddProposal"] },
    { name: "council", kind: { Group: ["polestar-dev.testnet"] }, permissions: ["*:VoteApprove", "*:VoteReject", "*:AddProposal"] },
  ],
  proposal_bond: "1000000000000000000000000",
};

function innerAction(tx: ReturnType<typeof gov.proposeFundRound>) {
  const proposal = (tx.args as { proposal: { description: string; kind: { FunctionCall: { receiver_id: string; actions: { method_name: string; args: string; deposit: string; gas: string }[] } } } }).proposal;
  return { proposal, action: proposal.kind.FunctionCall.actions[0]! };
}

describe("governanceCalls", () => {
  it("proposes fund_round with the budget as a bare u128 and the bond attached", () => {
    const tx = gov.proposeFundRound(
      { budget: 2n * 10n ** 24n, opensAt: 100, closesAt: 200, voterNamespace: "guild.testnet" },
      { description: "Fund the monthly round", bond },
    );
    expect(tx.receiverId).toBe("dao.polestar-dev.testnet");
    expect(tx.method).toBe("add_proposal");
    expect(tx.deposit).toBe(bond);
    const { proposal, action } = innerAction(tx);
    expect(proposal.kind.FunctionCall.receiver_id).toBe("budgeting.polestar-dev.testnet");
    expect(action.method_name).toBe("fund_round");
    expect(action.deposit).toBe("2000000000000000000000000");
    expect(action.gas).toBe((100n * TGAS).toString());
    expect(base64ToUtf8(action.args)).toBe(
      '{"config":{"budget":2000000000000000000000000,"opens_at":100,"closes_at":200,"t_min":0},"voter_namespace":"guild.testnet"}',
    );
  });

  it("omits voter_namespace for open rounds and rejects invalid names", () => {
    const tx = gov.proposeFundRound({ budget: 1n, opensAt: 1, closesAt: 2 }, { description: "d", bond });
    expect(base64ToUtf8(innerAction(tx).action.args)).not.toContain("voter_namespace");
    expect(() => gov.proposeFundRound({ budget: 1n, opensAt: 1, closesAt: 2, voterNamespace: "Bad..Name" }, { description: "d", bond })).toThrow(RangeError);
    expect(() => gov.proposeFundRound({ budget: 0n, opensAt: 1, closesAt: 2 }, { description: "d", bond })).toThrow(RangeError);
  });

  it("proposes milestone payment and remainder return", () => {
    const pay = innerAction(gov.proposeMilestonePayment({ roundId: 3, projectId: 1, milestoneIndex: 0 }, { description: "p", bond }));
    expect(pay.action.method_name).toBe("attest_milestone");
    expect(base64ToUtf8(pay.action.args)).toBe('{"round_id":3,"project_id":1,"milestone_index":0}');
    const ret = innerAction(gov.proposeReturnRemaining(2, { description: "r", bond }));
    expect(ret.action.method_name).toBe("return_remaining");
    expect(base64ToUtf8(ret.action.args)).toBe('{"round_id":2}');
  });

  it("votes by echoing the proposal kind", () => {
    const proposal = { id: 9, kind: { FunctionCall: { receiver_id: "x", actions: [] } } } as unknown as DaoProposal;
    const tx = gov.approve(proposal);
    expect(tx.method).toBe("act_proposal");
    expect(tx.args).toEqual({ id: 9, action: "VoteApprove", proposal: proposal.kind, memo: null });
    expect(gov.reject(proposal).args.action).toBe("VoteReject");
  });
});

describe("policy helpers", () => {
  it("reads permissions and bond", () => {
    expect(canSubmit(policy, "anyone.testnet")).toBe(true);
    expect(canVote(policy, "anyone.testnet")).toBe(false);
    expect(canVote(policy, "polestar-dev.testnet")).toBe(true);
    expect(proposalBond(policy)).toBe(bond);
  });

  it("decodes a proposal's action back to its arguments", () => {
    const tx = gov.proposeReturnRemaining(5, { description: "r", bond });
    const proposal = {
      id: 1,
      proposer: "a",
      description: "r",
      kind: (tx.args as { proposal: { kind: DaoProposal["kind"] } }).proposal.kind,
      status: "InProgress",
      vote_counts: {},
      votes: { "polestar-dev.testnet": "Approve", "b.testnet": "Reject" },
    } as DaoProposal;
    expect(decodeProposalAction(proposal)).toEqual({
      receiverId: "budgeting.polestar-dev.testnet",
      method: "return_remaining",
      args: { round_id: 5 },
      deposit: 0n,
      gas: 50n * TGAS,
    });
    expect(approvalCount(proposal)).toBe(1);
  });
});
