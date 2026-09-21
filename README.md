# Aurora Stays

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file from template:

```bash
copy .env.example .env.local
```

3. Update required values in `.env.local`:

- `MONGODB_URI`
- `JWT_SECRET`

4. Manual payment setup (no online gateway):

- `MANUAL_BANK_NAME`
- `MANUAL_BANK_ACCOUNT_NAME`
- `MANUAL_BANK_ACCOUNT_NUMBER`
- `MANUAL_MOBILE_PROVIDER`
- `MANUAL_MOBILE_ACCOUNT_NAME`
- `MANUAL_MOBILE_PHONE`

Customers pay manually and submit a receipt or transaction reference.

5. Start dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Manual Payment Workflow

1. Customer creates booking in Step 4 payment page.
2. Customer sees bank transfer and mobile money instructions.
3. Customer uploads receipt (image/pdf) or enters transaction reference.
4. Payment is stored as `PENDING`.
5. Admin reviews payment in `/admin/payments` and approves or rejects.
6. Booking is confirmed only after payment approval.
