import { ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { STAGE_LABEL } from "../../lib/roundData";
import type { AllocationResult, Project } from "../../types/domain";
import { Amount } from "../app/Amount";
import { Container } from "../app/Container";
import { ProjectStatusPill } from "../app/StatusPill";

export function ResultsSection({ roundId, projects, result }: { roundId: string; projects: Project[]; result: AllocationResult | null | undefined }) {
  const navigate = useNavigate();
  const fundedIds = result ? result.funded.map((f) => f.project) : projects.filter((p) => p.status === "Funded").map((p) => p.id);
  const funded = fundedIds.map((id) => projects.find((p) => p.id === id)).filter((p): p is Project => !!p);
  const unfunded = projects.filter((p) => !fundedIds.includes(p.id));

  return (
    <Container title="Results" headerAction={<span className="muted" style={{ fontSize: "var(--app-small)" }}>{funded.length} of {projects.length} funded</span>}>
      <table className="dtable">
        <thead>
          <tr>
            <th scope="col">Project</th>
            <th scope="col" className="dtable__num">
              Funded
            </th>
            <th scope="col" className="dtable__num">
              Paid out
            </th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="visually-hidden">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {[...funded, ...unfunded].map((project) => {
            const record = result?.funded.find((f) => f.project === project.id);
            const paid = project.milestones.filter((m) => m.attested).length;
            const to = `/rounds/${roundId}/projects/${project.id}`;
            const isFunded = fundedIds.includes(project.id);
            return (
              <tr key={project.id} className={`dtable__row--link${isFunded ? "" : " dtable__row--muted"}`} onClick={() => navigate(to)}>
                <td className="dtable__cell--lead">
                  <Link to={to} className="dtable__primary" onClick={(e) => e.stopPropagation()}>
                    {project.title}
                  </Link>
                  <span className="dtable__secondary">
                    {record ? (
                      `via ${STAGE_LABEL[record.stage]}`
                    ) : isFunded ? (
                      "Funded"
                    ) : (
                      <>
                        Asked for <Amount yocto={project.cost} />
                      </>
                    )}
                  </span>
                </td>
                <td className="dtable__num" data-label="Funded">
                  {isFunded ? <Amount yocto={record?.amount ?? project.cost} /> : "–"}
                </td>
                <td className="dtable__num" data-label="Paid out">
                  {isFunded ? `${paid} of ${project.milestones.length}` : "–"}
                </td>
                <td className="dtable__cell--plain">
                  <ProjectStatusPill status={project.status} />
                </td>
                <td className="dtable__chevron" aria-hidden>
                  <ChevronRight />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Container>
  );
}
