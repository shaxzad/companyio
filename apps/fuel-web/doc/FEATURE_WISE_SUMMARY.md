# Petrol Pump Web App — Feature-Wise Summary (for review)

This is a restated understanding of *Petrol_Pump_Feature_Development_Plan.docx* (Section 2 Gaps and Section 4 Features 1–18).

**No coding yet. No tech stack in this document.**

Confirm this matches the plan before any feature is built. After confirmation, work is strictly one feature at a time, in this order:

- Build only what is listed in that feature’s Scope — nothing extra, nothing from a later feature.
- Follow the Business Rules / Calculations exactly as written.
- Build the Screens / UI listed for that feature.
- After finishing a feature, stop, summarize against its Definition of Done, and wait for confirmation before the next feature.
- If something depends on an unanswered question from Section 5, use a simple configurable / placeholder approach — do not hard-code a permanent guess.

---

## Concepts that must not be merged

Taken from Gap 2.1. These stay separate in the product and in the database.

| Concept | Meaning | Paper form |
| --- | --- | --- |
| **A — Company Credit / Udhaar** | Fuel given to an outside company / vehicle without immediate payment. A receivable. Increases what the company owes the pump. | Not the form’s “CREDITS STATEMENT” |
| **B — Cash Paid Out / Disbursement** | Expense (salary, rent, tanker tip, etc.) paid directly from today’s cash collection. Deducted when calculating Cash in Hand. | The form’s “CREDITS” / “Total Credits” |

Daily Closing should pull cash-paid expenses from the Expenses module (Concept B) into the same deduction the paper form calls “Total Credits”. Do not create a second, conflicting “credit” concept.

Other gaps carried into the plan:

- **Gap 2.2:** BBF Cash (balance brought forward) is added in Feature 3 and used in Feature 13.
- **Gap 2.3:** Multiple meters / nozzles per product are supported in Feature 4.
- **Gap 2.4:** Tanker receiving includes Total Dip and Received-Dip in Feature 5.
- **Gap 2.5:** “Advance Cash” and the blank “Received Amount” table are left out of early features until the owner confirms what they mean.

---

## Feature order

| # | Feature | Phase | Depends On |
| --- | --- | --- | --- |
| 1 | Project Setup & Authentication | Phase 0 — Foundation | None |
| 2 | Master Data (Pump, Products, Tanks, Denominations) | Phase 0 — Foundation | F1 |
| 3 | Business Date & Daily Opening | Phase 1 — Daily Entry | F2 |
| 4 | Fuel Sales Entry (multi-meter) | Phase 1 — Daily Entry | F3 |
| 5 | Fuel Receiving / Tanker Entry | Phase 1 — Daily Entry | F3 |
| 6 | Company & Vehicle Master | Phase 1 — Daily Entry | F2 |
| 7 | Company Credit / Udhaar + Invoice | Phase 1 — Daily Entry | F6, F4 |
| 8 | Online Payments Entry | Phase 1 — Daily Entry | F3 |
| 9 | Expenses & Cash Disbursements | Phase 1 — Daily Entry | F3 |
| 10 | Salary & Rent Advances | Phase 1 — Daily Entry | F9 |
| 11 | Cash Denomination Entry | Phase 2 — Closing Inputs | F3 |
| 12 | Stock Reconciliation | Phase 2 — Closing Inputs | F4, F5 |
| 13 | Daily Cash Reconciliation | Phase 3 — Reconciliation | F7, F8, F9, F11 |
| 14 | Daily Profit & Loss | Phase 3 — Reconciliation | F12, F13 |
| 15 | Daily Closing Workflow & Approval | Phase 3 — Reconciliation | F13, F14 |
| 16 | Audit Trail | Phase 4 — Controls | F1 |
| 17 | Reports Module | Phase 4 — Controls | F15 |
| 18 | Dashboard | Phase 5 — Wrap-up | F17 |

---

## Feature 1 — Project Setup & Authentication

**Phase 0 · Depends on: none**

### What it does

Secure login with role-based access before any business data exists.

### Scope — build

- Login / logout screen
- Roles: Owner, Manager, Staff/Cashier, Accountant
- Basic user management: create / deactivate a user, assign a role
- Every later screen must check the logged-in user’s role before showing edit / approve actions

### Screens / UI

- Login page
- User list (owner-only)
- Add / edit user form

### Scope — do not build

Master data, daily entry, reports, dashboard, or any business modules.

### Definition of Done

- A user can log in with the correct role and cannot access screens outside that role.
- Owner can create / deactivate other users.

---

## Feature 2 — Master Data (Pump, Products, Tanks, Denominations)

**Phase 0 · Depends on: F1**

### What it does

Set up the reference data every later feature uses.

### Scope — build

- Pump / business profile (name, address, logo for invoices)
- Products (Petrol/PMG, Diesel/HSD, extendable to more)
- Tanks linked to a product (e.g. PMG Tank 1, PMG Tank 2, HSD Tank 1), with opening-stock capability
- Meters / nozzles linked to a tank / product (supports multiple readings per product — Gap 2.3)
- Configurable cash denomination list (5000, 1000, 500, 100, 50, 20, 10 — editable, not hard-coded)
- Current selling rate per product, effective-dated so rate changes over time are tracked

### Screens / UI

- Settings > Products
- Settings > Tanks & Meters
- Settings > Denominations
- Settings > Selling Rates

### Scope — do not build

Daily opening, sales, receiving, credit, expenses.

### Definition of Done

Owner can add / edit a product, tank, meter, denomination, and rate without asking a developer.

---

## Feature 3 — Business Date & Daily Opening

**Phase 1 · Depends on: F2**

### What it does

Let staff open a working day and carry forward the previous day’s closing values automatically. Adds **BBF Cash** (Gap 2.2), which the original requirements missed.

### Scope — build

- Select / create the business date (independent from system entry date — supports night / batch entry)
- Auto-fill opening meter readings for each meter from yesterday’s closing readings (editable if a correction is needed)
- Auto-fill opening stock per tank from yesterday’s closing stock
- Enter / confirm BBF Cash (balance brought forward from previous day)

### Business rules

A day cannot be opened until the previous day is Closed (or explicitly overridden by Owner).

### Screens / UI

Daily Opening screen: date picker, opening readings table, opening stock table, BBF Cash field.

### Scope — do not build

Sales entry, receiving, cash reconciliation UI. BBF is only stored here; it is used later in Feature 13.

### Definition of Done

- Opening a new day correctly pulls forward all closing values from the last closed day.
- BBF Cash is stored and visible on the closing screen later.

---

## Feature 4 — Fuel Sales Entry (multi-meter)

**Phase 1 · Depends on: F3**

### What it does

Record petrol and diesel sales exactly like the paper form: multiple meters per product, auto-calculated (Gap 2.3).

### Scope — build

- For each meter: Opening Reading (auto-filled), Closing Reading (entered), Liters (auto = Closing − Opening), Rate (auto from current selling rate, overridable with reason), Amount (auto = Liters × Rate)
- Auto-sum all meters of the same product into “Total Sale PMG” / “Total Sale HSD” style totals
- Store both transaction date/time and system entry date/time

### Business rules / calculations

- Liters = Closing − Opening per meter
- Amount = Liters × Rate per meter
- Product Total Sale = sum of all meter amounts for that product

### Screens / UI

Fuel Sales entry grid (one row per meter, grouped by product).

### Scope — do not build

Receiving, credit sales, cash reconciliation, stock reconciliation.

### Definition of Done

Entering closing readings for all meters produces the same “Total Sale PMG” and “Total Sale HSD” figures as the paper form.

---

## Feature 5 — Fuel Receiving / Tanker Entry

**Phase 1 · Depends on: F3**

### What it does

Record tanker deliveries including the Access / gain rule and dip-based measurements (Gap 2.4).

### Scope — build

- Tanker Number, Supplier, Product, Expected Liters (delivery note), Actual / Received Liters, Total Dip, Received-Dip, Purchase Rate, Tanker Tip, Other Receiving Cost, Date/Time
- Auto-calculate Access = Actual − Expected (only when positive; flag negative as a shortage instead)
- Access valuation rate is a configurable setting, not hard-coded — default to Purchase Rate until the owner confirms otherwise
- Fuel Cost = Actual Liters × Purchase Rate (costing method is a placeholder until Section 5 is answered)

### Business rules / calculations

- Access (L) = Actual Liters − Expected Liters, when positive
- Fuel Cost = Actual Liters × Purchase Rate (costing method to be confirmed)

### Screens / UI

- Tanker Receiving entry form
- Receiving history list per tank

### Scope — do not build

Stock reconciliation screen, P&L, a hard-coded costing method, or a hard-coded Access rate.

### Definition of Done

A tanker entry auto-calculates Access and updates the receiving tank’s stock.

---

## Feature 6 — Company & Vehicle Master

**Phase 1 · Depends on: F2**

### What it does

Set up the customers who buy fuel on credit, before recording any credit transaction.

### Scope — build

- Company master: name, email, contact, credit type (daily / monthly / both), active / inactive
- Vehicle master: company, vehicle number, driver name, active / inactive, vehicle history

### Screens / UI

- Companies list + add / edit form
- Vehicles list + add / edit form (linked to a company)

### Scope — do not build

Credit transactions, invoices, ledger postings.

### Definition of Done

A company can be created with at least one vehicle and appears in a dropdown for credit entry.

---

## Feature 7 — Company Credit / Udhaar + Invoice

**Phase 1 · Depends on: F6, F4**

### What it does

Record fuel given to a company vehicle on credit and generate the small invoice. This is **Concept A only** — not the paper form’s “Credits” (Concept B).

### Scope — build

- Credit transaction form: Company, Vehicle, Driver, Product, Liters, Rate, Amount (auto), Date/Time, Invoice Number (auto)
- Generate a small PDF invoice with company / vehicle / driver / product / liters / rate / amount / date / invoice number
- Send Email button using the company’s stored email (auto-send vs click-to-send is a Section 5 question — do not hard-code auto-email)
- Company ledger: opening balance, credit transactions, payments received, current outstanding balance

### Business rules / calculations

- Amount = Liters × Rate
- Outstanding Balance = previous balance + new credit − payments received

Rate source (normal pump rate vs fixed company rate vs per-transaction) is a Section 5 question — keep it configurable / placeholder. Same for whether a company can be both daily and monthly credit.

### Screens / UI

- Credit Transaction entry form
- Invoice preview / download screen
- Company Ledger screen

### Scope — do not build

Cash-paid expenses (Concept B), daily cash reconciliation, or merging this with “Total Credits” on the paper form.

### Definition of Done

A credit transaction produces a downloadable invoice and updates that company’s outstanding balance.

---

## Feature 8 — Online Payments Entry

**Phase 1 · Depends on: F3**

### What it does

Record payments received into bank / online accounts, separately from physical cash.

### Scope — build

- Payment account / method, reference number (optional), amount, date/time, related company / invoice (optional)
- Daily total and running monthly total
- Account / method list is configurable (Section 5 — do not hard-code a permanent list)

### Screens / UI

Online Payments entry grid (Name / Account, Qty, Amount — matches the paper form’s layout).

### Scope — do not build

Cash denomination count, cash reconciliation math.

### Definition of Done

Entered online payments sum to a daily total that will feed into Feature 13.

---

## Feature 9 — Expenses & Cash Disbursements

**Phase 1 · Depends on: F3**

### What it does

Cover **Concept B** from Gap 2.1 — anything paid directly out of today’s cash collection. This is what the paper form calls “Credits.”

### Scope — build

- Default categories: Kitchen, Rent, Salary, Tanker Tip, Electricity, Maintenance, Transport, Office, Miscellaneous, Custom
- Custom expense form: category, name, amount, description, payment method (Cash / Bank / Online), date/time, optional attachment, entered-by
- Mark an expense as “Paid from today’s cash” so it feeds into the cash deduction (matching the paper form’s “Total Credits” total) versus an expense paid another way

### Business rules / calculations

Daily “Cash Paid Out” total = sum of expenses marked “Paid from today’s cash”. This is the figure that plays the same role as “Total Credits” on the paper form.

Gap 2.1 confirmation is still an open Section 5 question — do not treat this as company receivables.

### Screens / UI

- Expenses entry list + add form
- Custom category creator

### Scope — do not build

Company receivables, salary / rent advance tracking (Feature 10), cash reconciliation screen.

### Definition of Done

Owner can add a brand-new expense category and record an expense without a developer, and the daily cash-paid-out total matches manual addition.

---

## Feature 10 — Salary & Rent Advances

**Phase 1 · Depends on: F9**

### What it does

Support partial / advance payments against a monthly obligation without double-counting.

### Scope — build

- Rent: monthly amount, advance payments, final payment, status (Advance / Paid / Fully Paid)
- Salary: monthly amount per employee, advance given, remaining balance for the month
- Employee-wise salary history list

### Business rules / calculations

Remaining for month = Monthly Amount − Sum of advances / payments already recorded this month.

### Screens / UI

- Rent Advances screen
- Salary Advances screen
- Employee salary history view

### Scope — do not build

Generic expense categories (already Feature 9), cash reconciliation, P&L.

### Definition of Done

A rent or salary advance recorded mid-month correctly reduces the remaining amount due at month end, with no duplicate counting.

---

## Feature 11 — Cash Denomination Entry

**Phase 2 · Depends on: F3**

### What it does

Let staff count physical cash exactly like the paper form.

### Scope — build

- Denomination rows pulled from Feature 2’s configurable list (5000, 1000, 500, 100, 50, 20, 10, etc.)
- Quantity entered per denomination; amount auto-calculated (Qty × Denomination value); grand total auto-summed

### Business rules / calculations

- Row Amount = Quantity × Denomination value
- Total Cash = sum of all row amounts

### Screens / UI

Cash Denomination entry grid.

### Scope — do not build

Expected-vs-actual cash reconciliation (that is Feature 13).

### Definition of Done

Entering quantities reproduces the same total cash figure as the paper form’s calculation.

---

## Feature 12 — Stock Reconciliation

**Phase 2 · Depends on: F4, F5**

### What it does

Track tank-level stock movement automatically from sales and receipts already entered.

### Scope — build

- Per tank: Opening Stock, Received (from Feature 5), Return, Total, Sale of Day (from Feature 4), Closing Stock (auto)
- Flag any unexplained difference instead of hiding it

### Business rules / calculations

- Total = Opening + Received − Return
- Closing Stock = Total − Sale of Day

### Screens / UI

Stock Reconciliation table, one row per tank.

### Scope — do not build

Cash reconciliation, P&L, closing workflow.

### Definition of Done

Closing stock for each tank auto-updates as sales and receiving entries are made during the day, and becomes tomorrow’s opening stock (Feature 3).

---

## Feature 13 — Daily Cash Reconciliation

**Phase 3 · Depends on: F7, F8, F9, F11**

### What it does

Reproduce the paper form’s cash math automatically, using the real formula confirmed in Gaps 2.1 and 2.2.

### Scope — build

- Pull in: Total Sale (PMG + HSD) from F4, BBF Cash from F3, Online Payments total from F8, Credit sales total from F7, Cash-Paid-Out total from F9
- Show Expected Cash in Hand, Actual Cash counted (F11) + Online Payments, and the Difference

### Business rules / calculations

- Total = Sale PMG + Sale HSD + BBF Cash
- Expected Cash in Hand = Total − Total Credit Sales (F7) − Cash Paid Out (F9)
- Difference = Expected Cash in Hand − (Actual Cash Counted + Online Payments)
- Any non-zero difference must be visibly flagged, not hidden

Do not treat the paper form’s “Credits” as company receivables.

### Screens / UI

Daily Cash Reconciliation summary screen.

### Scope — do not build

P&L, closing / approval workflow.

### Definition of Done

For a fully entered day, the screen’s calculated Cash in Hand matches a manual paper calculation for the same day (as verified against the sample statement).

---

## Feature 14 — Daily Profit & Loss

**Phase 3 · Depends on: F12, F13**

### What it does

Provide the daily gain / loss view, kept separate from the cash view.

### Scope — build

- Revenue (fuel sales), Credit Sales (shown separately), Online Payments (shown separately), Fuel Cost, Tanker Tip, Other Expenses, Access / Gain, Price Gain / Loss, Net Profit / Loss
- Costing method (weighted average / FIFO / other) must be a configurable setting, pending owner confirmation — do not hard-code
- Access valuation and how Tanker Tip affects P&L are Section 5 questions — keep configurable / placeholder

### Business rules / calculations

Net Profit / Loss = Revenue − Fuel Cost − Other Expenses + Access / Gain + Price Gain / Loss  
(exact formula to be confirmed with owner before this feature is finalized)

### Screens / UI

Daily P&L summary screen.

### Scope — do not build

Closing / approval workflow, reports module. Do not hard-code Access valuation or costing method.

### Definition of Done

The P&L screen shows every listed section with real numbers for a fully entered day, and clearly separates cash flow from accounting profit.

---

## Feature 15 — Daily Closing Workflow & Approval

**Phase 3 · Depends on: F13, F14**

### What it does

Tie every previous feature together into the lock / approve / reopen flow.

### Scope — build

- Status flow: Draft → Reconciled → Closed → (Reopened if needed)
- Checklist screen confirming: opening readings, fuel sales, tanker receipts, credit transactions, online payments, expenses, cash denomination, stock reconciliation, cash reconciliation, P&L — all reviewed
- Manager / Owner approval action to move Reconciled → Closed
- Reopen action (role-restricted) that requires a reason and is recorded in the audit trail
- Who can reopen (Manager, Owner, or both) is a Section 5 question — make it configurable, do not hard-code

### Screens / UI

- Daily Closing checklist / summary screen
- Approve / Close button
- Reopen dialog (reason required)

### Scope — do not build

Full audit log viewer (Feature 16), reports (Feature 17), dashboard (Feature 18).

### Definition of Done

A day can only be Closed after every checklist item is complete, and reopening always requires and records a reason.

---

## Feature 16 — Audit Trail

**Phase 4 · Depends on: F1**

### What it does

Make every important change traceable.

### Scope — build

- For key transactions: created by / date-time, last updated by / date-time, transaction date / time
- Old value vs new value stored for edits to already-saved records
- Reason / approval captured when a Closed day is changed
- Audit Log viewer (filter by date, user, record type)

Backdated-entry approval policy is a Section 5 question — use a configurable / placeholder rule, do not hard-code a permanent policy.

### Screens / UI

Audit Log viewer (filter by date, user, record type).

### Scope — do not build

Reports, dashboard.

### Definition of Done

Editing any locked / closed-day record is blocked without a recorded reason, and the change history is viewable.

---

## Feature 17 — Reports Module

**Phase 4 · Depends on: F15**

### What it does

Turn the data already captured into the listed reports.

### Scope — build

- Daily report, Monthly report, Company statement, Vehicle consumption report, Stock report, Cash report, P&L report
- Export to PDF / print for at least the daily statement and company statement
- Date-range filters

### Screens / UI

- Reports list screen
- Individual report viewers with date-range filters

### Scope — do not build

Dashboard, new data-entry screens.

### Definition of Done

Each listed report can be generated for a chosen date range and matches the underlying daily data.

---

## Feature 18 — Dashboard

**Phase 5 · Depends on: F17**

### What it does

Give the owner a quick daily / weekly snapshot on login.

### Scope — build

Today’s sales, cash position, outstanding company credit, and any unresolved differences / flags from Features 13–15.

### Screens / UI

Dashboard home screen.

### Scope — do not build

New reports, new entry modules, extra analytics beyond this list.

### Definition of Done

Owner sees an accurate at-a-glance summary immediately after logging in.

---

## Section 5 — Open questions (placeholders only; do not block Features 1–6)

These do not block starting development. Features 1–6 have no dependency on them. They should be answered before Features 5, 7, 9, 13, and 14 are considered final. Until then, use a simple configurable / placeholder — do not hard-code a permanent guess.

1. What does “Access” mean precisely, and what rate values it — purchase cost, current selling rate, or another rate? *(F5, F14)*
2. Which inventory costing method when purchase price changes — FIFO, weighted average, or another? *(F5, F14)*
3. For company credit, is the rate always the normal pump selling rate, a fixed company rate, or chosen per transaction? *(F7)*
4. Can a company be both daily and monthly credit, or is one method chosen per company? What is the monthly billing cycle? *(F7)*
5. Confirm: on the real paper form, “Credits” = cash paid out for salary / rent / tanker tip, not company receivables. *(F9, F13)*
6. What exactly is “BBF Cash” — always yesterday’s uncounted / undeposited cash carried forward? *(F3, F13)*
7. What is “Advance Cash” on the form, and what is the blank “Received Amount” (Name / Qty / Amount) table used for? *(Gap 2.5 — out of early features)*
8. Can staff create backdated entries freely, or does a manager / owner need to approve them? *(F1, F16)*
9. How should Tanker Tip affect P&L — separate cost only, or also folded into landed fuel cost? *(F5, F14)*
10. Should invoices be emailed automatically, or only when staff clicks Send? *(F7)*
11. Which online payment accounts / methods should be available? *(F8)*
12. Who is allowed to reopen a Closed day — Manager, Owner, or both? *(F15, F16)*

---

## Review checklist

Mark each item when you agree this summary is correct:

- [ ] Feature 1 understood
- [ ] Feature 2 understood
- [ ] Feature 3 understood (includes BBF Cash)
- [ ] Feature 4 understood (multi-meter)
- [ ] Feature 5 understood (dip fields + configurable Access rate)
- [ ] Feature 6 understood
- [ ] Feature 7 understood (Concept A only; not paper “Credits”)
- [ ] Feature 8 understood
- [ ] Feature 9 understood (Concept B = paper “Credits” / Cash Paid Out)
- [ ] Feature 10 understood
- [ ] Feature 11 understood
- [ ] Feature 12 understood
- [ ] Feature 13 understood (paper cash formula)
- [ ] Feature 14 understood (P&L separate from cash; costing configurable)
- [ ] Feature 15 understood
- [ ] Feature 16 understood
- [ ] Feature 17 understood
- [ ] Feature 18 understood
- [ ] Concept A vs Concept B must stay separate
- [ ] Section 5 questions will use placeholders, not permanent guesses

After you confirm, Feature 1 is the first (and only) thing to build.
