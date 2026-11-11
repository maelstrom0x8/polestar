# The SDK

_Reading rounds, sending transactions and preparing council proposals from TypeScript_

`@ezeonlabs/polestar` is a TypeScript client for Polestar. It has no runtime dependencies and runs in browsers and Node.js 20.12 or later. Polestar's own web app uses it for every read and write.

```bash
npm install @ezeonlabs/polestar
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
| :-- | :-- |
| `getRoundCount()` | How many rounds exist; ids run from 0 |
| `getRound(id)`, `getRoundPhase(id)` | A round, or `null` |
| `getProjects(roundId)`, `getProject(roundId, projectId)` | Projects with milestones and status |
| `getProjectSupport(roundId, projectId)` | How many ballots approved a project |
| `getBallot(roundId, voter)` | A voter's ballot, or `null` |
| `getFirstSeen(accountId)` | The block an account registered at, or `null` |
| `getAllocationResult(roundId)`, `getRemaining(roundId)` | The count's result and leftover |
| `getChainClock()` | The chain head and measured time per block, for turning block heights into dates |
| `governance.getPolicy()`, `governance.getOpenProposals()` | The DAO's policy and its open Polestar proposals |

## Write with a signer

`polestar.withSigner(signer)` returns a writer. A signer is anything with `signAndSendTransaction({ receiverId, actions })`.

**In a browser**, a wallet connected through `@hot-labs/near-connect` already fits:

```ts
const { wallet } = await connector.getConnectedWallet();
const writer = polestar.withSigner({
  signAndSendTransaction: (tx) => wallet.signAndSendTransaction(tx as never),
});
await writer.submitBallot(roundId, [0, 2]);
```

**On a server**, use a near-api-js account:

```ts
import { Account, JsonRpcProvider } from "near-api-js";
import { fromNearApiAccount } from "@ezeonlabs/polestar/near-api-js";

const account = new Account("keeper.testnet", new JsonRpcProvider({ url: "https://test.rpc.fastnear.com" }), privateKey);
const writer = polestar.withSigner(fromNearApiAccount(account));
```

| Writer method | Does |
| :-- | :-- |
| `registerVoter()` | Registers the account for every round funded later |
| `registerProject({ roundId, recipient, title, summary, milestones, deposit })` | Proposes a project; its cost is the sum of `milestones` |
| `submitBallot(roundId, projectIds)` | Approves any number of projects |
| `startVoting(roundId)`, `endVoting(roundId)` | Moves a round into and out of voting |
| `processAllocationSteps(roundId, maxSteps?)` | Runs as much of the count as fits in one transaction |
| `runCounting(roundId, { onProgress, signal })` | Repeats that until the results are in |
| `governance.proposeFundRound(…)`, `proposeMilestonePayment(…)`, `proposeReturnRemaining(…)` | Submits a council proposal |
| `governance.approve(proposal)`, `reject(proposal)` | Votes on one |

Every writer method has a pure builder (`polestar.calls.*`, `polestar.governance.calls.*`) that returns the exact transaction without sending it, so you can show people what they're about to sign.

## Amounts are exact

NEAR amounts are integers in yoctoNEAR, far larger than a JavaScript `number` can hold exactly, and the contract returns them as plain JSON numbers. Every amount the SDK accepts or returns is a `bigint`. Use `parseNear("1.25")` and `formatNearAmount(yocto)` to convert, with no floating point involved.

## Errors

| Error | Meaning | Retry? |
| :-- | :-- | :-- |
| `TransactionCancelledError` | The wallet was closed or the request declined. Nothing was sent. | If the person wants to |
| `ContractError` | The contract refused. `error.code` is the `ERR_*` code; `ERROR_CODES[code]` explains it. | After fixing the cause |
| `TransactionOutcomeUnknownError` | It may have been sent, but no result came back. | **No.** Read the chain first. Resending `registerProject` can create a duplicate. |
| `ViewError`, `ContractPanicError` | A read failed | Reads are safe to retry |

## Events

`parseEvents(outcome.logs)` turns the contract's log lines into `{ type, data }` objects, such as `{ type: "ProjectFunded", data: { round_id: "3", project_id: "1", stage: "Mes", amount: "…" } }`. The full list is in the [contract reference](../resources/contract-reference.md#events).

## Next steps

- [Run a keeper bot](keeper-bot.md) — A complete example using the writer
- [Prepare SputnikDAO proposals](sputnikdao-proposals.md) — What the governance builders produce
