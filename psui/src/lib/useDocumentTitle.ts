import { useEffect } from "react";

const DEFAULT_TITLE = "Polestar · Participatory budgeting for DAO treasuries";
const DEFAULT_DESCRIPTION =
  "Participatory budgeting for SputnikDAO treasuries on NEAR. Members back projects, the budget is split with the Method of Equal Shares, and teams are paid milestone by milestone.";

function apply(title: string, description: string) {
  document.title = title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", description);
}

export function resetDocumentTitle() {
  apply(DEFAULT_TITLE, DEFAULT_DESCRIPTION);
}

export function useDocumentTitle(title: string | null, description = DEFAULT_DESCRIPTION) {
  useEffect(() => {
    apply(title ? `${title} · Polestar` : DEFAULT_TITLE, description);
  }, [title, description]);
}
