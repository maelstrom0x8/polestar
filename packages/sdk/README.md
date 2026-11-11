# @ezeonlabs/polestar

A TypeScript client for Polestar, participatory budgeting for SputnikDAO treasuries on NEAR. It reads rounds, projects and results without a wallet. It builds and sends every Polestar transaction, with amounts encoded exactly. And it prepares the SputnikDAO proposals a council approves to fund rounds and pay milestones.

It has no runtime dependencies, works in browsers and Node.js 20.12+, and doesn't tie you to a wallet.

## What you can build

- **Membership issuers.** A round can be limited to direct sub-accounts of a named account, such as `*.guild.near`. An app that creates those accounts for vouched-for members decides who can vote, with no change to Polestar.
- **Keeper bots.** Anyone can end voting and run the count once voting closes. [`examples/keeper.mjs`](https://github.com/maelstrom0x8/polestar/blob/main/packages/sdk/examples/keeper.mjs) does both.
- **Council and treasury tools.** Prepare "fund a round", "pay a milestone" and "return unspent budget" proposals from scripts, scheduled jobs or another treasury interface.
- **Community front-ends and alerts.** Show a community's rounds on its own site, or post "voting is open" and "results are in" from the contract's event logs.
- **Dashboards.** Turnout, funded and unfunded projects, payment progress per project.

## Install

```bash
npm install @ezeonlabs/polestar
```

To work from a clone of the repository instead:

```bash
cd packages/sdk
npm install
npm run build
```

## Read without a wallet

```ts
import { PolestarClient, formatNearAmount } from "@ezeonlabs/polestar";

const polestar = new PolestarClient({
  contractId: "budgeting.polestar-dev.testnet",
  daoId: "dao.polestar-dev.testnet",
});

const roundId = 0;
const round = await polestar.getRound(roundId);
const projects = await polestar.getProjects(roundId);
const result = await polestar.getAllocationResult(roundId);

console.log(round?.phase, formatNearAmount(round!.config.budget));
```

| Method | Returns |
| --- | --- |
| `getRoundCount()` | Number of rounds ever created; ids run from `0` |
| `getRound(id)`, `getRoundPhase(id)` | A round, or `null` |
| `getProjects(roundId)`, `getProject(roundId, projectId)` | Projects with their milestones and status |
| `getProjectSupport(roundId, projectId)` | How many ballots approved the project |
| `getBallot(roundId, voter)` | A voter's ballot, or `null` |
| `getFirstSeen(accountId)` | Block at which the account registered, or `null` |
| `getAllocationResult(roundId)`, `getRemaining(roundId)` | The count's result and leftover budget |
| `getBlock()`, `getChainClock()` | Chain head, and the measured time per block for converting block heights to dates |
| `governance.getPolicy()`, `governance.getOpenProposals()` | The DAO's policy and its open proposals that call Polestar |

There is no "list all rounds" call: the contract exposes rounds one at a time. For many rounds, read `getRoundCount()` and fetch the ids you need.

Some old rounds can't be decoded by newer contract builds. Reading one throws `ContractPanicError`; skip it.

## Write with a signer

`client.withSigner(signer)` returns a writer. A signer is anything with `signAndSendTransaction({ receiverId, actions })`.

**Browser wallets** through `@hot-labs/near-connect` already have that shape:

```ts
const { wallet } = await connector.getConnectedWallet();
const writer = polestar.withSigner({
  signAndSendTransaction: (tx) => wallet.signAndSendTransaction(tx as never),
});
await writer.submitBallot(roundId, [0, 2]);
```

**Servers and bots** use a near-api-js account:

```ts
import { Account, JsonRpcProvider } from "near-api-js";
import { fromNearApiAccount } from "@ezeonlabs/polestar/near-api-js";

const account = new Account("keeper.testnet", new JsonRpcProvider({ url: "https://test.rpc.fastnear.com" }), privateKey);
const writer = polestar.withSigner(fromNearApiAccount(account));
```

| Writer method | What it does |
| --- | --- |
| `registerVoter()` | One-time registration that makes an account eligible for rounds opening later |
| `registerProject({ roundId, recipient, title, summary, milestones, deposit })` | Proposes a project; the cost is the sum of `milestones` |
| `submitBallot(roundId, projectIds)` | Approves any number of projects |
| `startVoting(roundId)`, `endVoting(roundId)` | Moves a round into and out of voting; anyone can call these |
| `processAllocationSteps(roundId, maxSteps?)` | Runs as many counting steps as fit in one transaction |
| `runCounting(roundId, { onProgress, signal })` | Repeats the above until the results are in |

Every writer method has a pure builder on `polestar.calls` (for example `polestar.calls.submitBallot(roundId, [0, 2])`) that returns the exact transaction without sending it. Use it to show people what they are about to sign.

## DAO actions are proposals

Three operations can only be carried out by the DAO itself: funding a round, paying a milestone and returning unspent budget. The SDK never offers them as direct calls. It prepares the SputnikDAO proposal, and the DAO's members approve it under their own rules.

```ts
await writer.governance.proposeFundRound(
  { budget: parseNear("5")!, opensAt, closesAt, voterNamespace: "guild.near" },
  { description: "May round for the guild" },
);

const [proposal] = await polestar.governance.getOpenProposals();
await writer.governance.approve(proposal);
```

- The proposal bond is read from the DAO's policy unless you pass `bond`.
- Leaving out `voterNamespace` creates a round anyone registered can vote in.
- `approve` and `reject` send the vote the way SputnikDAO requires, echoing the proposal so a vote can't land on a different one.
- Submitting a proposal does not fund anything. Funding happens when the proposal is approved, and the bond is returned once it's decided.

## Amounts and precision

NEAR amounts are integers in yoctoNEAR (10⁻²⁴ NEAR), far beyond what a JavaScript `number` holds exactly. The contract also returns them as plain JSON numbers, so a normal `JSON.parse` silently corrupts them.

- Every amount the SDK returns or accepts is a `bigint`. Use `parseNear("1.25")` and `formatNearAmount(yocto)` to convert, with no floating point involved.
- Reads go through `parsePreservingBigNumbers`, which keeps any 16-digit or longer number as a string before converting it to `bigint`.
- Writes are encoded per method, the way the contract expects: `fund_round`'s budget as a bare integer, `register_project`'s amounts as decimal strings.
- Round and project ids are `number`s. The SDK throws if one is ever outside JavaScript's safe integer range.

## Errors, and when not to retry

| Error | Meaning | Retry? |
| --- | --- | --- |
| `TransactionCancelledError` | The person closed the wallet or declined. Nothing was sent. | Yes, if they want to |
| `ContractError` | The contract refused. `error.code` is an `ERR_*` code; `ERROR_CODES[code]` explains it. Nothing changed. | Only after fixing the cause |
| `TransactionOutcomeUnknownError` | The transaction may have been sent, but no result came back. | **No.** Read the chain first: resending `registerProject` can create a duplicate project |
| `ViewError`, `ContractPanicError` | A read failed, or the contract panicked while reading | Reads are safe to retry |

## Counting

When voting closes, anyone can end it and run the count. The count is deterministic: the same ballots always give the same result, however many transactions it takes. A typical round finishes in one `processAllocationSteps` call. `runCounting` keeps going until the contract reports the results are in, and stops early if you abort its `signal`.

It is not atomic. Each transaction is final on its own, and progress is saved between them.

## Events

The contract logs one line per state change, for example `ProjectFunded round_id=3 project_id=1 stage=Mes amount=300000000000000000000000`. `parseEvents(outcome.logs)` turns them into `{ type, data }` objects.

The event types are: `RoundFunded`, `ProjectRegistered`, `DeclarationOpened`, `BallotSubmitted`, `DeclarationClosed`, `ProjectFunded`, `ProjectUnfunded`, `AllocationFinalized`, `MilestoneAttested`, `MilestoneReleaseFailed`, `RemainingReturned`, `RemainingReturnFailed`.

## Eligibility

`voterStatus(round, accountId, firstSeen)` predicts whether an account can vote in a round: `"eligible"`, `"not-registered"`, `"too-late"` or `"not-member"`. It is an estimate for showing people where they stand; the contract makes the final decision.

Eligibility is a social threshold, not proof of a unique person. A namespace's owner can create as many sub-accounts as they like.

## Examples

```bash
npm run build
node examples/read-round.mjs --round 0
node examples/keeper.mjs
node examples/keeper.mjs --send --account keeper.testnet --watch 60
```

The keeper runs dry unless you pass `--send`. It reads the signing key from `~/.near-credentials/testnet/<account>.json`, where the NEAR CLI stores keys.

## Development

```bash
npm test
npm run typecheck
```

## License

[Apache-2.0](LICENSE)
