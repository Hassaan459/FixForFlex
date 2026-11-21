importScripts("config.js"); // gives FLEX_ROLL_NO and FLEX_PASSWORD

// FLEX marks page. The semester (?semid=…) is worked out automatically, see currentSemId().
const MARKS_PAGE = "https://flexstudent.nu.edu.pk/Student/StudentMarks";
const SEM_RECHECK_HOURS = 6; // how often to look again for a new semester
const LOGIN_URL = "https://flexstudent.nu.edu.pk/Login";
const CHECK_EVERY_MINUTES = 1;

const ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

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

// Runs inside the login page: fills the form, waits for the Cloudflare check, clicks Sign In.
async function fillAndSubmit(roll, pass) {
  const set = (el, value) => {
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const user = document.querySelector('input[name="username"]');
  const pw = document.querySelector('input[name="password"]');
  const btn = document.getElementById("m_login_signin_submit");
  if (!user || !pw || !btn) return "form-not-found";
  set(user, roll);
  set(pw, pass);

  const token = () => document.querySelector('[name="cf-turnstile-response"]');
  for (let i = 0; i < 30; i++) {
    const t = token();
    if (!t || t.value) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  const t = token();
  if (t && !t.value) return "check-not-passed";
  btn.click();
  return "submitted";
}

async function waitForLogin(tabId, seconds) {
  for (let i = 0; i < seconds; i++) {
    await sleep(1000);
    let t;
    try { t = await chrome.tabs.get(tabId); } catch { return false; }
    if (!/login/i.test(t.url || "")) return true;
  }
  return false;
}

async function autoLogin() {
  const win = await chrome.windows.create({
    url: LOGIN_URL,
    type: "popup",
    focused: false,
    width: 420,
    height: 520,
    left: 20,
    top: 20,
  });
  const tabId = win.tabs[0].id;
  const close = async () => { try { await chrome.windows.remove(win.id); } catch {} };

  try {
    await sleep(4000);
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: fillAndSubmit,
      args: [FLEX_ROLL_NO, FLEX_PASSWORD],
    });

    let loggedIn = false;
    if (result === "submitted") loggedIn = await waitForLogin(tabId, 20);
    if (!loggedIn) {
      try { await chrome.windows.update(win.id, { focused: true }); } catch {}
      notify("FixForFlex", "Flex sign-in needs a manual click. Click Sign In in the Flex window.");
      loggedIn = await waitForLogin(tabId, 180);
    }
    await close();
    return loggedIn;
  } catch (e) {
    await close();
    return false;
  }
}

async function check(manual = false) {
  if (busy) return;
  busy = true;
  try {
    let { ok, rows, semId } = await fetchRows();

    if (!ok) {
      const { loginBlocked } = await chrome.storage.local.get("loginBlocked");
      if (loginBlocked && !manual) return;

      const loggedIn = await autoLogin();
      if (!loggedIn) {
        await chrome.storage.local.set({ loginBlocked: true });
        notify("FixForFlex: login failed", "Auto-login did not work. Check config.js, then click the extension icon to retry.");
        return;
      }
      await chrome.storage.local.set({ loginBlocked: false });
      ({ ok, rows, semId } = await fetchRows(true)); // just signed in: look the semester up again
      if (!ok) {
        notify("FixForFlex", "Logged in, but could not read the marks page.");
        return;
      }
    } else {
      await chrome.storage.local.set({ loginBlocked: false });
    }

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
    if (manual) notify("FixForFlex", "Check failed: " + e.message);
  } finally {
    busy = false;
  }
}

function setupAlarm() {
  chrome.alarms.create("check-marks", { periodInMinutes: CHECK_EVERY_MINUTES });
}

chrome.runtime.onInstalled.addListener(() => {
  setupAlarm();
  check(true);
});
chrome.runtime.onStartup.addListener(setupAlarm);
chrome.alarms.onAlarm.addListener((a) => a.name === "check-marks" && check());
chrome.action.onClicked.addListener(() => check(true));