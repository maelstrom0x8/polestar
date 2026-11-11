# Setting up Polestar

_What you need, and the order to do it in_

Polestar is one contract tied to one SputnikDAO, plus a web app that talks to it. You can use the public deployment straight away, or deploy your own for your DAO.

**Note**

If you've been invited to vote or propose in an existing round, you don't need to set anything up. Open the app, sign in, and go to [Meet Polestar](../using/index.md).

## Before you begin

### Choose a setup

| Setup | Description | What you need |
| :-- | :-- | :-- |
| **The public deployment** | The app reads the existing contract and DAO. Quickest way to see Polestar. | Node.js 20.12 or later |
| **Your own deployment** | A Polestar contract tied to your DAO, with your council and your treasury. | Node.js, Rust with cargo-near, the NEAR CLI, and a NEAR account to deploy from |

### Get a NEAR wallet

Signing in needs a NEAR wallet: Meteor, Intear, the NEAR CLI, Ledger, or an Ethereum wallet. Reading rounds and results needs no wallet at all.

## Quickstart

### Run the app

Clone the repository and start the web app. → [Run the app](run-the-app.md)

### Deploy your own

Create or reuse a SputnikDAO, build and deploy the contract, and point the app at it. → [Deploy your own](deploy-your-own.md)

### Run a first round

Fund a round, propose, vote, count and pay a milestone, end to end. → [Run a first round](run-a-first-round.md)

## Next steps

- [Run the app](run-the-app.md) — Start the web app against the public deployment
