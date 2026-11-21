// Marks Watcher: makes the FLEX StudentAttendance page easier to read, inside FLEX's own sections.
//  - Under each course title: classes attended, absences, and how many more you can miss.
//    FAST allows 6 absences in a 3-credit course and 3 in a 1- or 2-credit course (labs included).
//  - A red dot on a course's tab when it has no absences left.
//  - The weekday in front of each date ("Mon 17-Aug-2026").
//  The restyling itself (bar, label, absent rows, table box) is pure CSS in attendance.css.
(() => {
  "use strict";
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");

  function presenceCol(table) {
    const ths = [...table.querySelectorAll("thead th")];
    const i = ths.findIndex((th) => /presence/i.test(txt(th)));
    return i < 0 ? ths.length - 1 : i;
  }

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function addWeekday(cell) {
    const el = cell && (cell.querySelector("label") || cell);
    if (!el || el.querySelector(".mw-day")) return;
    const m = txt(el).match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (!m || MONTHS[m[2].toLowerCase()] == null) return;
    const d = new Date(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
    const day = document.createElement("span");
    day.className = "mw-day";
    day.textContent = DAYS[d.getDay()];
    el.prepend(day);
  }

  function readPane(pane) {
    const table = pane.querySelector("table");
    if (!table) return null;
    const col = presenceCol(table);
    let present = 0, absent = 0;
    const ths = [...table.querySelectorAll("thead th")];
    const dateCol = ths.findIndex((th) => /date/i.test(txt(th)));
    table.querySelectorAll("tbody tr").forEach((tr) => {
      if (dateCol >= 0) addWeekday(tr.children[dateCol]);
      const v = txt(tr.children[col]).toUpperCase();
      if (v === "A") absent++;
      else if (v) present++;
    });
    return { present, absent, total: present + absent, durations: [...table.querySelectorAll("tbody tr")].map((tr) => parseFloat(txt(tr.children[2]))) };
  }

  // 3-credit theory courses meet 3 hours a week (2 x 1.5 h); labs and 1-2 credit courses don't.
  function allowedAbsences(pane, r) {
    const title = txt(pane.querySelector("h5"));
    if (/\blab\b/i.test(title) || /^(CL|EL)\d/i.test(title)) return 3;
    const d = r.durations.filter(Number.isFinite).sort((a, b) => a - b);
    const median = d.length ? d[Math.floor(d.length / 2)] : 0;
    return median === 1.5 ? 6 : 3;
  }

  function summary(r, allowed) {
    const { present: P, total: T, absent: A } = r;
    if (!T) return { text: "No classes marked yet", tone: "" };
    const left = allowed - A;
    const base = `Attended <b>${P}</b> of ${T} · <b>${A}</b> of ${allowed} absences used`;
    if (left >= 1) return { html: `${base} · <b>${left}</b> left`, tone: left === 1 ? "warn" : "ok" };
    if (left === 0) return { html: `${base} · <b>No absences left</b>`, tone: "bad" };
    return { html: `${base} · <b>Over the limit by ${-left}</b>`, tone: "bad" };
  }

  function run() {
    const panes = document.querySelectorAll(".tab-content > .tab-pane");
    if (!panes.length) return;
    panes.forEach((pane) => {
      if (pane.dataset.mwDone) return;
      pane.dataset.mwDone = "1";
      const r = readPane(pane);
      if (!r) return;
      // One line under the course title.
      const h5 = pane.querySelector(".col-md-6 > h5");
      const s = summary(r, allowedAbsences(pane, r));
      if (h5) {
        const line = document.createElement("div");
        line.className = `mw-att-sum mw-${s.tone}`;
        line.innerHTML = s.html || s.text;
        h5.insertAdjacentElement("afterend", line);
      }

      // Tab: red dot when no absences are left.
      if (s.tone === "bad") {
        const tab = document.querySelector(`.m-tabs__link[href$="#${CSS.escape(pane.id)}"]`);
        if (tab && !tab.querySelector(".mw-tab-dot")) {
          const dot = document.createElement("span");
          dot.className = "mw-tab-dot";
          dot.title = "No absences left";
          tab.appendChild(dot);
        }
      }

    });
  }

  run();
})();
