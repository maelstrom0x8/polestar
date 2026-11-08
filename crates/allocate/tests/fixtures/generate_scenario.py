import json

PROJECTS = [
    {"id": "p1", "cost": 300},
    {"id": "p2", "cost": 200},
    {"id": "p3", "cost": 150},
    {"id": "p4", "cost": 100},
    {"id": "p5", "cost": 80},
    {"id": "p6", "cost": 400},
]

SUPPORT_RANGES = {
    "p1": range(0, 60),
    "p2": range(40, 80),
    "p3": range(70, 100),
    "p4": range(0, 5),
    "p5": range(95, 98),
    "p6": range(0, 10),
}

N_VOTERS = 100


def voter_id(i: int) -> str:
    return f"v{i}"


def main() -> None:
    approvals: dict[str, set[str]] = {voter_id(i): set() for i in range(N_VOTERS)}
    for project_id, voter_range in SUPPORT_RANGES.items():
        for i in voter_range:
            approvals[voter_id(i)].add(project_id)

    ballots = [
        {"voter": voter, "approved": sorted(projects)}
        for voter, projects in approvals.items()
        if projects
    ]

    scenario = {
        "n_voters": N_VOTERS,
        "budget": 1000,
        "projects": PROJECTS,
        "ballots": ballots,
    }

    with open("reference_scenario.json", "w") as f:
        json.dump(scenario, f, indent=2)
        f.write("\n")

    print(f"wrote {len(ballots)} ballots over {len(PROJECTS)} projects")


if __name__ == "__main__":
    main()
