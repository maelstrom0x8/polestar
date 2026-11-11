# Storage and upgrades

_What the contract stores, and how upgrades keep existing rounds readable_

## What's stored

| Key | Holds | Lifetime |
| :-- | :-- | :-- |
| Contract state | The DAO account, the next round id, and the maps below | Permanent |
| `rounds` | Each round's configuration, stage, `remaining`, result and counting progress | Permanent |
| Per-round projects | Each project with its milestones and status | Permanent |
| Per-round ballots | Each voter's approvals | Permanent |
| `first_seen` | Each account's registration block | Permanent |
| `remaining_returned` | Rounds whose leftover went back to the DAO, with the amount | Permanent |
| `voter_namespace` | Members-only rounds and their name | Permanent |

Nothing is ever deleted. Rounds can overlap, so one round's data can't be cleared when the next starts.

## Upgrades

The contract is upgraded by redeploying its code from the account it lives on. That account's key is the one privileged role outside the DAO, and it's a standard NEAR concern: protect it like any treasury key.

Stored data is encoded in a fixed binary layout. Adding a field to a stored type would change that layout and leave every existing round unreadable. So new data goes under its own storage prefix instead: `remaining_returned` and `voter_namespace` were added that way, and existing rounds decode exactly as before.

Each upgrade is checked before it's deployed. The sandbox test `return_remaining`, run with `PREVIOUS_WASM` set to the deployed build, creates and settles a round on that build, upgrades to the new one, and continues with the same round.

## Next steps

- [Deployments](../resources/deployments.md) — What's deployed now, and the upgrade history
