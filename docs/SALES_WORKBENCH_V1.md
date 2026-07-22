# Sales Workbench V1

## Purpose and route

`/dashboard/satis` is the primary Satış ve Teklifler entrance. It is an operational workbench backed by current company-scoped repositories, not a decorative KPI dashboard. Existing deep routes remain stable.

## Navigation

Sales navigation is grouped visually as:

- Genel Bakış
- Müşteriler: Firmalar, Kişiler, Müşteri Sağlığı
- Satış Süreci: Potansiyel Müşteriler, Fırsatlar, Pipeline, Aktiviteler
- Ticari İşlemler: Teklifler, Satış Siparişleri

Groups are presentation concepts only; no database or route concept was renamed. All list routes remain directly reachable and the current route has a text-and-color active state.

## Workbench sections

### Bugün dikkat gerektirenler — Implemented

Uses existing activity, opportunity, quotation, Sales Order and Customer Health records. Deterministic ordering is: overdue blockers, critical health, expiring quotations, missing/overdue opportunity next action, accepted quotations awaiting conversion, fulfillment attention, then normal response waiting. Every item states its reason and links to the source record. There is no hidden combined score.

### Octo hazırladı — Implemented

Shows real company-scoped Quote Preparation Assisted Execution cases: prepared/awaiting review, blocked and failed. Each item links to `/dashboard/satis/hazirlanan-isler/:caseId` and shows Firma, linked Fırsat, attention reason, evidence quality, blocking-input count, responsible user context and review due date where available. Empty state remains honest. This section does not alter the existing deterministic “Bugün dikkat gerektirenler” ranking.

### Onayınızı bekliyor — Implemented

Shows real Assisted Execution cases awaiting review alongside existing `pending_approval` quotation records. No fake count or invented policy approval exists.

### Ticari akış — Implemented

Shows record counts for active leads, open opportunities, quotations awaiting response, accepted quotations awaiting Sales Order conversion, active Sales Orders, and current risky/critical Customer Health. It does not aggregate currencies or describe pipeline as revenue, invoice, cash or collection.

### Son hareketler — Partially implemented

Shows a deliberately small timeline from safe structured lead, company-visible activity, quotation, Sales Order and Customer Health metadata. It excludes private activity records and never renders activity bodies or personal notes. A unified immutable cross-domain event feed does not yet exist.

## Permissions, states and integrity

Owner and employee users retain domain actions on the linked source pages. Accountant sees a clearly labelled read-only workbench. RLS remains authoritative. The workbench supports loading, full error, partial error, retry and honest empty states. No source-domain mutation occurs on page load.

## Deliberate limitations

Assisted Execution and Quote Preparation Assistant V1 are implemented as documented in [Assisted Execution Data Foundation V1](./ASSISTED_EXECUTION_DATA_FOUNDATION_V1.md) and [Quote Preparation Assistant V1](./QUOTE_PREPARATION_ASSISTANT_V1.md). There is still no scoring, forecasting, broad analytics, cross-currency total, automatic scheduler, external communication, AI/LLM dependency or legacy-store access.
