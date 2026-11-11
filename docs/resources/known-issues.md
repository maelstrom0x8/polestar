# Known issues

_Open problems, and trade-offs Polestar makes on purpose_

## Eligibility is a social threshold

In an open round, registering costs only the network fee, so someone can register many accounts ahead of a round and vote with all of them. Under Equal Shares each of those accounts also brings its own share of the budget. Members-only rounds move the decision to whoever controls the community's name, who can still create as many accounts as they like. Polestar makes no claim to resist fake accounts or strategic voting.

## The contract pays for storage from its own balance

Rounds, projects, ballots and registrations add storage, and the contract pays for it from the balance that also holds round budgets. The project deposit isn't sized to cover it, and voting carries no deposit. Operators need to keep a reserve on the contract account. Charging storage to the callers who create it is the planned fix.

## Unpaid milestones stay in the contract

Money for a milestone the council never approves stays in the contract, with no deadline after which it returns to the treasury. Only budget the count left unallocated can be returned.

## Anyone can start voting early

`open_declaration` needs only one project, so anyone can end a round's proposal period as soon as the first project arrives. The registration cutoff and voting deadline still apply as the council set them.

## Some failures need a redeploy

A round whose count overflowed (`ERR_RATIONAL_OVERFLOW`) couldn't finish counting until a new build could count it, and its budget would wait in the contract. A change to how rounds are stored would also need a migration, or existing rounds would become unreadable; see [Storage and upgrades](../internals/storage-and-upgrades.md).

## Views return amounts as plain JSON numbers

Views return yoctoNEAR amounts as bare numbers, which ordinary JSON parsing rounds. Use the [SDK](../building/sdk.md) or a big-number-aware parser.

## No list of rounds

There's no paginated view of rounds. Clients read `get_round_count` and fetch rounds one at a time.

## Trezu

Polestar's council actions are ordinary SputnikDAO proposals, so a treasury managed in Trezu should be able to approve them there. This hasn't been tried yet.
