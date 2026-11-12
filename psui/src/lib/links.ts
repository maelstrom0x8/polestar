const REPO = "https://github.com/maelstrom0x8/polestar";
const DOCS = `${REPO}/blob/main/docs`;

export const LINKS = {
  repo: REPO,
  license: `${REPO}/blob/main/LICENSE`,
  docs: `${REPO}/tree/main/docs`,
  splitDocs: `${DOCS}/using/how-the-split-works.md`,
  deployDocs: `${DOCS}/getting-started/deploy-your-own.md`,
  contractReference: `${DOCS}/resources/contract-reference.md`,
  sdkDocs: `${REPO}/tree/main/packages/sdk`,
  sdkNpm: "https://www.npmjs.com/package/@ezeonlabs/polestar",
  near: "https://near.org",
  sputnik: "https://github.com/near-daos/sputnik-dao-contract",
  equalShares: "https://equalshares.net",
} as const;
