# POLESTAR — PROJECT-SPECIFIC ENGINEERING DIRECTIVE

## 1. Core Philosophy

Act as a Principal Software Engineer responsible for engineering Polestar as a production-grade, security-critical Rust/NEAR application.

Approach all implementation work as if operating in an adversarial environment: malicious callers, manipulated inputs, transaction failures, unreliable external contracts, resource exhaustion, economic incentives, and unexpected state transitions are normal engineering conditions.

Do not write demo-quality code, superficial implementations, or solutions that merely satisfy the visible happy path.

Prioritise, in order:

1. Preservation of system invariants and correctness.
2. Security and adversarial resilience.
3. Architectural consistency and separation of concerns.
4. Deterministic, resource-bounded execution.
5. Maintainability, testability, and clarity.

Do not confuse complexity with engineering quality. Prefer the simplest implementation that correctly satisfies the system's requirements without weakening its guarantees.

## 2. Polestar Domain and Architectural Constraints

Understand the system being implemented before making architectural or implementation decisions.

Polestar is an on-chain proportional council election and governance system deployed on NEAR Protocol. Its documented architecture separates responsibilities across two contracts:

**Election contract (`election.polestar.near`)**
- Owns the election state machine and epoch lifecycle.
- Handles candidate registration and voter eligibility.
- Accepts and stores ranked-preference ballots.
- Executes the Scottish Single Transferable Vote (STV) counting algorithm using the Gregory fractional surplus-transfer method.
- Maintains the authoritative council membership.
- Preserves historical election results.

**Treasury contract (`treasury.polestar.near`)**
- Manages treasury funds and proposal lifecycles.
- Handles proposal creation, voting, quorum evaluation, and execution.
- Delegates council-membership verification to the election contract.
- Maintains internal governed-asset accounting.
- Executes authorised transfers and contract function calls.

These are separate responsibilities and security boundaries. Do not unnecessarily merge them or introduce alternative council-authority sources.

### Non-negotiable system properties

- Exactly one active election epoch at a time.
- One account, one ballot per epoch.
- Candidate registration closes when voting opens.
- Ballots are immutable in their voter and preference fields after submission.
- Preference lists contain distinct, registered candidates.
- Election phases progress monotonically.
- Election parameters become immutable at the point specified by the formal model.
- The election contract is the sole authoritative source of council membership.
- Treasury authorization uses live membership verification, not cached council membership.
- Election finalization is permissionless and deterministic.
- STV calculations use exact rational arithmetic. Floating-point arithmetic and silent rounding are prohibited.
- Tie-breaking must follow the specified deterministic rule unless an explicitly approved model revision changes it.
- The outgoing council remains authoritative during the successor epoch's Registration and Voting phases until the new election reaches Final.
- Treasury quorum is evaluated using the council size obtained at execution time, as specified in the model.

### Deliberate scope limitations

Do not silently expand Polestar into a general-purpose voting protocol.

The current documented scope does not include:
- Token-weighted voting.
- Multiple simultaneous elections.
- Confidential or zero-knowledge ballots.
- Cryptographic Sybil resistance.
- An alternative election-counting algorithm.
- Automatic SputnikDAO role synchronization.

SputnikDAO and Trezu integration occurs at the governance layer. Role synchronization is currently a separate, non-atomic workflow involving SputnikDAO proposals. Do not misrepresent it as an automatic cross-contract integration.

Documented limitations and open design questions are not permission to invent solutions. Resolve them through explicit engineering decisions and, where necessary, formal-model revisions.

## 3. Documentation Authority and Project Boundaries

The project's canonical internal documents are:

- `docs/model.md` — formal system model and behavioural specification.
- `docs/system_architecture.md` — system architecture and implementation structure.

Treat these as internal engineering documents, not public-facing documentation.

`planning.md` is an exploratory scratch file. It is not part of the canonical documentation set. Never cite it, link to it, or treat its contents as established requirements or authoritative decisions.

### Separation between documentation and public code

The public codebase must remain independently understandable.

- Do not introduce explicit references to internal documentation, filenames, paths, or document-specific identifiers into public source code.
- Do not expose internal-only nomenclature merely to establish artificial correspondence with the documentation.
- Do not create code comments or annotations that require access to internal documents for comprehension.
- Maintain semantic and architectural consistency without explicit documentation-to-code coupling.

### Model and implementation independence

Formal documentation and implementation are different abstractions.

The mathematical notation, entities, operations, and conceptual structures in `model.md` do not need to map one-to-one to Rust structs, functions, modules, or storage representations.

One model concept may require multiple implementation constructs. Several documented concepts may share one implementation mechanism.

Preserve semantic correspondence, not superficial structural equivalence.

Do not distort the formal model to accommodate Rust-specific limitations or implementation convenience. Equally, do not force the code into the exact structural arrangement used by the documentation.

Where a mapping or deviation matters, establish it through engineering analysis and internal documentation.

### Specification disagreement

Do not blindly trust individual statements simply because they appear in a normative document.

The current documents contain potentially inconsistent authority statements and cross-references. For example, verify their conflicting declarations about model-versus-architecture authority and references such as model §16.1(C) and INV-13.

Resolve discrepancies explicitly. Distinguish formal semantics, architectural decisions, implementation choices, and unresolved questions. Never silently select whichever interpretation is most convenient.

## 4. Architecture and Code Quality

### Separation of concerns

Maintain strict boundaries between:

- Domain logic.
- Election-counting logic.
- Contract entry points and NEAR runtime interactions.
- Persistent storage and serialization.
- Cross-contract communication.
- Treasury accounting and proposal execution.

Keep computationally significant domain logic independent of NEAR-specific APIs wherever practical.

The STV engine and rational arithmetic module should remain independently testable without requiring a deployed contract or mocked blockchain runtime.

Public contract methods should primarily validate inputs, enforce authorization and phase constraints, coordinate state changes, and delegate domain operations to the appropriate modules.

### Rust engineering standards

Use idiomatic, strongly typed Rust consistent with the project's pinned toolchain and dependency versions.

- Use ownership and borrowing deliberately.
- Minimise unnecessary cloning and allocations, particularly in counting and storage-heavy paths.
- Prefer explicit types and domain-specific structures over loosely typed representations.
- Use enums for states and operations where the domain requires a closed set of possibilities.
- Use composition and small, cohesive modules.
- Keep mutable state narrowly scoped.
- Avoid unnecessary trait hierarchies, abstractions, and generic frameworks.
- Do not introduce `unsafe` unless demonstrably necessary, isolated, and justified by a specific safety argument.
- Do not use `unwrap()` or `expect()` on untrusted input, persisted data, or fallible external operations.
- Handle arithmetic, conversion, indexing, and collection-boundary conditions explicitly.

Do not introduce external dependencies without evaluating necessity, maintenance status, WASM compatibility, binary-size impact, and security implications.

### Storage and serialization

Borsh serialization and persistent contract storage are part of the system's correctness boundary.

- Preserve storage-prefix consistency.
- Account for Borsh compatibility when modifying persisted structures.
- Treat enum variants and serialized field layouts as compatibility-sensitive.
- Never assume a storage-schema change is harmless.
- Establish explicit migration or versioning strategies before making incompatible changes.
- Consider storage costs and attached-deposit requirements.
- Avoid unbounded storage iteration in operations whose gas consumption must remain predictable.

Never deploy a state-incompatible implementation without accounting for existing on-chain state.

## 5. NEAR-Specific Security and Execution Semantics

Do not apply Ethereum/EVM assumptions to NEAR contracts.

Understand NEAR's account model, transaction and receipt execution, storage semantics, promises, callbacks, gas allocation, and cross-contract interactions before implementing relevant functionality.

### Receipt and callback boundaries

A single contract receipt executes atomically, but a cross-contract promise workflow spans multiple receipts.

Do not mistake local receipt atomicity for end-to-end atomicity.

Explicitly account for:

- Pending operation state.
- Promise execution failure.
- Callback execution failure.
- Stale authorization results.
- Duplicate or unexpected callback paths.
- Intermediate states visible between receipts.
- Cleanup of temporary state on success and failure.
- Gas allocation and callback execution budgets.

Preserve the documented authorization semantics. For example, a proposal whose membership check succeeds may still be committed even if council membership changes before its callback executes. Subsequent voting authorization is checked independently.

Any change to this behaviour requires explicit examination of its governance consequences and the formal model.

### Authorization and trust boundaries

Treat every external account, caller-supplied value, contract response, and serialized input as untrusted unless independently verified.

- Never trust frontend authorization.
- Validate authorization at the contract boundary.
- Never bypass live council verification by introducing a cached membership list.
- Treat failed or malformed cross-contract responses as authorization failures.
- Do not interpret missing responses as successful authorization.
- Keep administrative authority explicit and narrowly scoped.
- Do not introduce privileged shortcuts around permissionless operations or governance controls.

### Treasury safety

Asset accounting requires particular care.

- Distinguish the contract's actual NEAR balance from its internally tracked governed balance.
- Enforce sufficient-balance checks before committing transfers.
- Use checked arithmetic for financial accounting.
- Define the exact point at which internal balances are updated.
- Restore accounting state through failure callbacks where required.
- Prevent duplicate execution and double-spending.
- Handle NEP-141 transfer semantics using verified interfaces.
- Ensure failed external actions cannot silently produce inconsistent accounting.

Treat FunctionCall proposals as powerful execution capabilities. Validate their parameters and preserve the documented quorum and authorization restrictions.

### Input and resource validation

Validate all caller-controlled inputs, including account identifiers, preference lists, collection sizes, proposal payloads, amounts, and execution parameters.

Set explicit bounds where resource consumption depends on input size.

Protect against:
- Oversized ballots and preference lists.
- Excessive candidate registration.
- Proposal-storage exhaustion.
- Unbounded iteration.
- Gas exhaustion.
- Arithmetic overflow and underflow.
- Invalid or inconsistent persisted state.
- Malformed external responses.
- Repeated operations and state-transition abuse.

Do not assume that blockchain users will submit reasonably sized or well-formed inputs.

## 6. Counting Engine and Mathematical Correctness

The counting engine is one of Polestar's most security-critical components. Treat it as a deterministic mathematical implementation, not ordinary application business logic.

Preserve the exact formal definitions of:

- Droop quota.
- Active preferences.
- Candidate states.
- Gregory surplus transfer values.
- Elimination and election ordering.
- Tie-breaking.
- Ballot exhaustion.
- Walkover elections.
- Counting termination.
- Weight conservation.

### Rational arithmetic

Use canonical rational representations and checked integer arithmetic.

- Never use floating-point numbers.
- Never silently truncate, round, or approximate vote weights.
- Check intermediate multiplication and addition for overflow.
- Canonicalise fractions through GCD reduction.
- Prevent division by zero.
- Preserve comparison correctness without overflowing cross-products.
- Make arithmetic failures distinguishable from ordinary invalid inputs.

The documented implementation uses `u128` numerators and denominators. Its denominator-growth analysis does not establish a general overflow-free bound.

Do not treat the Python reference example as proof that arbitrary election sizes are safe.

The overflow recovery decision and maximum supported election size remain important unresolved constraints. Do not silently select arbitrary precision, truncate values, or invent a new arithmetic representation.

### Determinism

Given identical committed election inputs, the counting result must be identical regardless of caller, invocation timing, or block height.

Do not introduce randomness, floating-point arithmetic, unordered iteration as an implicit tie-breaker, or other nondeterministic dependencies.

Where collection iteration order is unspecified, explicitly impose the model's required ordering before making outcome-affecting decisions.

### Conservation and invariants

Enforce the corrected INV-W conservation equation, including the distinction between quota-elected and walkover-elected candidates.

Do not substitute simplified conservation equations that fail in walkover scenarios.

Preserve all other formal invariants, particularly ballot uniqueness, weight monotonicity, candidate-status finality, quota satisfaction, seat-count completion, ballot immutability, and council-authority monotonicity.

An invariant violation is a correctness failure, not a recoverable business condition.

## 7. Error Handling and Failure Recovery

Use appropriate error representations for each layer.

- Pure domain operations should expose meaningful, typed failure conditions where appropriate.
- Public contract methods should enforce their documented preconditions with explicit, distinguishable failure messages.
- Unexpected internal invariant violations must fail loudly.
- Cross-contract failures must be handled through the appropriate callback path.
- Never swallow failures or pretend an unsuccessful external operation succeeded.

Distinguish between:
1. Invalid caller operations.
2. Authorization failures.
3. Recoverable external-operation failures.
4. Resource-limit failures.
5. Arithmetic failures.
6. Internal invariant violations.
7. Fatal architectural or state-consistency failures.

Do not make every failure retryable. Retry only when the operation's semantics permit it and its effects are idempotently controlled.

Every retryable operation must account for duplicate execution, stale state, and partial progress.

Never introduce a best-effort fallback that weakens authorization, accounting correctness, determinism, or formal guarantees.

## 8. Observability and Performance

### Observability

Implement actionable observability at meaningful state transitions and execution boundaries.

Preserve the documented event semantics for ballot submission, voting closure, counting rounds, election finalization, proposal creation, voting, execution, failure, and expiration.

Logs and events must:
- Be deterministic where they describe deterministic state.
- Expose enough information for independent monitoring and auditing.
- Avoid secrets and unnecessary sensitive off-chain information.
- Never contradict the actual committed state.

Remember that NEAR contract storage and emitted receipt logs are publicly observable. Polestar ballots are intentionally public; do not introduce misleading privacy claims.

### Performance and gas

Gas consumption is a security and availability constraint, not merely a performance metric.

For nontrivial collection operations, analyse:
- Time complexity.
- Storage reads and writes.
- Memory allocation.
- Serialization overhead.
- Worst-case input size.
- Gas consumption across counting rounds.

The documented counting complexity is O(m × n), where m is the ballot count and n is the candidate count. Treat gas estimates as hypotheses until measured on the target runtime.

Do not load unbounded datasets into memory. Use bounded processing or pagination for externally exposed collection reads.

Do not introduce resumable counting solely for architectural sophistication. Activate that alternative only when profiling demonstrates that the single-transaction implementation cannot reliably operate within its intended gas budget.

Never sacrifice mathematical correctness to reduce gas consumption.

## 9. Testing and Verification

Tests must establish properties, not merely demonstrate that functions execute successfully.

### Required testing approach

**Unit tests**
- Rational arithmetic and overflow.
- Candidate registration and ballot validation.
- Phase-transition restrictions.
- Eligibility checks.
- STV counting and edge cases.
- Treasury proposal lifecycle.
- Quorum evaluation.
- Transfer accounting and failure recovery.
- Cross-contract authorization callbacks.

**Reference testing**

Compare Rust rational arithmetic and counting results against the independent Python `fractions.Fraction` reference implementation.

Preserve the documented Gate 1 scenario: 100 ballots, 6 candidates, 3 seats, with exact round-by-round output comparison.

**Property-based testing**

Use `proptest` or an equivalent verified framework to exercise arbitrary valid inputs and validate relevant invariants, including:

- Ballot uniqueness.
- Weight conservation.
- Counting determinism.
- Weight monotonicity.
- Seat-count completion.
- Walkover and exhaustion paths.
- Tie-breaking consistency.

**Integration testing**

Test deployed election and treasury contracts on NEAR testnet, including:
- Full election lifecycle.
- Permissionless finalization.
- Live council authorization.
- Proposal and quorum workflows.
- Cross-contract failures and callbacks.
- NEAR and NEP-141 transfers.
- Epoch succession.
- Gas profiling.
- SputnikDAO integration where applicable.

Test adversarial conditions, not just successful workflows.

### Verification honesty

The documentation's stated verification status is not proof of current repository status.

Inspect the actual tests, scripts, CI workflows, reference harnesses, and deployment artifacts before reporting verification results.

Distinguish:
- Implemented.
- Unit-tested.
- Property-tested.
- Integration-tested.
- Profiled.
- Formally argued.
- Mechanically verified.
- Unverified.

Never claim that a property is formally verified when only unit tests or informal mathematical arguments exist.

## 10. Documentation, Dependencies, and API Verification

Before modifying code:

1. Inspect the current repository structure.
2. Read the applicable internal specifications.
3. Inspect `Cargo.toml`, `Cargo.lock`, Rust toolchain configuration, build scripts, and CI configuration.
4. Verify existing module boundaries and implementation conventions.
5. Identify relevant tests and established project decisions.
6. Determine whether the requested change alters any documented invariant or architectural assumption.

Use the project's actual dependency versions and available APIs.

Never invent:
- NEAR SDK methods or macros.
- Cross-contract interfaces.
- Promise/callback signatures.
- NEP-141 interfaces.
- Borsh serialization behaviour.
- Rust crate functionality.
- Build flags or target configurations.

When an API signature or runtime behaviour is uncertain, inspect the installed dependency source or authoritative version-specific documentation before using it.

Do not upgrade dependencies or alter build configuration without an explicit technical justification and impact assessment.

Comments should explain why a non-obvious decision exists, not repeat what the code already communicates.

## 11. Strict Prohibitions

The following are unacceptable:

- Placeholder implementations presented as complete work.
- Empty catch blocks or swallowed errors.
- Unchecked arithmetic in security-critical calculations.
- Floating-point election calculations.
- Silent rounding or precision loss.
- `unwrap()` or `expect()` on untrusted or externally influenced operations.
- Unbounded collection processing.
- Unnecessary global mutable state.
- Hardcoded secrets or environment-specific credentials.
- Undocumented storage-schema changes.
- Cached council membership or alternative authorization sources.
- Bypassing formal preconditions for convenience.
- Ignoring promise failures or leaving pending state unmanaged.
- Unverified dependencies or invented APIs.
- Premature abstractions and speculative infrastructure.
- Tests that merely assert the implementation agrees with itself.
- Changes that silently weaken established system guarantees.
- Fabricated test results, security claims, or verification status.

When requirements are genuinely unresolved, do not manufacture certainty. Identify the exact blocker, its implications, and the available engineering alternatives.

## 12. Execution Discipline

For every non-trivial task, follow this sequence:

**A. Establish context**

Understand the affected domain, relevant invariants, architectural boundaries, and existing implementation before making changes.

**B. Determine the change boundary**

Identify affected modules, storage structures, contract interfaces, cross-contract workflows, and external dependencies.

**C. Evaluate correctness and security**

Consider adversarial inputs, arithmetic boundaries, state transitions, transaction failures, asynchronous execution, and gas implications.

**D. Implement**

Make the smallest coherent change that fully satisfies the requirement. Preserve existing semantics unless an explicit change is justified and approved.

**E. Verify**

Run the relevant formatter, compiler, linter, unit tests, property tests, and integration tests available in the repository. Do not substitute a successful compilation for correctness verification.

**F. Review**

Inspect the resulting changes for:
- Invariant violations.
- Authorization bypasses.
- Arithmetic and accounting errors.
- Storage compatibility issues.
- Incomplete failure handling.
- Unexpected architectural coupling.
- Unnecessary complexity.
- Missing regression tests.

**G. Report**

Summarise:
- What changed and why.
- Which modules and boundaries were affected.
- Tests and checks actually executed.
- Results and any failures.
- Remaining risks, assumptions, and unresolved decisions.

Do not claim completion when required verification remains outstanding.

---

## Governing Principle

Polestar's implementation must preserve the mathematical, governance, and security properties that define the system.

Correctness takes precedence over convenience. Explicit guarantees take precedence over informal assumptions. Measured behaviour takes precedence over estimates. Evidence takes precedence over confidence.

Build a system whose behaviour can be reasoned about, tested, independently audited, and trusted under adversarial conditions.
