# Gym Fee Reminder System

A full-stack, **multi-user** gym membership fee reminder app with automated Email
(Resend) and WhatsApp (Meta Cloud API) notifications. Built with Next.js 14,
Turso (libSQL), Netlify, and Tailwind CSS.

**Zero-touch setup:** the only thing you provide is a Turso database URL + token.
The app creates its own tables, generates its session secret, lets you create the
first admin from the login screen, and is configured entirely in-app — no SQL, no
setup commands, ever. See **[SETUP.md](SETUP.md)** for the 4-step guide.

## Features

- **Zero-touch initialization**: paste Turso credentials → the app builds its own
  schema and seeds itself. Graceful "waiting for database" screen until it's wired up.
- **Multi-user with roles**: `admin` and `standard` users, with server-enforced access control.
- **In-app configuration**: gym branding, reminder time/timezone, and Email + WhatsApp
  settings are all editable at runtime under **Settings** — no redeploys.
- **Member Management**: Full CRUD for gym members (name, email, phone, fee amount, due date, status).
- **Visual Dashboard**: Color-coded member table (🔴 Overdue, 🟡 Due Soon, 🟢 Paid).
- **Automated Reminders**: Hourly cron checks due dates and sends reminders at the hour you choose.
- **Manual Reminders**: Per-member "Send Reminder" button for immediate notifications.
- **Payment Tracking**: Mark-as-paid button + Stripe/Razorpay webhook support for auto-mark-paid.
- **PWA Support**: Installable, offline-capable with cached member data.
- **Responsive Design**: Mobile-first UI with Tailwind CSS.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router, TypeScript), React 18, Tailwind CSS |
| Database | Turso (libSQL) — self-initializing schema |
| Hosting | Netlify (Static + Scheduled Functions) |
| Email | Resend |
| WhatsApp | Meta WhatsApp Cloud API |
| Auth | Jose (JWT), bcryptjs, role-based access |
| Payments | Stripe / Razorpay (optional webhooks) |

## Quick Start

### Prerequisites

- Node.js 18+
- A Turso database account (the only hard requirement)
- Netlify account (for deployment)
- Optionally: Resend and/or Meta WhatsApp Cloud API — but these are configured
  **in the app**, not at build time

### 1. Clone & Install

```bash
git clone <your-repo>
cd gym-fee-reminder
npm install
```

### 2. Provide your Turso database

Create a database at [turso.tech](https://turso.tech) and copy its URL + token.
Set them as environment variables (locally in `.env.local`, in production in your
Netlify dashboard):

```env
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

**You do not need to run `schema.sql` or any migration.** The app creates its
tables automatically on first connection. Everything else in `.env.example` is
optional. See **[SETUP.md](SETUP.md)** for the full walkthrough.

### 3. Development

```bash
npm run dev
```

Open http://localhost:3000. On first visit you'll be prompted to **create your
admin account**.

For a pre-populated local database (sample members + a dev admin), run:

```bash
node scripts/create-local-db.js
```

It prints the dev admin credentials to log in with.

### 4. Create your admin & configure

- **First visit** → create the admin account.
- Log in → open **Settings** to set gym name, reminder hour/timezone, and enable
  Email/WhatsApp (enter your Resend key / WhatsApp token here — stored securely,
  shown masked).
- Open **Users** to add more admins or standard users.

### 5. WhatsApp Template Setup (only if you use WhatsApp)

Create these templates in Meta Business Manager, then set their names in
**Settings → WhatsApp** (defaults shown):

1. **fee_due_reminder** (due soon):
   ```
   Hi {{1}}, your gym fee of {{2}} is due on {{3}}. Please pay to continue access.
   ```
2. **fee_overdue_reminder** (overdue):
   ```
   ⚠️ Hi {{1}}, your gym fee of {{2}} was due on {{3}} and is now OVERDUE. Please pay immediately.
   ```
3. **payment_confirmation**:
   ```
   ✅ Hi {{1}}, your payment of {{2}} has been received. Thank you!
   ```

### 6. Deploy to Netlify

1. Push to GitHub/GitLab.
2. Connect the repo in Netlify.
3. Build command: `npm run build` · Publish directory: `.next`.
4. Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in the Netlify dashboard.
5. Deploy.

Netlify automatically deploys the Next.js app via `@netlify/plugin-nextjs` and
runs `netlify/functions/check-due.ts` on an hourly schedule (defined in the
function itself).

## Roles

| Capability | Standard | Admin |
|---|:--:|:--:|
| View dashboard & members | ✓ | ✓ |
| Add/edit member, mark paid, send reminder | ✓ | ✓ |
| Delete member | | ✓ |
| Edit own profile & password | ✓ | ✓ |
| Settings (gym / reminders / email / WhatsApp) | | ✓ |
| User management | | ✓ |

Access is enforced server-side in the API routes. Guard rails prevent deleting
your own account or the last admin, and demoting the last admin.

## Project Structure

```
gym-fee-reminder/
├── app/
│   ├── layout.tsx              # Root layout + PWA manifest + SW registration
│   ├── page.tsx                # Redirects to /login or /dashboard
│   ├── login/page.tsx          # Login + first-run "create admin" + waiting-for-DB states
│   ├── dashboard/page.tsx      # Main dashboard with member table
│   ├── profile/page.tsx        # Edit own name/email/password (all users)
│   ├── settings/page.tsx       # Gym/reminders/email/WhatsApp config (admin only)
│   ├── users/page.tsx          # User management (admin only)
│   └── api/
│       ├── setup/route.ts      # First-run: needsSetup check + create first admin
│       ├── auth/route.ts       # POST login/logout, GET session (with role)
│       ├── profile/route.ts    # GET/PUT own profile
│       ├── settings/route.ts   # GET/PUT app settings (admin, secrets masked)
│       ├── users/
│       │   ├── route.ts        # GET list, POST create (admin)
│       │   └── [id]/route.ts   # PUT role/details, PATCH reset-password, DELETE (admin)
│       ├── members/
│       │   ├── route.ts        # GET all, POST new
│       │   └── [id]/route.ts   # GET, PUT, PATCH mark-paid; DELETE (admin only)
│       ├── remind/[id]/route.ts # POST trigger email+WhatsApp
│       └── webhook/payment/route.ts # Stripe/Razorpay webhook
├── middleware.ts               # Redirects unauthenticated users off protected routes
├── netlify/functions/
│   └── check-due.ts            # Hourly cron: config-driven auto-remind
├── lib/
│   ├── schema.ts               # Single source of truth for the DB schema (DDL)
│   ├── db.ts                   # Turso/local client, ensureSchema(), member + settings queries
│   ├── users.ts                # User CRUD
│   ├── auth.ts                 # JWT sessions, roles, auto session secret
│   ├── settings.ts             # Settings model, defaults, resolved configs, tz helpers
│   ├── api.ts                  # Shared API error handling (incl. DB-not-configured → 503)
│   ├── email.ts                # Resend email templates (config-driven)
│   └── whatsapp.ts             # Meta Cloud API templates (config-driven)
├── components/
│   ├── AppHeader.tsx           # Shared header with role-gated nav
│   ├── MemberTable.tsx         # Color-coded member table
│   ├── MemberForm.tsx          # Add/edit member form
│   ├── StatusBadge.tsx         # Paid/Due/Overdue badge
│   └── SWRegister.tsx          # Service worker registration
├── scripts/
│   ├── create-local-db.js      # Optional: local SQLite with sample data + dev admin
│   └── push-schema.js          # Optional: manually push schema.sql to Turso
├── schema.sql                  # Reference DDL (app self-initializes; not required)
├── SETUP.md                    # Zero-touch setup guide
├── .env.example                # Environment template (only Turso is required)
├── netlify.toml                # Netlify config
└── package.json
```

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/setup` | Whether first-run admin setup is needed | public |
| POST | `/api/setup` | Create the first admin (only while no users exist) | public (locked after) |
| POST | `/api/auth` | Login (`{email, password}`) / Logout (`{action:"logout"}`) | public |
| GET | `/api/auth` | Current session `{authenticated, user}` | auth |
| GET/PUT | `/api/profile` | View/update own name, email, password | auth |
| GET | `/api/members` | List all members | auth |
| POST | `/api/members` | Create member | auth |
| GET/PUT/PATCH | `/api/members/:id` | Get / update / mark-paid | auth |
| DELETE | `/api/members/:id` | Delete member | admin |
| POST | `/api/remind/:id` | Send reminder (email + WhatsApp) | auth |
| GET/PUT | `/api/settings` | View/update app settings (secrets masked) | admin |
| GET/POST | `/api/users` | List / create users | admin |
| PUT/PATCH/DELETE | `/api/users/:id` | Update role, reset password, delete | admin |
| POST | `/api/webhook/payment` | Stripe/Razorpay webhook | signed |

## Scheduled Function

`netlify/functions/check-due.ts` runs **hourly**. On each run it:

1. Updates `due` → `overdue` for past-due members.
2. No-ops unless automatic reminders are **enabled** and the current hour (in your
   configured timezone) matches your chosen **reminder hour**.
3. Finds members due within your configured window (plus overdue) and sends email
   + WhatsApp reminders, at most once per member per day.
4. Updates `last_reminder_sent`.

All of this is driven by the values you set in **Settings** — nothing is hardcoded.

## PWA Features

- **Installable**: Add to home screen on mobile/desktop.
- **Offline Support**: Service worker caches the member list for offline viewing.
- **App-like Experience**: Standalone display, custom icons, splash screen.

To generate proper PWA icons, replace the SVG placeholders in `public/icons/` with
PNG files at the required sizes (72, 96, 128, 144, 152, 192, 384, 512).

## License

MIT License — feel free to use for your gym!

---

Built with ❤️ for gym owners everywhere.
