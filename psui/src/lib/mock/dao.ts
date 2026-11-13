import { DAO_ID } from "../near";
import type { DaoPolicy, DaoProposal } from "../dao";
import { COUNCIL_ACCOUNT, MOCK_ACCOUNT } from "./fixtures";

// Demo mode seeds a council distinct from any member, so the role switcher
// shows the real boundary; plain mock mode keeps the single sample account
// as its own council, unchanged.
const COUNCIL_GROUP = __DEMO_MODE__ ? [COUNCIL_ACCOUNT] : [MOCK_ACCOUNT];

/** A one-member council (the sample account), anyone may submit: the live DAO's shape. */
export const daoStore: { policy: DaoPolicy; proposals: DaoProposal[] } = {
  policy: {
    roles: [
      { name: "all", kind: "Everyone", permissions: ["*:AddProposal"] },
      { name: "council", kind: { Group: COUNCIL_GROUP }, permissions: ["*:VoteApprove", "*:VoteReject", "*:AddProposal", "*:Finalize"] },
    ],
    proposal_bond: "1000000000000000000000000",
  },
  proposals: [],
};

export function daoView(method: string, args: Record<string, unknown>): unknown {
  switch (method) {
    case "get_policy":
      return daoStore.policy;
    case "get_last_proposal_id":
      return daoStore.proposals.length;
    case "get_proposals": {
      const from = Number(args.from_index ?? 0);
      return daoStore.proposals.slice(from, from + Number(args.limit ?? 50));
    }
    case "get_proposal":
      return daoStore.proposals.find((p) => p.id === Number(args.id)) ?? null;
    default:
      throw new Error(`mock DAO: no view named ${method}`);
  }
}

export { DAO_ID };
