<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 2.0.0
Modified principles: None
Added sections: None
Removed sections:
  - IV. Performance Requirements (deferred — not in scope for now)
  - Quality Gates: performance-related gate removed
Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ No performance-specific gates referenced
  - .specify/templates/spec-template.md — ✅ Performance targets in Success Criteria are now optional, not mandatory
  - .specify/templates/tasks-template.md — ✅ No change needed
Follow-up TODOs: Performance requirements principle may be re-introduced in a future amendment.
-->

# beingc Constitution

## Core Principles

### I. Code Quality

Every piece of code merged to the main branch MUST meet the following standards:

- Code MUST pass all configured linting and static-analysis checks with zero warnings before merge.
- Functions and modules MUST have a single, clear responsibility (Single Responsibility Principle); multi-purpose helpers are prohibited.
- Cyclomatic complexity MUST NOT exceed 10 per function; anything higher MUST be refactored or explicitly justified in the Complexity Tracking table of the relevant plan.
- Code MUST be self-documenting: names MUST convey intent without requiring inline comments. Comments are reserved for non-obvious decisions and MUST explain *why*, never *what*.
- Dead code, unused imports, and commented-out blocks MUST NOT be committed. Remove, don't comment out.
- All public APIs MUST have doc-comments that describe parameters, return values, and error conditions.

### II. Testing Standards (NON-NEGOTIABLE)

Test-Driven Development is mandatory. No production code may be written before a failing test exists.

- **Red-Green-Refactor** cycle is strictly enforced: write a failing test → confirm it fails → implement → confirm it passes → refactor.
- Every user story MUST have at least one acceptance-level test that is independently runnable and maps directly to a scenario in the feature spec.
- Unit test coverage MUST be ≥ 80% for all new code. Coverage regressions against the main branch are a merge blocker.
- Integration tests MUST cover all inter-service and inter-module contracts. Mocking at the boundary is permitted; mocking internal collaborators is not.
- Contract tests MUST be written for every public API endpoint or library interface before implementation begins.
- Tests MUST be deterministic and hermetic: no reliance on external network calls, wall-clock time, or shared mutable state between test cases.
- Flaky tests MUST be fixed or quarantined (with a tracked issue) within one sprint of detection; they MUST NOT be silently skipped.

### III. User Experience Consistency

All user-facing surfaces MUST behave predictably and coherently across the product.

- Error messages MUST be human-readable, actionable, and consistent in tone. Error codes or raw stack traces MUST NOT be surfaced to end users.
- Terminology MUST be consistent across UI, documentation, and error messages; divergence requires a documented decision.
- All interactive flows MUST be accessible: WCAG 2.1 AA compliance is the minimum bar for web surfaces; platform accessibility guidelines apply for native platforms.
- Loading states, empty states, and error states MUST be explicitly designed and implemented for every feature — they are not optional polish.
- UX changes that affect existing workflows MUST include a migration path or deprecation notice communicated to users before removal.
- Visual design tokens (colors, spacing, typography) MUST be consumed from the shared design system; hard-coded values are prohibited.

## Quality Gates

The following gates MUST be satisfied before any branch is merged:

- All linting and static-analysis checks pass (zero warnings).
- Unit test coverage ≥ 80% for changed code; no coverage regression against main.
- All contract and integration tests pass.
- No open Complexity Tracking violations without documented justification.
- UX states (loading, empty, error) have been implemented and verified.

## Development Workflow

- Features MUST be developed on a dedicated branch following the naming convention `###-feature-name` (sequential branch numbers from the spec register).
- Each task in `tasks.md` MUST be committed atomically; a task is either complete or not started — partial commits are discouraged.
- The spec (`spec.md`) and plan (`plan.md`) MUST be updated to reflect reality if implementation diverges from the original design. Documentation debt is a defect.
- Code review MUST verify Constitution compliance. A reviewer who approves a PR that violates a NON-NEGOTIABLE principle shares responsibility for the violation.
- Post-merge: the feature branch MUST be deleted, and the spec folder archived under `specs/###-feature-name/`.

## Governance

This Constitution supersedes all other development practices, style guides, or informal norms. In case of conflict, the Constitution wins.

**Amendment procedure**:

1. Propose the amendment in writing, identifying which principle is affected and why the change is necessary.
2. Obtain approval from at least one other project maintainer.
3. Provide a migration plan for any existing code or processes that the amendment would invalidate.
4. Increment the version following semantic versioning (MAJOR for removals/redefinitions, MINOR for additions, PATCH for clarifications).
5. Update `LAST_AMENDED_DATE` and commit with message: `docs: amend constitution to vX.Y.Z (<brief rationale>)`.

All pull requests and code reviews MUST verify compliance with this Constitution. Non-compliance is a blocker, not a suggestion.

**Version**: 2.0.0 | **Ratified**: 2026-03-30 | **Last Amended**: 2026-03-30
