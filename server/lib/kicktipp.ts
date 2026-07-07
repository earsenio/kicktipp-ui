// Scraping engine: logs into kicktipp.com with per-user cookie sessions,
// fetches pages, and parses HTML with cheerio into structured data.
// Each tool (get_bets, get_leaderboard, etc.) maps to a function here.
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

// ── Types ────────────────────────────────────────────────────────

export interface UserSession {
  id: string;
  email: string;
  password: string;
  cookies: string;
  loggedIn: boolean;
  community: string;
  player: string;
  lastActive: number;
  // The logged-in member's own participant id, derived per community from the
  // prediction page (see getCurrentTipperId). Used to mark the user's row in
  // ranking tables reliably, independent of display name or the "treffer" class.
  tipperId?: string;
  tipperCommunity?: string;
}

type Locale = "en" | "fr" | "de";

// ── Routing ──────────────────────────────────────────────────────

const ROUTES: Record<Locale, Record<string, string>> = {
  en: { predict: "predict", schedule: "schedule", leaderboard: "leaderboard", overview: "overview", tables: "tables", rules: "rules" },
  fr: { predict: "centre-pronostics", schedule: "calendrier", leaderboard: "tableau-pronostics", overview: "tableau-general", tables: "classement", rules: "regles" },
  de: { predict: "tippabgabe", schedule: "spielplan", leaderboard: "gesamtwertung", overview: "uebersicht", tables: "tabelle", rules: "spielregeln" },
};

function getUrlBase(): string {
  return process.env.KICKTIPP_URL || "https://www.kicktipp.com";
}

function detectLocale(): Locale {
  const url = getUrlBase().toLowerCase();
  if (url.includes("kicktipp.fr")) return "fr";
  if (url.includes("kicktipp.de")) return "de";
  return "en";
}

function route(name: string): string {
  const locale = detectLocale();
  return ROUTES[locale]?.[name] || ROUTES.en[name] || name;
}

function predictUrl(community: string, matchday?: number): string {
  const base = `${getUrlBase()}/${encodeURIComponent(community)}/${route("predict")}`;
  return matchday !== undefined ? `${base}?spieltagIndex=${matchday}` : base;
}

function leaderboardUrl(community: string, matchday?: number, bonus = false): string {
  const params: string[] = [];
  if (bonus) params.push("bonus=true");
  if (matchday !== undefined) params.push(`spieltagIndex=${matchday}`);
  const base = `${getUrlBase()}/${encodeURIComponent(community)}/${route("leaderboard")}`;
  return params.length ? `${base}?${params.join("&")}` : base;
}

// ── Cookie management ────────────────────────────────────────────

function mergeCookies(existing: string, setCookies: string[]): string {
  const jar = new Map<string, string>();
  for (const c of existing.split("; ").filter(Boolean)) {
    const [k, ...v] = c.split("=");
    jar.set(k, v.join("="));
  }
  for (const raw of setCookies) {
    const pair = raw.split(";")[0];
    const [k, ...v] = pair.split("=");
    jar.set(k, v.join("="));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

// ── Session-aware login/fetch ────────────────────────────────────

export async function loginSession(session: UserSession): Promise<void> {
  const { email, password } = session;
  if (!email || !password) throw new Error("Email and password are required");

  const loginGetManual = await fetch(`${getUrlBase()}/info/profil/login`, { redirect: "manual" });
  let loginPageUrl = `${getUrlBase()}/info/profil/login`;
  session.cookies = mergeCookies("", loginGetManual.headers.getSetCookie());

  if (loginGetManual.status >= 300 && loginGetManual.status < 400) {
    const loc = loginGetManual.headers.get("location") || "";
    loginPageUrl = loc.startsWith("http") ? loc : new URL(loc, getUrlBase()).href;
    const step2 = await fetch(loginPageUrl, { redirect: "manual", headers: { Cookie: session.cookies } });
    session.cookies = mergeCookies(session.cookies, step2.headers.getSetCookie());
    if (step2.status >= 300 && step2.status < 400) {
      loginPageUrl = step2.headers.get("location") || loginPageUrl;
      if (!loginPageUrl.startsWith("http")) loginPageUrl = new URL(loginPageUrl, getUrlBase()).href;
    }
  }

  const pageRes = await fetch(loginPageUrl, { headers: { Cookie: session.cookies } });
  session.cookies = mergeCookies(session.cookies, pageRes.headers.getSetCookie());
  const html = await pageRes.text();
  const formAction = html.match(/form[^>]*action="([^"]*)"/)?.[1] || "/info/profil/loginaction";
  const actionUrl = formAction.startsWith("http") ? formAction : new URL(formAction, getUrlBase()).href;

  const form = new URLSearchParams({ kennung: email, passwort: password });
  const res = await fetch(actionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: session.cookies },
    body: form.toString(),
    redirect: "manual",
  });

  session.cookies = mergeCookies(session.cookies, res.headers.getSetCookie());

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location") || "";
    if (location.includes("/login") || location.includes("/connexion")) {
      throw new Error("Login failed — check email and password");
    }
  }

  session.loggedIn = true;
  console.log(`[kicktipp] Logged in: ${email}`);
}

async function fetchPage(url: string, session: UserSession): Promise<cheerio.CheerioAPI> {
  if (!session.loggedIn) await loginSession(session);

  let res = await fetch(url, { headers: { Cookie: session.cookies }, redirect: "manual" });
  session.cookies = mergeCookies(session.cookies, res.headers.getSetCookie());

  for (let i = 0; i < 5 && res.status >= 300 && res.status < 400; i++) {
    const location = res.headers.get("location") || "";

    if (location.includes("/login") || location.includes("/connexion")) {
      session.loggedIn = false;
      await loginSession(session);
      res = await fetch(url, { headers: { Cookie: session.cookies }, redirect: "manual" });
      session.cookies = mergeCookies(session.cookies, res.headers.getSetCookie());
      if (res.status >= 300 && res.status < 400) {
        const loc2 = res.headers.get("location") || "";
        if (loc2.includes("/login") || loc2.includes("/connexion")) {
          throw new Error("Session expired and re-login failed");
        }
      }
      break;
    }

    const nextUrl = location.startsWith("http") ? location : new URL(location, url).href;
    res = await fetch(nextUrl, { headers: { Cookie: session.cookies }, redirect: "manual" });
    session.cookies = mergeCookies(session.cookies, res.headers.getSetCookie());
  }

  session.lastActive = Date.now();
  return cheerio.load(await res.text());
}

async function submitForm(url: string, fields: Record<string, string>, session: UserSession): Promise<cheerio.CheerioAPI> {
  if (!session.loggedIn) await loginSession(session);

  const form = new URLSearchParams(fields);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: session.cookies,
    },
    body: form.toString(),
    redirect: "manual",
  });

  const setCookies = res.headers.getSetCookie();
  if (setCookies.length) {
    session.cookies = setCookies.map((c) => c.split(";")[0]).join("; ");
  }

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location") || "";
    const absoluteUrl = location.startsWith("http") ? location : new URL(location, url).href;
    const followRes = await fetch(absoluteUrl, { headers: { Cookie: session.cookies } });
    return cheerio.load(await followRes.text());
  }

  session.lastActive = Date.now();
  return cheerio.load(await res.text());
}

// ── Parsing helpers ───────────────────────────────────────────────

// Kicktipp tags every ranking row with a "teilnehmer<ID>" class carrying the member's
// stable participant id. Matching that id against the logged-in user's own id (see
// getCurrentTipperId) is the reliable way to locate the user's row across all ranking
// tables — independent of display name, locale, or the "treffer" highlight class, which
// some communities apply to a different row.
function participantId($: cheerio.CheerioAPI, tr: AnyNode): string | null {
  const m = ($(tr).attr("class") || "").match(/\bteilnehmer(\d+)\b/);
  return m ? m[1] : null;
}

// Best-effort fallback used only when the current user's participant id is unknown:
// Kicktipp highlights the logged-in member's own ranking row with the CSS class
// "treffer" (one row per page). Less reliable than participant-id matching — the
// per-user flag it produces is corrected downstream in stampCurrentPlayer.
function isCurrentPlayerRow($: cheerio.CheerioAPI, tr: AnyNode): boolean {
  return /\btreffer\b/.test($(tr).attr("class") || "");
}

// The logged-in member's own participant id, exposed as a hidden "tipperId" input on
// the prediction page. Cached per community on the session so ranking tables can mark
// the user's row by id. Returns null if it can't be determined (callers then fall back
// to the "treffer"/name heuristic).
export async function getCurrentTipperId(session: UserSession): Promise<string | null> {
  const community = ensureCommunity(session);
  if (session.tipperId && session.tipperCommunity === community) return session.tipperId;
  try {
    const $ = await fetchPage(predictUrl(community), session);
    const id = $('input[name="tipperId"]').attr("value")?.trim() || null;
    if (id) {
      session.tipperId = id;
      session.tipperCommunity = community;
    }
    return id;
  } catch {
    return null;
  }
}

// Re-stamp the per-user "isCurrentPlayer" flag on a (possibly shared-cached) ranking
// response using the requesting user's participant id. Returns a shallow clone so the
// shared cache entry stays identity-neutral across users. When the id is unknown, the
// response is returned unchanged, preserving the scraper's best-effort heuristic.
export function stampCurrentPlayer(tool: string, data: unknown, tipperId: string | null): unknown {
  if (!tipperId || !data || typeof data !== "object") return data;
  const mark = (rows: Array<Record<string, unknown>>) =>
    rows.map((r) => ({ ...r, isCurrentPlayer: r.playerId === tipperId }));
  const d = data as Record<string, unknown>;
  if (tool === "get_leaderboard" && Array.isArray(d.rankings)) {
    return { ...d, rankings: mark(d.rankings as Array<Record<string, unknown>>) };
  }
  if ((tool === "get_overview" || tool === "get_matchday_predictions") && Array.isArray(d.players)) {
    return { ...d, players: mark(d.players as Array<Record<string, unknown>>) };
  }
  return data;
}

// Kicktipp sometimes adds columns to tables. Instead of hardcoding indices,
// find the bet column by its content: either .nichttippbar or _heimTipp inputs.
function findBetColIndex($: cheerio.CheerioAPI, row: cheerio.Cheerio<AnyNode>): number {
  const cols = row.children("td");
  let idx = -1;
  cols.each((i, td) => {
    if ($(td).hasClass("nichttippbar") || $(td).find('input[id$="_heimTipp"]').length) {
      idx = i;
      return false;
    }
  });
  return idx;
}

function parseOdds($: cheerio.CheerioAPI, td: AnyNode): [string, string, string] {
  const el = $(td);
  return [
    el.find("span.quote-heim span.quote-text").text().trim(),
    el.find("span.quote-remis span.quote-text").text().trim(),
    el.find("span.quote-gast span.quote-text").text().trim(),
  ];
}

// Bonus/tendency points column ("X - Y - Z"): points earned for a correct
// outcome — +home-win / +draw / +away-win. Returns null when the cell isn't
// this column (so communities that don't show it degrade gracefully).
function parseBonusPoints(text: string): { home: number; draw: number; away: number } | null {
  const m = text.trim().match(/^(\d+)\s*-\s*(\d+)\s*-\s*(\d+)$/);
  if (!m) return null;
  return { home: +m[1], draw: +m[2], away: +m[3] };
}

// Reads a single "phase" (span.kicktipp-abschnitt) into "H:G". The home/away goals
// live in direct-child span.kicktipp-heim / span.kicktipp-gast (the separator is a
// span.kicktipp-tortrenner, "-"). Returns null when the phase has no numeric score
// (e.g. "-" placeholders on a not-started match).
function readAbschnittScore($: cheerio.CheerioAPI, abschnitt: cheerio.Cheerio<AnyNode>): string | null {
  if (!abschnitt.length) return null;
  const h = abschnitt.children("span.kicktipp-heim").first().text().trim();
  const g = abschnitt.children("span.kicktipp-gast").first().text().trim();
  if (!/^\d+$/.test(h) || !/^\d+$/.test(g)) return null;
  return `${h}:${g}`;
}

// Parses a span.kicktipp-ergebnis. Knockout games decided in extra time / on penalties
// carry TWO scores: the headline final (e.g. "4-5 a.TAB") in the primary phase, plus a
// separate span.kicktipp-tippwertung sub-result ("1-1 a.Prlg") which is the score
// kicktipp actually grades tips against. We return the graded score as `result` (so our
// colour coding matches kicktipp's awarded points) and the headline final — with its
// marker (a.TAB / n.V. / …) — as `penalty`, to show on its own line. Normal matches have
// a single phase: result = that score, penalty = null.
function parseResultSpan($: cheerio.CheerioAPI, span: cheerio.Cheerio<AnyNode>): { result: string; penalty: string | null } {
  if (!span.length) return { result: "-:-", penalty: null };
  // Primary phase = the direct-child phase (the headline final). Grading phase =
  // the nested kicktipp-tippwertung phase, present only for ET/penalty games.
  const primary = span.children("span.kicktipp-abschnitt").first();
  const tippwertung = span.find("span.kicktipp-abschnitt.kicktipp-tippwertung").first();
  const finalScore = readAbschnittScore($, primary);
  const gradedScore = readAbschnittScore($, tippwertung);

  let result = gradedScore ?? finalScore;
  if (!result) {
    // Some live layouts render the score as plain text ("1-2") inside the span.
    const m = span.text().trim().match(/(\d+)\s*[:\-]\s*(\d+)/);
    result = m ? `${m[1]}:${m[2]}` : "-:-";
  }

  // Show the headline final on its own line whenever it differs from the graded score
  // (i.e. the match was decided after the 120-min/ET result kicktipp scored tips on).
  let penalty: string | null = null;
  if (gradedScore && finalScore && gradedScore !== finalScore) {
    const marker = primary.children("span.kicktipp-zusatz").first().text().trim();
    penalty = marker ? `${finalScore} ${marker}` : finalScore;
  }
  return { result, penalty };
}

// Searches an entire prediction/schedule row for a result span. The result column
// index varies between pages and kicktipp layouts (see findBetColIndex), so we search
// the whole row rather than a hardcoded column.
function parseRowResult($: cheerio.CheerioAPI, row: cheerio.Cheerio<AnyNode>): { result: string; penalty: string | null } {
  return parseResultSpan($, row.find("span.kicktipp-ergebnis").first());
}

// Like parseRowResult, but also reports whether the match is over. Kicktipp tags the
// result phase on span.kicktipp-abschnitt: in-play matches carry "kicktipp-liveergebnis",
// finished ones "kicktipp-abpfiff" (final whistle). We treat any valid score that is NOT
// flagged live as final — this covers abpfiff plus extra-time/penalty final markers.
function parseRowResultInfo($: cheerio.CheerioAPI, row: cheerio.Cheerio<AnyNode>): { result: string; penalty: string | null; ended: boolean } {
  const { result, penalty } = parseRowResult($, row);
  const hasScore = result !== "-:-";
  const live = row.find("span.kicktipp-ergebnis .kicktipp-liveergebnis").length > 0;
  return { result, penalty, ended: hasScore && !live };
}

// Extracts the user's locked tip from a non-bettable ("nichttippbar") cell without
// conflating it with the live result, which kicktipp may render inside the same cell.
// We deliberately ignore any heim/gast spans nested under a result span
// (span.kicktipp-ergebnis) so the tip is never mistaken for the score.
// NOTE: the exact markup of a locked tip cell on the prediction page is unverified
// (no live fixture available) — verify against a real live match. The regex fallback
// preserves prior behavior for cells that are just plain "1:2" text.
function parseLockedTip($: cheerio.CheerioAPI, betTd: cheerio.Cheerio<AnyNode>): string {
  const notInResult = (_: number, el: AnyNode) =>
    $(el).closest("span.kicktipp-ergebnis").length === 0;
  const heim = betTd.find("span.kicktipp-heim").filter(notInResult).first().text().trim();
  const gast = betTd.find("span.kicktipp-gast").filter(notInResult).first().text().trim();
  if (/^\d+$/.test(heim) && /^\d+$/.test(gast)) return `${heim}:${gast}`;
  // Fallback: read the cell text with any result span removed first.
  const clone = betTd.clone();
  clone.find("span.kicktipp-ergebnis").remove();
  const m = clone.text().trim().match(/(\d+)\s*[:\-]\s*(\d+)/);
  if (m) return `${m[1]}:${m[2]}`;
  const raw = clone.text().trim();
  return raw || "-";
}

// Kicktipp renders match times in the site's own timezone (CET/CEST for the
// German/French sites), NOT the server's. Interpreting them as server-local time
// shifts kickoffs by the UTC offset difference and breaks live/upcoming detection.
// Map the locale to its IANA zone; allow an explicit override via KICKTIPP_TZ.
function siteTimeZone(): string {
  if (process.env.KICKTIPP_TZ) return process.env.KICKTIPP_TZ;
  switch (detectLocale()) {
    case "fr": return "Europe/Paris";
    case "de": return "Europe/Berlin";
    default: return "Europe/Berlin"; // kicktipp is German-run; .com also shows CET
  }
}

// Offset (ms) of `timeZone` from UTC at the given instant: tzLocal - UTC.
function tzOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") p[part.type] = parseInt(part.value, 10);
  }
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - date.getTime();
}

// Convert a wall-clock time in `timeZone` to the correct UTC instant.
function zonedWallTimeToDate(y: number, mo1: number, d: number, h: number, mi: number, timeZone: string): Date {
  const guess = Date.UTC(y, mo1 - 1, d, h, mi);
  let utc = guess - tzOffsetMs(new Date(guess), timeZone);
  // Refine once to handle DST transition edges.
  const off2 = tzOffsetMs(new Date(utc), timeZone);
  if (guess - off2 !== utc) utc = guess - off2;
  return new Date(utc);
}

function parseMatchDate(dateStr: string): Date | null {
  const trimmed = dateStr.trim();
  const tz = siteTimeZone();
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
  if (usMatch) {
    const [, m, d, y, h, min, ampm] = usMatch;
    let hour = parseInt(h);
    if (ampm.toUpperCase() === "PM" && hour !== 12) hour += 12;
    if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
    return zonedWallTimeToDate(2000 + parseInt(y), parseInt(m), parseInt(d), hour, parseInt(min), tz);
  }
  const euMatch = trimmed.match(/^(\d{2})[\./](\d{2})[\./](\d{2})\s+(\d{2}):(\d{2})$/);
  if (euMatch) {
    const [, d, m, y, h, min] = euMatch;
    return zonedWallTimeToDate(2000 + parseInt(y), parseInt(m), parseInt(d), parseInt(h), parseInt(min), tz);
  }
  return null;
}

// Human-friendly date label rendered in the SITE timezone, so cards show the same
// wall-clock time as kicktipp regardless of where the server runs.
function formatMatchDate(parsedDate: Date | null, fallback: string): string {
  if (!parsedDate) return fallback;
  const tz = siteTimeZone();
  return parsedDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", timeZone: tz })
    + " · " + parsedDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
}

// ── Tool implementations ──────────────────────────────────────────

function ensureCommunity(session: UserSession): string {
  if (!session.community) throw new Error("No community set. Call set_community first.");
  return session.community;
}

// The prediction page shows the user's tips but not the live/final score. Results
// (incl. live, via span.kicktipp-liveergebnis) live on the schedule page, so we fetch
// it and key the results by "home|away" for merging into bets/today's matches.
//
// One wrinkle: the schedule page only shows a knockout game's HEADLINE final
// (e.g. "4-5 a.TAB"), not the 120-min/ET score kicktipp actually grades tips on.
// That breakdown (span.kicktipp-tippwertung) only appears on the leaderboard page,
// so we overlay the leaderboard's graded score + headline final on top for any match
// it resolves — leaving normal matches sourced from the schedule untouched.
async function getResultsMap(session: UserSession, matchday?: number): Promise<Map<string, { result: string; penalty: string | null; ended: boolean }>> {
  const map = new Map<string, { result: string; penalty: string | null; ended: boolean }>();
  try {
    const schedule = await getSchedule(session, matchday);
    for (const m of schedule.matches) {
      if (m.result && m.result !== "-:-") map.set(`${m.home}|${m.away}`, { result: m.result, penalty: m.penaltyResult ?? null, ended: m.ended });
    }
  } catch {
    // Schedule unavailable — fall back to no results rather than failing the page.
  }
  try {
    const lb = await getLeaderboard(session, matchday);
    for (const m of lb.matches ?? []) {
      // Only override when the leaderboard exposes the penalty/ET breakdown — that's the
      // only case the schedule's headline-only result is wrong for grading.
      if (m.penaltyResult) {
        const existing = map.get(`${m.home}|${m.away}`);
        map.set(`${m.home}|${m.away}`, { result: m.result, penalty: m.penaltyResult, ended: existing?.ended ?? true });
      }
    }
  } catch {
    // Leaderboard unavailable — keep schedule-derived results.
  }
  return map;
}

async function getStatus(session: UserSession) {
  return {
    credentials_saved: true,
    community: session.community || null,
    player: session.player || null,
    setup_needed: !session.community,
    setup_instructions: !session.community ? "Call set_community to select your community" : null,
  };
}

async function getTodayMatches(session: UserSession) {
  const community = ensureCommunity(session);
  const $ = await fetchPage(predictUrl(community), session);
  const content = $("#kicktipp-content");
  const title = content.find("div.pagetitle").text().trim();
  const tbody = content.find("tbody");
  if (!tbody.length) return { title, matches: [] };

  const tz = siteTimeZone();
  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  // Results (incl. live) come from the schedule page, keyed by "home|away".
  const resultsMap = await getResultsMap(session);
  const matches: Array<{
    time: string; kickoff: string; home: string; away: string; bet: string;
    odds: { home: string; draw: string; away: string };
    bonusPoints: { home: number; draw: number; away: number } | null;
    needsBet: boolean; result: string; penaltyResult: string | null; ended: boolean;
  }> = [];

  // kicktipp prints the date/time only on the first match of a same-kickoff group;
  // follow-on rows have an empty date cell, so carry the last parsed date forward.
  let lastDate: Date | null = null;
  tbody.children("tr").each((_, tr) => {
    const row = $(tr);
    const cols = row.children("td");
    if (cols.length < 5) return;
    const betCol = findBetColIndex($, row);
    if (betCol < 0) return;
    const dateText = $(cols[0]).text().trim();
    const matchDate = parseMatchDate(dateText) ?? lastDate;
    if (matchDate) lastDate = matchDate;
    // Compare days in the site timezone so "today" matches what kicktipp shows.
    if (!matchDate || matchDate.toLocaleDateString("en-CA", { timeZone: tz }) !== todayKey) return;

    const home = $(cols[1]).text().trim();
    const away = $(cols[2]).text().trim();
    const info = resultsMap.get(`${home}|${away}`);
    const result = info?.result ?? "-:-";
    const penaltyResult = info?.penalty ?? null;
    const ended = info?.ended ?? false;
    const betTd = $(cols[betCol]);
    let bet: string;
    if (betTd.hasClass("nichttippbar")) {
      bet = parseLockedTip($, betTd);
    } else {
      const heimInput = betTd.find('input[id$="_heimTipp"]');
      const gastInput = betTd.find('input[id$="_gastTipp"]');
      if (heimInput.length && gastInput.length) {
        const h = heimInput.attr("value") || "";
        const g = gastInput.attr("value") || "";
        bet = h && g ? `${h}:${g}` : "";
      } else {
        bet = "-";
      }
    }

    const time = matchDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: tz });
    const kickoff = matchDate.toISOString();
    const oddsTd = cols[betCol + 1];
    const [rateHome, rateDraw, rateAway] = oddsTd ? parseOdds($, oddsTd) : ["", "", ""];
    // Bonus-points cell sits immediately before the bet-input column.
    const bonusPoints = parseBonusPoints($(cols[betCol - 1]).text());
    matches.push({
      time, kickoff, home, away, bet,
      odds: { home: rateHome, draw: rateDraw, away: rateAway },
      bonusPoints,
      needsBet: !bet, result, penaltyResult, ended,
    });
  });

  return { title, matches };
}

async function getBets(session: UserSession, matchday?: number) {
  const community = ensureCommunity(session);
  const $ = await fetchPage(predictUrl(community, matchday), session);
  const content = $("#kicktipp-content");
  const title = content.find("div.pagetitle").text().trim();
  let maxMatchday = 34;
  const spieltagLinks = $('a[href*="spieltagIndex="]');
  if (spieltagLinks.length) {
    let max = 0;
    spieltagLinks.each((_, el) => {
      const href = $(el).attr("href") || "";
      const m = href.match(/spieltagIndex=(\d+)/);
      if (m) { const n = parseInt(m[1], 10); if (n > max) max = n; }
    });
    if (max > 0) maxMatchday = max;
  }

  // The matchday tab kicktipp marks active (parent class "level0 active-true") is the
  // current one. Meaningful when no spieltagIndex is requested; lets the UI open there.
  let currentMatchday: number | null = null;
  const active = spieltagLinks.filter((_, el) => {
    const p = $(el).parent();
    return p.hasClass("level0") && p.hasClass("active-true") && !p.hasClass("bonusoption");
  }).first();
  const am = active.attr("href")?.match(/spieltagIndex=(\d+)/);
  if (am) currentMatchday = parseInt(am[1], 10);

  const tbody = content.find("tbody");
  if (!tbody.length) return { title, matches: [], maxMatchday, currentMatchday };

  // Results (incl. live) come from the schedule page for this matchday.
  const resultsMap = await getResultsMap(session, matchday);

  const matches: Array<{
    date: string; kickoff: string | null; home: string; away: string; bet: string;
    odds: { home: string; draw: string; away: string };
    bonusPoints: { home: number; draw: number; away: number } | null;
    result: string; penaltyResult: string | null; ended: boolean;
  }> = [];

  // kicktipp prints the date/time only on the first match of a same-kickoff group;
  // follow-on rows have an empty date cell, so carry the last parsed date forward.
  let lastDate: Date | null = null;
  tbody.children("tr").each((_, tr) => {
    const row = $(tr);
    const cols = row.children("td");
    if (cols.length < 5) return;
    const betCol = findBetColIndex($, row);
    if (betCol < 0) return;
    const rawDate = $(cols[0]).text().trim();
    const parsedDate = parseMatchDate(rawDate) ?? lastDate;
    if (parsedDate) lastDate = parsedDate;
    const date = formatMatchDate(parsedDate, rawDate);
    const home = $(cols[1]).text().trim();
    const away = $(cols[2]).text().trim();
    const info = resultsMap.get(`${home}|${away}`);
    const result = info?.result ?? "-:-";
    const penaltyResult = info?.penalty ?? null;
    const ended = info?.ended ?? false;
    const betTd = $(cols[betCol]);
    let bet: string;
    if (betTd.hasClass("nichttippbar")) {
      bet = parseLockedTip($, betTd);
    } else {
      const heimInput = betTd.find('input[id$="_heimTipp"]');
      const gastInput = betTd.find('input[id$="_gastTipp"]');
      if (heimInput.length && gastInput.length) {
        const h = heimInput.attr("value") || "";
        const g = gastInput.attr("value") || "";
        bet = h && g ? `${h}:${g}` : "-";
      } else {
        bet = "-";
      }
    }
    const kickoff = parsedDate ? parsedDate.toISOString() : null;
    const oddsTd = cols[betCol + 1];
    const [rateHome, rateDraw, rateAway] = oddsTd ? parseOdds($, oddsTd) : ["", "", ""];
    // Bonus-points cell sits immediately before the bet-input column.
    const bonusPoints = parseBonusPoints($(cols[betCol - 1]).text());
    matches.push({ date, kickoff, home, away, bet, odds: { home: rateHome, draw: rateDraw, away: rateAway }, bonusPoints, result, penaltyResult, ended });
  });

  return { title, matches, maxMatchday, currentMatchday };
}

async function getSchedule(session: UserSession, matchday?: number) {
  const community = ensureCommunity(session);
  let url = `${getUrlBase()}/${encodeURIComponent(community)}/${route("schedule")}`;
  if (matchday !== undefined) url += `?spieltagIndex=${matchday}`;
  const $ = await fetchPage(url, session);
  const content = $("#kicktipp-content");
  const title = content.find("div.pagetitle").text().trim();
  const table = content.find("table#spiele");
  if (!table.length) return { title, matches: [] };
  const tbody = table.find("tbody");
  if (!tbody.length) return { title, matches: [] };

  const matches: Array<{ date: string; kickoff: string | null; home: string; away: string; result: string; penaltyResult: string | null; ended: boolean }> = [];
  tbody.children("tr").each((_, tr) => {
    const cols = $(tr).children("td");
    if (cols.length < 5) return;
    const rawDate = $(cols[0]).text().trim();
    const parsedDate = parseMatchDate(rawDate);
    const date = formatMatchDate(parsedDate, rawDate);
    const kickoff = parsedDate ? parsedDate.toISOString() : null;
    const home = $(cols[2]).text().trim();
    const away = $(cols[3]).text().trim();
    // Result column varies by site layout, so search the whole row.
    const { result, penalty, ended } = parseRowResultInfo($, $(tr));
    matches.push({ date, kickoff, home, away, result, penaltyResult: penalty, ended });
  });

  return { title, matches };
}

async function getLeaderboard(session: UserSession, matchday?: number, bonus = false) {
  const community = ensureCommunity(session);
  const $ = await fetchPage(leaderboardUrl(community, matchday, bonus), session);
  const content = $("#kicktipp-content");
  const title = content.find("div.pagetitle").text().trim();

  let matches: Array<{ date: string; home: string; away: string; result: string; penaltyResult: string | null }> | undefined;
  if (!bonus) {
    const matchesTable = content.find("table#spielplanSpiele");
    if (matchesTable.length) {
      matches = [];
      matchesTable.find("tbody tr").each((_, tr) => {
        const cols = $(tr).children("td");
        if (cols.length < 4) return;
        const { result, penalty: penaltyResult } = parseResultSpan($, $(cols[3]).find("span.kicktipp-ergebnis").first());
        const rawDate = $(cols[0]).text().trim();
        const parsedDate = parseMatchDate(rawDate);
        matches!.push({
          date: formatMatchDate(parsedDate, rawDate),
          home: $(cols[1]).text().trim(),
          away: $(cols[2]).text().trim(),
          result,
          penaltyResult,
        });
      });
    }
  }

  let bonusQuestions: Array<{ abbreviation: string; question: string; result: string }> | undefined;
  if (bonus) {
    const questionsTable = content.find("table.ktable").first();
    if (questionsTable.length) {
      bonusQuestions = [];
      questionsTable.find("tbody tr").each((_, tr) => {
        const cols = $(tr).children("td");
        if (cols.length < 4) return;
        const resultParts: string[] = [];
        $(cols[3]).find("table tr").each((__, subTr) => {
          const medium = $(subTr).find("div.visible-medium-block");
          if (medium.length) resultParts.push(medium.text().trim());
        });
        bonusQuestions!.push({
          abbreviation: $(cols[2]).text().trim(),
          question: $(cols[1]).text().trim(),
          result: resultParts.join(", ") || "---",
        });
      });
    }
  }

  const rankings: Array<{
    position: string; name: string; playerId: string | null; matchdayPoints: string;
    bonus: string; total: string; isCurrentPlayer: boolean;
  }> = [];
  content.find("table#ranking tbody tr").each((_, tr) => {
    const posTd = $(tr).find("td.position");
    const nameDiv = $(tr).find("div.mg_name");
    if (!posTd.length || !nameDiv.length) return;
    const name = nameDiv.text().trim();
    rankings.push({
      position: posTd.text().trim(),
      name,
      playerId: participantId($, tr),
      matchdayPoints: $(tr).find("td.spieltagspunkte").text().trim(),
      bonus: $(tr).find("td.bonus").text().trim(),
      total: $(tr).find("td.gesamtpunkte").text().trim(),
      isCurrentPlayer: isCurrentPlayerRow($, tr) || (!!session.player && name === session.player),
    });
  });

  return { title, matches, bonusQuestions, rankings };
}

// Every player's tip + points for each match of a matchday. The leaderboard ranking
// table carries one "ereignis" column per match; each player cell holds the tip and a
// <sub class="p"> with points, e.g. "2-0<sub>3</sub>". "---" = no/hidden tip. Column
// order matches the matchday's match order, so the caller maps by index.
async function getMatchdayPredictions(session: UserSession, matchday: number) {
  const community = ensureCommunity(session);
  const $ = await fetchPage(leaderboardUrl(community, matchday), session);
  const table = $("#kicktipp-content table#ranking");

  // ereignisN class → column index.
  const ereignisIndex = (el: AnyNode): number => {
    const cls = $(el).attr("class") || "";
    const m = cls.match(/\bereignis(\d+)\b/);
    return m ? parseInt(m[1], 10) : -1;
  };

  const matches: Array<{ index: number; label: string }> = [];
  $(table).find("thead tr").last().find("th.ereignis").each((_, th) => {
    const index = ereignisIndex(th);
    if (index >= 0) matches.push({ index, label: $(th).text().replace(/\s+/g, " ").trim() });
  });
  matches.sort((a, b) => a.index - b.index);
  const matchCount = matches.length;

  const players: Array<{
    name: string; position: string; playerId: string | null; isCurrentPlayer: boolean;
    predictions: Array<{ tip: string | null; points: number | null }>;
  }> = [];

  $(table).find("tbody tr").each((_, tr) => {
    const nameDiv = $(tr).find("div.mg_name");
    if (!nameDiv.length) return;
    const name = nameDiv.text().trim();
    const position = $(tr).find("td.position").text().trim();
    const predictions: Array<{ tip: string | null; points: number | null }> =
      Array.from({ length: matchCount }, () => ({ tip: null, points: null }));

    $(tr).find("td.ereignis").each((__, td) => {
      const index = ereignisIndex(td);
      if (index < 0 || index >= matchCount) return;
      const cell = $(td).clone();
      const subText = cell.find("sub").text().trim();
      const points = /^\d+$/.test(subText) ? parseInt(subText, 10) : null;
      cell.find("sub").remove();
      const raw = cell.text().trim();
      let tip: string | null = null;
      const m = raw.match(/(\d+)\s*[-:]\s*(\d+)/);
      if (m) tip = `${m[1]}:${m[2]}`;
      predictions[index] = { tip, points };
    });

    // Kicktipp highlights the logged-in member's own ranking row with class "treffer"
    // (exactly one row per page, stable across matchdays). This is more reliable than
    // matching session.player, which is often unset — so the UI can always locate the
    // user's points even on a partially-played matchday with few visible tips.
    const isCurrentPlayer = isCurrentPlayerRow($, tr) || (!!session.player && name === session.player);
    players.push({ name, position, playerId: participantId($, tr), isCurrentPlayer, predictions });
  });

  return { matchday, matches, players };
}

async function getOverview(session: UserSession, view = "matchday-points") {
  const VIEWS: Record<string, [string, string]> = {
    "matchday-points": ["spieltagspunkte", "Matchday points"],
    "standings": ["platzierungen", "Standings"],
    "standings-diff": ["platzierungsdifferenz", "Standings difference"],
    "matchday-standings": ["spieltagsplatzierungen", "Matchday standings"],
    "points-from-leader": ["punkteZurSpitze", "Points from leader"],
  };
  if (!(view in VIEWS)) throw new Error(`Unknown view '${view}'. Options: ${Object.keys(VIEWS).join(", ")}`);
  const [ansicht, label] = VIEWS[view];
  const community = ensureCommunity(session);
  const $ = await fetchPage(`${getUrlBase()}/${encodeURIComponent(community)}/${route("overview")}?ansicht=${ansicht}`, session);
  const content = $("#kicktipp-content");
  const ranking = content.find("table#ranking");
  if (!ranking.length) return { label, maxMatchday: 0, players: [] };
  const tbody = ranking.find("tbody");
  if (!tbody.length) return { label, maxMatchday: 0, players: [] };

  const players: Array<{
    position: string; name: string; playerId: string | null; matchdays: Record<number, string>;
    bonus: string; wins: string; total: string; isCurrentPlayer: boolean;
  }> = [];
  let maxMatchday = 0;

  tbody.find("tr").each((_, tr) => {
    const posTd = $(tr).find("td.position");
    const nameDiv = $(tr).find("div.mg_name");
    if (!posTd.length || !nameDiv.length) return;
    const name = nameDiv.text().trim();
    const matchdays: Record<number, string> = {};
    $(tr).find("td.spieltag").each((__, td) => {
      const classes = $(td).attr("class")?.split(/\s+/) || [];
      for (const cls of classes) {
        if (cls.startsWith("spieltag") && cls !== "spieltag") {
          const idx = parseInt(cls.replace("spieltag", ""));
          const val = $(td).text().trim();
          if (val) { matchdays[idx] = val; if (idx > maxMatchday) maxMatchday = idx; }
        }
      }
    });
    players.push({
      position: posTd.text().trim(), name, playerId: participantId($, tr), matchdays,
      bonus: $(tr).find("td.bonus").text().trim(),
      wins: $(tr).find("td.siege").text().trim(),
      total: $(tr).find("td.punkte").text().trim(),
      isCurrentPlayer: isCurrentPlayerRow($, tr) || (!!session.player && name === session.player),
    });
  });

  return { label, maxMatchday, players };
}

async function getTable(session: UserSession, option?: string) {
  const community = ensureCommunity(session);
  let url = `${getUrlBase()}/${encodeURIComponent(community)}/${route("tables")}`;
  let label = "League Table";
  if (option === "home") { url += "?option=heim"; label = "League Table (Home)"; }
  else if (option === "away") { url += "?option=gast"; label = "League Table (Away)"; }

  const $ = await fetchPage(url, session);
  const content = $("#kicktipp-content");
  const table = content.find("table").first();
  if (!table.length) return { label, teams: [] };
  const tbody = table.find("tbody");
  if (!tbody.length) return { label, teams: [] };

  const teams: Array<{
    position: string; team: string; played: string; points: string;
    goalsFor: string; goalsAgainst: string; goalDifference: string;
    wins: string; draws: string; losses: string;
  }> = [];
  tbody.children("tr").each((_, tr) => {
    const cols = $(tr).children("td");
    if (cols.length < 10) return;
    teams.push({
      position: $(cols[0]).text().trim(), team: $(cols[1]).text().trim(),
      played: $(cols[2]).text().trim(), points: $(cols[3]).text().trim(),
      goalsFor: $(cols[4]).text().trim(), goalsAgainst: $(cols[5]).text().trim(),
      goalDifference: $(cols[6]).text().trim(), wins: $(cols[7]).text().trim(),
      draws: $(cols[8]).text().trim(), losses: $(cols[9]).text().trim(),
    });
  });

  return { label, teams };
}

async function getRules(session: UserSession) {
  const community = ensureCommunity(session);
  const $ = await fetchPage(`${getUrlBase()}/${encodeURIComponent(community)}/${route("rules")}`, session);
  const pagecontent = $("#kicktipp-content div.pagecontent");
  if (!pagecontent.length) return [];

  const sections: Array<{ type: string; text?: string; headers?: string[]; rows?: string[][] }> = [];
  pagecontent.contents().each((_, child) => {
    if (child.type !== "tag") return;
    const el = $(child);
    const tagName = (child as any).tagName as string;
    if (tagName === "h2") {
      sections.push({ type: "heading", text: el.text().trim() });
    } else if (tagName === "p") {
      sections.push({ type: "paragraph", text: el.text().trim() });
    } else if (tagName === "div") {
      const table = el.find("table");
      if (table.length) {
        const headers: string[] = [];
        table.find("thead th").each((__, th) => { headers.push($(th).text().trim()); });
        const rows: string[][] = [];
        table.find("tbody tr").each((__, tr) => {
          const row: string[] = [];
          $(tr).find("td").each((___, td) => { row.push($(td).text().trim()); });
          rows.push(row);
        });
        if (headers.length) sections.push({ type: "table", headers, rows });
      }
    }
  });

  return sections;
}

const EXCLUDED_SLUGS = new Set([
  "info", "profil", "login", "connexion", "impressum",
  "datenschutz", "nutzungsbedingungen", "agb", "kontakt",
  "hilfe", "help", "faq", "register", "inscription",
  "anmelden", "passwort", "password", "logout",
]);

async function getCommunities(session: UserSession) {
  const $ = await fetchPage(`${getUrlBase()}/info/profil/meinetipprunden`, session);
  const links = $("#kicktipp-content a");

  // Strategy A: URL-pattern matching (robust to text/display changes)
  const urlCommunities = new Set<string>();
  links.each((_, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/^\/([A-Za-z0-9][\w-]*)\/?/);
    if (!match) return;
    const slug = match[1];
    if (EXCLUDED_SLUGS.has(slug.toLowerCase())) return;
    if (slug.includes(".")) return;
    urlCommunities.add(slug);
  });

  if (urlCommunities.size > 0) {
    console.log(`[getCommunities] Found ${urlCommunities.size} via URL pattern: ${[...urlCommunities].join(", ")}`);
    return [...urlCommunities];
  }

  // Strategy B: text-match (original logic, backward compat)
  const textCommunities: string[] = [];
  links.each((_, el) => {
    const href = ($(el).attr("href") || "").replace(/\//g, "");
    const text = $(el).text().trim();
    const hrefNorm = href.toLowerCase().replace(/-/g, " ");
    const textNorm = text.toLowerCase();
    const menuDiv = $(el).find("div.menu-title-mit-tippglocke");
    if (
      href.toLowerCase() === textNorm ||
      hrefNorm === textNorm ||
      (menuDiv.length && menuDiv.text().trim().toLowerCase() === href.toLowerCase())
    ) {
      textCommunities.push(href);
    }
  });

  if (textCommunities.length > 0) {
    console.log(`[getCommunities] Found ${textCommunities.length} via text match: ${textCommunities.join(", ")}`);
    return textCommunities;
  }

  // Diagnostic: log what we found so failures are debuggable from server logs
  const sample: string[] = [];
  links.each((_, el) => {
    if (sample.length >= 10) return false;
    const href = $(el).attr("href") || "(no href)";
    const text = $(el).text().trim().slice(0, 60);
    sample.push(`href="${href}" text="${text}"`);
  });
  console.warn(`[getCommunities] No communities detected. ${links.length} links in #kicktipp-content:`);
  sample.forEach(l => console.warn(`  ${l}`));

  return [];
}

async function getPlayers(session: UserSession) {
  const community = ensureCommunity(session);
  const $ = await fetchPage(leaderboardUrl(community), session);
  const players: string[] = [];
  $("table#ranking tbody tr").each((_, tr) => {
    const name = $(tr).find("div.mg_name").text().trim();
    if (name) players.push(name);
  });
  return players;
}

async function getBonusQuestions(session: UserSession) {
  const community = ensureCommunity(session);
  const $ = await fetchPage(`${getUrlBase()}/${encodeURIComponent(community)}/${route("predict")}?bonus=true`, session);
  const content = $("#kicktipp-content");

  let deadline: string | null = null;

  const table = content.find("table#tippabgabeFragen");
  if (!table.length) return { questions: [], deadline };
  const tbody = table.find("tbody");
  if (!tbody.length) return { questions: [], deadline };

  const questions: Array<{
    question: string;
    selects: Array<{ name: string; options: Array<{ value: string; text: string }>; selected: string }>;
  }> = [];

  tbody.children("tr").each((_, tr) => {
    const cols = $(tr).children("td");
    if (cols.length < 3) return;

    // Extract deadline from the first column (tipptermin) if available
    if (!deadline) {
      const dateText = $(cols[0]).text().trim();
      const dateMatch = dateText.match(/\d{2}[.\/]\d{2}[.\/]\d{2}\s+\d{2}:\d{2}/);
      if (dateMatch) {
        const parsed = parseMatchDate(dateMatch[0]);
        if (parsed) deadline = parsed.toISOString();
      }
    }

    const question = $(cols[1]).text().trim();

    // Find the column containing select elements (resilient to column changes)
    let selectTd: AnyNode | null = null;
    cols.each((__, td) => {
      if ($(td).find("select").length) selectTd = td;
    });

    const selects: typeof questions[0]["selects"] = [];
    if (selectTd) {
      // Editable: deadline not yet passed — parse the real dropdowns.
      $(selectTd).find("select").each((__, sel) => {
        const name = $(sel).attr("name")!;
        const options: Array<{ value: string; text: string }> = [];
        let selected = "-1";
        $(sel).find("option").each((___, opt) => {
          const value = $(opt).attr("value") || "";
          const text = $(opt).text().trim();
          if (value !== "-1") options.push({ value, text });
          if ($(opt).attr("selected") !== undefined) selected = value;
        });
        selects.push({ name, options, selected });
      });
    } else {
      // Read-only (deadline passed): kicktipp renders the user's answer(s) as
      // <div class="nichttippbar"><div class="antwort">…</div></div>, one per pick.
      // Synthesize a locked single-option select per answer so the UI shows it.
      let answerTd: AnyNode | null = null;
      cols.each((__, td) => {
        if ($(td).find("div.antwort").length) answerTd = td;
      });
      if (!answerTd) return;
      $(answerTd).find("div.antwort").each((__, d) => {
        const text = $(d).text().trim();
        if (text) selects.push({ name: "", options: [{ value: "0", text }], selected: "0" });
      });
    }

    if (!selects.length) return;
    questions.push({ question, selects });
  });

  return { questions, deadline };
}

function setCommunity(session: UserSession, name: string) {
  session.community = name;
  return { community: name };
}

function setPlayer(session: UserSession, name: string) {
  session.player = name;
  return { player: name };
}

async function placeBets(session: UserSession, bets: string[], matchday?: number, dryRun = false) {
  const community = ensureCommunity(session);
  const url = predictUrl(community, matchday);
  const $ = await fetchPage(url, session);
  const tbody = $("#kicktipp-content tbody");
  if (!tbody.length) throw new Error("No matches found.");

  interface EditableMatch { home: string; away: string; heimName: string; gastName: string }
  const editable: EditableMatch[] = [];
  tbody.find("tr").each((_, tr) => {
    const row = $(tr);
    const cols = row.children("td");
    if (cols.length < 5) return;
    const betCol = findBetColIndex($, row);
    if (betCol < 0) return;
    const betTd = $(cols[betCol]);
    if (betTd.hasClass("nichttippbar")) return;
    const heimInput = betTd.find('input[id$="_heimTipp"]');
    const gastInput = betTd.find('input[id$="_gastTipp"]');
    if (!heimInput.length || !gastInput.length) return;
    editable.push({
      home: $(cols[1]).text().trim(),
      away: $(cols[2]).text().trim(),
      heimName: heimInput.attr("name")!,
      gastName: gastInput.attr("name")!,
    });
  });

  if (!editable.length) throw new Error("No editable matches found.");

  const formFields: Record<string, string> = {};
  $("#kicktipp-content form input[type='hidden']").each((_, el) => {
    const name = $(el).attr("name");
    const value = $(el).attr("value") || "";
    if (name) formFields[name] = value;
  });
  for (const match of editable) {
    const heimVal = $(`input[name="${match.heimName}"]`).attr("value") || "";
    const gastVal = $(`input[name="${match.gastName}"]`).attr("value") || "";
    if (heimVal) formFields[match.heimName] = heimVal;
    if (gastVal) formFields[match.gastName] = gastVal;
  }

  const placed: Array<{ home: string; away: string; homeGoals: number; awayGoals: number }> = [];
  const seen = new Set<string>();

  for (const arg of bets) {
    if (!arg.includes("=")) throw new Error(`Invalid bet '${arg}'. Use format: Home vs Away=H:G`);
    const eqIdx = arg.lastIndexOf("=");
    const fixture = arg.slice(0, eqIdx);
    const result = arg.slice(eqIdx + 1);
    if (!fixture.includes(" vs ")) throw new Error(`Invalid fixture '${arg}'. Use format: Home vs Away=H:G`);
    const vsIdx = fixture.indexOf(" vs ");
    const home = fixture.slice(0, vsIdx).trim();
    const away = fixture.slice(vsIdx + 4).trim();
    const key = `${home.toLowerCase()}|${away.toLowerCase()}`;
    if (seen.has(key)) throw new Error(`Duplicate fixture: "${home} vs ${away}"`);
    seen.add(key);

    const parts = result.split(":");
    if (parts.length !== 2) throw new Error(`Invalid result '${result}'. Use format H:G`);
    const h = parseInt(parts[0]);
    const g = parseInt(parts[1]);
    if (isNaN(h) || isNaN(g) || h < 0 || g < 0) throw new Error(`Invalid result '${result}'.`);

    const match = editable.find(
      (e) => e.home.toLowerCase() === home.toLowerCase() && e.away.toLowerCase() === away.toLowerCase()
    );
    if (!match) throw new Error(`No match found for "${home} vs ${away}"`);

    formFields[match.heimName] = String(h);
    formFields[match.gastName] = String(g);
    placed.push({ home: match.home, away: match.away, homeGoals: h, awayGoals: g });
  }

  if (dryRun) return placed;

  formFields["submitbutton"] = "";
  const formAction = $("#kicktipp-content form").attr("action");
  const submitUrl = formAction
    ? (formAction.startsWith("http") ? formAction : new URL(formAction, url).href)
    : url;

  await submitForm(submitUrl, formFields, session);
  return placed;
}

async function placeBonusBets(session: UserSession, bets: string[], dryRun = false) {
  const community = ensureCommunity(session);
  const url = `${getUrlBase()}/${encodeURIComponent(community)}/${route("predict")}?bonus=true`;
  const { questions } = await getBonusQuestions(session);
  if (!questions.length) throw new Error("No editable bonus questions found.");

  const formFields: Record<string, string> = {};
  const $ = await fetchPage(url, session);
  $("#kicktipp-content form input[type='hidden']").each((_, el) => {
    const name = $(el).attr("name");
    const value = $(el).attr("value") || "";
    if (name) formFields[name] = value;
  });
  for (const q of questions) {
    for (const sel of q.selects) {
      formFields[sel.name] = sel.selected;
    }
  }

  const placed: Array<{ question: string; answer: string }> = [];

  for (const arg of bets) {
    const eqIdx = arg.lastIndexOf("=");
    if (eqIdx === -1) throw new Error(`Invalid bonus bet '${arg}'. Use format: selectName=value`);
    const name = arg.slice(0, eqIdx).trim();
    const value = arg.slice(eqIdx + 1).trim();
    formFields[name] = value;

    for (const q of questions) {
      const sel = q.selects.find((s) => s.name === name);
      if (sel) {
        const opt = sel.options.find((o) => o.value === value);
        placed.push({ question: q.question, answer: opt?.text ?? value });
        break;
      }
    }
  }

  if (dryRun) return placed;

  formFields["submitbutton"] = "";
  const formAction = $("#kicktipp-content form").attr("action");
  const submitUrl = formAction
    ? (formAction.startsWith("http") ? formAction : new URL(formAction, url).href)
    : url;

  await submitForm(submitUrl, formFields, session);
  return placed;
}

// ── Public API ────────────────────────────────────────────────────

export type ToolName =
  | "get_status" | "get_today_matches" | "get_bets" | "get_schedule"
  | "get_leaderboard" | "get_overview" | "get_table" | "get_rules"
  | "get_communities" | "get_players" | "get_bonus_questions"
  | "get_matchday_predictions"
  | "set_community" | "set_player" | "place_bets" | "place_bonus_bets";

export const VALID_TOOLS: ToolName[] = [
  "get_status", "get_today_matches", "get_bets", "get_schedule",
  "get_leaderboard", "get_overview", "get_table", "get_rules",
  "get_communities", "get_players", "get_bonus_questions",
  "get_matchday_predictions",
  "set_community", "set_player", "place_bets", "place_bonus_bets",
];

export const SHARED_TOOLS = new Set<string>([
  "get_schedule", "get_leaderboard", "get_overview", "get_table",
  "get_rules", "get_players", "get_matchday_predictions",
]);

export async function callTool(name: string, args: Record<string, unknown> | undefined, session: UserSession): Promise<unknown> {
  switch (name) {
    case "get_status": return getStatus(session);
    case "get_today_matches": return getTodayMatches(session);
    case "get_bets": return getBets(session, args?.matchday as number | undefined);
    case "get_schedule": return getSchedule(session, args?.matchday as number | undefined);
    case "get_leaderboard": return getLeaderboard(session, args?.matchday as number | undefined, args?.bonus as boolean | undefined);
    case "get_overview": return getOverview(session, args?.view as string | undefined);
    case "get_table": return getTable(session, args?.option as string | undefined);
    case "get_rules": return getRules(session);
    case "get_communities": return getCommunities(session);
    case "get_players": return getPlayers(session);
    case "get_bonus_questions": return getBonusQuestions(session);
    case "get_matchday_predictions": return getMatchdayPredictions(session, args?.matchday as number);
    case "set_community": return setCommunity(session, args?.name as string);
    case "set_player": return setPlayer(session, args?.name as string);
    case "place_bets": return placeBets(session, args?.bets as string[], args?.matchday as number | undefined, args?.dry_run as boolean | undefined);
    case "place_bonus_bets": return placeBonusBets(session, args?.bets as string[], args?.dry_run as boolean | undefined);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}
