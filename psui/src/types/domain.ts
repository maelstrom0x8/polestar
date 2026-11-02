export type RoundPhase = "Registration" | "Declaration" | "Allocation" | "Settlement";

export interface Milestone {
  amount: string;
  attested: boolean;
}

export type ProjectStatus = "Pending" | "Funded" | "Unfunded";

export interface Project {
  id: string;
  proposer: string;
  recipient: string;
  title: string;
  summary: string;
  cost: string;
  milestones: Milestone[];
  status: ProjectStatus;
  supporterCount: number;
}

export interface Round {
  id: string;
  phase: RoundPhase;
  budget: string;
  remaining: string;
  ballotCount: number;
  projects: Project[];
}
