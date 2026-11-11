import {
  ContractError,
  NetworkError,
  TGAS,
  TransactionCancelledError,
  TransactionOutcomeUnknownError,
  contractJson,
  sendTransaction,
  type Signer,
  type TransactionOutcome,
} from "@ezeonlabs/polestar";
import { CONTRACT_ID } from "./near";

export { TGAS, contractJson };
export {
  ContractError as TxRefusedError,
  NetworkError as TxNetworkError,
  TransactionCancelledError as TxCancelledError,
  TransactionOutcomeUnknownError as TxUnknownError,
};

export type TxOutcome = TransactionOutcome;

export interface ContractCall {
  receiverId?: string;
  method: string;
  args: Record<string, unknown>;
  deposit: bigint;
  gas: bigint;
}

export async function sendCall(call: ContractCall): Promise<TxOutcome> {
  if (__MOCK_DATA__) {
    const { mockSend } = await import("./mock/tx");
    return mockSend(call);
  }

  const { getConnectedWallet } = await import("./wallet");
  const wallet = await getConnectedWallet().catch(() => {
    throw new NetworkError("No wallet is connected.");
  });
  const signer: Signer = { signAndSendTransaction: (transaction) => wallet.signAndSendTransaction(transaction as never) };
  return sendTransaction(signer, { ...call, receiverId: call.receiverId ?? CONTRACT_ID });
}

export function explorerTxUrl(hash: string): string {
  return `https://testnet.nearblocks.io/txns/${hash}`;
}
