# Troubleshooting

_What a refusal or an odd screen means, and what to do about it_

## Voting

| You see | Why | What to do |
| :-- | :-- | :-- |
| **You can't vote in this round**, and you never registered | Registration closed before you registered | Register now; you'll be able to vote in rounds funded from here on |
| **You can't vote in this round**, and you did register | You registered after this round's cutoff | Same: later rounds will count you |
| **You can't vote in this round** in a members-only round | Your account isn't directly under the round's name | Ask the community for an account under its name |
| "You've already voted in this round" | Ballots are final | Nothing; your first ballot stands |
| "Voting has closed for this round" | The closing block passed while you were choosing | Nothing; the round moves to counting next |

## Proposing

| You see | Why | What to do |
| :-- | :-- | :-- |
| "This round isn't taking more proposals; it's full" | The round has 50 projects | Propose in the next round |
| "The milestones must add up to the total cost" | The amounts changed between entry and signing | Re-enter the milestones |
| **Propose a project** missing on a round | Voting has started | Proposals close when voting starts |

## Counting and payouts

| You see | Why | What to do |
| :-- | :-- | :-- |
| **End voting** isn't shown | The closing block hasn't passed yet | Wait; the timeline shows how long |
| **Finish counting** asks for another confirmation | A very large round didn't fit in one transaction | Confirm again; progress is saved between transactions |
| A milestone payment proposal executed, but the milestone isn't paid | The transfer failed and was undone, usually because the contract's free balance was short | Top up the contract account, then submit the payment again |
| "No finished round has unspent budget to return" | Every finished round is fully allocated or already returned | Nothing to do |

## Signing

| You see | Why | What to do |
| :-- | :-- | :-- |
| "Signing was cancelled" | The wallet was closed or the request declined | Try again when ready; nothing was sent |
| A transaction's outcome is unknown | The wallet may have sent it, but no answer came back | Check the round before retrying. Re-proposing a project could create a duplicate. |

## Next steps

- [Contract reference](contract-reference.md): Every error code
