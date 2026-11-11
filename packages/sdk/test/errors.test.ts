import { describe, expect, it } from "vitest";
import {
  ContractError,
  TransactionCancelledError,
  TransactionOutcomeUnknownError,
  classifySendError,
  readOutcome,
  utf8ToBase64,
} from "../src/index.js";

describe("classifySendError", () => {
  it("sorts wallet failures into typed errors", () => {
    expect(classifySendError(new Error("User rejected the request"))).toBeInstanceOf(TransactionCancelledError);
    const refused = classifySendError(new Error("Smart contract panicked: ERR_ALREADY_VOTED"));
    expect(refused).toBeInstanceOf(ContractError);
    expect((refused as ContractError).code).toBe("ERR_ALREADY_VOTED");
    expect(classifySendError(new Error("socket hang up"))).toBeInstanceOf(TransactionOutcomeUnknownError);
  });
});

describe("readOutcome", () => {
  it("returns hash, logs and a decoded value on success", () => {
    const outcome = readOutcome({
      transaction: { hash: "abc" },
      receipts_outcome: [{ outcome: { logs: ["ProjectRegistered round_id=1 project_id=4 cost=1 milestones=1"] } }, { outcome: { logs: [] } }],
      status: { SuccessValue: utf8ToBase64("4") },
    });
    expect(outcome).toEqual({ hash: "abc", logs: ["ProjectRegistered round_id=1 project_id=4 cost=1 milestones=1"], value: 4 });
  });

  it("throws ContractError with the panic code on failure", () => {
    expect(() =>
      readOutcome({ status: { Failure: { ActionError: { kind: { FunctionCallError: { ExecutionError: "Smart contract panicked: ERR_WRONG_PHASE" } } } } } }),
    ).toThrowError(expect.objectContaining({ code: "ERR_WRONG_PHASE" }));
  });

  it("keeps a big u128 return value exact", () => {
    const outcome = readOutcome({ status: { SuccessValue: utf8ToBase64("1000000000000000000000000") } });
    expect(outcome.value).toBe("1000000000000000000000000");
  });
});
