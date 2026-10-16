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

## Advanced Configuration

### WhatsApp Reminder Setup

To enable WhatsApp reminders via Meta Cloud API:

1. **Create a Meta for Developers account** at [developers.facebook.com](https://developers.facebook.com/)
2. **Set up WhatsApp Business API**:
   - Create a new app or use an existing one
   - Add "WhatsApp" product to your app
   - Complete the business verification process
3. **Get credentials**:
   - **Access Token**: From WhatsApp API setup in your app dashboard
   - **Phone Number ID**: Found in WhatsApp API settings (starts with `105...` or similar)
4. **Create Message Templates** (required by WhatsApp):
   - `fee_due_reminder` - for upcoming payment reminders
   - `fee_overdue_reminder` - for overdue payment notifications  
   - `payment_confirmation` - for successful payment alerts
   - Templates must be approved by WhatsApp before use
5. **Configure in App**:
   - Go to Settings → WhatsApp
   - Enable WhatsApp
   - Enter your Access Token
   - Enter your Phone Number ID
   - Set template language (default: `en`)
   - Verify template names match those approved by WhatsApp
   - Save settings

### Email Reminder Setup (via Resend)

The app uses [Resend](https://resend.com) for email delivery by default:

1. **Create a Resend account** at [resend.com](https://resend.com)
2. **Verify your domain** (required for sending)
3. **Get your API key** from Resend API keys page
4. **Verify a sender email** (must be from your verified domain)
5. **Configure in App**:
   - Go to Settings → Email
   - Enable Email
   - Enter your From Name (e.g., "Pakistan Gym")
   - Enter your From Address (verified sender email)
   - Enter your Resend API key
   - Save settings

### Alternative: Gmail SMTP Setup

To use Gmail's SMTP server instead of Resend (requires code modification):

> ⚠️ **Note**: This requires modifying the email sending implementation. The current code uses Resend API. To switch to Gmail SMTP, you would need to:
> 1. Replace the email sending logic in `lib/email.ts` (create this file if needed)
> 2. Use `nodemailer` with Gmail SMTP transport
> 3. Configure OAuth2 or App Password authentication

#### Option 1: Gmail App Password (Less Secure)
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password for "Mail"
3. Use your Gmail email as username and the App Password as password in nodemailer config

#### Option 2: Gmail OAuth2 (More Secure - Requires Client ID/Secret)
1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable "Gmail API" for your project
2. **Configure OAuth Consent Screen**:
   - Set user type to "External" (for org domain) or "Internal"
   - Add required scopes: `https://mail.google.com/` or `https://www.googleapis.com/auth/gmail.send`
3. **Create OAuth 2.0 Client ID**:
   - Go to Credentials → Create Credentials → OAuth Client ID
   - Application type: "Web application"
   - Add authorized redirect URIs (your domain + `/api/auth/callback/google`)
   - Copy the **Client ID** and **Client Secret**
4. **Implement OAuth Flow**:
   - Use a library like `next-auth` or `passport` to handle Google OAuth
   - Store refresh token securely to obtain access tokens for SMTP auth
5. **Configure nodemailer** with OAuth2:
   ```javascript
   const transporter = nodemailer.createTransport({
     service: 'gmail',
     auth: {
       type: 'OAuth2',
       user: 'your-email@yourdomain.com',
       clientId: process.env.GMAIL_CLIENT_ID,
       clientSecret: process.env.GMAIL_CLIENT_SECRET,
       refreshToken: process.env.GMAIL_REFRESH_TOKEN,
       accessToken: // obtained periodically using refresh token
     }
   });
   ```

### SSO with Gmail (Google Login)

To enable "Sign in with Google" instead of or in addition to email/password login:

> ⚠️ **Note**: This requires adding authentication providers. Current auth is custom email/password only.

1. **Follow Google Cloud Project steps above** (for OAuth2 credentials)
2. **Add NextAuth.js** (recommended):
   ```bash
   npm install next-auth
   ```
3. **Create `/app/api/auth/[...nextauth]/route.ts`**:
   ```typescript
   import NextAuth from "next-auth"
   import GoogleProvider from "next-auth/providers/google"
   
   export const authOptions = {
     providers: [
       GoogleProvider({
         clientId: process.env.GOOGLE_CLIENT_ID,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET,
       }),
     ],
     callbacks: {
       async session({ session, token }) {
         // Custom session handling
         return session
       }
     }
   }
   
   export default NextAuth(authOptions)
   ```
4. **Update login page** to show "Sign in with Google" button
5. **Handle user creation** on first Google login (similar to existing admin setup)

### Environment Variables for Advanced Features

Add these to your hosting provider's environment variables (Netlify/Vercel):

```
# For WhatsApp
WHATSAPP_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_ID=your_phone_number_id

# For Email (Resend) - already documented
RESEND_API_KEY=your_resend_api_key

# For Gmail SMTP OAuth2 (if implemented)
GMAIL_CLIENT_ID=your_google_client_id
GMAIL_CLIENT_SECRET=your_google_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# For Google SSO (if implemented)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

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