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

function parseOdds($: cheerio.CheerioAPI, td: AnyNode): [string, string, string] {
  const el = $(td);
  return [
    el.find("span.quote-heim span.quote-text").text().trim(),
    el.find("span.quote-remis span.quote-text").text().trim(),
    el.find("span.quote-gast span.quote-text").text().trim(),
  ];
}

function parseMatchDate(dateStr: string): Date | null {
  const trimmed = dateStr.trim();
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
  if (usMatch) {
    const [, m, d, y, h, min, ampm] = usMatch;
    let hour = parseInt(h);
    if (ampm.toUpperCase() === "PM" && hour !== 12) hour += 12;
    if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
    return new Date(2000 + parseInt(y), parseInt(m) - 1, parseInt(d), hour, parseInt(min));
  }
  const euMatch = trimmed.match(/^(\d{2})[\./](\d{2})[\./](\d{2})\s+(\d{2}):(\d{2})$/);
  if (euMatch) {
    const [, d, m, y, h, min] = euMatch;
    return new Date(2000 + parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min));
  }
  return null;
}

// ── Tool implementations ──────────────────────────────────────────

function ensureCommunity(session: UserSession): string {
  if (!session.community) throw new Error("No community set. Call set_community first.");
  return session.community;
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

  const now = new Date();
  const matches: Array<{
    time: string; kickoff: string; home: string; away: string; bet: string;
    odds: { home: string; draw: string; away: string }; needsBet: boolean;
  }> = [];

  tbody.children("tr").each((_, tr) => {
    const cols = $(tr).children("td");
    if (cols.length < 5) return;
    const dateText = $(cols[0]).text().trim();
    const matchDate = parseMatchDate(dateText);
    if (!matchDate || matchDate.getFullYear() !== now.getFullYear() ||
        matchDate.getMonth() !== now.getMonth() || matchDate.getDate() !== now.getDate()) return;

    const home = $(cols[1]).text().trim();
    const away = $(cols[2]).text().trim();
    const betTd = $(cols[3]);
    let bet: string;
    if (betTd.hasClass("nichttippbar")) {
      bet = betTd.text().trim() || "-";
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

    const time = matchDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const kickoff = matchDate.toISOString();
    const [rateHome, rateDraw, rateAway] = parseOdds($, cols[4]);
    matches.push({
      time, kickoff, home, away, bet,
      odds: { home: rateHome, draw: rateDraw, away: rateAway },
      needsBet: !bet,
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

  const tbody = content.find("tbody");
  if (!tbody.length) return { title, matches: [], maxMatchday };

  const matches: Array<{
    date: string; kickoff: string | null; home: string; away: string; bet: string;
    odds: { home: string; draw: string; away: string };
  }> = [];

  tbody.children("tr").each((_, tr) => {
    const cols = $(tr).children("td");
    if (cols.length < 5) return;
    const rawDate = $(cols[0]).text().trim();
    const parsedDate = parseMatchDate(rawDate);
    const date = parsedDate
      ? parsedDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" })
        + " · " + parsedDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
      : rawDate;
    const home = $(cols[1]).text().trim();
    const away = $(cols[2]).text().trim();
    const betTd = $(cols[3]);
    let bet: string;
    if (betTd.hasClass("nichttippbar")) {
      bet = betTd.text().trim();
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
    const [rateHome, rateDraw, rateAway] = parseOdds($, cols[4]);
    matches.push({ date, kickoff, home, away, bet, odds: { home: rateHome, draw: rateDraw, away: rateAway } });
  });

  return { title, matches, maxMatchday };
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

  const matches: Array<{ date: string; home: string; away: string; result: string }> = [];
  tbody.children("tr").each((_, tr) => {
    const cols = $(tr).children("td");
    if (cols.length < 5) return;
    const rawDate = $(cols[0]).text().trim();
    const parsedDate = parseMatchDate(rawDate);
    const date = parsedDate
      ? parsedDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" })
        + " · " + parsedDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
      : rawDate;
    const home = $(cols[2]).text().trim();
    const away = $(cols[3]).text().trim();
    const resultSpan = $(cols[4]).find("span.kicktipp-ergebnis");
    let result: string;
    if (resultSpan.length) {
      result = `${resultSpan.find("span.kicktipp-heim").text().trim()}:${resultSpan.find("span.kicktipp-gast").text().trim()}`;
    } else {
      result = "-:-";
    }
    matches.push({ date, home, away, result });
  });

  return { title, matches };
}

async function getLeaderboard(session: UserSession, matchday?: number, bonus = false) {
  const community = ensureCommunity(session);
  const $ = await fetchPage(leaderboardUrl(community, matchday, bonus), session);
  const content = $("#kicktipp-content");
  const title = content.find("div.pagetitle").text().trim();

  let matches: Array<{ date: string; home: string; away: string; result: string }> | undefined;
  if (!bonus) {
    const matchesTable = content.find("table#spielplanSpiele");
    if (matchesTable.length) {
      matches = [];
      matchesTable.find("tbody tr").each((_, tr) => {
        const cols = $(tr).children("td");
        if (cols.length < 4) return;
        const resultSpan = $(cols[3]).find("span.kicktipp-ergebnis");
        let result = "-:-";
        if (resultSpan.length) {
          result = `${resultSpan.find("span.kicktipp-heim").text().trim()}:${resultSpan.find("span.kicktipp-gast").text().trim()}`;
        }
        const rawDate = $(cols[0]).text().trim();
        const parsedDate = parseMatchDate(rawDate);
        matches!.push({
          date: parsedDate
            ? parsedDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" })
              + " · " + parsedDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
            : rawDate,
          home: $(cols[1]).text().trim(),
          away: $(cols[2]).text().trim(),
          result,
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
    position: string; name: string; matchdayPoints: string;
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
      matchdayPoints: $(tr).find("td.spieltagspunkte").text().trim(),
      bonus: $(tr).find("td.bonus").text().trim(),
      total: $(tr).find("td.gesamtpunkte").text().trim(),
      isCurrentPlayer: !!session.player && name === session.player,
    });
  });

  return { title, matches, bonusQuestions, rankings };
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
    position: string; name: string; matchdays: Record<number, string>;
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
      position: posTd.text().trim(), name, matchdays,
      bonus: $(tr).find("td.bonus").text().trim(),
      wins: $(tr).find("td.siege").text().trim(),
      total: $(tr).find("td.punkte").text().trim(),
      isCurrentPlayer: !!session.player && name === session.player,
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

async function getCommunities(session: UserSession) {
  const $ = await fetchPage(`${getUrlBase()}/info/profil/meinetipprunden`, session);
  const links = $("#kicktipp-content a");
  const communities: string[] = [];
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
      communities.push(href);
    }
  });
  return communities;
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
  const deadlineEl = content.find(".deadline, .hinweis, .abgabeschluss");
  if (deadlineEl.length) {
    const deadlineText = deadlineEl.text().trim();
    const dateMatch = deadlineText.match(/\d{2}[.\/]\d{2}[.\/]\d{2}\s+\d{2}:\d{2}/);
    if (dateMatch) {
      const parsed = parseMatchDate(dateMatch[0]);
      if (parsed) deadline = parsed.toISOString();
    }
  }

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
    const question = $(cols[1]).text().trim();
    const selectEls = $(cols[2]).find("select");
    if (!selectEls.length) return;
    const selects: typeof questions[0]["selects"] = [];
    selectEls.each((__, sel) => {
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
    const cols = $(tr).find("td");
    if (cols.length < 5) return;
    const betTd = $(cols[3]);
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
  | "set_community" | "set_player" | "place_bets" | "place_bonus_bets";

export const VALID_TOOLS: ToolName[] = [
  "get_status", "get_today_matches", "get_bets", "get_schedule",
  "get_leaderboard", "get_overview", "get_table", "get_rules",
  "get_communities", "get_players", "get_bonus_questions",
  "set_community", "set_player", "place_bets", "place_bonus_bets",
];

export const SHARED_TOOLS = new Set<string>([
  "get_schedule", "get_leaderboard", "get_overview", "get_table",
  "get_rules", "get_players",
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
    case "set_community": return setCommunity(session, args?.name as string);
    case "set_player": return setPlayer(session, args?.name as string);
    case "place_bets": return placeBets(session, args?.bets as string[], args?.matchday as number | undefined, args?.dry_run as boolean | undefined);
    case "place_bonus_bets": return placeBonusBets(session, args?.bets as string[], args?.dry_run as boolean | undefined);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}
