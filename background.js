// Settings live in chrome.storage.local, set from the toolbar popup (ui/popup.html):
//   flexRoll, flexPass   FLEX sign-in, used only to sign in again when the session has expired
//   watchEnabled         background marks checks on/off (off until the user turns it on)
//   watchEvery           minutes between checks (owner only; everyone else checks every 30 minutes)
//   enabled              FixForFlex on/off (on unless switched off); off leaves FLEX untouched
const DEFAULTS = { watchEnabled: false, watchEvery: 30 };
importScripts("content/registry.js");

// ---- On/off ----
const isEnabled = async () => (await chrome.storage.local.get("enabled")).enabled !== false;

// FLEX's page scripts and styles are registered only while FixForFlex is on.
async function syncContentScripts() {
  try { await chrome.scripting.unregisterContentScripts(); } catch (_) {}
  if (await isEnabled()) await chrome.scripting.registerContentScripts(FFX_CONTENT_SCRIPTS);
}

async function reloadFlexTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: "https://flexstudent.nu.edu.pk/*" });
    for (const t of tabs) chrome.tabs.reload(t.id);
  } catch (_) {}
}
const STANDARD_EVERY = 30;
// The developer's own roll number, hashed, so only that copy can change the interval.
const OWNER_HASH = "c2f8eeb78c0a0b1a25d9640795f5782d2986cc132eef84574d90688173739706";
async function isOwner(roll) {
  const norm = String(roll || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!norm) return false;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(norm));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("") === OWNER_HASH;
}
async function settings() {
  const st = await chrome.storage.local.get(["flexRoll", "flexPass", "watchEnabled", "watchEvery"]);
  return { ...DEFAULTS, ...Object.fromEntries(Object.entries(st).filter(([, v]) => v !== undefined)) };
}

// FLEX marks page. The semester (?semid=…) is worked out automatically, see currentSemId().
const MARKS_PAGE = "https://flexstudent.nu.edu.pk/Student/StudentMarks";
const SEM_RECHECK_HOURS = 6; // how often to look again for a new semester
const LOGIN_URL = "https://flexstudent.nu.edu.pk/Login";

const ICON = "icons/icon128.png";

let busy = false;

function notify(title, message) {
  chrome.notifications.create(String(Date.now()), {
    type: "basic",
    iconUrl: ICON,
    title,
    message: message.slice(0, 400),
    priority: 2,
    requireInteraction: true,
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Splits the page into one block per course tab, using the tab-pane id (e.g. "CL2001").
function splitByCourse(html) {
  const re = /<div class="tab-pane[^"]*"\s+id="([^"]+)"/g;
  const starts = [];
  let m;
  while ((m = re.exec(html))) starts.push({ id: m[1], contentStart: re.lastIndex });

  const courses = [];
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].contentStart : html.length;
    const block = html.slice(starts[i].contentStart, end);
    const h5 = block.match(/<h5[^>]*>([\s\S]*?)<\/h5>/);
    const title = h5 ? h5[1].replace(/<[^>]*>/g, "").trim() : starts[i].id;
    courses.push({ code: starts[i].id, title, block });
  }
  return courses;
}

// For each course, finds every marks table and labels its rows with the course code
// and the nearest heading/link above the table (e.g. "Lab Work", "Quiz").
function extractRows(html) {
  const courses = splitByCourse(html);
  const rows = [];

  for (const course of courses) {
    const tables = [...course.block.matchAll(/<table[^>]*sum_table[^>]*>[\s\S]*?<\/table>/g)];
    tables.forEach((tm, idx) => {
      const tableHtml = tm[0];
      const before = course.block.slice(Math.max(0, tm.index - 1200), tm.index);
      const targets = [...before.matchAll(/data-target="#([^"]+)"/g)];

      let category;
      if (targets.length) {
        const raw = targets[targets.length - 1][1]; // e.g. "CL2001-Lab_Work"
        category = raw
          .replace(new RegExp("^" + course.code + "-"), "")
          .replace(/_/g, " ")
          .trim();
      } else {
        category = `Section ${idx + 1}`;
      }

      const bodyRows = tableHtml.match(/<tr class="calculationrow"[\s\S]*?<\/tr>/g) || [];
      bodyRows.forEach((row) => {
        const cells = (row.match(/<t[dh][\s\S]*?<\/t[dh]>/g) || []).map((c) =>
          c.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
        );
        if (!cells.length) return;
        const itemNo = cells[0];
        rows.push({
          key: `${course.code}|${category}|${itemNo}`,
          course: course.code,
          category,
          itemNo,
          text: cells.join(" | "),
        });
      });
    });
  }
  return rows;
}

// ---- Current semester ----
// FLEX semester ids look like 20263: the year, then 1 = Spring, 2 = Summer, 3 = Fall.
function semName(id) {
  const m = /^(\d{4})(\d)$/.exec(String(id || ""));
  if (!m) return `semester ${id}`;
  return `${{ 1: "Spring", 2: "Summer", 3: "Fall" }[m[2]] || "Semester"} ${m[1]}`;
}

// Finds the current semester id in a FLEX page. FLEX's own sidebar links carry it
// (".../StudentMarks?semid=20263"), and the marks page's SemId dropdown has it selected.
function findSemId(html) {
  const link = html.match(/StudentMarks\?semid=(\d{5})/i);
  if (link) return link[1];
  const sel = html.match(/<select[^>]*id="SemId"[^>]*>([\s\S]*?)<\/select>/i);
  if (sel) {
    const opts = [...sel[1].matchAll(/<option([^>]*)>/gi)].map((o) => o[1]);
    const picked = opts.find((a) => /\bselected\b/i.test(a)) || opts.find((a) => /value="\d{5}"/.test(a));
    const v = picked && picked.match(/value="(\d{5})"/);
    if (v) return v[1];
  }
  const any = html.match(/[?&]semid=(\d{5})/i);
  return any ? any[1] : null;
}

// Returns the semester to watch. Looks it up on FLEX at most every SEM_RECHECK_HOURS
// (or when forced), and otherwise reuses the last one found. Returns null if it has never
// been found, in which case the marks page is fetched without ?semid and FLEX shows its default.
async function currentSemId(force = false) {
  const { semId, semCheckedAt } = await chrome.storage.local.get(["semId", "semCheckedAt"]);
  const fresh = semId && semCheckedAt && Date.now() - semCheckedAt < SEM_RECHECK_HOURS * 3600e3;
  if (fresh && !force) return semId;
  try {
    const res = await fetch(MARKS_PAGE, { credentials: "include", cache: "no-store" });
    if (!res.ok || /login/i.test(res.url)) return semId || null; // signed out: keep the last one
    const found = findSemId(await res.text());
    if (found) {
      await chrome.storage.local.set({ semId: found, semCheckedAt: Date.now() });
      return found;
    }
  } catch (_) {}
  return semId || null;
}

async function fetchRows(forceSem = false) {
  const semId = await currentSemId(forceSem);
  const url = semId ? `${MARKS_PAGE}?semid=${semId}` : MARKS_PAGE;
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  const html = await res.text();
  const rows = extractRows(html);
  // A brand-new semester can have no marks yet, so the SemId dropdown also counts as "page read fine".
  const ok = res.ok && !/login/i.test(res.url) && (rows.length > 0 || /id="SemId"/i.test(html));
  return { ok, rows, semId: semId || findSemId(html) };
}

function diffRows(oldRows, newRows) {
  const oldMap = new Map(oldRows.map((r) => [r.key, r]));
  const newMap = new Map(newRows.map((r) => [r.key, r]));
  const changedCourses = new Set();
  const details = [];

  for (const [key, row] of newMap) {
    const prev = oldMap.get(key);
    if (!prev) {
      changedCourses.add(row.course);
      details.push(`${row.course} — ${row.category} ${row.itemNo}: new entry`);
    } else if (prev.text !== row.text) {
      changedCourses.add(row.course);
      details.push(`${row.course} — ${row.category} ${row.itemNo}: updated`);
    }
  }
  for (const [key, row] of oldMap) {
    if (!newMap.has(key)) {
      changedCourses.add(row.course);
      details.push(`${row.course} — ${row.category} ${row.itemNo}: removed`);
    }
  }
  return { changedCourses: [...changedCourses], details };
}

// ---- Signing in again ----
// FLEX's sign-in page has a Cloudflare check, so the form has to be filled in a real page.
// That page is opened out of sight: first as a frame inside an offscreen document (never shown),
// then, if that doesn't work, in a minimized window. content/autologin.js fills the form; it only
// gets the roll number and password from here while a sign-in is in progress, for the page we opened.
// Only when the user pressed "Check now" and both hidden tries failed is a small window shown,
// so they can click Sign In themselves.
const OFFSCREEN_PAGE = "offscreen/signin.html";
const FRAME_RULE_ID = 4101;
let pending = null; // { kind: "offscreen" | "tab", tabId, ready, roll, pass, resolve }

// Starts listening for the sign-in page before it is opened, so its first message isn't missed.
// For a window, the tab id is filled in once the window exists (see setTab).
function expectSignIn(kind, roll, pass) {
  let setTab;
  const ready = kind === "tab" ? new Promise((r) => { setTab = r; }) : Promise.resolve();
  let resolve;
  const reported = new Promise((r) => { resolve = r; });
  pending = { kind, tabId: null, ready, roll, pass, resolve };
  const p = pending;
  return { reported, setTab: (id) => { p.tabId = id; setTab(id); } };
}

async function signedIn() {
  try {
    const res = await fetch(MARKS_PAGE, { credentials: "include", cache: "no-store" });
    return res.ok && !/login/i.test(res.url);
  } catch (_) { return false; }
}

// Waits for autologin.js to report back, then for FLEX to accept the sign-in.
// Returns "ok", "check-not-passed", "form-not-found" or "timeout".
// With waitForUser (the visible window), it keeps waiting for the user to click Sign In themselves.
async function runSignIn(reported, seconds, waitForUser = false) {
  const deadline = Date.now() + seconds * 1000;
  let result = null;
  reported.then((r) => { result = r; });
  while (Date.now() < deadline) {
    await sleep(waitForUser ? 4000 : 2000);
    if (result && result !== "submitted" && !waitForUser) return result;
    if ((result === "submitted" || waitForUser) && (await signedIn())) return "ok";
    await chrome.storage.local.get("lastCheck"); // keeps the service worker awake meanwhile
  }
  return (await signedIn()) ? "ok" : "timeout";
}

// Lets the FLEX sign-in page load inside the offscreen document: FLEX forbids being framed,
// so for frames that don't belong to any tab (only the offscreen one) those headers are dropped.
async function allowFraming(on) {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [FRAME_RULE_ID],
    addRules: on ? [{
      id: FRAME_RULE_ID,
      priority: 1,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          { header: "x-frame-options", operation: "remove" },
          { header: "content-security-policy", operation: "remove" },
        ],
      },
      condition: {
        requestDomains: ["flexstudent.nu.edu.pk"],
        resourceTypes: ["sub_frame"],
        tabIds: [chrome.tabs.TAB_ID_NONE],
      },
    }] : [],
  });
}

async function closeOffscreen() {
  try { await chrome.offscreen.closeDocument(); } catch (_) {}
}

async function signInOffscreen(roll, pass) {
  if (!chrome.offscreen) return "unsupported";
  try {
    await closeOffscreen(); // only one offscreen document at a time; start from a fresh page
    await allowFraming(true);
    const { reported } = expectSignIn("offscreen", roll, pass);
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_PAGE,
      reasons: ["IFRAME_SCRIPTING"],
      justification: "Signs in to FLEX again in the background when the session has expired.",
    });
    return await runSignIn(reported, 50);
  } catch (_) {
    return "error";
  } finally {
    pending = null;
    await closeOffscreen();
    try { await allowFraming(false); } catch (_) {}
  }
}

async function signInWindow(roll, pass, minimized) {
  let win;
  const { reported, setTab } = expectSignIn("tab", roll, pass);
  try {
    win = await chrome.windows.create(minimized
      ? { url: LOGIN_URL, type: "popup", state: "minimized" }
      : { url: LOGIN_URL, type: "popup", focused: true, width: 420, height: 560, left: 20, top: 20 });
  } catch (_) { pending = null; return "error"; }
  try {
    setTab(win.tabs[0].id);
    if (minimized) return await runSignIn(reported, 50);
    notify("FixForFlex", "Flex sign-in needs a manual click. Click Sign In in the Flex window.");
    return await runSignIn(reported, 180, true);
  } finally {
    pending = null;
    try { await chrome.windows.remove(win.id); } catch (_) {}
  }
}

// Returns "ok", or why it failed ("check-not-passed" means the Cloudflare check, not the password).
async function autoLogin(roll, pass, manual) {
  let r = await signInOffscreen(roll, pass);
  if (r === "ok") return r;
  const r2 = await signInWindow(roll, pass, true);
  if (r2 === "ok") return r2;
  if (r2 !== "error") r = r2;
  if (manual) return signInWindow(roll, pass, false);
  return r;
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!msg || !pending || (msg.type !== "autologin-ready" && msg.type !== "autologin-result")) return;
  const p = pending;
  if (sender.origin !== "https://flexstudent.nu.edu.pk") return;
  p.ready.then(() => {
    const ours = p === pending && (p.kind === "offscreen"
      ? !sender.tab // only the offscreen frame has no tab
      : sender.tab && sender.tab.id === p.tabId && sender.frameId === 0);
    if (!ours) return reply(null);
    if (msg.type === "autologin-ready") reply({ roll: p.roll, pass: p.pass });
    else { p.resolve(msg.result); reply(null); }
  });
  return true; // replies after the window's tab id is known
});

// Remembers how the last check went, for the popup.
const setStatus = (status) => chrome.storage.local.set({ lastCheck: { at: Date.now(), status } });

async function check(manual = false) {
  if (busy) return;
  busy = true;
  try {
    if (!(await isEnabled())) return;
    const cfg = await settings();
    if (!manual && !cfg.watchEnabled) return;
    let { ok, rows, semId } = await fetchRows();

    if (!ok) {
      // No sign-in saved in the popup: use the one kept by Remember me on FLEX's sign-in page.
      if (!cfg.flexRoll || !cfg.flexPass) {
        const kept = await rememberedSignIn();
        if (kept) { cfg.flexRoll = kept.roll; cfg.flexPass = kept.pass; }
      }
      if (!cfg.flexRoll || !cfg.flexPass) {
        await setStatus("signed-out");
        if (manual) notify("FixForFlex", "Sign in to FLEX, or save your sign-in in the FixForFlex popup, then try again.");
        return;
      }
      const { loginBlocked } = await chrome.storage.local.get("loginBlocked");
      if (loginBlocked && !manual) { await setStatus("login-failed"); return; }
      if (!manual && (await userOnFlex())) { await setStatus("signed-out"); return; } // try again next time

      const login = await autoLogin(cfg.flexRoll, cfg.flexPass, manual);
      if (login !== "ok") {
        await chrome.storage.local.set({ loginBlocked: true });
        await setStatus("login-failed");
        if (login === "check-not-passed") notify("FixForFlex: sign-in failed", "FLEX's Cloudflare check didn't pass in the background. Press Check now in the FixForFlex popup to sign in.");
        else notify("FixForFlex: sign-in failed", "Check your roll number and password in the FixForFlex popup, then press Check now.");
        return;
      }
      await chrome.storage.local.set({ loginBlocked: false });
      ({ ok, rows, semId } = await fetchRows(true)); // just signed in: look the semester up again
      if (!ok) {
        await setStatus("error");
        notify("FixForFlex", "Signed in, but could not read the marks page.");
        return;
      }
    } else {
      await chrome.storage.local.set({ loginBlocked: false });
    }

    await setStatus("ok");
    const { rows: old, rowsSemId } = await chrome.storage.local.get(["rows", "rowsSemId"]);
    await chrome.storage.local.set({ rows, rowsSemId: semId || rowsSemId || null });

    const courseCount = new Set(rows.map((r) => r.course)).size;
    if (!old) {
      notify("FixForFlex", `Started watching ${semId ? semName(semId) : "this semester"}. Tracking ${rows.length} items across ${courseCount} courses.`);
      return;
    }
    // New semester: start fresh instead of reporting every old course as "removed".
    if (semId && rowsSemId && semId !== rowsSemId) {
      notify("FixForFlex", `Now watching ${semName(semId)}. Tracking ${rows.length} items across ${courseCount} courses.`);
      return;
    }

    const { changedCourses, details } = diffRows(old, rows);
    if (details.length) {
      notify(`Marks updated: ${changedCourses.join(", ")}`, details.slice(0, 5).join("\n"));
    } else if (manual) {
      notify("FixForFlex", "Checked just now. No changes.");
    }
  } catch (e) {
    await setStatus("error");
    if (manual) notify("FixForFlex", "Check failed: " + e.message);
  } finally {
    busy = false;
  }
}

// ---- Remember me: staying signed in ----
// FLEX's own "Remember me" only pre-fills the roll number; the sign-in itself is a server session
// that FLEX ends after a stretch with no page loads (it was gone ~30 minutes after signing in).
// When you sign in on FLEX with Remember me ticked, content/login.js keeps that roll number and
// password (mwRememberRoll, mwRememberPass), separate from the popup's notification sign-in.
// While they are kept, FixForFlex:
//  - loads a FLEX page every KEEPALIVE_MINUTES, which counts as activity and keeps the session going;
//  - signs in again out of sight if the session has ended anyway (Chrome closed, PC asleep);
//  - signs you in on FLEX's sign-in page itself if you land there (content/autologin.js).
// Unticking Remember me or pressing Logout on FLEX forgets the password and stops all of this.
const KEEPALIVE_MINUTES = 5;

async function rememberState() {
  const st = await chrome.storage.local.get(["mwKeepSignedIn", "mwRememberRoll", "mwRememberPass"]);
  // Only an explicit tick at the last sign-in counts (set by content/login.js), never an old
  // remembered roll number on its own, so Remember me off really means off.
  const on = st.mwKeepSignedIn === true;
  const creds = on && st.mwRememberRoll && st.mwRememberPass ? { roll: st.mwRememberRoll, pass: st.mwRememberPass } : null;
  return { on, creds };
}
const rememberedSignIn = async () => (await rememberState()).creds;

// Never sign in out of sight while you are using FLEX yourself: if FLEX allows one session per
// account, a second sign-in would end the one in your tab. So no background sign-in while a FLEX
// tab is open, or within SIGNIN_QUIET_MINUTES of you signing in on FLEX's page (content/login.js).
const SIGNIN_QUIET_MINUTES = 15;
async function userOnFlex() {
  try {
    const tabs = await chrome.tabs.query({ url: "https://flexstudent.nu.edu.pk/*" });
    if (tabs.length) return true;
  } catch (_) {}
  const { mwSignedInAt } = await chrome.storage.local.get("mwSignedInAt");
  return !!mwSignedInAt && Date.now() - mwSignedInAt < SIGNIN_QUIET_MINUTES * 60e3;
}

async function keepAlive() {
  const { on, creds } = await rememberState();
  if (busy || !on || !(await isEnabled())) return;
  busy = true;
  try {
    if (await signedIn()) return; // that page load was the keep-alive
    if (!creds) return; // signed in before the password was kept: nothing to sign in again with
    if (await userOnFlex()) return; // FLEX's own page will sign you in (content/autologin.js)
    const { rememberBlocked } = await chrome.storage.local.get("rememberBlocked");
    if (rememberBlocked) return; // that password failed before: wait for the next sign-in on FLEX
    const login = await autoLogin(creds.roll, creds.pass, false);
    if (login === "ok") await chrome.storage.local.set({ rememberBlocked: false });
    else if (login !== "check-not-passed") await chrome.storage.local.set({ rememberBlocked: true });
  } catch (_) {
  } finally {
    busy = false;
  }
}

// FLEX's sign-in page opened in a tab (not by us): content/autologin.js asks for the remembered
// sign-in. One try per tab every 2 minutes, so a changed password can't cause a sign-in loop;
// once that tab reaches a signed-in FLEX page (content/login.js says so), it may try again.
const pageTries = new Map(); // tabId -> time of last try
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg && msg.type === "flex-signed-in") {
    if (sender.tab) pageTries.delete(sender.tab.id);
    if (typeof msg.home === "string" && msg.home.startsWith("https://flexstudent.nu.edu.pk/")) {
      chrome.storage.local.set({ mwHomeUrl: msg.home });
    }
    return;
  }
  const ours = sender.origin === "https://flexstudent.nu.edu.pk" && sender.tab && sender.frameId === 0;
  // content/signin-fast.js: FLEX's sign-in address was opened. Still signed in? Then go home.
  if (msg && msg.type === "remember-check") {
    if (pending || !ours) return reply(null);
    (async () => {
      const { on, creds } = await rememberState();
      if (!on) return reply({ on: false });
      const url = await homeUrl();
      if (await signedIn()) return reply({ on: true, signedIn: true, url });
      // Will content/autologin.js sign in on this page? Same rules as "remember-signin" below.
      const { rememberBlocked } = await chrome.storage.local.get("rememberBlocked");
      const tried = Date.now() - (pageTries.get(sender.tab.id) || 0) < 120e3;
      reply({ on: true, signedIn: false, willSignIn: !!creds && !rememberBlocked && !tried, url });
    })().catch(() => reply(null));
    return true;
  }
  if (!msg || msg.type !== "remember-signin") return;
  if (pending || !ours) return reply(null);
  const last = pageTries.get(sender.tab.id) || 0;
  if (Date.now() - last < 120e3) return reply(null);
  rememberedSignIn().then(async (creds) => {
    const { rememberBlocked } = await chrome.storage.local.get("rememberBlocked");
    if (!creds || rememberBlocked) return reply(null);
    // Still signed in after all (signin-fast.js is taking you home): don't sign in a second time.
    if (await signedIn()) return reply(null);
    pageTries.set(sender.tab.id, Date.now());
    reply(creds);
  });
  return true;
});

// FLEX's home page: the sidebar's Home link as last seen (it carries a ?dump= token), else /Home.
async function homeUrl() {
  const { mwHomeUrl } = await chrome.storage.local.get("mwHomeUrl");
  return mwHomeUrl || "https://flexstudent.nu.edu.pk/Home";
}

chrome.tabs.onRemoved.addListener((id) => pageTries.delete(id));

// ---- Update notice ----
// Unpacked installs never update themselves, so once a week look at the latest GitHub release
// and remember it. When it is newer than this copy, the toolbar icon gets a "NEW" badge and the
// popup shows a download link. The request is a plain anonymous GET to GitHub's public API:
// nothing about the user or this copy is sent.
const RELEASES_API = "https://api.github.com/repos/Hassaan459/FixForFlex/releases/latest";
const UPDATE_EVERY_DAYS = 7;

function newer(a, b) { // true if version a > version b ("1.10" > "1.9", "1.1" > "1.0")
  const pa = String(a).replace(/^v/i, "").split(".").map(Number);
  const pb = String(b).replace(/^v/i, "").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

// The badge on the toolbar icon. Chrome forgets it on restart, so it is set again from storage.
async function syncBadge() {
  try {
    const { update } = await chrome.storage.local.get("update");
    const show = !!update && newer(update.version, chrome.runtime.getManifest().version) && (await isEnabled());
    await chrome.action.setBadgeText({ text: show ? "NEW" : "" });
    if (show) await chrome.action.setBadgeBackgroundColor({ color: "#00ADEF" });
    await chrome.action.setTitle({ title: show ? `FixForFlex: version ${update.version} is out` : "FixForFlex" });
  } catch (_) {}
}

// Looks at GitHub at most once every UPDATE_EVERY_DAYS (force: right after install or update).
async function checkForUpdate(force = false) {
  try {
    if (!(await isEnabled())) return;
    const { updateCheckedAt } = await chrome.storage.local.get("updateCheckedAt");
    if (!force && updateCheckedAt && Date.now() - updateCheckedAt < UPDATE_EVERY_DAYS * 864e5) return;
    const res = await fetch(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store",
      credentials: "omit",
    });
    if (!res.ok) return; // offline, rate-limited, or the repo is private: say nothing, try again tomorrow
    const rel = await res.json();
    const version = String(rel.tag_name || "").replace(/^v/i, "");
    const current = chrome.runtime.getManifest().version;
    const zip = (rel.assets || []).find((a) => /\.zip$/i.test(a.name));
    await chrome.storage.local.set({
      updateCheckedAt: Date.now(),
      update: newer(version, current) ? { version, url: zip ? zip.browser_download_url : rel.html_url, page: rel.html_url } : null,
    });
  } catch (_) {}
}

// ---- Alarms ----
const UPDATE_ALARM_MINUTES = 24 * 60;
async function setupAlarms() {
  const cfg = await settings();
  await chrome.alarms.clear("check-marks");
  if (!(await isEnabled())) {
    await chrome.alarms.clear("keep-alive");
    await chrome.alarms.clear("check-update");
    return;
  }
  const every = (await isOwner(cfg.flexRoll)) ? Math.max(1, Number(cfg.watchEvery) || STANDARD_EVERY) : STANDARD_EVERY;
  if (cfg.watchEnabled) chrome.alarms.create("check-marks", { periodInMinutes: every });
  if (!(await chrome.alarms.get("keep-alive"))) chrome.alarms.create("keep-alive", { delayInMinutes: 1, periodInMinutes: KEEPALIVE_MINUTES });
  // Wakes once a day; checkForUpdate itself only goes to GitHub once a week. Older copies
  // made this alarm with a different period, so it is made again if it doesn't match.
  const up = await chrome.alarms.get("check-update");
  if (!up || up.periodInMinutes !== UPDATE_ALARM_MINUTES) {
    chrome.alarms.create("check-update", { delayInMinutes: 1, periodInMinutes: UPDATE_ALARM_MINUTES });
  }
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === "update") {
    // Copies from before the Settings page kept the sign-in in config.js and always watched.
    // Keep watching (every minute, as before).
    const st = await chrome.storage.local.get(["rows", "watchEnabled", "flexRoll"]);
    if (st.rows && st.watchEnabled === undefined) {
      await chrome.storage.local.set({ watchEnabled: true, watchEvery: 1 });
    }
  }
  await syncContentScripts();
  await setupAlarms();
  await checkForUpdate(true); // also clears the notice once this copy is the newest
  syncBadge();
});
chrome.runtime.onStartup.addListener(() => { setupAlarms(); syncBadge(); setTimeout(keepAlive, 15e3); });
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "check-marks") check();
  if (a.name === "check-update") checkForUpdate();
  if (a.name === "keep-alive") keepAlive();
});
// Popup changed the schedule: start over with the new one.
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== "local") return;
  if (ch.enabled) {
    (async () => {
      await syncContentScripts();
      await setupAlarms();
      if (!(await isEnabled())) { pending = null; await closeOffscreen(); }
      else checkForUpdate();
      syncBadge();
      await reloadFlexTabs();
    })();
    return;
  }
  if (ch.update) syncBadge();
  if (ch.watchEnabled || ch.watchEvery || ch.flexRoll) {
    setupAlarms();
    if (ch.watchEnabled && ch.watchEnabled.newValue === true && !ch.watchEnabled.oldValue) check(true);
  }
  if (ch.flexRoll || ch.flexPass) chrome.storage.local.set({ loginBlocked: false });
  // A new password from the FLEX sign-in page: try it again even if the old one failed.
  if (ch.mwRememberPass && ch.mwRememberPass.newValue) chrome.storage.local.set({ rememberBlocked: false });
});
// From the popup.
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg && msg.type === "check-now") { check(true).then(() => reply({ done: true })); return true; }
});