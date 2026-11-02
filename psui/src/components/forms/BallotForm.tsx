import { useState } from "react";
import type { Project } from "../../types/domain";
import { ProjectList } from "../projects/ProjectList";

interface BallotFormProps {
  projects: Project[];
  onSubmit: (approved: string[]) => void;
}

export function BallotForm({ projects, onSubmit }: BallotFormProps) {
  const [approved, setApproved] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <form
      className="card"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit([...approved]);
      }}
    >
      <span className="label">Declare your ballot</span>
      <h3 className="h3" style={{ marginTop: 8 }}>
        Which projects do you support?
      </h3>
      <ProjectList projects={projects} showApproval approved={approved} onToggle={toggle} />
      <div
        style={{
          marginTop: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="field__hint">{approved.size} selected</span>
        <button type="submit" className="btn btn-primary" disabled={approved.size === 0}>
          Submit ballot
        </button>
      </div>
    </form>
  );
}
