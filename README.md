# Tippkick

Open-source web UI for [kicktipp.com](https://www.kicktipp.com) — the German sports prediction game.

Kicktipp has no public API. Tippkick scrapes kicktipp.com directly using HTTP requests and [cheerio](https://cheerio.js.org/) HTML parsing — no headless browser needed. The goal: you never need to open kicktipp.com again.

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
Browser  -->  Hono API server  -->  kicktipp.com
  (React)      (auth, cache)        (HTTP + cheerio)
```

The Next.js frontend is statically exported and served by the same Hono process that runs the API. Scraping is done with plain HTTP requests and cookie-based sessions — no headless browser or external tools needed. No database — sessions and cache live in memory.

## Prerequisites

- **Node.js 20+**

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
| Scraping | cheerio (HTML parsing) + cookie-based sessions |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
