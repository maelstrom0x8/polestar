import { ROUNDS } from "../data/mock";
import { RoundList } from "../components/rounds/RoundList";

export function RoundsPage() {
  return (
    <div className="page">
      <section style={{ marginBottom: 56 }}>
        <span className="label">Polestar</span>
        <h1 className="display" style={{ marginTop: 8 }}>
          Shared budgets,
          <br />
          allocated fairly.
        </h1>
      </section>

      <section>
        <span className="label">Rounds</span>
        <RoundList rounds={ROUNDS} />
      </section>
    </div>
  );
}
