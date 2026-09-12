# How to use Fuel Management

Step-by-step guide for pump staff and owners. Use this when onboarding someone new, or after a feature ships.

**Tip:** Pick the right **station** on screens that ask for it — figures and stock are per station.

---

## 1. Sign in & roles

1. Open the Fuel app and sign in with your email and password.
2. Your **role** controls what you can see and edit:
   - **Owner** — full access, users, settings
   - **Manager** — operations + most credit / settings
   - **Staff / Cashier** — daily opening, sales, receiving
   - **Accountant** — companies, vehicles, ledger, reports

If a menu item is missing, your role does not include that screen.

---

## 2. First-time setup (Owner)

Do this once before daily work.

### Pump / station profile
1. Open **Settings → Pump profile**.
2. Confirm station name and details.

### Products
1. Open **Settings → Products**.
2. Click **Add product** (popup). Enter name, code, selling and purchase prices.
3. Click **Add product**. While saving the button shows **Adding…**; when editing it becomes **Update product** / **Updating…**.
4. Use **Edit** or **Deactivate** on a row as needed.

### Tanks & meters
1. Open **Settings → Tanks & meters**.
2. Select the **station**.
3. Click **Add tank** (opens a popup). Enter name, product, capacity, opening stock → **Add tank**.
4. To change a tank, click **Edit** → change fields → **Update tank** (button shows **Updating…** while saving).
5. Use **Deactivate** if a tank should stop appearing for new work (history stays).
6. Click **Add pump**, then **Add nozzle**, and link each nozzle to the correct tank.

### Selling rates
1. Open **Settings → Rates**.
2. Choose a product, enter **selling price per litre**.
3. Optionally set **Effective from** with the date/time picker (blank = now).
4. Click **Post selling rate**.

### Cash denominations
1. Open **Settings → Denominations**.
2. Add note / coin values used when counting cash (e.g. 5000, 1000, 500).

### Users
1. Open **Users**.
2. Create staff with the correct role; deactivate people who leave.

---

## 3. Daily opening (start of day)

1. Open **Daily opening**.
2. Select **station** and **business date** (calendar picker).
3. Review auto-filled **opening meter** and **tank** figures (from last closed day, or setup if first day).
4. Enter / confirm **BBF Cash** (cash brought forward).
5. If the system asks for an owner override, enter a reason (owner only).
6. Click **Open business day**.

You cannot post meter sales for a date until that business day is open.

---

## 4. Meter sales (cash pump sales)

1. Open **Meter sales**.
2. Select station (business date comes from the open day).
3. Enter **closing** meter readings for each nozzle.
4. Confirm / adjust rate if needed.
5. Optionally set **Sale date / time** (blank = now).
6. Save / post the sheet.

Totals should match “Total Sale” per product on the paper form.

---

## 5. Fuel receiving (tanker)

1. Open **Receiving**.
2. Select station, product, and tank.
3. Enter dips / litres, supplier, costs as required.
4. Optionally set **Date / time** (blank = now).
5. Save — **Access** (gain) is calculated and tank stock updates.

---

## 6. Companies & vehicles (credit customers)

### Companies
1. Open **Companies**.
2. Click **Add company** (popup). Enter name, contact, email (for invoices), credit type (daily / monthly / both), limit, opening balance if needed.
3. Submit with **Add company** (or **Update company** when editing).
4. Save.

### Vehicles
1. Open **Vehicles**.
2. Click **Add vehicle** (popup).
3. Choose company, registration, driver name if known.
4. Click **Add vehicle** / **Update vehicle**.
5. The vehicle appears in credit-sale dropdowns.

---

## 7. Company credit (udhaar) + invoice

This is **fuel on credit to a company** (receivable). It is **not** cash paid out for salary/rent (that is a later Expenses feature).

### Post a credit sale
1. Open **Credit sales** (sidebar: under Sales & Credit).
2. Select station, company, vehicle, product, tank.
3. Enter litres and rate (amount calculates).
4. Optional: driver name, **Date / time**, notes.
5. Submit — you are taken to the **invoice**.

### Invoice
1. Review company, vehicle, product, litres, rate, amount, invoice number.
2. Use **Print / PDF** to download or print.
3. Use **Email** only if the company has an email stored (opens your mail app — it does not auto-send).

### Company ledger
1. Open **Company ledger**.
2. Select the company.
3. Review opening balance, credit sales, payments, and **outstanding**.

---

## Date & time fields

Wherever you see a calendar field:

1. Click the field (or calendar icon).
2. Pick the date; for date/time fields, also set the time.
3. Leave blank when the hint says “use now” if you want the current time.

Do not use the browser’s plain `dd/mm/yyyy` box — the app uses a shared date picker.

---

## Typical daily flow (checklist)

1. **Open** the business day  
2. Enter **meter sales** as the day runs  
3. Enter **tanker receiving** when a tanker arrives  
4. Enter **credit sales** when a company takes fuel on udhaar  
5. (Later features) online payments, expenses, cash count, closing  

---

## Need help?

- Wrong numbers after opening → check station and business date.
- Credit sale missing a vehicle → add it under **Vehicles** first.
- Cannot open a screen → ask the owner to check your role under **Users**.

When a new feature is added to the product, this file should get a new numbered section with the same “click-by-click” style.
