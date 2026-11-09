import { Check, Info, X } from "lucide-react";
import type { StepLogEntry } from "../../lib/roundData";
import type { Project } from "../../types/domain";
import { Container } from "../app/Container";
import { ProjectsTable } from "./ProjectsTable";

export function AllocationLog({ roundId, projects, log }: { roundId: string; projects: Project[]; log: StepLogEntry[] }) {
  const funded = projects.filter((p) => p.status === "Funded").length;
  return (
    <>
      <Container title="Allocation">
        <div className="container__body">
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--app-small)" }}>
            {funded === 0
              ? "No project has been funded yet."
              : `${funded} of ${projects.length} projects funded so far.`}{" "}
            The order of earlier steps isn't recorded on chain; steps taken from this page are listed as they happen.
          </p>
          {log.length > 0 && (
            <ol className="step-log" aria-label="Steps taken from this page">
              {log.map((entry) => (
                <li key={entry.key} className={`step-log__item step-log__item--${entry.tone}`}>
                  {entry.tone === "funded" ? <Check aria-hidden /> : entry.tone === "unfunded" ? <X aria-hidden /> : <Info aria-hidden />}
                  {entry.text}
                </li>
              ))}
            </ol>
          )}
        </div>
      </Container>
      <Container title="Projects">
        <ProjectsTable roundId={roundId} projects={projects} />
      </Container>
    </>
  );
}
