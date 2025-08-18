# ERP Manufacturing Plan: Quotations → Work Orders → Billing

A clear, team-friendly plan to implement the 3-stage flow with scheduling, quote versioning/discounts, payments (token/progress/final), extras, and final billing.

- Stage 1: Quotations (pricing, versions, approval, print)
- Stage 2: Work Orders (the “middle” stage: scheduling, capacity, production, extras, progress payments)
- Stage 3: Billing (Invoices: final settlement and print). To be added after Stage 2 is stable.

We’ll implement Stage 2 now using the existing Bill model as Work Order (fast path), then optionally refactor later to a dedicated WorkOrder + Invoice model.

---

## 1) Vocabulary and scope
- Quotation: Offer sent to customer; can have multiple versions (v1 base, v2 with discount, etc.). Latest version is the one to print by default.
- Work Order (middle stage): The accepted order we schedule and execute in the workshop. Today, we’ll use the existing Bill model for this stage to move fast.
- Billing (Invoice): Final invoice after work is done; subtract payments (token/progress) from total; show remaining balance.
- Capacity: Max concurrent vehicles the workshop can work on per day. Configurable (default 2).
- Token payment: Amount paid at time of accepting the order (conversion Quote → Work Order).
- Progress payments: Payments made during the job.
- Final payment: Payment at invoice stage to close the balance.
- Extras: Additional costs added during the job (customer-requested changes or other reasons).

Assumption: 1 day = whole-day blocks; job occupies continuous days from appointment_date to appointment_date + required_days − 1.

---

## 2) Stages overview
- Stage 1: Quotations
  - Create, edit, version (discount amount/percent), approve.
  - Print latest version by default; allow printing any version.
- Stage 2: Work Orders (current release focus)
  - Convert approved quotation to Work Order with appointment_date and required_days.
  - Validate capacity (max 2 concurrent). If full, API suggests earliest available start date.
  - Track job lifecycle: scheduled → in_progress → completed → delivered.
  - Add extras and accept payments (token/progress) during the job.
- Stage 3: Billing (later)
  - Create Invoice from Work Order totals (base + extras − payments).
  - Record final payment; print invoice.

---

## 3) Data model (minimal changes now)
We’ll keep the current models and add only what’s needed for Stage 2. Later we can refactor cleanly.

- QuotationVersion (new)
  - Fields: id, quotation(FK), version(int per quotation), base_total, discount_amount?, discount_percent?, final_total, notes?, created_by, created_at.
  - Purpose: store every discount/version; latest is printed by default.

- Bill (used as Work Order for now)
  - Add field: base_amount Decimal(12,2) — freeze the agreed quote total at conversion time.
  - Ensure/Use fields: appointment_date (Date), required_days (int), expected_delivery_date (Date), status, actual_delivery_date, completed_at.
  - Existing aggregations: total_added_features_cost (sum of AddedFeature.cost) already maintained.

- Payment (existing)
  - payment_type should include: token, progress, final.

- AddedFeature (existing)
  - Used to track extras during the job.

Later refactor (optional): introduce WorkOrder (separate model) and Invoice; move Payments to Invoice for final stage.

---

## 4) Scheduling and capacity
- Capacity per day: 2 concurrent vehicles (configurable later).
- Occupancy window: [appointment_date, appointment_date + required_days − 1].
- Count overlapping Work Orders in statuses: scheduled, in_progress.
- Validation: if any day in the window hits capacity, reject with 400 and provide the next available start date.
- Suggestion algorithm:
  - Given required_days and an optional start date (default today), scan forward to find the earliest contiguous block where daily load < capacity.
- Load summary:
  - Return per-day counts and availability for a window (e.g., next 30 days) to power a calendar/heatmap UI.

---

## 5) Finance logic and formulas
- base_amount: frozen when converting quotation → work order. Prefer latest Quote Version’s final_total; fallback to quotation.final_total or suggested_total.
- added_features_total: Sum(AddedFeature.cost) for the work order.
- gross_total = base_amount + added_features_total.
- payments:
  - token_total = sum of payments where payment_type = token
  - progress_total = sum where payment_type = progress
  - final_total = sum where payment_type = final (later for billing stage)
  - total_paid = token_total + progress_total + final_total
- balance_due = max(gross_total − total_paid, 0)
- Overpayment guard: if total_paid > gross_total, surface overpayment = total_paid − gross_total.

Validation:
- No negative totals; discount percent 0–100; payment amounts > 0.

---

## 6) Backend API (Django REST) — additions/changes
Note: We extend existing ViewSets in `manufacturing/views.py`.

Quotations
- POST /api/quotations/{id}/versions
  - Body: discount_amount? (decimal), discount_percent? (decimal), notes?
  - Creates a new version; computes final_total; version auto-increments per quotation.
- GET /api/quotations/{id}/versions
  - Lists versions (latest first).
- GET /api/quotations/{id}/print?version=latest|{n}&download=0|1
  - Existing print action extended to select version; default latest.
- POST /api/quotations/{id}/approve
  - Optionally binds to latest version final_total; store reviewer and timestamp.

Work Orders (BillViewSet used as Work Orders for now)
- POST /api/bills
  - Body: quotation_id, appointment_date (YYYY-MM-DD), required_days (int), token_payment_amount? (decimal), token_payment_notes? (string)
  - Validates capacity; if full, returns 400 with {message, suggestionDate} (first available start date).
  - Creates Bill with base_amount from latest quote version (fallback: quotation.final_total/suggested_total).
  - If token_payment_amount > 0, creates a Payment of type 'token' atomically.
- GET /api/bills/{id}/finance
  - Returns: base_amount, added_features_total, gross_total, payments breakdown, total_paid, balance_due (and overpayment if any).
- POST /api/bills/{id}/payments (or use PaymentViewSet create with bill)
  - Body: amount, payment_type ('progress'|'final'), notes?, payment_date?
  - Returns updated finance summary.
- GET /api/payments/summary?bill={id}
  - Returns payment totals grouped by type and total_paid.
- Scheduling helpers
  - GET /api/bills/schedule/summary?start=YYYY-MM-DD&days=30
    - Returns per-day load, capacity, and availability for calendar.
  - POST /api/bills/schedule/suggest
    - Body: required_days, start? (YYYY-MM-DD) → Returns earliest suggested appointment_date.
- Lifecycle (existing)
  - POST /api/bills/{id}/start_job → status in_progress
  - POST /api/bills/{id}/complete_job → status completed, set completed_at
  - POST /api/bills/{id}/deliver → status delivered, set actual_delivery_date

Notes
- Security: all endpoints require IsAuthenticated; restrict creation/approval to roles if applicable.
- Transactions: conversion with token payment should be atomic to avoid partial state.

---

## 7) Frontend (React/Vite) — pages and flows
Navigation
- Sidebar: add Work Orders (Stage 2). Keep Billing (Stage 3) for later.

Quotation detail
- Versions panel
  - Show v1 base, v2 discount, … newest first.
  - Create new version with discount amount/percent and notes.
  - Print latest by default; dropdown to print any version.
- Convert to Work Order modal
  - Fields: required_days, appointment_date, token payment amount (optional), notes (optional).
  - Auto-suggest appointment_date when required_days changes (uses suggest API).
  - Show load/availability widget (mini heatmap) using schedule summary.
  - On submit: create Work Order; navigate to detail.

Work Orders
- List page (/work-orders)
  - Group or filter by status: Scheduled, In Progress, Completed, Delivered.
  - Columns: customer, vehicle, appointment_date, required_days, expected_delivery_date, status, balance_due.
- Detail page (/work-orders/:id)
  - Header with key dates and lifecycle actions (start/complete/deliver).
  - Finance summary panel: base_amount, extras, gross_total, payments breakdown, balance_due.
  - Tabs/sections:
    - Extras (Added Features): list + add; shows running total.
    - Payments: add payment (progress/final), show history and totals.
    - Schedule: show calendar block for this job.

---

## 8) Phase delivery plan
Phase 1 (now)
- Backend:
  - Add Bill.base_amount.
  - Implement capacity validation on creation; schedule summary/suggest endpoints.
  - Quotation versions (create/list) and print version selection; approve ties to latest version.
  - Finance summary endpoint and payments summary.
- Frontend:
  - Work Orders list/detail pages (MVP).
  - Convert-from-quote modal with required_days, appointment_date, token payment, and suggest.
  - Versions panel on quotation detail; print latest.

Phase 2 (UX polish)
- Mini calendar/heatmap on convert modal and work order detail.
- Better error states, toasts, and role-based controls.

Phase 3 (refactor + billing)
- Introduce WorkOrder model separate from Bill; introduce Invoice model for Stage 3.
- Migrate payments to Invoice for final stage; add printable invoice.

---

## 9) Edge cases and rules
- Capacity counts statuses: scheduled, in_progress. Completed/delivered excluded.
- expected_delivery_date = appointment_date + required_days − 1.
- Reject negative discounts and payments; cap discount percent 0–100.
- Prevent overbooking edits (validate capacity on update as well).
- Overpayment surfaced in finance summary; decision on refunds is out of scope.

---

## 10) Acceptance criteria (Stage 2)
- Create Work Order from an approved quotation with appointment_date, required_days, and optional token payment; capacity-validated with a suggested start date if full.
- Add extras and see totals update.
- Add progress payments and see balance update.
- View finance summary at any time: base_amount, extras, gross, paid (by type), balance due.
- Quotation versions can be created and listed; print latest by default.

---

## 11) Open configuration (defaults)
- capacity_per_day: 2
- schedule_summary_window_days: 30
- default_scheduling_start: today

These can be promoted to settings later.

---

## 12) Next steps checklist
- [ ] Backend: add Bill.base_amount migration and implement endpoints (versions, finance, schedule).
- [ ] Frontend: routes/pages for Work Orders, convert modal, versions UI.
- [ ] Wire finance summary and payments UI.
- [ ] Smoke test: create quote → version → approve → convert with token → add extras → add payment → verify balance.

Notes: We intentionally keep “Bill” as Work Order for speed. A clean WorkOrder + Invoice split can be introduced after Stage 2 is live.
