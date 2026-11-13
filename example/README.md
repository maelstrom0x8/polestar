# Walkthrough: the interactive demo

The [demo](../README.md#live) is a separate build of the app with sample
data instead of a real contract, and a role switcher in place of a wallet.
Pick any role at sign-in, try every flow, no wallet or sign-up needed.
Nothing here touches testnet or mainnet. Each visit starts from the same
sample rounds, and nothing you do persists past the tab.

## Pick a role

| Role | Who they are | Try |
| --- | --- | --- |
| **The council** | Funds rounds, approves milestone payments | Proposals → Fund a round |
| **Priya** | A member, proposes projects | Round 4 → Propose a project |
| **Lena** | A member, votes | Round 3 → vote for a project |
| **Jordan** | Not a member of the co-op | Round 3 → see what happens when you try to vote |

## A walkthrough

1. **Sign in as the council.** Open **Proposals** and **Fund a round**: set
   a budget, the registration and voting windows, and (optionally) a NEAR
   name that voters must sit under. Submit and approve it: one account
   playing both proposer and the whole council, so it's approved
   immediately.
2. **Sign out, sign in as Priya.** Open **Round 4**, still taking
   proposals, and **Propose a project** with a cost and milestones.
3. **Sign out, sign in as Lena.** Open **Round 3**, open for voting, and
   cast a ballot. The round's vote count updates, and `/account` now
   lists it under rounds you voted in.
4. **Sign out, sign in as Jordan.** Open **Round 3** again. Jordan hasn't
   interacted with the co-op before, so voting is closed to them, the
   same message a genuine non-member would see.
5. **Look at Round 1**, already settled, to see a full result: which
   projects were funded, which weren't, and why: the worked example
   behind [how the split works](../docs/using/how-the-split-works.md).

## Running it yourself

```bash
cd psui
VITE_DEMO_MODE=true npm run dev
```
