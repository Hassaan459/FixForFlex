// Marks Watcher: rebuilds FLEX's sidebar in place. It groups the links under headings, gives them
// shorter labels and one consistent icon set, and adds a collapse button.
// FLEX's own links (with their session tokens) are kept as they are; they are only moved and relabelled.
(() => {
  "use strict";

  const s = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    home: s('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>'),
    attendance: s('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="m9 15.5 2 2 4-4"/>'),
    marks: s('<rect x="7" y="2.5" width="10" height="4" rx="1"/><path d="M17 4.5h1.5A1.5 1.5 0 0 1 20 6v14a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20V6a1.5 1.5 0 0 1 1.5-1.5H7"/><path d="M8 17v-3M12 17v-6M16 17v-4"/>'),
    transcript: s('<path d="M22 9.5 12 4.5 2 9.5l10 5 10-5z"/><path d="M6 11.5V16c2 2.2 4 3 6 3s4-.8 6-3v-4.5"/><path d="M22 9.5v6"/>'),
    gradereport: s('<path d="M14 2.5H6.5A1.5 1.5 0 0 0 5 4v16a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20V7.5z"/><path d="M14 2.5v5h5"/><path d="M9 13.5h2.2l1.3 3.5 1.3-6 1.2 2.5H16"/>'),
    plo: s('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>'),
    studyplan: s('<path d="M9 3.5 3 6v14.5l6-2.5 6 2.5 6-2.5V3.5L15 6z"/><path d="M9 3.5V18M15 6v14.5"/>'),
    registration: s('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/><path d="M12 7v6M9 10h6"/>'),
    admitcard: s('<rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14.5 10h4M14.5 13.5h4"/>'),
    challan: s('<path d="M5 2.5h14v19l-2.5-1.5L14 21.5 12 20l-2 1.5L7.5 20 5 21.5z"/><path d="M9 7.5h6M9 11h6M9 14.5h3.5"/>'),
    feedetails: s('<path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4h-12A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20h14a1.5 1.5 0 0 0 1.5-1.5v-10A1.5 1.5 0 0 0 19.5 7H5.5A2.5 2.5 0 0 1 3 4.5"/><circle cx="16.5" cy="13.5" r="1.2"/>'),
    feedback: s('<path d="M21 14.5a2 2 0 0 1-2 2H8l-5 4.5V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="m12 7 1.1 2.3 2.4.3-1.8 1.7.5 2.4L12 12.5l-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z"/>'),
    retake: s('<path d="M3 12a9 9 0 1 0 2.8-6.5L3 8"/><path d="M3 3v5h5"/><path d="M12 8v4l2.5 2"/>'),
    withdraw: s('<path d="M14 2.5H6.5A1.5 1.5 0 0 0 5 4v16a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20V7.5z"/><path d="M14 2.5v5h5"/><path d="M9 14.5h6"/>'),
    gradechange: s('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5z"/>'),
    other: s('<circle cx="12" cy="12" r="1.2"/><circle cx="5" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),
    collapse: s('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m15.5 9.5-2.5 2.5 2.5 2.5"/>'),
    expand: s('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m13 9.5 2.5 2.5-2.5 2.5"/>'),
  };

  // Keyed by the last part of each link's path, so it keeps working whatever tokens FLEX adds.
  const ITEMS = {
    "": { group: "Academics", label: "Home", icon: "home" },
    studentattendance: { group: "Academics", label: "Attendance", icon: "attendance" },
    studentmarks: { group: "Academics", label: "Marks", icon: "marks" },
    transcript: { group: "Academics", label: "Transcript", icon: "transcript" },
    gradereport: { group: "Academics", label: "Grade Report", icon: "gradereport" },
    studentplorpt: { group: "Academics", label: "PLO Report", icon: "plo" },
    tentativestudyplan: { group: "Academics", label: "Study Plan", icon: "studyplan" },
    courseregistration: { group: "Registration", label: "Course Registration", icon: "registration" },
    printadmitcard: { group: "Registration", label: "Admit Card", icon: "admitcard" },
    challan: { group: "Fees", label: "Fee Challan", icon: "challan" },
    consolidatedstdfeereport: { group: "Fees", label: "Fee Details", icon: "feedetails" },
    coursefeedback: { group: "Requests", label: "Course Feedback", icon: "feedback" },
    retakerequest: { group: "Requests", label: "Retake Exam", icon: "retake" },
    coursewithdraw: { group: "Requests", label: "Withdraw Course", icon: "withdraw" },
    gradechangerequest: { group: "Requests", label: "Grade Change", icon: "gradechange" },
  };
  const ORDER = Object.keys(ITEMS);
  const GROUPS = ["Academics", "Registration", "Fees", "Requests", "More"];
  const root = document.documentElement;
  const KEY = "mwSideCollapsed";

  function keyOf(a) {
    try {
      const path = new URL(a.href, location.href).pathname.replace(/\/+$/, "");
      if (path === "" || /^\/(home|student\/?home|index)?$/i.test(path)) return "";
      return path.split("/").pop().toLowerCase();
    } catch (_) { return null; }
  }

  function build() {
    const nav = document.querySelector(".m-aside-menu .m-menu__nav");
    if (!nav || nav.dataset.mw) return;
    nav.dataset.mw = "1";

    const items = [...nav.children].filter((li) => li.matches(".m-menu__item"));
    const byGroup = Object.fromEntries(GROUPS.map((g) => [g, []]));

    items.forEach((li) => {
      const a = li.querySelector("a.m-menu__link");
      if (!a) return;
      const k = keyOf(a);
      const cfg = ITEMS[k] || { group: "More", label: (a.querySelector(".m-menu__link-text")?.textContent || "").trim(), icon: "other" };
      const text = a.querySelector(".m-menu__link-text");
      if (text) text.textContent = cfg.label;
      a.title = cfg.label;
      const old = a.querySelector(".m-menu__link-icon");
      const ico = document.createElement("span");
      ico.className = "m-menu__link-icon mw-ico";
      ico.innerHTML = ICONS[cfg.icon] || ICONS.other;
      if (old) old.replaceWith(ico); else a.prepend(ico);
      li.classList.add("mw-item");
      li.dataset.order = k in ITEMS ? ORDER.indexOf(k) : 999;
      byGroup[cfg.group].push(li);
    });

    GROUPS.forEach((g) => {
      const list = byGroup[g].sort((x, y) => x.dataset.order - y.dataset.order);
      if (!list.length) return;
      const head = document.createElement("li");
      head.className = "mw-group-head";
      head.textContent = g;
      nav.appendChild(head);
      list.forEach((li) => nav.appendChild(li));
    });

    // Collapse to icons only
    const li = document.createElement("li");
    li.className = "mw-collapse-item";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mw-collapse-btn";
    const paint = () => {
      const c = root.classList.contains("mw-side-collapsed");
      btn.innerHTML = `${c ? ICONS.expand : ICONS.collapse}<span>Collapse</span>`;
      btn.title = c ? "Expand sidebar" : "Collapse sidebar";
    };
    btn.addEventListener("click", () => {
      const c = !root.classList.contains("mw-side-collapsed");
      root.classList.toggle("mw-side-collapsed", c);
      try { localStorage.setItem(KEY, c ? "1" : "0"); } catch (_) {}
      paint();
    });
    paint();
    li.appendChild(btn);
    nav.insertBefore(li, nav.firstChild);
  }

  // A small wordmark next to FLEX's logo, so the corner above the menu isn't an empty block.
  function brand() {
    const logo = document.querySelector(".m-brand .m-brand__logo-wrapper");
    if (!logo || logo.querySelector(".mw-brand-name")) return;
    const name = document.createElement("span");
    name.className = "mw-brand-name";
    name.textContent = "FLEX";
    logo.appendChild(name);
  }

  try { if (localStorage.getItem(KEY) === "1") root.classList.add("mw-side-collapsed"); } catch (_) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { build(); brand(); });
  else { build(); brand(); }
})();
