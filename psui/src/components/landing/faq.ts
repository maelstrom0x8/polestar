import { LINKS } from "../../lib/links";

export interface FaqLink {
  label: string;
  to?: string;
  href?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string[];
  link?: FaqLink;
}

export interface FaqGroup {
  id: string;
  title: string;
  items: FaqItem[];
}

export const FAQ: FaqGroup[] = [
  {
    id: "basics",
    title: "Basics",
    items: [
      {
        id: "what-is-polestar",
        question: "What is Polestar?",
        answer: [
          "Polestar runs funding rounds for a DAO's shared treasury. The DAO sets a budget, anyone can propose a project, and the community votes for the projects it supports.",
          "The budget is then split between projects with the Method of Equal Shares, and funded teams are paid milestone by milestone, each payment approved by the DAO.",
        ],
        link: { label: "Read about the approach", to: "/about" },
      },
      {
        id: "who-is-it-for",
        question: "Who is it for?",
        answer: [
          "Communities that share a treasury on NEAR and want their members, not only a council, to direct grants: guilds, ecosystems, co-ops and local groups.",
          "Builders use it to ask for funding. DAO councils use it to fund rounds and release payments.",
        ],
      },
      {
        id: "what-does-it-cost",
        question: "What does it cost to take part?",
        answer: [
          "Registering as a voter and voting cost only the network fee. Proposing a project takes a small deposit, 0.05 NEAR by default, which the contract keeps.",
          "Council actions are ordinary DAO proposals, so they carry your DAO's usual proposal bond.",
        ],
      },
    ],
  },
  {
    id: "voting",
    title: "Voting",
    items: [
      {
        id: "who-can-vote",
        question: "Who can vote in a round?",
        answer: [
          "In an open round, any NEAR account registered before the round's registration cutoff.",
          "In a members-only round, only accounts directly under the community's NEAR name, such as ana.guild.near in a guild.near round. Whoever controls the name decides who gets one.",
        ],
        link: { label: "Voting, step by step", href: `${LINKS.docs}/using/vote.md` },
      },
      {
        id: "how-do-i-vote",
        question: "How do I vote?",
        answer: [
          "Register as a voter before the cutoff. It's one step, and it covers every round funded after it.",
          "When voting opens, tick every project you'd want funded and confirm in your wallet. There's no ranking, and you can approve as many projects as you like.",
        ],
      },
      {
        id: "can-i-change-my-vote",
        question: "Can I change my vote?",
        answer: ["No. A ballot is final once it's cast, so the app shows a summary to review before you confirm."],
      },
      {
        id: "are-votes-private",
        question: "Are votes private?",
        answer: [
          "No. Ballots, projects and results are stored on the NEAR blockchain, and anyone can read them. That's also what lets anyone recompute the count.",
        ],
      },
    ],
  },
  {
    id: "counting",
    title: "Counting",
    items: [
      {
        id: "how-is-the-budget-split",
        question: "How is the budget split?",
        answer: [
          "With the Method of Equal Shares. The budget is divided equally among everyone who voted. A project is funded when its supporters can cover its cost together from their shares, cheapest per supporter first.",
          "When no remaining project can be covered that way, the leftover goes to the projects with the most supporters per NEAR that still fit.",
        ],
        link: { label: "See a worked example", to: "/about#equal-shares" },
      },
      {
        id: "why-not-the-most-popular",
        question: "Why wasn't the most popular project funded?",
        answer: [
          "Because winning the most votes isn't the test. A project needs enough supporters to cover its cost from their shares.",
          "A large group that spends its shares on one project can't also pay for its next one, so a smaller group's project can be funded instead. That's how each group of voters gets a part of the budget in line with its size.",
        ],
      },
      {
        id: "leftover-budget",
        question: "What happens to leftover budget?",
        answer: [
          "Budget the count didn't allocate stays in the round until the DAO votes to return it to the treasury. Money allocated to funded projects can't be taken back.",
        ],
      },
    ],
  },
  {
    id: "payments",
    title: "Payments",
    items: [
      {
        id: "how-are-teams-paid",
        question: "How do funded teams get paid?",
        answer: [
          "Each project's cost is split into milestones when it's proposed. When a milestone is delivered, a payment proposal goes to the DAO, and once the council approves it the amount goes straight to the project's recipient.",
          "Each milestone is paid once, in any order.",
        ],
      },
      {
        id: "payment-fails",
        question: "What if a payment fails?",
        answer: ["The milestone is marked unpaid again and its money stays in the round. A new proposal can retry it."],
      },
      {
        id: "milestone-never-approved",
        question: "What if a milestone is never approved?",
        answer: [
          "Its money stays in the contract. Nobody can redirect it to another project or recipient, and there's no deadline after which it returns to the treasury.",
        ],
      },
    ],
  },
  {
    id: "daos",
    title: "For DAOs",
    items: [
      {
        id: "change-our-dao",
        question: "Do we have to change our SputnikDAO?",
        answer: [
          "No. Polestar works with an existing SputnikDAO exactly as it is. Funding a round and paying a milestone are ordinary function-call proposals, voted under your DAO's own policy.",
        ],
        link: { label: "The proposals Polestar uses", href: `${LINKS.docs}/building/sputnikdao-proposals.md` },
      },
      {
        id: "can-polestar-move-our-treasury",
        question: "Can Polestar move our treasury on its own?",
        answer: [
          "No. Your treasury stays in your DAO. A round's budget reaches Polestar only when your DAO votes to fund the round, and each payment leaves only when your DAO votes that a milestone is done.",
          "Polestar never calls into your DAO.",
        ],
      },
      {
        id: "parallel-rounds",
        question: "Can rounds run at the same time?",
        answer: ["Yes. Each round is independent, so one can be paying milestones while the next is taking proposals."],
      },
    ],
  },
  {
    id: "developers",
    title: "Developers",
    items: [
      {
        id: "is-there-an-sdk",
        question: "Is there an SDK?",
        answer: [
          "Yes: @ezeonlabs/polestar on npm. It reads rounds and results without a wallet, sends every Polestar transaction with exact amounts, and prepares the SputnikDAO proposals a council approves. It has no runtime dependencies.",
        ],
        link: { label: "SDK documentation", href: LINKS.sdkDocs },
      },
      {
        id: "deploy-our-own",
        question: "Can we deploy our own?",
        answer: [
          "Yes. Create or reuse a SputnikDAO, deploy the contract with your DAO's account, and point the web app at it.",
        ],
        link: { label: "Deploy your own", href: LINKS.deployDocs },
      },
    ],
  },
  {
    id: "trust",
    title: "Trust",
    items: [
      {
        id: "fake-accounts",
        question: "Does Polestar stop fake accounts?",
        answer: [
          "Not on its own, and it doesn't claim to. Equal Shares is proportional to whoever votes, so who may vote matters.",
          "Members-only rounds hand that decision to whoever controls your community's NEAR name, who can issue accounts only to people they've vouched for.",
        ],
      },
      {
        id: "open-source",
        question: "Is the code open source?",
        answer: [
          "Yes, under the Apache-2.0 license. The contract, the counting engine, the SDK and this app are on GitHub, with the tests that check the counting against an independent reference.",
        ],
        link: { label: "View on GitHub", href: LINKS.repo },
      },
    ],
  },
];

const TEASER_IDS = ["how-is-the-budget-split", "why-not-the-most-popular", "can-polestar-move-our-treasury", "who-can-vote"];

export const FAQ_TEASER: FaqItem[] = TEASER_IDS.map((id) => {
  const found = FAQ.flatMap((group) => group.items).find((item) => item.id === id);
  if (!found) throw new Error(`FAQ item ${id} is missing`);
  return found;
});
