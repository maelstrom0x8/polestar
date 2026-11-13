# Issue members for members-only rounds

_Using your community's NEAR name to decide who can vote_

A members-only round accepts votes only from accounts directly under a NEAR name, such as `ana.meridian.near` under `meridian.near`. Polestar stores the name and checks it on every ballot. Who counts as a member is decided entirely by whoever controls the name, because on NEAR only that key holder can create accounts directly under it.

That makes membership something your community can build however it likes: vouching, contribution history, an interview, a badge in another system. Polestar doesn't need to know which.

## Create a member account

The member generates their own key pair and sends you only the public key, so they alone control the account. You create the account under your name with that key:

```bash
near create-account ana.meridian.testnet \
  --masterAccount meridian.testnet \
  --publicKey ed25519:<the member's public key> \
  --initialBalance 0.1
```

The new account needs a little NEAR to pay its own network fees. From an app, the same thing with near-api-js:

```ts
await meridian.createSubAccount({
  accountOrPrefix: "ana.meridian.testnet",
  publicKey: memberPublicKey,
  nearToTransfer: parseNear("0.1")!,
});
```

The member then registers as a voter once, as any voter does, and can vote in every members-only round funded under your name after that.

## Fund a members-only round

In the app, choose **Members of a named account** under **Who can vote** and enter your name. With the SDK:

```ts
await writer.governance.proposeFundRound(
  { budget: parseNear("5")!, opensAt, closesAt, voterNamespace: "meridian.testnet" },
  { description: "November infrastructure round" },
);
```

The name is fixed when the round is funded, inside the same proposal the council approves.

## Things to design for

- **Membership is permanent.** You can't delete an account you created for someone else, because its key is theirs. To refresh membership, issue a new name for each season (`2026.meridian.near`) and fund rounds under that.
- **Only direct sub-accounts count.** `ops.ana.meridian.near` can't vote, so a member can't mint extra votes under their own account.
- **The name's owner can create as many accounts as it likes.** Protect the key that controls your name the way you'd protect any treasury key, and make your issuing process public so members can check it.

## Next steps

- [Eligibility](../internals/eligibility.md): The exact checks every ballot goes through
