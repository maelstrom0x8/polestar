import { Link } from "react-router-dom";

export function DaoCard({ roundId }: { roundId: string }) {
  return (
    <section className="container">
      <div className="container__body">
        <div className="section-label">For the DAO</div>
        <p style={{ marginTop: 8, fontSize: "var(--app-small)", color: "var(--text-secondary)" }}>
          Funding a round and paying out milestones go through the DAO's own proposals.
        </p>
        <Link to={`/dao/propose?round=${roundId}`} className="app-link" style={{ display: "inline-block", marginTop: 8 }}>
          Prepare a proposal for Round {roundId}
        </Link>
      </div>
    </section>
  );
}
