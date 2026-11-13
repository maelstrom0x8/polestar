# Pay milestones and return unspent budget

_How money leaves a round after the count_

After the count, a round's money is in two places: the funded projects' milestones, and the leftover. Both leave the contract only through proposals the council approves.

## Pay a milestone

When a project has delivered a milestone, open **Proposals** and choose **Pay a milestone**. Pick the round, the project and the milestone; only unpaid milestones are listed. **Review**, confirm, and approve. The payment goes straight to the project's recipient, and the results show it as paid.

- Each milestone can be paid once.
- Milestones can be paid in any order.
- If a transfer fails, the milestone is marked unpaid again, and a new proposal can retry it.

Anyone can submit a payment proposal if the DAO's policy lets everyone submit, including the project team. Only the council can approve it.

## Return unspent budget

If the count left budget unallocated, **Return unspent budget** lists the rounds with something left over. Approving the proposal sends that amount back to the DAO's treasury. Funded projects are unaffected, and their milestones can still be paid afterwards.

## What the council controls, and what it doesn't

| The council can | The council can't |
| :-- | :-- |
| Decide when each milestone is paid | Change which projects were funded |
| Decline to pay a milestone that wasn't delivered | Move a project's money to another project or recipient |
| Take back what the count left unallocated | Take back money allocated to a funded project |

A milestone the council never approves stays in the contract.

## Next steps

- [Funds and escrow](../internals/funds-and-escrow.md): How the contract accounts for every round's money
- [Prepare SputnikDAO proposals](../building/sputnikdao-proposals.md): The proposals the app submits, for building your own tools
