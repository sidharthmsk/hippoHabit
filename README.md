# hippoHabit

![hippoHabit](public/logo.png)

A quiet habit tracker for one person. Check days off a list, watch streaks and a heatmap. No reminders, no accounts. The week of checkboxes follows [Beaver Habit Tracker](https://github.com/daya0576/beaverhabits) and Loop Habit Tracker.

Sign in with a username and password, through your own OIDC provider, or both. Data lives in a SQLite file on your server.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run hash-password   # paste the output into AUTH_PASSWORD_HASH
# also set AUTH_USERNAME, AUTH_SECRET (openssl rand -base64 32), APP_TIMEZONE
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

```bash
npm test
```

## Deploy on your server

```bash
cp .env.example .env
# edit AUTH_SECRET, APP_TIMEZONE, and at least one sign-in method (below)
docker compose build
docker compose run --rm habits node scripts/hash-password.mjs   # for AUTH_PASSWORD_HASH
docker compose up -d
```

The app listens on port 3000 (`PUBLISH_PORT` to change it). Put it behind HTTPS (Caddy, nginx, Traefik). Backup is the file `data/habits.db`, or export JSON from Settings. Importing a hippoHabit backup replaces all habits and check-ins. Importing a [Beaver Habits](https://github.com/daya0576/beaverhabits) JSON export merges it in: new habits are added (first tag becomes the group, starred habits become High priority) and check-ins are merged into habits with the same name.

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | Signs the session cookie. Changing it signs every device out |
| `AUTH_USERNAME` | Username for password sign-in |
| `AUTH_PASSWORD_HASH` | scrypt hash from `hash-password`. Never the plain password |
| `OIDC_ISSUER` | Issuer URL of your provider |
| `OIDC_CLIENT_ID` | Client ID from the provider |
| `OIDC_CLIENT_SECRET` | Client secret from the provider |
| `OIDC_PROVIDER_NAME` | Button label, e.g. `Authentik` (default `SSO`) |
| `OIDC_ALLOWED_USERS` | Comma-separated emails, usernames, or subject IDs allowed in |
| `APP_URL` | Public URL, only if your proxy doesn't send `X-Forwarded-Host`/`-Proto` |
| `APP_TIMEZONE` | Calendar dates for check-ins (IANA name, default `UTC`) |
| `DATABASE_PATH` | SQLite path (default `./data/habits.db`) |

## Sign-in

Set up one method or both. The login page shows whatever is configured.

**Password.** Set `AUTH_USERNAME` and `AUTH_PASSWORD_HASH`. The hash is scrypt, and the format has no `$`, so it goes into `.env` unquoted. After 5 attempts from one IP, or 30 in total, sign-in pauses for 15 minutes. The counters live in memory, so restarting the container clears them.

**OIDC** (Authentik, Authelia, Pocket ID, Keycloak, and others). Create a confidential client in your provider with the redirect URI `https://<your app>/auth/oidc/callback` and the scopes `openid profile email`. Then set:

```bash
OIDC_ISSUER=https://auth.example.com/application/o/habits/   # exactly the provider's issuer
OIDC_CLIENT_ID=...
OIDC_CLIENT_SECRET=...
```

Without `OIDC_ALLOWED_USERS`, anyone who can sign in to that client gets in. Restrict the application in the provider, or list yourself: `OIDC_ALLOWED_USERS=you@example.com`. The flow uses PKCE, state, and nonce. Signing out of Habits doesn't sign you out of the provider.

The old `ACCESS_KEY` isn't used anymore. Devices that are already unlocked stay signed in until you change `AUTH_SECRET`.

## Appearance

Settings → Appearance has a mode (System, Light, Dark), background presets or a custom color, and accent presets or a custom color. Changes preview live, then save to the database, so every device uses them. **Reset to default** goes back to the original look.

## How it works

Home is a list of habits grouped by group, with the last week as checkboxes (Beaver / Loop Habit style) and today's progress at the top. Tap a cell to toggle that day. Open a habit for a year heatmap, streaks, completion rates, and total check-ins. Add and edit habits on their own pages, and set the order of groups and habits under Arrange. Each habit has a High / Medium / Low priority.

Streaks are weekly. A week (Monday to Sunday) counts when it has at least one check-in, and a streak only breaks after a full week with none. The current week never breaks a streak while it is in progress.

## License

[Apache License 2.0](LICENSE)
