// FixForFlex: All semesters page. Reads every semester's FLEX marks page with the user's own FLEX
// sign-in (FLEX serves any term at /Student/StudentMarks?semid=YYYYT, T: 1 Spring, 2 Summer, 3 Fall)
// and shows marks obtained out of the weightage published so far, per course.
const BASE = "https://flexstudent.nu.edu.pk";
const RECENT_MS = 6 * 3600 * 1000;      // terms FLEX still lists: marks can still change
const OLD_MS = 30 * 24 * 3600 * 1000;   // older terms: final
const WEEK = 7 * 24 * 3600 * 1000;
const TERMS = { 1: "Spring", 2: "Summer", 3: "Fall" };

const $ = (id) => document.getElementById(id);
const label = (id) => `${TERMS[String(id).slice(4)] || "Term"} ${String(id).slice(0, 4)}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => String(Math.round(n * 100) / 100);
const num = (t) => { const v = parseFloat(String(t || "").replace(/,/g, "")); return Number.isFinite(v) ? v : 0; };
const low = (p) => (p < 50 ? " low" : "");
const store = {
  get: (k) => new Promise((r) => chrome.storage.local.get(k, r)),
  set: (o) => new Promise((r) => chrome.storage.local.set(o, r)),
};

async function page(id) {
  const res = await fetch(`${BASE}/Student/StudentMarks${id ? `?semid=${id}` : ""}`, { credentials: "include" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return new DOMParser().parseFromString(await res.text(), "text/html");
}

// Same walk as content/semesters.js, sharing its saved list: back from the oldest listed term,
// stopping after 6 empty terms in a row.
async function olderSemesters(oldest) {
  const { olderSemesters: c } = await store.get("olderSemesters");
  if (c && c.oldest === oldest && Date.now() - c.at < WEEK) return c.list;
  let year = +oldest.slice(0, 4), term = +oldest.slice(4), empty = 0;
  const back = () => { if (--term < 1) { term = 3; year--; } };
  const list = [];
  back();
  while (empty < 6 && year >= 2015) {
    const id = `${year}${term}`;
    const courses = [...(await page(id)).querySelectorAll(".nav-tabs a")].map((a) => a.textContent.trim()).filter(Boolean);
    if (courses.length) { list.push({ id, courses }); empty = 0; } else empty++;
    back();
  }
  await store.set({ olderSemesters: { oldest, at: Date.now(), list } });
  return list;
}

// Per course: FLEX's own Total row of every section (so "best of N" matches FLEX), Grand Total skipped.
function courseTotals(doc) {
  return [...doc.querySelectorAll("div.tab-pane[id]")].map((pane) => {
    let weight = 0, obtained = 0;
    pane.querySelectorAll(".card").forEach((card) => {
      if (/grand total/i.test(card.querySelector(".card-header")?.textContent || "")) return;
      card.querySelectorAll('tr[class^="totalColumn_"]').forEach((row) => {
        weight += num(row.querySelector(".totalColweightage")?.textContent);
        obtained += num(row.querySelector(".totalColObtMarks")?.textContent);
      });
    });
    const title = doc.querySelector(`a[href="#${CSS.escape(pane.id)}"]`)?.textContent.trim() || pane.id;
    return { title, weight, obtained };
  });
}

function semesterHTML(id, courses) {
  const rows = courses.filter((c) => c.weight > 0);
  if (!rows.length) return { html: "", pcts: [] };
  const pcts = rows.map((c) => (c.obtained / c.weight) * 100);
  const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
  const going = rows.some((c) => c.weight < 90);
  const html = `
    <section class="sheet sem">
      <div class="sem-head">
        <div><a href="${BASE}/Student/StudentMarks?semid=${id}" target="_blank" rel="noopener">${label(id)}</a>${going ? "<small>in progress</small>" : ""}</div>
        <span class="avg${low(avg)}">avg ${fmt(avg)}%</span>
      </div>
      <table>${rows.map((c, i) => `
        <tr><td class="course">${esc(c.title)}</td>
          <td class="marks">${fmt(c.obtained)} / ${fmt(c.weight)}</td>
          <td><div class="bar"><i class="${low(pcts[i])}" style="width:${Math.min(100, pcts[i])}%"></i></div></td>
          <td class="pct${low(pcts[i])}">${fmt(pcts[i])}%</td></tr>`).join("")}
      </table>
    </section>`;
  return { html, pcts };
}

function message(html) {
  $("stats").innerHTML = "";
  $("note").textContent = "";
  $("content").innerHTML = `<div class="sheet msg">${html}</div>`;
}

let busy = false;
async function load(force) {
  if (busy) return;
  busy = true;
  $("refresh").disabled = true;
  try {
    message("Loading your semesters…");
    const first = await page("");
    const listed = [...first.querySelectorAll("#SemId option")].map((o) => o.value).filter((v) => /^\d{5}$/.test(v));
    if (!listed.length) {
      message(`<b>Sign in to FLEX first.</b><br>Open <a href="${BASE}" target="_blank" rel="noopener">flexstudent.nu.edu.pk</a>, sign in, then press Refresh.`);
      return;
    }
    message("Looking for older semesters…");
    const older = (await olderSemesters(String(Math.min(...listed.map(Number))))).map((s) => s.id);
    const ids = [...new Set([...listed, ...older])].sort((a, b) => b - a);
    const recent = new Set(listed);

    const { semesterTotals: saved } = await store.get("semesterTotals");
    const cache = saved || {};
    const results = {};
    let done = 0, next = 0;
    // Three at a time: quick, without hammering FLEX.
    const worker = async () => {
      while (next < ids.length) {
        const id = ids[next++];
        const hit = cache[id];
        const fresh = hit && Date.now() - hit.at < (recent.has(id) ? RECENT_MS : OLD_MS) && !(force && recent.has(id));
        try {
          if (!fresh) cache[id] = { at: Date.now(), courses: courseTotals(await page(id)) };
          results[id] = cache[id].courses;
        } catch (_) { results[id] = []; }
        message(`Loading semesters… ${++done} of ${ids.length}`);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    await store.set({ semesterTotals: cache });

    const all = [];
    let sems = 0;
    const blocks = ids.map((id) => {
      const { html, pcts } = semesterHTML(id, results[id] || []);
      if (html) { sems++; all.push(...pcts); }
      return html;
    }).join("");
    if (!blocks) { message("No marks found yet."); return; }

    const overall = all.reduce((a, b) => a + b, 0) / all.length;
    const best = Math.max(...all), worst = Math.min(...all);
    $("stats").innerHTML = [
      [sems, "semesters"], [all.length, "courses"],
      [`<span class="${low(overall)}">${fmt(overall)}%</span>`, "average across courses"],
      [`${fmt(best)}%`, "best course"],
      [`<span class="${low(worst)}">${fmt(worst)}%</span>`, "lowest course"],
    ].map(([v, t]) => `<div class="sheet stat"><b>${v}</b><span>${t}</span></div>`).join("");
    $("content").innerHTML = blocks;
    $("note").textContent = "Percentages are marks obtained out of the weightage published so far, so a course still in progress can move.";
  } catch (_) {
    message("Couldn't load your marks. Check your connection and that you are signed in to FLEX, then press Refresh.");
  } finally {
    busy = false;
    $("refresh").disabled = false;
  }
}

$("refresh").addEventListener("click", () => load(true));
load(false);
