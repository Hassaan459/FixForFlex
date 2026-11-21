// FixForFlex: the Requests pages (Course Feedback, Retake Exam, Withdraw Course, Grade Change).
// Tags table columns so requests.css can align them, colours real problem statuses, puts the
// Withdraw buttons in a row, and says so when a table is empty instead of showing a bare header.
(() => {
  // Multi-line notices ("Note 1 : … <br> Note 2 : …"): one line per note with the labels lined up,
  // and the "More Instruction" button on its own line underneath instead of wedged into the text.
  function tidyNotes() {
    for (const text of document.querySelectorAll(".m-alert .m-alert__text")) {
      if (text.dataset.ffNotes || !text.querySelector("br")) continue;
      text.dataset.ffNotes = "1";
      const buttons = [...text.querySelectorAll("a.btn")].map((a) => a.closest("strong") || a);
      buttons.forEach((b) => b.remove());
      const lines = [[]];
      for (const node of [...text.childNodes]) {
        if (node.nodeName === "BR") lines.push([]);
        else lines[lines.length - 1].push(node);
      }
      text.textContent = "";
      for (const nodes of lines) {
        const row = document.createElement("div");
        row.className = "ff-note";
        nodes.forEach((n) => row.appendChild(n));
        // Drop the &nbsp; padding FLEX puts after each label.
        for (const n of row.childNodes) if (n.nodeType === 3) n.textContent = n.textContent.replace(/\u00a0/g, " ").replace(/^\s+/, n === row.firstChild ? "" : " ");
        const label = row.querySelector("strong");
        if (label && /^\s*note/i.test(label.textContent) && row.firstElementChild === label) {
          label.textContent = label.textContent.replace(/\u00a0/g, " ").replace(/\s*:\s*$/, "").trim();
          label.classList.add("ff-note-k");
        }
        // Everything after the label goes in one span so it wraps as a single block of text.
        const val = document.createElement("span");
        val.className = "ff-note-v";
        for (const n of [...row.childNodes]) if (!(n.classList && n.classList.contains("ff-note-k"))) val.appendChild(n);
        row.appendChild(val);
        if (row.textContent.trim()) text.appendChild(row);
      }
      if (buttons.length) {
        const act = document.createElement("div");
        act.className = "ff-note-act";
        buttons.forEach((b) => act.appendChild(b));
        text.appendChild(act);
      }
    }
  }

  function run() {
    tidyNotes();
    const table = document.querySelector(".m-portlet .m-section__content .table");
    if (!table) return;
    const heads = [...table.querySelectorAll("thead th")];
    const name = (th) => th.textContent.trim().toLowerCase();
    const numCols = new Set(), checkCol = new Set();
    let statusCol = -1;
    heads.forEach((th, i) => {
      if (/^(credits?|section|grade)$/.test(name(th))) { numCols.add(i); th.classList.add("ff-rq-num"); }
      if (th.querySelector('input[type="checkbox"]')) { checkCol.add(i); th.classList.add("ff-rq-check"); }
      if (name(th) === "status") statusCol = i;
    });

    const rows = [...table.querySelectorAll("tbody tr")];
    for (const tr of rows) {
      const cells = [...tr.children];
      // Withdraw: the last row holds only the two buttons
      if (tr.querySelector(".btn") && cells.filter((c) => c.textContent.trim()).length <= 1) { tr.classList.add("ff-rq-actions"); continue; }
      cells.forEach((td, i) => {
        if (numCols.has(i)) td.classList.add("ff-rq-num");
        if (checkCol.has(i)) td.classList.add("ff-rq-check");
      });
      const st = cells[statusCol];
      if (st) {
        const t = st.textContent.trim().toLowerCase();
        if (/reject|declin|not approved/.test(t)) st.classList.add("ff-rq-bad");
        else if (/approved|accepted|submitted$/.test(t) && !/not /.test(t)) st.classList.add("ff-rq-good");
      }
    }

    const body = table.querySelector("tbody");
    if (body && !body.querySelector("tr") && heads.length) {
      const tr = document.createElement("tr");
      tr.className = "ff-rq-empty";
      const td = document.createElement("td");
      td.colSpan = heads.length;
      td.textContent = "Nothing to show for this semester.";
      tr.appendChild(td);
      body.appendChild(tr);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
