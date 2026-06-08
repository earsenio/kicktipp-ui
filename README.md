# Tippkick

Open-source web UI for [kicktipp.com](https://www.kicktipp.com) — the German sports prediction game.

Kicktipp has no public API. Tippkick talks to it through the [kicktipp-agent](https://github.com/christianheidorn/kicktipp-agent) MCP server, which scrapes kicktipp.com using headless Chromium. The goal: you never need to open kicktipp.com again.

## Features

- **Batch predictions** — fill in all scores, submit once
- **Infinite scroll** — browse matchdays without page reloads
- **Live updates** — scores refresh automatically during matches
- **Leaderboard & overview** — season standings, player stats, charts
- **Bonus questions** — answer bonus questions with dropdown selectors
- **Multi-user** — each friend logs in with their own kicktipp.com credentials
- **PWA** — install on your phone's home screen
- **Dark mode** — default dark theme with light mode toggle
- **Keyboard shortcuts** — G+P predictions, G+L leaderboard, R refresh

## Architecture

```
Browser  -->  Hono API server  -->  kicktipp-agent (MCP)  -->  kicktipp.com
  (React)      (auth, cache)        (headless Chromium)        (HTML scraping)
```

The Next.js frontend is statically exported and served by the same Hono process that runs the API. No database — sessions and cache live in memory.

## Prerequisites

- **Node.js 20+**
- **kicktipp-agent MCP server** — [install instructions](https://github.com/christianheidorn/kicktipp-agent):
  ```bash
  git clone https://github.com/christianheidorn/kicktipp-agent.git
  cd kicktipp-agent
  npm install && npx playwright install chromium && npm run build && npm link
  ```

## Quick Start

```bash
git clone https://github.com/earsenio/tippkick.git
cd tippkick
npm install
```

Create `.env.local`:

```env
KICKTIPP_EMAIL=your@email.com
KICKTIPP_PASSWORD=yourpassword
KICKTIPP_URL=https://www.kicktipp.com
```

Start development servers:

```bash
npm run dev:all
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KICKTIPP_URL` | No | `https://www.kicktipp.com` | Kicktipp domain (`.com`, `.de`, or `.fr`) |
| `PORT` | No | `3001` | API server port |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | API URL for browser requests (dev only) |

User credentials are provided at login time and stored in-memory only.

## Production Deployment (Railway)

```bash
npm run build    # Static export to ./out
npm start        # Hono serves API + static files on one port
```

The included `railway.toml` handles Railway deployment. Set `KICKTIPP_URL` in the Railway dashboard. Each user logs in with their own credentials — no server-side email/password needed in production.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, static export) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Animations | Framer Motion |
| Charts | Recharts |
| API Server | Hono |
| MCP Client | Per-session headless Chromium via kicktipp-agent |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
