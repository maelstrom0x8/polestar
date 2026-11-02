import { useState } from "react";
import { Field } from "../ui/Field";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

export interface ProjectDraft {
  title: string;
  summary: string;
  cost: string;
  milestones: string[];
}

interface RegisterProjectFormProps {
  onSubmit: (draft: ProjectDraft) => void;
}

export function RegisterProjectForm({ onSubmit }: RegisterProjectFormProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [cost, setCost] = useState("");
  const [milestones, setMilestones] = useState<string[]>([""]);

  const costNum = Number(cost) || 0;
  const milestoneSum = milestones.reduce((sum, amount) => sum + (Number(amount) || 0), 0);
  const sumMatches = costNum > 0 && Math.abs(milestoneSum - costNum) < 1e-9;

  function updateMilestone(index: number, amount: string) {
    setMilestones((prev) => prev.map((m, i) => (i === index ? amount : m)));
  }

  function addMilestone() {
    setMilestones((prev) => [...prev, ""]);
  }

  function removeMilestone(index: number) {
    setMilestones((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  return (
    <form
      className="card"
      onSubmit={(event) => {
        event.preventDefault();
        if (!sumMatches) return;
        onSubmit({ title, summary, cost, milestones });
      }}
    >
      <span className="label">Register a project</span>
      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 20 }}>
        <Field label="Title" htmlFor="project-title">
          <Input
            id="project-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            required
          />
        </Field>

        <Field
          label="Summary"
          htmlFor="project-summary"
          hint="One or two sentences. Voters see this on the ballot."
        >
          <Textarea
            id="project-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={280}
            rows={3}
            required
          />
        </Field>

        <Field label="Total cost (NEAR)" htmlFor="project-cost">
          <Input
            id="project-cost"
            type="number"
            min="0"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            required
          />
        </Field>

        <Field
          label="Milestones"
          htmlFor="milestone-0"
          hint="Amounts must sum to the total cost."
          error={
            cost && !sumMatches
              ? `Milestones sum to ${milestoneSum} NEAR, cost is ${costNum} NEAR.`
              : undefined
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {milestones.map((amount, index) => (
              <div key={index} style={{ display: "flex", gap: 8 }}>
                <Input
                  id={`milestone-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => updateMilestone(index, e.target.value)}
                  placeholder={`Milestone ${index + 1} amount`}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => removeMilestone(index)}
                  disabled={milestones.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addMilestone}
              style={{ alignSelf: "flex-start" }}
            >
              Add milestone
            </button>
          </div>
        </Field>
      </div>

      <div style={{ marginTop: 24 }}>
        <button type="submit" className="btn btn-primary" disabled={!title || !summary || !sumMatches}>
          Register project
        </button>
      </div>
    </form>
  );
}
