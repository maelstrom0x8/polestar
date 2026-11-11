import { describe, expect, it } from "vitest";
import {
  ContractError,
  PolestarClient,
  TransactionCancelledError,
  base64ToUtf8,
  parsePreservingBigNumbers,
  utf8ToBase64,
  type FunctionCallAction,
  type Signer,
} from "../src/index.js";

const CONTRACT = "budgeting.polestar-dev.testnet";
const DAO = "dao.polestar-dev.testnet";

function fakeView(responses: Record<string, string>) {
  const calls: { method: string; args: Record<string, unknown>; contractId: string }[] = [];
  const view = async (method: string, args: Record<string, unknown>, contractId: string) => {
    calls.push({ method, args, contractId });
    const text = responses[method];
    if (text === undefined) throw new Error(`unexpected view ${method}`);
    return parsePreservingBigNumbers(text);
  };
  return { view, calls };
}

function fakeSigner(values: unknown[]) {
  const sent: { receiverId: string; actions: FunctionCallAction[] }[] = [];
  const signer: Signer = {
    signAndSendTransaction: async (tx) => {
      sent.push(tx);
      const value = values.shift();
      if (value instanceof Error) throw value;
      return { transaction: { hash: `h${sent.length}` }, receipts_outcome: [], status: { SuccessValue: utf8ToBase64(JSON.stringify(value)) } };
    },
  };
  return { signer, sent };
}

describe("PolestarClient reads", () => {
  it("maps rounds with exact amounts and the new fields", async () => {
    const { view, calls } = fakeView({
      get_round:
        '{"id":3,"config":{"budget":1000000000000000000000000,"opens_at":276751070,"closes_at":276751370,"t_min":0},"phase":"Settlement","remaining":0,"remaining_returned":false,"voter_namespace":null,"project_count":5,"ballot_count":6}',
    });
    const client = new PolestarClient({ contractId: CONTRACT, daoId: DAO, view });
    const round = await client.getRound(3);
    expect(round).toEqual({
      id: 3,
      config: { budget: 10n ** 24n, opensAt: 276751070, closesAt: 276751370, tMin: 0 },
      phase: "Settlement",
      remaining: 0n,
      remainingReturned: false,
      voterNamespace: null,
      projectCount: 5,
      ballotCount: 6,
    });
    expect(calls[0]).toEqual({ method: "get_round", args: { round_id: 3 }, contractId: CONTRACT });
  });

  it("treats deployments without the newer fields as open, unreturned rounds", async () => {
    const { view } = fakeView({
      get_round: '{"id":1,"config":{"budget":5,"opens_at":1,"closes_at":2,"t_min":0},"phase":"Registration","remaining":5,"project_count":0,"ballot_count":0}',
    });
    const round = await new PolestarClient({ contractId: CONTRACT, daoId: DAO, view }).getRound(1);
    expect(round?.remainingReturned).toBe(false);
    expect(round?.voterNamespace).toBeNull();
  });

  it("filters open DAO proposals to this contract", async () => {
    const proposals = JSON.stringify([
      { id: 4, status: "InProgress", kind: { FunctionCall: { receiver_id: CONTRACT, actions: [] } } },
      { id: 5, status: "Approved", kind: { FunctionCall: { receiver_id: CONTRACT, actions: [] } } },
      { id: 6, status: "InProgress", kind: { Transfer: {} } },
      { id: 7, status: "InProgress", kind: { FunctionCall: { receiver_id: CONTRACT, actions: [] } } },
    ]);
    const { view, calls } = fakeView({ get_last_proposal_id: "8", get_proposals: proposals });
    const open = await new PolestarClient({ contractId: CONTRACT, daoId: DAO, view }).governance.getOpenProposals();
    expect(open.map((p) => p.id)).toEqual([7, 4]);
    expect(calls.every((c) => c.contractId === DAO)).toBe(true);
  });
});

describe("PolestarWriter", () => {
  it("sends exact argument bytes and returns the project id", async () => {
    const { signer, sent } = fakeSigner([12]);
    const writer = new PolestarClient({ contractId: CONTRACT, daoId: DAO, view: async () => null }).withSigner(signer);
    const { projectId } = await writer.registerProject({
      roundId: 2,
      recipient: "t.testnet",
      title: "t",
      summary: "s",
      milestones: [10n ** 24n],
      deposit: 1n,
    });
    expect(projectId).toBe(12);
    const action = sent[0]!.actions[0]!;
    expect(sent[0]!.receiverId).toBe(CONTRACT);
    expect(action.params.deposit).toBe("1");
    expect(new TextDecoder().decode(action.params.args)).toContain('"cost":"1000000000000000000000000"');
  });

  it("surfaces cancellation and contract refusals as typed errors", async () => {
    const { signer } = fakeSigner([new Error("User closed the wallet"), new Error("ERR_ALREADY_VOTED")]);
    const writer = new PolestarClient({ contractId: CONTRACT, daoId: DAO, view: async () => null }).withSigner(signer);
    await expect(writer.registerVoter()).rejects.toBeInstanceOf(TransactionCancelledError);
    await expect(writer.submitBallot(1, [0])).rejects.toBeInstanceOf(ContractError);
  });

  it("runCounting repeats batched calls until the contract reports done", async () => {
    const { signer, sent } = fakeSigner([false, false, true]);
    const progress: number[] = [];
    const writer = new PolestarClient({ contractId: CONTRACT, daoId: DAO, view: async () => null }).withSigner(signer);
    const result = await writer.runCounting(4, { onProgress: (p) => progress.push(p.transactions) });
    expect(result.done).toBe(true);
    expect(result.transactions).toBe(3);
    expect(progress).toEqual([1, 2, 3]);
    expect(sent.every((tx) => tx.actions[0]!.params.methodName === "process_allocation_steps")).toBe(true);
  });

  it("runCounting stops before sending when aborted", async () => {
    const { signer, sent } = fakeSigner([false, false, true]);
    const controller = new AbortController();
    const writer = new PolestarClient({ contractId: CONTRACT, daoId: DAO, view: async () => null }).withSigner(signer);
    const result = await writer.runCounting(4, { signal: controller.signal, onProgress: () => controller.abort() });
    expect(result).toMatchObject({ done: false, transactions: 1 });
    expect(sent).toHaveLength(1);
  });

  it("fetches the DAO bond when a proposal doesn't pass one", async () => {
    const { view } = fakeView({ get_policy: '{"roles":[],"proposal_bond":"1000000000000000000000000"}' });
    const { signer, sent } = fakeSigner([7]);
    const writer = new PolestarClient({ contractId: CONTRACT, daoId: DAO, view }).withSigner(signer);
    await writer.governance.proposeReturnRemaining(2, { description: "Return round 2" });
    expect(sent[0]!.receiverId).toBe(DAO);
    expect(sent[0]!.actions[0]!.params.deposit).toBe("1000000000000000000000000");
    const body = JSON.parse(new TextDecoder().decode(sent[0]!.actions[0]!.params.args)) as { proposal: { kind: { FunctionCall: { actions: { args: string }[] } } } };
    expect(base64ToUtf8(body.proposal.kind.FunctionCall.actions[0]!.args)).toBe('{"round_id":2}');
  });
});
