import json
from fractions import Fraction


def rho(cost, supporters, budget_of):
    if not supporters:
        return None
    ordered = sorted(supporters, key=lambda v: (budget_of[v], v))
    t = len(ordered)
    prefix = Fraction(0)
    for s in range(1, t + 1):
        b_s = budget_of[ordered[s - 1]]
        candidate = (Fraction(cost) - prefix) / (t - s + 1)
        if candidate <= b_s:
            return candidate
        prefix += b_s
    return None


def run_mes(projects, cost_of, supporters_of, budget_of, remaining):
    funded = []
    pending = set(projects)
    while True:
        best_id = None
        best_rho = None
        for pid in pending:
            r = rho(cost_of[pid], supporters_of[pid], budget_of)
            if r is None:
                continue
            if best_rho is None or r < best_rho or (r == best_rho and pid < best_id):
                best_rho, best_id = r, pid
        if best_id is None:
            break
        for v in supporters_of[best_id]:
            payment = min(budget_of[v], best_rho)
            budget_of[v] -= payment
        remaining -= cost_of[best_id]
        funded.append((best_id, "mes", cost_of[best_id]))
        pending.remove(best_id)
    return funded, pending, remaining


def run_completion(cost_of, supporters_of, pending, remaining):
    funded = []
    pending = set(pending)
    while True:
        affordable = [pid for pid in pending if cost_of[pid] <= remaining]
        if not affordable:
            break
        best_id = None
        best_density = None
        for pid in affordable:
            density = Fraction(len(supporters_of[pid]), cost_of[pid])
            if (
                best_density is None
                or density > best_density
                or (density == best_density and pid < best_id)
            ):
                best_density, best_id = density, pid
        remaining -= cost_of[best_id]
        funded.append((best_id, "completion", cost_of[best_id]))
        pending.remove(best_id)
    return funded, pending, remaining


def run_allocation(scenario):
    projects = [p["id"] for p in scenario["projects"]]
    cost_of = {p["id"]: p["cost"] for p in scenario["projects"]}
    supporters_of = {pid: [] for pid in projects}
    for ballot in scenario["ballots"]:
        for pid in ballot["approved"]:
            supporters_of[pid].append(ballot["voter"])

    n = len(scenario["ballots"])
    budget = scenario["budget"]
    share = Fraction(budget, n) if n > 0 else Fraction(0)
    budget_of = {ballot["voter"]: share for ballot in scenario["ballots"]}

    remaining = budget
    mes_funded, pending, remaining = run_mes(
        projects, cost_of, supporters_of, budget_of, remaining
    )
    completion_funded, pending, remaining = run_completion(
        cost_of, supporters_of, pending, remaining
    )

    for pid in pending:
        assert cost_of[pid] > remaining, f"PROP-Exhaustive violated for {pid}"

    return {
        "funded": mes_funded + completion_funded,
        "unfunded": sorted(pending),
        "remaining": remaining,
    }


def main():
    with open("reference_scenario.json") as f:
        scenario = json.load(f)

    result = run_allocation(scenario)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
