# Octo Owner UX V1

## Mental model

Owner Workflow V1 puts the operating question before the underlying ERP layers:

1. **Understand** on `Bugün`: deterministic business status, at most three attention items, and the 30-day cash position.
2. **Decide** in `Yapılacaklar`: active reasoning cases, supported approvals, and missing-data actions.
3. **Verify** in the insight drawer: structured events followed by all eight reasoning receipts.

The existing domain stores, signal adapters, and deterministic reasoning engine remain authoritative. Insight action state records only how a user handled a conclusion; it never changes the conclusion itself.

## Navigation

- **Sizin için:** `Bugün`, `Yapılacaklar`, `30 Gün`
- **İşletme:** `Finans`, `Vergi`, `İnsan & Bordro`, `Operasyon`
- **Araçlar:** `Verileri Yönet`

Placeholder modules remain routable for compatibility but do not compete in primary navigation. Mobile uses the same groups in a keyboard-accessible sheet.

## Bugün priority rules

The business-status sentence is derived from reasoning severity, coverage, and the next structured event:

- Any critical case produces a critical status.
- Missing finance coverage, two or more missing domains, or no signals produces an insufficient-data status.
- Warning cases produce an attention status.
- A stable status is shown only when available records contain no warning or critical case; unevaluated domains are named explicitly.

Returning owners see status, attention, and the 30-day strip before business pulse, daily briefing, historical cash flow, and audit detail. Empty production state keeps import and full coverage requirements prominent.

## Attention ranking

`rankOwnerInsights` orders one card per `ReasoningCase` by:

1. severity (`critical`, `warning`, `info`)
2. earliest structured relevant date
3. presence of a recommendation
4. number of affected domains
5. confidence
6. stable case ID

Confidence is only a tie-breaker. A low-confidence critical case remains visible and explains both the uncertainty and the repair action. `Bugün` renders at most three cards.

## Insight drawer

The desktop drawer becomes a full-width mobile sheet and provides:

1. **Ne oluyor?** — outcome, consequence, and horizon
2. **Ödeme ve olay akışı** — chronological structured signals; amounts are rendered only from signal fields
3. **Ne yapabilirsiniz?** — recommendation, responsible role, local action status, optional assigned role, and copy action
4. **Kanıt ve hesaplama** — records and freshness; calculation and rule; confidence and missing data; recommendation and responsibility

Escape closes the drawer, focus is trapped while open, focus returns to the originating card, and background scrolling is disabled.

## Confidence behavior

Severity and confidence are always separate. `OwnerInsightViewModel` derives a short explanation from case confidence, signal confidence, and existing `missingData`; it does not create new factual claims. Low and medium confidence include a concrete action that can improve the evidence. Missing data also remains visible in the receipt section.

## Task sources

`Yapılacaklar` aggregates only supported contracts:

- active `ReasoningCase` results plus persisted insight action state
- HR leave requests and the existing approve/reject store action
- `DataCoverageSnapshot.missingActions`

Resolved and dismissed insights remain reversible. Leave decisions continue to be available in the HR layer. Payroll and purchase-order approvals are intentionally absent because their current domain models do not contain approval state.

## 30-day calculation rules

`buildThirtyDayCashSummary` uses structured cash signals and base-currency finance accounts:

- valid, finite base-currency account balances form current cash
- only positive structured cash event amounts are included
- only valid dates from today through day 30 are included; overdue outflows are applied conservatively at the start date
- overdue inflows are not treated as future cash
- same-day outflows are applied before inflows
- foreign-currency events are excluded without a dated conversion source
- missing dates and invalid amounts are excluded and explained
- recorded, non-low-confidence outflows are labeled confirmed; inflows and derived/forecast events are labeled expected

The lowest running balance and date are calculated event by event. The page also shows non-cash operational events from the same structured signal timeline.

## Other implementation changes

- Returning-owner data coverage is compact; full detail and obligation settings remain available in a modal.
- Import confirmation uses formal Turkish and distinguishes automatic routing from manual mapping. Completion reports imported records, skipped sheets, updated views, and newly appeared deterministic cases when present.
- Payroll now orders employer cost, net salary, SGK/tax obligations, real missing attendance/payment data, employee detail, and calculation assumptions.

## Known limitations

- Insight action state is local-browser persistence, not a multi-user workflow or audit log.
- Assigned responsibility is free text; Octo does not claim account identity or notification delivery.
- No share action sends data. Copying an insight only writes text to the local clipboard.
- Receivable dates are expected cash dates without a configured collection probability.
- Foreign-currency values remain excluded until a dated, sourced conversion contract exists.
- Derived SGK dates still require official calendar and extension confirmation, as stated by the reasoning case.
- The import engine does not currently expose row-level review, duplicate, or confidence counts, so the UI does not claim them.
- Placeholder routes are omitted from primary navigation but retained for compatibility.

## Extension points

- Add payroll or purchase-order approval adapters only after their domain stores expose real pending/approved/rejected state and consequences.
- Replace local insight action persistence with a backend repository while preserving `InsightActionState` semantics and history.
- Add mali müşavir collaboration only with an authenticated sharing, delivery, and receipt contract.
- Add dated FX conversion as a sourced signal before combining currencies in owner cash calculations.
- Add further task adapters through `OwnerTaskSources` without changing the task page contract.
