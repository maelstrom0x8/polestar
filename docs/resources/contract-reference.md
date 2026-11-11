# Contract reference

_Every method, view, event and error the Polestar contract exposes_

All amounts are yoctoNEAR (10⁻²⁴ NEAR). Round and project ids are integers from 0. Block heights are NEAR block heights.

## Change methods

| Method | Arguments | Caller | Stage | Deposit |
| :-- | :-- | :-- | :-- | :-- |
| `new` | `sputnik_dao_account` | The deployer, once | | none |
| `fund_round` | `config: { budget, opens_at, closes_at, t_min }`, `voter_namespace?` | DAO | creates a round | exactly `budget` |
| `register_project` | `round_id`, `recipient`, `title`, `summary`, `cost`, `milestone_amounts[]` | Anyone | Registration | more than zero |
| `register_voter` | none | Anyone | any | none |
| `open_declaration` | `round_id` | Anyone | Registration, with a project | none |
| `submit_ballot` | `round_id`, `approved[]` | An eligible account | Declaration, up to `closes_at` | none |
| `close_declaration` | `round_id` | Anyone | Declaration, after `closes_at` | none |
| `process_allocation_step` | `round_id` | Anyone | Allocation | none |
| `process_allocation_steps` | `round_id`, `max_steps` (at least 1) | Anyone | Allocation | none |
| `attest_milestone` | `round_id`, `project_id`, `milestone_index` | DAO | Settlement | none |
| `return_remaining` | `round_id` | DAO | Settlement | none |

**JSON encoding.** `fund_round`'s `budget` is a bare JSON integer. `register_project`'s `cost` and `milestone_amounts` are decimal strings. Ids, heights, `t_min` and `max_steps` are JSON numbers.

**Return values.** `fund_round` returns the new round id and `register_project` the new project id. The two counting methods return `true` once the round has settled.

## Views

| View | Arguments | Returns |
| :-- | :-- | :-- |
| `get_round_count` | | How many rounds exist |
| `get_round` | `round_id` | `{ id, config, phase, remaining, remaining_returned, voter_namespace, project_count, ballot_count }`, or `null` |
| `get_round_phase` | `round_id` | `"Registration"`, `"Declaration"`, `"Allocation"` or `"Settlement"`, or `null` |
| `get_projects` | `round_id` | `[{ id, proposer, recipient, title, summary, cost, milestones: [{ amount, attested }], status }]` |
| `get_project` | `round_id`, `project_id` | One project, or `null` |
| `get_project_support` | `round_id`, `project_id` | How many ballots approved it |
| `get_ballot` | `round_id`, `voter` | `{ voter, approved[] }`, or `null` |
| `get_first_seen` | `account_id` | The registration block, or `null` |
| `get_allocation_result` | `round_id` | `{ budget, funded: [{ project, stage, amount }], unfunded[], remaining }` once settled, otherwise `null` |
| `get_remaining` | `round_id` | The round's unallocated budget |

A project's `status` is `"Pending"` until the count finishes, then `"Funded"` or `"Unfunded"`. A funding `stage` is `"Mes"` (equal shares) or `"Completion"`.

**Note**

Views return amounts as bare JSON numbers, which ordinary `JSON.parse` rounds. Use the [SDK](../building/sdk.md) or a parser that keeps large integers exact.

## Events

Each event is one log line: the name, then `key=value` pairs.

| Event | Fields |
| :-- | :-- |
| `RoundFunded` | `round_id budget opens_at closes_at voter_namespace` (`none` for open rounds) |
| `ProjectRegistered` | `round_id project_id cost milestones` |
| `DeclarationOpened` | `round_id` |
| `BallotSubmitted` | `round_id voter approved_count` |
| `DeclarationClosed` | `round_id n` (the number of ballots) |
| `ProjectFunded` | `round_id project_id stage amount` |
| `ProjectUnfunded` | `round_id project_id` |
| `AllocationFinalized` | `round_id total_funded remaining` |
| `MilestoneAttested` | `round_id project_id milestone_index` |
| `MilestoneReleaseFailed` | `round_id project_id milestone_index reason` |
| `RemainingReturned` | `round_id amount` |
| `RemainingReturnFailed` | `round_id reason` |

## Errors

| Code | Meaning |
| :-- | :-- |
| `ERR_NOT_SPUTNIK_DAO` | A DAO operation called by another account |
| `ERR_DEPOSIT_MISMATCH` | `fund_round`'s deposit isn't exactly the budget |
| `ERR_INVALID_CONFIG` | `closes_at` isn't after `opens_at` |
| `ERR_ROUND_NOT_FOUND` | No round with that id |
| `ERR_WRONG_PHASE` | The round isn't in the stage the call needs |
| `ERR_NO_DEPOSIT` | `register_project` without a deposit |
| `ERR_ZERO_COST` | A project cost of zero |
| `ERR_TITLE_TOO_LONG` | Title over 200 bytes |
| `ERR_SUMMARY_TOO_LONG` | Summary over 2,000 bytes |
| `ERR_TOO_MANY_PROJECTS` | The round already has 50 projects |
| `ERR_MILESTONE_SUM_MISMATCH` | Milestones don't add up to the cost |
| `ERR_ARITHMETIC_OVERFLOW` | Milestone amounts overflow when added |
| `ERR_NO_PROJECTS` | Starting voting with no projects |
| `ERR_DECLARATION_CLOSED` | Voting after `closes_at` |
| `ERR_DECLARATION_NOT_YET_CLOSED` | Ending voting before `closes_at` has passed |
| `ERR_NOT_IN_VOTER_NAMESPACE` | A members-only round, and the voter isn't a direct sub-account of its name |
| `ERR_ALREADY_VOTED` | A second ballot from the same account |
| `ERR_EMPTY_APPROVAL` | A ballot approving nothing |
| `ERR_UNREGISTERED_PROJECT` | A ballot naming a project that isn't in the round |
| `ERR_NO_PRIOR_INTERACTION` | The voter registered at or after `opens_at`, or never |
| `ERR_ACCOUNT_TOO_NEW` | The voter registered less than `t_min` blocks before `opens_at` |
| `ERR_INVALID_STEP_COUNT` | `max_steps` of zero |
| `ERR_PROJECT_NOT_FOUND` | No project with that id in the round |
| `ERR_PROJECT_NOT_FUNDED` | Paying a milestone of an unfunded project |
| `ERR_INVALID_MILESTONE_INDEX` | No milestone at that index |
| `ERR_ALREADY_ATTESTED` | The milestone has already been paid |
| `ERR_ALREADY_RETURNED` | The round's leftover has already been returned |
| `ERR_NOTHING_TO_RETURN` | The round has no leftover |
| `ERR_INSUFFICIENT_BALANCE` | The contract's free balance can't cover the return |
| `ERR_RATIONAL_OVERFLOW` | The count's arithmetic overflowed; this build can't count the round |
| `ERR_ALLOCATION_INVARIANT_VIOLATED` | An internal consistency check failed |
