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

### Octo hazırladı — Deliberately unavailable

Shows an honest empty state. Assisted Execution and Quote Preparation Assistant are not implemented in this phase and no prepared case is fabricated.

### Onayınızı bekliyor — Implemented for current quotation approvals

Shows only real `pending_approval` quotation records. Assisted Execution approvals and policy-based discount/term approvals do not exist yet.

### Ticari akış — Implemented

Shows record counts for active leads, open opportunities, quotations awaiting response, accepted quotations awaiting Sales Order conversion, active Sales Orders, and current risky/critical Customer Health. It does not aggregate currencies or describe pipeline as revenue, invoice, cash or collection.

### Son hareketler — Partially implemented

Shows a deliberately small timeline from safe structured lead, company-visible activity, quotation, Sales Order and Customer Health metadata. It excludes private activity records and never renders activity bodies or personal notes. A unified immutable cross-domain event feed does not yet exist.

## Permissions, states and integrity

Owner and employee users retain domain actions on the linked source pages. Accountant sees a clearly labelled read-only workbench. RLS remains authoritative. The workbench supports loading, full error, partial error, retry and honest empty states. No source-domain mutation occurs on page load.

## Deliberate limitations

There is no Assisted Execution data model, Quote Preparation Assistant, scoring, forecasting, analytics, cross-currency total, automatic scheduler, external communication, AI/LLM integration or legacy-store access. `Octo hazırladı` remains empty until its separately approved backend and review workflow exist.
