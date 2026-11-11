# Glossary

_Terms used across this documentation_

**Round**: one budget, shared out between the projects proposed for it, through four stages: open for proposals, voting, counting, results.

**Council**: whoever can approve proposals in the SputnikDAO a Polestar deployment is tied to.

**DAO operations**: the three calls only the DAO can make: `fund_round`, `attest_milestone` and `return_remaining`. Each arrives as an approved SputnikDAO proposal.

**Project**: a funding request in a round, with a recipient and a cost split into milestones.

**Milestone**: one part of a project's cost, paid separately once the council approves it.

**Ballot**: the set of projects a voter approves in a round. Unranked and final.

**Registration**: the one-time step, `register_voter` or proposing a project, that records when an account joined. It decides which rounds the account can vote in.

**Cutoff**: a round's `opens_at` block. Only accounts registered before it can vote in the round.

**Members-only round**: a round whose voters must be direct sub-accounts of a NEAR name, such as `ana.meridian.near` for `meridian.near`.

**Method of Equal Shares**: the rule that splits the budget. Each voter gets an equal share, and a project is funded when its supporters can cover its cost from their shares.

**Completion**: the second stage of the count, which spends what equal shares left over on the projects with the most supporters per NEAR that still fit.

**Remaining**: what a round's count left unallocated. The DAO can take it back with `return_remaining`.

**Keeper**: whoever starts voting, ends it, or runs the count. Anyone can.

**Settlement**: the final stage, in which results are fixed and milestones are paid.

**yoctoNEAR**: the smallest NEAR unit, 10⁻²⁴ NEAR. Every amount in the contract is in yoctoNEAR.
