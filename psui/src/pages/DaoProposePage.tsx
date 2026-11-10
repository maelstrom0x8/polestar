import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Callout } from "../components/app/Callout";
import { Container } from "../components/app/Container";
import { FieldShell, TextField } from "../components/app/Form";
import { PageHeader } from "../components/app/PageHeader";
import { PayloadBlock } from "../components/app/PayloadBlock";
import { Tabs } from "../components/app/Tabs";
import { blockDistance, formatBlock, useChainClock, type ChainClock } from "../lib/chainClock";
import { useAllRounds, useProjects } from "../lib/contractQueries";
import { formatNear, parseNear } from "../lib/format";
import { CONTRACT_ID, DAO_ID, viewFunction } from "../lib/near";
import { TGAS, contractJson } from "../lib/tx";

type Mode = "fund" | "milestone";

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

/** SputnikDAO add_proposal arguments for one FunctionCall to this contract. */
function proposalArgs(description: string, method: string, args: Record<string, unknown>, deposit: bigint, gas: bigint) {
  return {
    proposal: {
      description,
      kind: {
        FunctionCall: {
          receiver_id: CONTRACT_ID,
          actions: [
            {
              method_name: method,
              args: toBase64(contractJson(args)),
              deposit: deposit.toString(),
              gas: gas.toString(),
            },
          ],
        },
      },
    },
  };
}

function useProposalBond() {
  return useQuery({
    queryKey: ["daoPolicy", DAO_ID],
    queryFn: async () => {
      const policy = await viewFunction<{ proposal_bond: string | number }>("get_policy", {}, DAO_ID);
      return String(policy.proposal_bond);
    },
    staleTime: 5 * 60_000,
  });
}

function blocksPer(ms: number, clock: ChainClock | undefined): number | null {
  return clock?.msPerBlock ? Math.round(ms / clock.msPerBlock) : null;
}

const DAY = 86_400_000;

function estimate(height: number | null, clock: ChainClock | undefined): string | undefined {
  if (height === null) return undefined;
  const distance = blockDistance(height, clock);
  if (!distance) return undefined;
  if (distance === "about now") return "About now";
  return distance.endsWith("ago") ? distance : `${distance} from now`;
}

function parseBlock(text: string): number | null {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
}

function ProposalOutput({ value, decoded, deposit }: { value: unknown; decoded: string; deposit: bigint }) {
  const bond = useProposalBond();
  return (
    <Container title="Your proposal">
      <div className="container__body stack">
        <p style={{ fontSize: "var(--app-small)", color: "var(--text-secondary)" }}>
          Submit this as <span className="mono">add_proposal</span> on <span className="mono">{DAO_ID}</span>, attaching
          the DAO's proposal bond
          {bond.data ? ` (${formatNear(bond.data)}, from its current policy)` : ""}. Once the DAO's members approve it,
          the DAO makes this call itself{deposit > 0n ? `, sending ${formatNear(deposit, true)} from its treasury` : ""}.
        </p>
        <PayloadBlock value={value} label="add_proposal arguments" />
        <details className="tx__sign">
          <summary>Decoded call arguments</summary>
          <PayloadBlock value={decoded} label="Decoded call arguments" />
        </details>
      </div>
    </Container>
  );
}

function FundRoundForm() {
  const { data: clock } = useChainClock();
  const day = blocksPer(DAY, clock);
  const defaults = useMemo(() => {
    if (!clock || !day) return { opens: "", closes: "", tMin: "" };
    const opens = clock.height + day;
    return { opens: String(opens), closes: String(opens + 3 * day), tMin: String(day) };
  }, [clock, day]);

  const [budget, setBudget] = useState("");
  const [opens, setOpens] = useState<string | null>(null);
  const [closes, setCloses] = useState<string | null>(null);
  const [tMin, setTMin] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);

  const opensText = opens ?? defaults.opens;
  const closesText = closes ?? defaults.closes;
  const tMinText = tMin ?? defaults.tMin;
  const budgetYocto = parseNear(budget);
  const opensAt = parseBlock(opensText);
  const closesAt = parseBlock(closesText);
  const tMinBlocks = parseBlock(tMinText);

  const errors = {
    budget: budget && (budgetYocto === null || budgetYocto === 0n) ? "Enter an amount above zero." : null,
    closes: opensAt !== null && closesAt !== null && closesAt <= opensAt ? "Must be after the opening block." : null,
  };
  const ready =
    budgetYocto !== null && budgetYocto > 0n && opensAt !== null && closesAt !== null && tMinBlocks !== null && closesAt > opensAt;
  const desc = description ?? (budgetYocto ? `Fund a Polestar round with a ${formatNear(budgetYocto, true)} budget` : "Fund a Polestar round");

  const args = ready ? { config: { budget: budgetYocto, opens_at: opensAt, closes_at: closesAt, t_min: tMinBlocks } } : null;
  const deadline = opensAt !== null && tMinBlocks !== null ? opensAt - tMinBlocks : null;

  return (
    <>
      <Container>
        <div className="container__body form">
          <TextField
            label="Budget"
            value={budget}
            inputMode="decimal"
            suffix="NEAR"
            placeholder="0.00"
            onChange={(e) => setBudget(e.target.value)}
            hint="Sent from the DAO's treasury with the call. The contract checks the two match exactly."
            error={errors.budget}
          />
          <TextField
            label="Voting opens at block"
            value={opensText}
            inputMode="numeric"
            onChange={(e) => setOpens(e.target.value)}
            hint={estimate(opensAt, clock) ?? "Block height"}
          />
          <TextField
            label="Voting closes after block"
            value={closesText}
            inputMode="numeric"
            onChange={(e) => setCloses(e.target.value)}
            hint={estimate(closesAt, clock) ?? "Block height"}
            error={errors.closes}
          />
          <TextField
            label="Minimum account age, in blocks"
            value={tMinText}
            inputMode="numeric"
            onChange={(e) => setTMin(e.target.value)}
            hint={
              deadline !== null
                ? `Voters must register by block ${formatBlock(deadline)}${estimate(deadline, clock) ? ` (${estimate(deadline, clock)})` : ""}.`
                : "How long before voting opens a voter must already be registered."
            }
          />
          <TextField label="Proposal description" value={desc} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </Container>
      {args ? (
        <ProposalOutput
          value={proposalArgs(desc, "fund_round", args, budgetYocto as bigint, 100n * TGAS)}
          decoded={contractJson(args, 2)}
          deposit={budgetYocto as bigint}
        />
      ) : (
        <Callout tone="info">Fill in the budget and the voting window to get the proposal.</Callout>
      )}
    </>
  );
}

function MilestoneForm({ initialRound }: { initialRound: string | null }) {
  const { rounds } = useAllRounds();
  const settled = rounds.filter((r) => r.phase === "Settlement").sort((a, b) => Number(b.id) - Number(a.id));
  const [roundId, setRoundId] = useState<string | null>(initialRound);
  const chosenRound = roundId ?? settled[0]?.id ?? null;
  const projectsQuery = useProjects(chosenRound ?? undefined);
  const funded = (projectsQuery.data ?? []).filter((p) => p.status === "Funded");
  const [projectId, setProjectId] = useState<string | null>(null);
  const hasUnpaid = (p: (typeof funded)[number]) => p.milestones.some((m) => !m.attested);
  const project = funded.find((p) => p.id === projectId) ?? funded.find(hasUnpaid) ?? funded[0];
  const open = project ? project.milestones.map((m, i) => ({ ...m, index: i })).filter((m) => !m.attested) : [];
  const [milestone, setMilestone] = useState<number | null>(null);
  const chosen = open.find((m) => m.index === milestone) ?? open[0];
  const [description, setDescription] = useState<string | null>(null);

  if (settled.length === 0) {
    return <Callout tone="info">No round has settled yet, so there are no milestones to confirm.</Callout>;
  }

  const args =
    chosenRound !== null && project && chosen
      ? { round_id: Number(chosenRound), project_id: Number(project.id), milestone_index: chosen.index }
      : null;
  const desc =
    description ??
    (project && chosen
      ? `Confirm milestone ${chosen.index + 1} of "${project.title}" (Round ${chosenRound}) and pay ${formatNear(chosen.amount, true)}`
      : "");

  return (
    <>
      <Container>
        <div className="container__body form">
          <FieldShell label="Round">
            {({ inputId }) => (
              <div className="form-input">
                <select id={inputId} value={chosenRound ?? ""} onChange={(e) => { setRoundId(e.target.value); setProjectId(null); setMilestone(null); }}>
                  {settled.map((r) => (
                    <option key={r.id} value={r.id}>
                      Round {r.id}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </FieldShell>
          {funded.length === 0 ? (
            <Callout tone="info">No funded projects in this round.</Callout>
          ) : (
            <>
              <FieldShell label="Project">
                {({ inputId }) => (
                  <div className="form-input">
                    <select id={inputId} value={project?.id ?? ""} onChange={(e) => { setProjectId(e.target.value); setMilestone(null); }}>
                      {funded.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                          {hasUnpaid(p) ? "" : " (all paid)"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </FieldShell>
              {open.length === 0 ? (
                <Callout tone="info">Every milestone of this project has already been paid.</Callout>
              ) : (
                <FieldShell label="Milestone" hint="Only milestones that haven't been paid yet are listed.">
                  {({ inputId, describedBy }) => (
                    <div className="form-input">
                      <select id={inputId} aria-describedby={describedBy} value={chosen?.index ?? ""} onChange={(e) => setMilestone(Number(e.target.value))}>
                        {open.map((m) => (
                          <option key={m.index} value={m.index}>
                            Milestone {m.index + 1} · {formatNear(m.amount, true)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </FieldShell>
              )}
              {args && <TextField label="Proposal description" value={desc} onChange={(e) => setDescription(e.target.value)} />}
            </>
          )}
        </div>
      </Container>
      {args && (
        <ProposalOutput value={proposalArgs(desc, "attest_milestone", args, 0n, 150n * TGAS)} decoded={contractJson(args, 2)} deposit={0n} />
      )}
    </>
  );
}

export function DaoProposePage() {
  const [params] = useSearchParams();
  const roundParam = params.get("round");
  const { rounds } = useAllRounds();
  const settledParam = rounds.find((r) => r.id === roundParam && r.phase === "Settlement");
  const [chosen, setChosen] = useState<Mode | null>(null);
  const mode: Mode = chosen ?? (settledParam ? "milestone" : "fund");

  return (
    <div className="page">
      <PageHeader title="DAO proposal helper" subtitle="Ready-to-submit proposals for your SputnikDAO" />
      <div className="narrow stack">
        <Callout tone="info">
          Polestar only accepts these two calls from its DAO, so they go through the DAO's own vote. This page builds the
          proposal; it doesn't send anything.
        </Callout>
        <Container
          toolbar={
            <Tabs
              label="Proposal type"
              value={mode}
              onChange={setChosen}
              items={[
                { id: "fund", label: "Fund a round" },
                { id: "milestone", label: "Confirm a milestone" },
              ]}
            />
          }
        >
          <div className="container__note" style={{ borderTop: 0 }}>
            {mode === "fund"
              ? "Creates a new round and moves its budget from the treasury into the contract."
              : "Confirms a funded project finished a milestone, which pays that milestone to the project."}
          </div>
        </Container>
        {mode === "fund" ? <FundRoundForm /> : <MilestoneForm initialRound={settledParam ? settledParam.id : null} />}
      </div>
    </div>
  );
}
