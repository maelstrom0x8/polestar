import { ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { Project } from "../../types/domain";
import { Amount } from "../app/Amount";
import { ProjectStatusPill } from "../app/StatusPill";

interface ProjectsTableProps {
  roundId: string;
  projects: Project[];
  showStatus?: boolean;
}

export function ProjectsTable({ roundId, projects, showStatus = true }: ProjectsTableProps) {
  const navigate = useNavigate();
  return (
    <table className="dtable">
      <thead>
        <tr>
          <th scope="col">Project</th>
          <th scope="col" className="dtable__num">
            Cost
          </th>
          <th scope="col" className="dtable__num">
            Milestones
          </th>
          {showStatus && <th scope="col">Status</th>}
          <th scope="col">
            <span className="visually-hidden">Open</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => {
          const to = `/rounds/${roundId}/projects/${project.id}`;
          return (
            <tr key={project.id} className="dtable__row--link" onClick={() => navigate(to)}>
              <td className="dtable__cell--lead">
                <Link to={to} className="dtable__primary" onClick={(e) => e.stopPropagation()}>
                  {project.title}
                </Link>
                <span className="dtable__secondary">
                  <span className="mono">#{project.id}</span> · <span className="mono">{project.proposer}</span>
                </span>
              </td>
              <td className="dtable__num" data-label="Cost">
                <Amount yocto={project.cost} />
              </td>
              <td className="dtable__num" data-label="Milestones">
                {project.milestones.length}
              </td>
              {showStatus && (
                <td className="dtable__cell--plain">
                  <ProjectStatusPill status={project.status} />
                </td>
              )}
              <td className="dtable__chevron" aria-hidden>
                <ChevronRight />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
