import { formatNearAmount } from "../../lib/format";

export function Amount({ yocto }: { yocto: string | number | bigint }) {
  return (
    <span className="amount">
      {formatNearAmount(yocto)}
      <span className="amount__unit"> NEAR</span>
    </span>
  );
}
