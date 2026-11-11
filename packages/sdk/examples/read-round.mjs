import { ContractPanicError, PolestarClient, formatNearAmount } from "../dist/index.js";

const option = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const client = new PolestarClient({
  contractId: option("--contract", "budgeting.polestar-dev.testnet"),
  daoId: option("--dao", "dao.polestar-dev.testnet"),
  rpcUrl: option("--rpc", process.env.NEAR_RPC_URL),
});

const near = (yocto) => `${formatNearAmount(yocto)} NEAR`;
const roundId = Number(option("--round", (await client.getRoundCount()) - 1));

let round;
try {
  round = await client.getRound(roundId);
} catch (error) {
  if (error instanceof ContractPanicError) {
    console.log(`Round ${roundId} can't be read by the current contract build (${error.panic}).`);
    process.exit(1);
  }
  throw error;
}
if (!round) {
  console.log(`Round ${roundId} doesn't exist.`);
  process.exit(1);
}

console.log(`Round ${round.id}: ${round.phase}`);
console.log(`  Budget       ${near(round.config.budget)}`);
console.log(`  Who can vote ${round.voterNamespace ? `members of ${round.voterNamespace}` : "anyone registered"}`);
console.log(`  Projects     ${round.projectCount}, voters ${round.ballotCount}`);

const projects = await client.getProjects(round.id);
for (const project of projects) {
  const paid = project.milestones.filter((m) => m.attested).length;
  console.log(`  #${project.id} ${project.title.padEnd(40)} ${near(project.cost).padStart(12)}  ${project.status}  ${paid}/${project.milestones.length} paid`);
}

const result = await client.getAllocationResult(round.id);
if (result) {
  const awarded = result.funded.reduce((sum, f) => sum + f.amount, 0n);
  console.log(`  Awarded      ${near(awarded)} of ${near(result.budget)}`);
  console.log(`  Unspent      ${near(result.remaining)}${round.remainingReturned ? " (returned to the treasury)" : ""}`);
}
