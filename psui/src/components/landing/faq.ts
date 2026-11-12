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
          "Funding rounds for a DAO's treasury. The community backs projects, the budget is split fairly between groups of voters, and teams are paid milestone by milestone as the DAO approves their work.",
        ],
        link: { label: "Read about the approach", to: "/about" },
      },
      {
        id: "who-is-it-for",
        question: "Who is it for?",
        answer: [
          "Any community with a shared treasury on NEAR that wants its members, not only a council, to direct grants. Builders use it to get funded; councils use it to fund rounds and release payments.",
        ],
      },
      {
        id: "what-does-it-cost",
        question: "What does it cost to take part?",
        answer: [
          "Registering and voting cost only the network fee. Proposing a project takes a 0.05 NEAR deposit by default. Council actions are ordinary DAO proposals with your DAO's usual bond.",
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
          "Open rounds: any NEAR account registered before the cutoff. Members-only rounds: only accounts under the community's NEAR name, like ana.guild.near for guild.near.",
        ],
        link: { label: "Voting, step by step", href: `${LINKS.docs}/using/vote.md` },
      },
      {
        id: "how-do-i-vote",
        question: "How do I vote?",
        answer: [
          "Register once before the cutoff; it covers every round funded after that. When voting opens, tick every project you'd fund and confirm in your wallet. No ranking, no limit.",
        ],
      },
      {
        id: "can-i-change-my-vote",
        question: "Can I change my vote?",
        answer: ["No. Ballots are final, so the app shows a summary before you confirm."],
      },
      {
        id: "are-votes-private",
        question: "Are votes private?",
        answer: ["No. Ballots and results are public on NEAR, which is what lets anyone check the count."],
      },
    ],
  },
  {
    id: "counting",
    title: "Counting",
    items: [
      {
        id: "how-is-the-budget-split",
        question: "Why wasn't the most-voted project funded?",
        answer: [
          "Every voter gets an equal share of the budget, and a project is funded when its supporters can cover its cost together. A big group that spends its shares on one project can't also pay for the next, so a smaller group's pick can win instead.",
          "Leftover budget goes to the projects with the most backing per NEAR that still fit.",
        ],
        link: { label: "How the split works", to: "/about#equal-shares" },
      },
      {
        id: "leftover-budget",
        question: "What happens to leftover budget?",
        answer: ["It stays in the round until the DAO votes it back to the treasury. Money allocated to projects stays theirs."],
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
          "Milestone by milestone. When one is delivered, the DAO votes on it and the payment goes straight to the team. Each milestone is paid once, in any order.",
        ],
      },
      {
        id: "payment-fails",
        question: "What if a payment fails?",
        answer: ["The milestone goes back to unpaid and its money stays put. A new proposal can retry it."],
      },
      {
        id: "milestone-never-approved",
        question: "What if a milestone is never approved?",
        answer: ["Its money stays in the contract. Nobody can redirect it, and it doesn't return to the treasury on a deadline."],
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
        answer: ["No. Polestar works with any SputnikDAO as it is. Funding and payments are ordinary proposals under your DAO's own rules."],
        link: { label: "The proposals Polestar uses", href: `${LINKS.docs}/building/sputnikdao-proposals.md` },
      },
      {
        id: "can-polestar-move-our-treasury",
        question: "Can Polestar move our treasury on its own?",
        answer: [
          "No. Money reaches a round only when your DAO votes to fund it, and leaves only when your DAO votes a milestone done. Polestar never calls into your DAO.",
        ],
      },
      {
        id: "parallel-rounds",
        question: "Can rounds run at the same time?",
        answer: ["Yes. One round can be paying milestones while the next takes proposals."],
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
          "Yes: @ezeonlabs/polestar on npm. Read rounds without a wallet, send every Polestar transaction, and prepare the DAO proposals a council approves.",
        ],
        link: { label: "SDK documentation", href: LINKS.sdkDocs },
      },
      {
        id: "deploy-our-own",
        question: "Can we deploy our own?",
        answer: ["Yes. Bring a SputnikDAO, deploy the contract for it, and point the app at it."],
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
          "Not on its own. The split is fair to whoever votes, so who may vote matters. Members-only rounds leave that to whoever controls your community's NEAR name.",
        ],
      },
      {
        id: "open-source",
        question: "Is the code open source?",
        answer: ["Yes, Apache-2.0. The contract, SDK and app are on GitHub."],
        link: { label: "View on GitHub", href: LINKS.repo },
      },
    ],
  },
];

const TEASER_IDS = ["how-is-the-budget-split", "can-polestar-move-our-treasury", "who-can-vote", "how-are-teams-paid"];

export const FAQ_TEASER: FaqItem[] = TEASER_IDS.map((id) => {
  const found = FAQ.flatMap((group) => group.items).find((item) => item.id === id);
  if (!found) throw new Error(`FAQ item ${id} is missing`);
  return found;
});
