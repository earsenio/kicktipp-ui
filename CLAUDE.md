# CLAUDE.md — Tippkick

This file is read by Claude Code on every session. Follow these instructions at all times.

---

## What This Project Is

A modern, open-source web UI for [kicktipp.com](https://www.kicktipp.com) — the German sports prediction game. Kicktipp has **no public API**. All data flows through the `kicktipp-agent` MCP server, which scrapes kicktipp.com using headless Chromium.

The goal: users never need to open kicktipp.com again.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Animations | Framer Motion |
| Charts | Recharts |
| MCP Client | `@modelcontextprotocol/sdk` |
| Cache | In-memory TTL cache (`src/lib/cache.ts`) |
| Deployment | Railway (Nixpacks, Node 20) |

**No Supabase. No external database.** Multi-user auth via httpOnly session cookies backed by an in-memory `Map<string, UserSession>`. Each user logs in with their own kicktipp.com credentials. Sessions are lost on server restart (users re-login).

---

## Environment Variables

```
KICKTIPP_URL=https://www.kicktipp.fr   # or .de / .com — determines locale-specific URL paths
```

Set in `.env.local` for development, in Railway dashboard for production. `KICKTIPP_URL` defaults to `https://www.kicktipp.com` if not set. Use the domain matching your community's locale (`.fr` for French, `.de` for German, `.com` for English).

User credentials are provided at login time, stored in-memory only (never on disk), and cleared on server restart.

---

## MCP Server — 15 Available Tools

The kicktipp-agent ([christianheidorn/kicktipp-agent](https://github.com/christianheidorn/kicktipp-agent)) exposes the `kicktipp-mcp` binary (stdio transport). For local development: clone the repo, `npm install && npx playwright install chromium && npm run build && npm link`. It is invoked as a subprocess by `src/lib/mcp-client.ts`.

| Tool | Description | Expensive? |
|------|-------------|-----------|
| `get_status` | Check credentials + community config | No |
| `get_today_matches` | Today's matches + bet status | Yes (Chromium) |
| `get_bets` | Matches + current bets for a matchday | Yes |
| `get_schedule` | Full season schedule with results | Yes |
| `get_leaderboard` | Player rankings for a matchday | Yes |
| `get_overview` | Season overview across all matchdays | Yes |
| `get_table` | Actual football league standings | Yes |
| `get_rules` | Scoring rules and game config | Yes |
| `get_communities` | Communities the user belongs to | Yes |
| `get_players` | Players in the current community | Yes |
| `get_bonus_questions` | Bonus questions with options | Yes |
| `set_community` | Change active community | Yes |
| `set_player` | Set player identity | Yes |
| `place_bets` | Submit match predictions | Yes (mutating) |
| `place_bonus_bets` | Submit bonus question answers | Yes (mutating) |

"Expensive" = 1–3 seconds per call (headless browser). **Always cache reads. Never cache writes.**

---

## Cache TTL Policy

Defined in `src/lib/cache.ts`. Use these TTLs everywhere:

```typescript
export const TTL = {
  TODAY_MATCHES: 60,         // seconds — live during matchday
  BETS: 30,                  // seconds — invalidate after place_bets
  LEADERBOARD: 120,          // seconds
  SCHEDULE: 3600,            // 1 hour
  TABLE: 3600,               // 1 hour
  OVERVIEW: 300,             // 5 minutes
  RULES: 86400,              // 24 hours
  COMMUNITIES: 3600,         // 1 hour
  PLAYERS: 3600,             // 1 hour
  BONUS_QUESTIONS: 600,      // 10 minutes
} as const;
```

Cache key format: `tool:args_hash` — e.g. `get_bets:matchday=15`.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                 # Root layout: sidebar + header
│   ├── page.tsx                   # Dashboard (today's matches)
│   ├── matchday/[n]/page.tsx      # Bet placement for matchday N
│   ├── leaderboard/page.tsx
│   ├── schedule/page.tsx
│   ├── table/page.tsx
│   ├── overview/page.tsx
│   ├── bonus/page.tsx
│   ├── players/page.tsx
│   ├── rules/page.tsx
│   ├── login/page.tsx              # Login form
│   ├── setup/page.tsx             # First-run onboarding
│   └── api/                       # API routes served by Hono (server/index.ts)
├── lib/
│   ├── mcp-client.ts              # MCP subprocess singleton
│   ├── cache.ts                   # In-memory TTL cache
│   ├── types.ts                   # All Kicktipp data types (auto-inferred from MCP)
│   └── utils.ts
├── components/
│   ├── ui/                        # shadcn/ui primitives (DO NOT edit)
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── mobile-nav.tsx
│   ├── auth/
│   │   └── auth-provider.tsx      # Auth context + 401 redirect
│   ├── match/
│   │   ├── match-card.tsx
│   │   ├── score-input.tsx
│   │   └── bet-status-badge.tsx
│   ├── leaderboard/
│   │   └── leaderboard-row.tsx
│   ├── stats/
│   │   └── overview-chart.tsx
│   └── shared/
│       ├── matchday-selector.tsx
│       ├── community-switcher.tsx
│       └── loading-skeleton.tsx
└── hooks/
    ├── use-kicktipp.ts            # Generic SWR-style hook wrapping /api/kicktipp
    ├── use-bets.ts                # Bet state + optimistic updates
    └── use-live-refresh.ts        # Polling during live matches
```

---

## API Route Contract

### Authentication

```
POST /api/auth/login    — { email, password } → Set-Cookie: kt-session
POST /api/auth/logout   — clears session
GET  /api/auth/me       — { email, community } or 401
```

All `/api/kicktipp/*` endpoints require a valid `kt-session` httpOnly cookie. Unauthenticated requests return 401.

### Data

```
POST /api/kicktipp
Body: { tool: string, args?: Record<string, unknown>, skipCache?: boolean }
Response: { data: unknown, cached: boolean, cachedAt?: number }
```

Error response:
```
{ error: string, code: "MCP_ERROR" | "TOOL_NOT_FOUND" | "NOT_AUTHENTICATED" }
```

The `skipCache: true` flag is used after write operations (place_bets, place_bonus_bets). Cache keys are per-user for user-specific tools (bets, today_matches, bonus_questions, status) and shared for global tools (schedule, leaderboard, overview, rules, players, table).

---

## Batch Prediction — Core Feature

Batch prediction is the most important interaction in the app. Always design bet placement to support submitting multiple predictions at once.

The `place_bets` MCP tool accepts an array of strings (each `"Home vs Away=H:G"`):
```json
{ "bets": ["FC Bayern vs Dortmund=2:1", "RB Leipzig vs Leverkusen=0:0"], "matchday": 15, "dry_run": false }
```

UI pattern: the `/matchday/[n]` page renders all matches as a grid of score inputs. The user fills in all scores freely, then hits one **"Submit All Predictions"** button. Partial submission is also supported (only filled inputs are sent).

Score inputs must support:
- Keyboard navigation (Tab between home/away/next match)
- +/- buttons for touch users
- Click-to-select for quick editing
- Visual indication of: unsaved changes, saved, pending, deadline-passed

---

## Coding Conventions

- **Server Components by default**. Use `'use client'` only when needed (interactivity, hooks).
- **No `any` types**. Infer types from MCP responses or define them in `src/lib/types.ts`.
- **Error boundaries** on every page. MCP calls can fail — always show a recovery UI.
- **Loading states** with shadcn/ui Skeleton on every data fetch.
- **Accessible**: ARIA labels on score inputs, keyboard nav works end-to-end.
- **Mobile-first**: bottom tab nav on < 768px, sidebar on ≥ 768px.
- **Comments in English** throughout. This is an open-source repo.

---

## Design System

- **Color palette** defined in `tailwind.config.ts` and as CSS variables in `globals.css`
- **Dark mode default** with light mode toggle stored in localStorage
- **Correct prediction**: green (`#22c55e`)
- **Partial (goal diff)**: amber (`#f59e0b`)
- **Wrong**: red/muted
- **Deadline warning**: pulsing orange border on match cards

Score fonts: use a **monospace** font for all score displays and inputs (e.g., `font-mono`).

---

## Open Source Requirements

- All code must be **MIT licensed**
- No hardcoded credentials or personal data anywhere
- All configuration via environment variables
- `README.md` must include: purpose, install steps, env vars, Railway deploy button
- Every PR must include a brief description in CONTRIBUTING.md format
- Do not commit `.env.local`, session files, or Chromium cache

---

## Railway Deployment Notes

- Nixpacks auto-detects Next.js — no Dockerfile needed
- Set `KICKTIPP_EMAIL` and `KICKTIPP_PASSWORD` in Railway environment variables
- The kicktipp-agent subprocess requires Playwright + Chromium. Add to `package.json` scripts:
  ```json
  "postinstall": "npx playwright install chromium --with-deps"
  ```
- Railway `railway.toml`:
  ```toml
  [build]
  builder = "NIXPACKS"
  
  [deploy]
  startCommand = "npm start"
  healthcheckPath = "/api/kicktipp/status"
  healthcheckTimeout = 30
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 3
  ```
- MCP subprocess is kept alive for the lifetime of the Node.js process
- Session files are stored in Railway's ephemeral filesystem — on restart, the MCP server will re-authenticate automatically using env vars

---

## What NOT to Build (v1)

- No community creation or admin features
- No user registration — users must have existing kicktipp.com accounts
- No Kicktipp messaging/chat integration
- No payment or subscription management
- No AI-powered prediction suggestions (v2)
