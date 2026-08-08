# Focus

Focus is a personal productivity workspace for todos, notes, planning, habits,
notifications, focus sessions, and an AI companion.

## Included

- `artifacts/mobile-app` — the main Focus web app
- `artifacts/api-server` — Express API server and AI companion route
- `lib` — shared API contracts, generated clients, database schema, and AI helpers
- `artifacts/focus-deck` — the product presentation deck
- `artifacts/mockup-sandbox` — UI mockup sandbox
- `scripts` — workspace utility scripts

## Run locally

This project uses pnpm and Node.js 24.

```bash
pnpm install
pnpm --filter @workspace/mobile-app run dev
```

The main app expects the workflow to provide `PORT` and `BASE_PATH`. If you
run Vite directly, provide them yourself:

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/mobile-app run dev
```

## API setup

The API server uses PostgreSQL and requires:

- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — server port

The AI companion route also needs `OPENAI_API_KEY` unless you replace that
server-side integration with another provider.

```bash
pnpm --filter @workspace/api-server run dev
```

## Checks

```bash
pnpm run typecheck
pnpm run build
```

## GitHub upload

1. Unzip this project.
2. Create a new GitHub repository.
3. Upload the unzipped files, or run:

```bash
git init
git add .
git commit -m "Initial Focus app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Do not commit `.env` files, API keys, database credentials, or other secrets.