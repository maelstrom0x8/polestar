import type { Project } from "../../types/domain";
import { formatNear } from "../../lib/format";
import { Checkbox } from "../ui/Checkbox";

interface ProjectRowProps {
  project: Project;
  showApproval?: boolean;
  approved?: boolean;
  onToggle?: (id: string) => void;
}

export function ProjectRow({ project, showApproval, approved, onToggle }: ProjectRowProps) {
  const attestedCount = project.milestones.filter((m) => m.attested).length;

  return (
    <div className="project-row">
      {showApproval && (
        <Checkbox
          id={`approve-${project.id}`}
          checked={!!approved}
          onChange={() => onToggle?.(project.id)}
        />
      )}
      <div className="project-row__main">
        <span className="project-row__title">{project.title}</span>
        <span className="project-row__summary">{project.summary}</span>
      </div>
      <div className="project-row__meta">
        {project.status === "Funded" && (
          <span className="project-row__milestones">
            {attestedCount}/{project.milestones.length} milestones
          </span>
        )}
        <span className={`badge status-badge status-badge--${project.status.toLowerCase()}`}>
          {project.status}
        </span>
        <span className="project-row__cost">{formatNear(project.cost)}</span>
      </div>
    </div>
  );
}
