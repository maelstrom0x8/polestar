import { ROUNDS } from "../data/mock";
import { RoundList } from "../components/rounds/RoundList";

export function RoundsPage() {
  return (
    <div className="page">
      <section style={{ marginBottom: 32 }}>
        <span className="label">Polestar</span>
        <h1 className="h1" style={{ marginTop: 8 }}>
          Rounds
        </h1>
      </section>

      <RoundList rounds={ROUNDS} />
    </div>
  );
}
