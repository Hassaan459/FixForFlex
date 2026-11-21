// FixForFlex: the Requests pages (Course Feedback, Retake Exam, Withdraw Course, Grade Change).
// Tags table columns so requests.css can align them, colours real problem statuses, puts the
// Withdraw buttons in a row, and says so when a table is empty instead of showing a bare header.
(() => {
  function run() {
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
