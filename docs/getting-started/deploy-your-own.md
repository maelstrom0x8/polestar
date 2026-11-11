# Deploy your own

_A SputnikDAO, a Polestar contract tied to it, and the app pointed at both_

These steps use the [NEAR CLI](https://github.com/near/near-cli) (`npm install -g near-cli`) and [cargo-near](https://github.com/near/cargo-near) (`cargo install --locked cargo-near`). Replace `you.testnet` and `mycommunity` with your own names.

## Set up the DAO

Use a SputnikDAO you already run, or create one through the factory:

```bash
ARGS=$(printf '%s' '{"config":{"name":"mycommunity","purpose":"Community budget","metadata":""},"policy":["you.testnet"]}' | base64 | tr -d '\n')

near call sputnik-v2.testnet create "{\"name\":\"mycommunity\",\"args\":\"$ARGS\"}" \
  --accountId you.testnet --deposit 6 --gas 150000000000000
```

A list of accounts as `policy` gives SputnikDAO's default policy: those accounts are the council, approvals need half of it, and anyone may submit a proposal with a 1 NEAR bond. The deposit pays for the DAO contract's storage.

**Tip**

Every milestone payment is a DAO proposal. Before you start, decide who may submit proposals and how many approvals a payment needs. A council of five that needs four approvals for every payment will be slow.

## Deploy the contract

```bash
cd contracts/budgeting
cargo near build non-reproducible-wasm
cd ../..

near create-account budget.you.testnet --masterAccount you.testnet --initialBalance 5

near deploy budget.you.testnet target/near/polestar_budgeting/polestar_budgeting.wasm \
  --initFunction new \
  --initArgs '{"sputnik_dao_account":"mycommunity.sputnik-v2.testnet"}'
```

`sputnik_dao_account` is the only account that can fund rounds and release money. It can't be changed without redeploying.

**Note**

The contract's code needs about 2.5 NEAR of storage, and every round, project and registration adds a little, paid from the contract's own balance. Keep a reserve on the contract account and top it up as it's used. See [Funds and escrow](../internals/funds-and-escrow.md).

## Fund the treasury

```bash
near send you.testnet mycommunity.sputnik-v2.testnet 3
```

The DAO needs the budget of the rounds you plan, plus a bond for each proposal it submits itself.

## Point the app at it

Create `psui/.env.local`:

```bash
VITE_CONTRACT_ID=budget.you.testnet
VITE_DAO_ID=mycommunity.sputnik-v2.testnet
```

Then run `npm run dev` in `psui/`.

## Next steps

- [Run a first round](run-a-first-round.md) — Take one round from funding to its first payout
