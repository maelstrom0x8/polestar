import type { Project } from "../../types/domain";
import { ProjectRow } from "./ProjectRow";

interface ProjectListProps {
  projects: Project[];
  showApproval?: boolean;
  approved?: Set<string>;
  onToggle?: (id: string) => void;
}

export function ProjectList({ projects, showApproval, approved, onToggle }: ProjectListProps) {
  return (
    <div className="project-list">
      {projects.map((project) => (
        <ProjectRow
          key={project.id}
          project={project}
          showApproval={showApproval}
          approved={approved?.has(project.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
