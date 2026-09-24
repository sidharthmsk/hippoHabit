# hippoHabit

![hippoHabit](public/logo.png)

A quiet habit tracker for one person. Check days off a list, watch streaks and a heatmap. No reminders, no accounts. The week of checkboxes follows [Beaver Habit Tracker](https://github.com/daya0576/beaverhabits) and Loop Habit Tracker.

Unlock once per device with an access key. Data lives in a SQLite file on your server.

## Run locally

```bash
cp .env.example .env.local
# set ACCESS_KEY, AUTH_SECRET (openssl rand -base64 32), APP_TIMEZONE
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and enter the access key.

```bash
npm test
```

## Deploy on your server

```bash
cp .env.example .env
# edit ACCESS_KEY, AUTH_SECRET, APP_TIMEZONE
docker compose up -d --build
```

The app listens on port 3000 (`PUBLISH_PORT` to change it). Put it behind HTTPS (Caddy, nginx, Traefik). Backup is the file `data/habits.db`, or export JSON from Settings. Importing a hippoHabit backup replaces all habits and check-ins. Importing a [Beaver Habits](https://github.com/daya0576/beaverhabits) JSON export merges it in: new habits are added (first tag becomes the group, starred habits become High priority) and check-ins are merged into habits with the same name.

| Variable | Purpose |
|---|---|
| `ACCESS_KEY` | Shared unlock key |
| `AUTH_SECRET` | Signs the session cookie |
| `APP_TIMEZONE` | Calendar dates for check-ins (IANA name, default `UTC`) |
| `DATABASE_PATH` | SQLite path (default `./data/habits.db`) |

## How it works

Home is a list of habits grouped by group, with the last week as checkboxes (Beaver / Loop Habit style) and today's progress at the top. Tap a cell to toggle that day. Open a habit for a year heatmap, streaks, completion rates, and total check-ins. Add and edit habits on their own pages, and set the order of groups and habits under Arrange. Each habit has a High / Medium / Low priority.

Streaks are weekly. A week (Monday to Sunday) counts when it has at least one check-in, and a streak only breaks after a full week with none. The current week never breaks a streak while it is in progress.

## License

[Apache License 2.0](LICENSE)
