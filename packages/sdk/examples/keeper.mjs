import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Account, JsonRpcProvider } from "near-api-js";
import { ContractPanicError, PolestarClient } from "../dist/index.js";
import { fromNearApiAccount } from "../dist/near-api-js.js";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const rpcUrl = option("--rpc", process.env.NEAR_RPC_URL ?? "https://test.rpc.fastnear.com");
const client = new PolestarClient({
  contractId: option("--contract", "budgeting.polestar-dev.testnet"),
  daoId: option("--dao", "dao.polestar-dev.testnet"),
  rpcUrl,
});
const send = flag("--send");
const watchSeconds = Number(option("--watch", 0));
const log = (message) => console.log(`${new Date().toISOString()}  ${message}`);

function signer() {
  const accountId = option("--account");
  if (!accountId) throw new Error("--send needs --account <id> with a key in ~/.near-credentials/testnet");
  const file = join(homedir(), ".near-credentials", "testnet", `${accountId}.json`);
  const key = JSON.parse(readFileSync(file, "utf8")).private_key;
  return fromNearApiAccount(new Account(accountId, new JsonRpcProvider({ url: rpcUrl }), key));
}

const writer = send ? client.withSigner(signer()) : null;

async function pass() {
  const [count, head] = await Promise.all([client.getRoundCount(), client.getBlock()]);
  let acted = 0;
  for (let id = 0; id < count; id++) {
    let round;
    try {
      round = await client.getRound(id);
    } catch (error) {
      if (error instanceof ContractPanicError) continue;
      throw error;
    }
    if (!round) continue;
    const votingOver = round.phase === "Declaration" && head.height > round.config.closesAt;
    if (!votingOver && round.phase !== "Allocation") continue;

    acted += 1;
    const plan = votingOver ? "end voting, then finish counting" : "finish counting";
    if (!writer) {
      log(`round ${id}: would ${plan} (dry run; pass --send --account <id> to act)`);
      continue;
    }
    if (votingOver) {
      await writer.endVoting(id);
      log(`round ${id}: voting ended`);
    }
    const result = await writer.runCounting(id, {
      onProgress: ({ transactions, done }) => log(`round ${id}: counting transaction ${transactions}${done ? ", finished" : ""}`),
    });
    log(`round ${id}: ${result.done ? "results are in" : "counting paused"} after ${result.transactions} transaction(s)`);
  }
  if (acted === 0) log(`nothing to do across ${count} round(s) at block ${head.height}`);
}

await pass();
while (watchSeconds > 0) {
  await new Promise((resolve) => setTimeout(resolve, watchSeconds * 1000));
  await pass().catch((error) => log(`pass failed: ${error.message}`));
}
