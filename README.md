# Tippkick

A modern, mobile-friendly web UI for [kicktipp.com](https://www.kicktipp.com).

Kicktipp is awesome. It's been the go-to platform for prediction games in Germany (and beyond) for years, and the team behind it deserves a lot of credit. But let's be honest: the UI feels a bit stuck in 2010. We wanted something that feels like 2026. Fast, smooth, great on your phone, dark mode, the works.

So we built Tippkick: a fresh frontend that talks to your existing kicktipp.com account. You keep your community, your friends, your bets. Just with a nicer experience on top.

## What it does

- **Batch predictions** fill in all your scores, submit once (no more clicking through each match)
- **Infinite scroll** browse matchdays without page reloads
- **Live updates** scores refresh automatically during matches
- **Leaderboard & stats** season standings, player stats, charts
- **Bonus questions** answer bonus questions with clean dropdown selectors
- **Multi-user** each person logs in with their own kicktipp.com credentials
- **PWA** install it on your phone's home screen
- **Dark mode** because it's 2026
- **Keyboard shortcuts** G+P predictions, G+L leaderboard, R refresh

## How it works

```
Browser  -->  Hono API server  -->  kicktipp.com
  (React)      (auth, cache)        (HTTP + cheerio)
```

Kicktipp has no public API, so Tippkick scrapes the site directly using plain HTTP requests and [cheerio](https://cheerio.js.org/) for HTML parsing. No headless browser, no Selenium, no Playwright. Just fetch and parse. The Next.js frontend is statically exported and served by the same Hono process that handles the API. No database either. Sessions and cache live in memory.

## Quick start

You'll need **Node.js 20+**.

```bash
git clone https://github.com/earsenio/kicktipp-ui.git
cd kicktipp-ui
npm install
```

Create `.env.local`:

```env
KICKTIPP_URL=https://www.kicktipp.com   # or .de or .fr depending on your community
```

Start it up:

```bash
npm run dev:all
```

Open [http://localhost:3000](http://localhost:3000) and log in with your kicktipp.com credentials.

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KICKTIPP_URL` | No | `https://www.kicktipp.com` | Kicktipp domain (`.com`, `.de`, or `.fr`) |
| `PORT` | No | `3001` | API server port |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | API URL for browser requests (dev only) |

User credentials are provided at login time and stored in memory only. Nothing gets written to disk.

## Deploy to Railway

```bash
npm run build    # Static export to ./out
npm start        # Hono serves API + static files on one port
```

The included `railway.toml` handles Railway deployment. Set `KICKTIPP_URL` in the Railway dashboard. Each user logs in with their own credentials, so no server-side secrets are needed beyond the URL.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, static export) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Animations | Framer Motion |
| Charts | Recharts |
| API Server | Hono |
| Scraping | cheerio + cookie-based sessions |

## Built with vibe-coding

Full transparency: this entire project was built with [Claude Code](https://claude.ai/code), Anthropic's AI coding tool. Every component, every scraping function, every line of CSS. A human steered the direction and made the design calls, but the code was written by AI. We think that's pretty cool, and we're not going to pretend otherwise.

If you're curious what vibe-coded software looks like at scale, poke around. If you find rough edges, that's part of the deal, and a great reason to contribute.

## Contributing

This is a side project built for fun. If you use kicktipp and want a better mobile experience, you're our target audience, and probably the best person to improve it.

Don't worry about perfect code or big PRs. Found a bug? Open an issue. Want to tweak the UI? Go for it. Have an idea for a feature? Let's talk about it. Check out [CONTRIBUTING.md](CONTRIBUTING.md) for the details, but honestly, just jump in.

## License

[MIT](LICENSE)
