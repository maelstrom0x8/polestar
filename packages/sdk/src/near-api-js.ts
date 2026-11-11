import { actions, type Account } from "near-api-js";
import type { Signer } from "./types.js";

export function fromNearApiAccount(account: Account): Signer {
  return {
    accountId: account.accountId,
    signAndSendTransaction: ({ receiverId, actions: calls }) =>
      account.signAndSendTransaction({
        receiverId,
        actions: calls.map((call) =>
          actions.functionCall(call.params.methodName, call.params.args, BigInt(call.params.gas), BigInt(call.params.deposit)),
        ),
        throwOnFailure: false,
      }),
  };
}
