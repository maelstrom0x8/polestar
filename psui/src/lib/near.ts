import { ContractPanicError, ViewError, parsePreservingBigNumbers, rpcBlock, rpcView, type Block } from "@ezeonlabs/polestar";

export const RPC_URL = import.meta.env.VITE_NEAR_RPC_URL ?? "https://test.rpc.fastnear.com";
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID ?? "budgeting.polestar-dev.testnet";
export const DAO_ID = import.meta.env.VITE_DAO_ID ?? "dao.polestar-dev.testnet";

export { ContractPanicError, ViewError as ViewCallError, parsePreservingBigNumbers };
export type BlockRef = Block;

const view = rpcView(RPC_URL);
const block = rpcBlock(RPC_URL);

export async function viewFunction<T>(
  methodName: string,
  args: Record<string, unknown> = {},
  contractId = CONTRACT_ID,
): Promise<T> {
  if (__MOCK_DATA__) {
    const { mockView } = await import("./mock/views");
    return mockView(methodName, args, contractId) as T;
  }
  return (await view(methodName, args, contractId)) as T;
}

export async function getBlock(ref: "final" | number): Promise<BlockRef> {
  if (__MOCK_DATA__) {
    const { mockBlock } = await import("./mock/views");
    return mockBlock(ref);
  }
  return block(ref);
}
