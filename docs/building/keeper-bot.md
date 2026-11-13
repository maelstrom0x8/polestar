# Run a keeper bot

_Ending voting and running the count automatically, as soon as a round is ready_

Three steps in every round need someone to trigger them: starting voting, ending it, and running the count. Anyone may, and none of them can change the outcome. A **keeper** is whoever does it. In the app it's a person pressing a button; a bot does the same without waiting for anyone.

| Step | When it's possible | Method |
| :-- | :-- | :-- |
| Start voting | The round is open for proposals and has a project | `open_declaration` |
| End voting | Voting is open and its closing block has passed | `close_declaration` |
| Run the count | The round is counting | `process_allocation_steps` |

## The example keeper

`packages/sdk/examples/keeper.mjs` checks every round, ends voting where it has closed, and runs the count to completion.

```bash
cd packages/sdk
npm install
npm run build
node examples/keeper.mjs
```

Without flags it only reports what it would do:

```
2026-11-11T13:10:22.503Z  nothing to do across 0 round(s) at block 277219773
```

To act, give it an account whose key the NEAR CLI has stored in `~/.near-credentials/testnet/`:

```bash
node examples/keeper.mjs --send --account keeper.testnet --watch 60
```

`--watch 60` repeats the check every 60 seconds. `--contract`, `--dao` and `--rpc` point it at another deployment.

## How it works

```ts
const writer = client.withSigner(fromNearApiAccount(account));

if (round.phase === "Declaration" && head.height > round.config.closesAt) {
  await writer.endVoting(round.id);
}
await writer.runCounting(round.id, {
  onProgress: ({ transactions, done }) => log(`transaction ${transactions}${done ? ", finished" : ""}`),
});
```

`runCounting` keeps sending `process_allocation_steps` until the contract reports the results are in. A typical round takes one transaction. Each transaction is final on its own, so a keeper that stops halfway leaves the count resumable by anyone.

**Note**

The keeper deliberately doesn't start voting. When proposals close is a judgement call for the community, so the example leaves `open_declaration` to people.

## Costs

None of these calls takes a deposit. The keeper pays only network fees: ending voting and a typical count each cost a small fraction of a NEAR.

## Next steps

- [The counting engine](../internals/counting-engine.md): Why splitting the count across transactions never changes the result
