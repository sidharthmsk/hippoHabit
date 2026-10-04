# Changelog

## v1.0.0 (2026-10-04)

First public release.

### Habits

- Home lists habits by group, with the last seven days as checkboxes and today's progress at the top. Tap a cell to toggle a day. A failed check-in is undone and shows a toast.
- Each habit has a High, Medium, or Low priority. Habits can be archived.
- Arrange sets the order of groups and habits.
- A habit's page shows a year heatmap (weeks start on Monday), streaks, completion rates, and total check-ins.
- Streaks are weekly. A Monday-to-Sunday week counts if it has at least one check-in, and a streak breaks only after a full week with none. The current week never breaks a streak.

### Sign-in

- Password sign-in. `npm run hash-password` asks for a username (Enter gives `admin`) and a password, then prints the `AUTH_USERNAME` and `AUTH_PASSWORD_HASH` lines for `.env`. Passwords are hashed with scrypt.
- Sign-in pauses for 15 minutes after 5 failed attempts from one IP, or 30 in total.
- Optional OIDC sign-in for Authentik, Authelia, Pocket ID, Keycloak, and similar providers. It uses PKCE, state, and nonce, and `OIDC_ALLOWED_USERS` can limit who gets in.
- You can turn on password sign-in, OIDC, or both.

### Data

- Everything is stored in one SQLite file. Schema changes run as numbered migrations.
- Settings exports a JSON backup. Importing a hippoHabit backup replaces all data. Large backups import in chunks, and version 1 backups still work.
- Settings also imports [Beaver Habits](https://github.com/daya0576/beaverhabits) JSON exports and merges check-ins into habits with the same name.

### Appearance

- Mode (System, Light, Dark), background and accent presets, and custom colors. Changes preview live and are saved to the database, so every device gets them.

### Deploy

- Docker image and `docker-compose.yml`. The container starts as root only to fix `/app/data` permissions, then runs as an unprivileged user. It has a healthcheck.
- Starting with this release, each version is published as a container image at `ghcr.io/sidharthmsk/hippohabit` (amd64 and arm64). A prebuilt Linux x64 bundle is attached to the GitHub release.

### Upgrading from a pre-release build

- `ACCESS_KEY` was removed. Set `AUTH_PASSWORD_HASH` (run `hash-password`) or configure OIDC. Devices that are already unlocked stay signed in until you change `AUTH_SECRET`.
- `/unlock` redirects to `/login`.
