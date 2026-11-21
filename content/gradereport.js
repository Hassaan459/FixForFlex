// FixForFlex: Grade Report page (/Student/GradeReport).
// FLEX builds this page after load from an AJAX call and marks each grade's status only with a
// background colour (blue = in progress, pink = not taken, orange = prerequisite missing, ...).
// The shared theme clears table backgrounds, so those meanings were lost. This script reads the
// colours FLEX set, gives each grade cell a status class, adds a one-line key, splits course code
// from name, names the semester term, and moves the passed-credit totals to the foot of each column.
(() => {
  "use strict";

  const TERMS = { 1: "Spring", 2: "Summer", 3: "Fall" };
  const FAIL = ["F", "F/R", "FA", "U", "W"];
  const KEY = [
    ["mw-gr-now", "I", "in progress"],
    ["mw-gr-next", "R", "registered for next term"],
    ["mw-gr-fail", "F", "failed"],
    ["mw-gr-blocked", "N", "prerequisite not met"],
    ["mw-gr-open", "–", "not taken yet"],
    ["mw-gr-tr", "Tr", "transferred"],
  ];
  const TITLES = Object.fromEntries(KEY.map(([c, , t]) => [c, t[0].toUpperCase() + t.slice(1)]));

  // FLEX's status colours, as the browser reports them
  const rgb = (s) => (s || "").replace(/\s+/g, "");
  function status(td) {
    const g = td.textContent.trim();
    const bg = rgb(td.style.backgroundColor);
    const fg = rgb(td.style.color);
    if (!g) return "";
    if (bg === "rgb(0,209,178)") return FAIL.includes(g) || fg === "rgb(156,0,6)" ? "mw-gr-fail mw-gr-next" : "mw-gr-next";
    if (FAIL.includes(g) || fg === "rgb(156,0,6)") return "mw-gr-fail";
    if (g === "I" || bg === "rgb(0,191,255)") return "mw-gr-now";
    if (g === "N" || bg === "rgb(231,105,83)") return "mw-gr-blocked";
    if (g === "-" || bg === "rgb(239,178,215)") return "mw-gr-open";
    if (g === "Tr" || bg === "rgb(0,255,255)") return "mw-gr-tr";
    return "mw-gr-pass";
  }

  function semester(col) {
    if (col.querySelector(":scope > .mw-gr-sem")) return;
    const head = col.querySelector(":scope > table.tbl23");
    const body = col.querySelector(":scope > .portlet-body");
    if (!head || !body || !body.querySelector("tbody tr")) return;

    // One box per semester: the heading table and the course table together
    const box = document.createElement("div");
    box.className = "mw-gr-sem";
    col.insertBefore(box, head);
    box.append(head, body);

    // Heading: "Semester 1" with the term under it, attempted credits on the right
    // FLEX pins the course column at 204px with an inline !important, which overflows the box
    col.querySelectorAll("th[style*='204px']").forEach((th) => th.style.removeProperty("width"));
    const ths = head.querySelectorAll("th");
    const cr = ths[1];
    const semId = (cr && cr.id || "").replace("TotAttp_", "");
    if (ths[0] && /^\d{5}$/.test(semId)) {
      const term = TERMS[semId.slice(-1)];
      const sub = document.createElement("small");
      sub.className = "mw-gr-term";
      sub.textContent = term ? `${term} 20${semId.slice(2, 4)}` : "";
      ths[0].appendChild(sub);
    }
    if (cr) { cr.classList.add("mw-gr-cr"); cr.title = "Credit hours attempted"; }
    if (ths[2]) ths[2].classList.add("mw-gr-season");

    const table = body.querySelector("table");
    table.style.height = "";
    const hs = table.querySelectorAll("thead th");
    if (hs[1]) { hs[1].textContent = "Grade"; hs[1].title = "Course grade"; }
    if (hs[2]) { hs[2].textContent = "Lab"; hs[2].title = "Lab grade"; }

    for (const tr of table.querySelectorAll("tbody tr")) {
      const tds = tr.children;
      // FLEX's blank spacer rows
      if (tds.length === 1 && tds[0].colSpan === 3) { tr.remove(); continue; }
      // Passed-credit totals: move to a footer pinned to the bottom of the box
      if (tds.length === 3 && !tds[0].textContent.trim() && /^Pass/.test(tds[1].id)) {
        const foot = document.createElement("div");
        foot.className = "mw-gr-foot";
        foot.innerHTML = `<span>Passed</span><b title="Course credit hours passed"></b><b title="Lab credit hours passed"></b>`;
        foot.children[1].textContent = tds[1].textContent.trim();
        foot.children[2].textContent = tds[2].textContent.trim();
        box.appendChild(foot);
        tr.remove();
        continue;
      }
      const name = tds[0];
      if (name && !name.querySelector(".mw-gr-code")) {
        const m = name.textContent.trim().match(/^([A-Z]{2,4}\d?X?\d{1,4}[A-Z]?)\s*-\s*(.+)$/);
        if (m) {
          name.textContent = "";
          const code = document.createElement("span");
          code.className = "mw-gr-code";
          code.textContent = m[1];
          const title = document.createElement("span");
          title.className = "mw-gr-name";
          title.textContent = m[2];
          name.append(code, title);
        }
        if (/200,230,255/.test(rgb(name.style.background))) name.classList.add("mw-gr-elective");
      }
      for (const td of [tds[1], tds[2]]) {
        if (!td) continue;
        const s = status(td);
        if (!s) continue;
        td.className = td.className.replace(/\bmw-gr-\S+/g, "").trim();
        td.classList.add(...s.split(" "));
        const t = s.split(" ").map((c) => TITLES[c]).filter(Boolean).join(", ");
        if (t) td.title = t;
        if (td.textContent.trim() === "-") td.textContent = "–";
      }
    }
  }

  // A single line under the heading saying what the marks mean (only the ones on this page)
  function legend(root) {
    const used = KEY.filter(([c]) => root.querySelector("td." + c));
    let el = document.querySelector(".mw-gr-key");
    if (!used.length) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement("p");
      el.className = "mw-gr-key";
      root.parentNode.insertBefore(el, root);
    }
    el.innerHTML = "";
    for (const [c, mark, text] of used) {
      const item = document.createElement("span");
      const b = document.createElement("b");
      b.className = c;
      b.textContent = mark;
      item.append(b, " " + text);
      el.appendChild(item);
    }
  }

  function run() {
    const root = document.getElementById("TranscriptDivision");
    if (!root) return;
    root.querySelectorAll(".row > .col-md-3").forEach(semester);
    legend(root);
  }

  const start = () => {
    run();
    const root = document.getElementById("TranscriptDivision");
    if (!root) return;
    let t = 0;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(run, 60); })
      .observe(root, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
