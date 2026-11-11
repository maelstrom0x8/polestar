# Deployments

_What's deployed, and how it's changed_

## The public deployment

| | Account |
| :-- | :-- |
| **Polestar contract** | [`budgeting.polestar-dev.testnet`](https://testnet.nearblocks.io/address/budgeting.polestar-dev.testnet) |
| **SputnikDAO** | [`dao.polestar-dev.testnet`](https://testnet.nearblocks.io/address/dao.polestar-dev.testnet) |
| **RPC** | `https://test.rpc.fastnear.com` |
| **SDK** | [`@ezeonlabs/polestar`](https://www.npmjs.com/package/@ezeonlabs/polestar) |

**Current build:** code hash `2w8CDHRv7rnm5hYbagqJehNb6UzYoTymqqdNo9ZfyBoC` ([deploy transaction](https://testnet.nearblocks.io/txns/5WK2DqcLBZdr4a5qkZ3SEUSvGiiJKSBN557zxSxTPnrX)), with returning unspent budget, members-only rounds and batched counting.

**The DAO's policy** is SputnikDAO's default: a one-member council, approvals at half the council, anyone may submit a proposal, and a 1 NEAR bond.

## History

| Date | Change |
| :-- | :-- |
| 2026-11-03 | Counting made resumable across transactions. This changed how rounds are stored, and rounds 0 and 1 can no longer be read. |
| 2026-11-10 | Project amounts accepted as strings; `get_first_seen` added. |
| 2026-11-11 | `return_remaining`, members-only rounds, `process_allocation_steps`. New data stored under new prefixes; existing rounds unchanged. |

Rounds 0 and 1 make `get_round` fail with a deserialization error. The app and SDK skip them.

## Next steps

- [Storage and upgrades](../internals/storage-and-upgrades.md) — How upgrades keep rounds readable
