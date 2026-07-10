# Octo Engineering Instructions

## Product

Octo is an AI-native business operating system for Turkish SMEs.

Its main differentiation is cross-domain reasoning: Finance, Tax, HR, Operations and future business domains must work as one connected system rather than separate modules.

The product must detect risks and opportunities that become visible only when records from multiple domains are combined.

## Core architecture

- Domain stores contain the source records.
- Signal adapters convert domain records into normalized reasoning signals.
- The deterministic reasoning engine calculates and proves findings.
- Insight objects contain complete traceability.
- The LLM may explain verified findings but must never be the authority for calculations.
- UI components present findings but must not contain business logic.

The intended flow is:

Domain records
→ normalized signals
→ deterministic rules
→ traceable insight
→ optional LLM narration
→ user interface

## Trust requirements

Octo must never present an unsupported business conclusion.

Every important insight should provide:

- source records
- calculation
- data freshness
- missing information
- confidence
- rule applied
- recommended action
- responsible role

Never allow an LLM to invent:

- amounts
- deadlines
- tax or legal rules
- calculations
- source records
- confidence levels
- business events

## Cross-domain requirements

Before adding a new detector:

1. Identify which domains participate.
2. Trace every input to a real store record.
3. Check whether the same obligation is represented elsewhere.
4. Prevent double counting.
5. Define empty-data behavior.
6. Define incomplete-data behavior.
7. Define confidence honestly.
8. Add deterministic tests.

## Turkish SME requirements

- Preserve Turkish accounting, tax, payroll and operational terminology.
- Do not replace regulatory concepts with generic international ERP language.
- Respect the mali müşavir as an ally and professional authority.
- Octo supports preparation, visibility and coordination; it must not falsely claim regulated professional authority.
- Customer-facing language should be calm, clear and evidence-based.

## Code standards

- Use strict TypeScript.
- Prefer pure functions for calculations.
- Keep business logic out of React components.
- Reuse existing stores and types before introducing new abstractions.
- Avoid `any`.
- Guard against NaN, Infinity, invalid dates and division by zero.
- Do not add production dependencies without explaining why.
- Do not silently change persisted schemas.
- Add migration guards when persisted state structures change.
- Keep empty production state genuinely empty.
- Demo data must remain isolated behind demo mode.

## Verification

After meaningful changes, run:

- npm run build
- npm run lint
- automated tests when available

Report:

- files changed
- behavior changed
- tests run
- build result
- unresolved risks

Do not commit unless explicitly instructed.
