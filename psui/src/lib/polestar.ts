import { PolestarClient } from "@ezeonlabs/polestar";
import { CONTRACT_ID, DAO_ID, RPC_URL, getBlock, viewFunction } from "./near";

export const polestar = new PolestarClient({
  contractId: CONTRACT_ID,
  daoId: DAO_ID,
  rpcUrl: RPC_URL,
  view: viewFunction,
  block: getBlock,
});
