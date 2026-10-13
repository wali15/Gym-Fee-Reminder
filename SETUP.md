# Setup Guide

This app is **zero-touch**: you never run SQL or setup commands. The only thing
you provide is a Turso database. The app creates its own tables, generates its
own session secret, and lets you create the first admin from the login screen.

---

## What you need

- A [Turso](https://turso.tech) account (free tier is fine)
- A hosting account — [Netlify](https://netlify.com) or [Vercel](https://vercel.com) (both supported)

That's it. No email/WhatsApp account is required to get started — you can add
those later, inside the app.

---

## Step 1 — Create a Turso database

1. Sign up at [turso.tech](https://turso.tech).
2. Create a database (via the Turso dashboard or CLI).
3. Copy two values:
   - **Database URL** — looks like `libsql://your-db-name.turso.io`
   - **Auth token** — a long token string

> You do **not** need to create any tables or run `schema.sql`. The app does
> this for you the first time it connects.

---

## Step 2 — Deploy

### Option A: Deploy to Netlify (Recommended)

1. Push this repository to GitHub/GitLab and connect it in Netlify
   (build command `npm run build`, the Next.js plugin handles the rest).
2. In your Netlify environment variables, set:
   ```
   TURSO_DATABASE_URL = libsql://your-db-name.turso.io
   TURSO_AUTH_TOKEN   = your-auth-token
   ```

3. Deploy.

If you open the app before these are set, you'll see a friendly
**"Waiting for database configuration"** screen — add the two variables, redeploy
(or reload), and you're moving.

### Option B: Deploy to Vercel

1. Push this repository to GitHub/GitLab and import it in Vercel
   (Vercel will automatically detect it's a Next.js app).
2. In your Vercel environment variables, set:
   ```
   TURSO_DATABASE_URL = libsql://your-db-name.turso.io
   TURSO_AUTH_TOKEN   = your-auth-token
   ```

3. Deploy.

4. **Important for scheduled reminders**: Vercel doesn't use Netlify's scheduled functions.
   To enable hourly reminders, you need to:
   - Go to your Vercel project dashboard → Settings → Cron Jobs
   - Create a new cron job that calls `https://your-domain.com/api/check-due` every hour
   - (You'll need to create this endpoint - see note below)

> ⚠️ **Note**: The `check-due` function is currently configured for Netlify scheduled functions.
> For Vercel, you may need to create a simple API route that triggers the check-due logic,
> or modify `netlify/functions/check-due.ts` to work as a standard API route.
> Optional variables (all have safe defaults) are documented in
> [`.env.example`](.env.example).

---

## Step 3 — Create your admin account

On your **first visit**, the app detects there are no users yet and shows a
**"Create your admin account"** form. Enter your name, email, and a password
(min 8 characters). That account becomes the **admin** and you're taken straight
to the dashboard.

> Prefer to pre-seed it? Set `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` (see
> [`.env.example`](.env.example)) and the admin is created automatically the
> first time the app runs — no setup screen needed.

---

## Step 4 — Configure everything in the app

Log in as the admin and open **Settings** (top navigation). Everything is
editable at runtime — no redeploys:

- **Gym** — name, contact email, currency, timezone
- **Reminders** — turn automatic reminders on/off, the hour they run (in your
  timezone), and how many days before the due date to remind
- **Email (Resend)** — enable email, from name/address, and your Resend API key
- **WhatsApp (Meta Cloud API)** — enable WhatsApp, phone number ID, access
  token, template language, and template names

Secrets (API keys/tokens) are stored securely and never shown back to you in
full — you'll see only the last 4 characters. Leave a secret field blank to keep
the existing value.

Manage additional logins under **Users** (admin only): add standard or admin
users, change roles, reset passwords, or remove accounts.

---

## 🆕 New Features

### Member Import/Export
- **Export Members**: Go to `/api/members/export` to download all members as a CSV file
- **Import Members**: Use `/api/members/import` (POST) with a CSV file to bulk import members
  - CSV must include: name, fee_amount, due_date (required)
  - Optional: email, phone, status (defaults to 'due')
  - Format: YYYY-MM-DD for dates

### Audit Logging
- Track all changes to settings and members
- View audit logs at `/api/audit` (admin only)
- Filter by table (`?table=members` or `?table=settings`) and paginate
- Shows who changed what and when

### Enhanced Security
- Input validation on all API endpoints
- Standardized error handling (proper HTTP status codes)
- Secure development script with known password (for local dev only)
- Secrets masked in UI (only last 4 characters shown)

---

## Roles

| Capability | Standard | Admin |
|---|:--:|:--:|
| View dashboard & members | ✓ | ✓ |
| Add/edit member, mark paid, send reminder | ✓ | ✓ |
| Delete member | | ✓ |
| Edit own profile & password | ✓ | ✓ |
| Settings (gym / reminders / email / WhatsApp) | | ✓ |
| User management | | ✓ |

Guard rails: you can't delete your own account or the last remaining admin, and
you can't demote the last admin.

---

## Automatic reminders

A scheduled function (`netlify/functions/check-due.ts`) runs **hourly** and:

1. Flips `due` → `overdue` for past-due members.
2. Finds members due within your configured "days before" window (plus overdue).
3. Sends email + WhatsApp reminders — but **only** in the hour you chose and only
   when automatic reminders are enabled. Each member is reminded at most once per
   day.

Change the reminder hour/timezone/window anytime in **Settings** — it takes
effect on the next hourly run. No configuration lives in code.

---

## Local development (optional)

For working on the app locally against a throwaway SQLite file:

```bash
npm install
node scripts/create-local-db.js   # sample members + a dev admin
npm run dev
```

**Dev Account Credentials:**
- Email: `admin@example.com`
- Password: `Password@110!`  ← **CHANGED FOR SECURITY**

> ⚠️ **SECURITY NOTE**: This password is **known and should only be used for local development**.
> - In production, **never** use this script or these credentials
> - Production admins are created automatically via:
>   1. The `/login` setup screen (when no users exist)
>   2. Or via environment variables: `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH`
> - The setup screen handles admin creation in production (you don't run the script)

---

## FAQ

**Do I need to run `schema.sql` or `npm run db:push`?**
No. Those exist only as optional helpers. The app initializes the schema itself.

**What if I change the Turso database later?**
The app initializes the new database automatically too. You'll create a new admin
on first visit (or pre-seed via env).

**Where are email/WhatsApp keys stored?**
In the `settings` table in your database, entered via the Settings page. Env vars
for them are supported only as fallbacks.

**How do I enable hourly reminders on Vercel?**
Create a Vercel Cron Job that calls `https://your-domain.com/api/check-due` every hour.
(You may need to create this endpoint if it doesn't exist.)

**Is my data safe?**
Yes! All secrets (API keys, tokens) are encrypted in the database and never
returned in full to the client. You only see the last 4 characters for verification.

**Can I customize email/WhatsApp templates?**
Yes! Go to Settings → Email/WhatsApp to configure:
- Template names (must match those in your provider)
- Template language
- Phone numbers/IDs
- Enable/disable services

**What if I forget my admin password?**
If you're the only admin and forget your password, you'll need to reset the
database or use the environment variable method to create a new admin.

**Can I run this with Docker?**
While not officially supported, you can create a Dockerfile based on the Node.js
base image and run `npm install` followed by `npm run build` and `npm start`.

**How do I backup my Turso database?**
Use the Turso CLI: `turso db backup <your-db-name>` or enable automatic backups
in your Turso dashboard.

**Why am I seeing a "Waiting for database configuration" screen?**
This means the `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` environment variables
are not set or are incorrect. Check your hosting provider's environment variable
settings and ensure they match the values from your Turso dashboard.