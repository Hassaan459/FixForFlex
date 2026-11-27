// Older semesters on the Marks page. FLEX's semester list only shows the last few terms, but FLEX
// still serves marks for any term at /Student/StudentMarks?semid=YYYYT (T: 1 Spring, 2 Summer, 3 Fall).
// This adds the terms FLEX leaves out to the bottom of its own list, under "Older semesters".
(() => {
  "use strict";

  const TERMS = { 1: "Spring", 2: "Summer", 3: "Fall" };
  const label = (id) => `${TERMS[String(id).slice(4)] || "Term"} ${String(id).slice(0, 4)}`;
  const WEEK = 7 * 24 * 3600 * 1000;

  // Walk back from the oldest term FLEX lists; stop after 6 empty terms in a row.
  // Returns null on a network problem, so a half result is never saved.
  async function scan(oldest) {
    let year = +String(oldest).slice(0, 4), term = +String(oldest).slice(4);
    const back = () => { if (--term < 1) { term = 3; year--; } };
    const found = [];
    let empty = 0;
    back();
    while (empty < 6 && year >= 2015) {
      const id = `${year}${term}`;
      try {
        const html = await fetch(`/Student/StudentMarks?semid=${id}`, { credentials: "include" }).then((r) => r.text());
        const doc = new DOMParser().parseFromString(html, "text/html");
        const courses = [...doc.querySelectorAll(".nav-tabs a")].map((a) => a.textContent.trim()).filter(Boolean);
        if (courses.length) { found.push({ id, courses }); empty = 0; } else empty++;
      } catch (_) { return null; }
      back();
    }
    return found;
  }

  function run() {
    const sel = document.getElementById("SemId");
    if (!sel || sel.dataset.ffxOlder) return;
    sel.dataset.ffxOlder = "1";
    const listed = [...sel.options].map((o) => o.value).filter((v) => /^\d{5}$/.test(v));
    if (!listed.length) return;
    const oldest = String(Math.min(...listed.map(Number)));
    // FLEX shows ?semid= marks for any term but its list keeps showing the latest one, so make the
    // list say what is really on screen.
    const current = new URLSearchParams(location.search).get("semid");

    const group = document.createElement("optgroup");
    group.label = "Older semesters";
    const fill = (list) => {
      const ids = list.map((x) => x.id);
      if (current && !listed.includes(current) && !ids.includes(current)) ids.unshift(current);
      group.replaceChildren(...ids.map((id) => {
        const o = document.createElement("option");
        o.value = id;
        o.textContent = label(id);
        const hit = list.find((x) => x.id === id);
        if (hit) o.title = hit.courses.join(", ");
        return o;
      }));
      if (ids.length && !group.parentNode) sel.appendChild(group);
      if (current && (listed.includes(current) || ids.includes(current))) sel.value = current;
    };
    fill([]);

    // FLEX posts its form when the list changes; for an older term open its ?semid= link instead.
    // Same when the page itself came from a ?semid= link, since the post would keep that stale link.
    // Capture phase runs before FLEX's own handler on the list, so that handler never fires.
    document.addEventListener("change", (e) => {
      if (e.target !== sel || !(current || group.contains(sel.selectedOptions[0]))) return;
      e.stopImmediatePropagation();
      location.href = `/Student/StudentMarks?semid=${sel.value}`;
    }, true);

    chrome.storage.local.get("olderSemesters", async ({ olderSemesters: c }) => {
      if (c && c.oldest === oldest && Date.now() - c.at < WEEK) return fill(c.list);
      const list = await scan(oldest);
      if (!list) return;
      chrome.storage.local.set({ olderSemesters: { oldest, at: Date.now(), list } });
      fill(list);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
