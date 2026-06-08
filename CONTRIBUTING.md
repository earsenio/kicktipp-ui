# Contributing to Tippkick

Thanks for your interest in contributing! Here's how to get started.

## Local Development

1. Follow the [Quick Start](README.md#quick-start) to set up the project
2. Run `npm run dev:all` to start both the Next.js dev server and the Hono API server

The frontend runs on `:3000` and the API on `:3001` in development. In production, Hono serves both from a single port.

## Code Conventions

- **TypeScript strict mode** — no `any` types
- **Server components by default** — use `'use client'` only when needed
- **Tailwind CSS** for styling — no inline styles or CSS modules
- **shadcn/ui** primitives in `src/components/ui/` — do not edit these directly
- **English comments** throughout
- **No hardcoded credentials** — all configuration via environment variables

## Project Structure

- `server/` — Hono API server, scraping engine, session management
- `src/app/` — Next.js pages (App Router)
- `src/components/` — React components, grouped by feature
- `src/hooks/` — Custom React hooks
- `src/lib/` — Shared utilities, types, API client

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation.

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- Include a brief description of what changed and why
- Run `npx tsc --noEmit` before submitting to catch type errors
- Test the feature in a browser (type checking alone doesn't verify UI behavior)

## What's Needed

- Bug reports and fixes
- Accessibility improvements
- Performance optimizations
- New locale support (kicktipp operates in multiple countries)
- Documentation improvements
- UI/UX suggestions
