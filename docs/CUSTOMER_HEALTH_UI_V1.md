# Customer Health and Revenue Risk UI V1

## Routes and navigation

`Müşteri Sağlığı` appears after `Satış Siparişleri` in Satış ve Teklifler. The overview is `/dashboard/satis/musteri-sagligi`, the current Firma snapshot is `/dashboard/satis/musteri-sagligi/:partyId`, and an immutable snapshot is `/dashboard/satis/musteri-sagligi/:partyId/degerlendirmeler/:assessmentId`.

## Overview and Firma merge

The overview merges active canonical customer-role Firmalar with current assessments using `party_id`. A Firma with no snapshot is `Henüz değerlendirilmedi`; this is distinct from an existing `Yetersiz veri` assessment. Status cards, current-only factor distribution, filters and the Revenue Risk lens never aggregate monetary values across currencies.

## Refresh behavior

Owner and employee users can explicitly refresh one Firma or eligible company customers. Company refresh uses sequential batches of at most 200 IDs and reports created, unchanged and failed counts honestly. No refresh runs on page load. Refresh uses only the controlled RPC-backed repository, preserves unchanged fingerprints, creates immutable history when sources change, and never changes CRM, Sales or Finance source records or creates tasks/messages.

## Detail, factors and evidence

Current detail shows status, summary, confidence, sufficiency, ruleset, primary risk, negative/positive/neutral factors, safe evidence and separate currency contexts. Confidence describes evidence quality, not churn probability. Evidence is read from the stored snapshot, grouped by factor and ordered chronologically. It does not re-query or display private activity bodies, personal notes, email bodies, phone/address, tax identifiers, IBAN or attachments.

Historical routes render only the selected immutable assessment and its stored factors, evidence and contexts. They are visibly marked historical and expose no refresh control.

## Revenue Risk terminology

Revenue Risk means deterministic signals such as overdue receivables, late payments, order inactivity/value decline, quotation deterioration and relationship inactivity. It is not predicted lost revenue, churn probability, an AI output, a hidden score or a cross-currency exposure total.

## Firma, permissions and accessibility

Firma Detayı includes a compact Müşteri Sağlığı panel without becoming Firma 360. Owner/employee may refresh; accountant is read-only. All pages use active-company-scoped repositories, labelled controls, keyboard-operable dialogs/actions, textual status labels, responsive cards, honest states and no color-only meaning.

## Deliberate limits

There is no automatic refresh scheduler, Realtime, automatic task/activity/communication, churn model, machine learning, Opportunity Scoring, Forecasting, Analytics, currency conversion, legacy Cari access or Finance mutation.
