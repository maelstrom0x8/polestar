import { Link, useParams } from "react-router-dom";
import { ROUNDS } from "../data/mock";
import { PhaseBadge } from "../components/rounds/PhaseBadge";
import { ProjectList } from "../components/projects/ProjectList";
import { BallotForm } from "../components/forms/BallotForm";
import { RegisterProjectForm } from "../components/forms/RegisterProjectForm";
import { formatNear } from "../lib/format";

export function RoundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const round = ROUNDS.find((r) => r.id === id);

  if (!round) {
    return (
      <div className="page">
        <p style={{ marginBottom: 20 }}>Round not found.</p>
        <Link to="/" className="btn btn-secondary">
          Back to rounds
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/" className="label" style={{ display: "inline-block", marginBottom: 24 }}>
        &larr; All rounds
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <h1 className="h1">Round {round.id}</h1>
        <PhaseBadge phase={round.phase} />
      </div>
      <p className="project-row__summary" style={{ marginBottom: 32 }}>
        {formatNear(round.budget)} budget &middot; {formatNear(round.remaining)} remaining &middot;{" "}
        {round.ballotCount} ballots cast
      </p>

      <section style={{ marginBottom: 40 }}>
        <span className="label">Projects</span>
        <ProjectList projects={round.projects} />
      </section>

      {round.phase === "Declaration" && (
        <section style={{ marginBottom: 40 }}>
          <BallotForm
            projects={round.projects}
            onSubmit={(approved) => console.log("submit_ballot (stub):", approved)}
          />
        </section>
      )}

      {round.phase === "Registration" && (
        <section>
          <RegisterProjectForm
            onSubmit={(draft) => console.log("register_project (stub):", draft)}
          />
        </section>
      )}
    </div>
  );
}
