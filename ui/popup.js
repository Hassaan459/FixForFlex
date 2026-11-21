// FixForFlex toolbar popup: marks alerts, Check now, feedback quick fill, dark mode, update notice.
const $ = (id) => document.getElementById(id);
$("version").textContent = "v" + chrome.runtime.getManifest().version;

function ago(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

function render(st) {
  $("watch").checked = !!st.watchEnabled;
  const last = st.lastCheck;
  let text;
  if (last && last.status === "signed-out") text = "Signed out of FLEX. Sign in, or add your sign-in in Settings.";
  else if (last && last.status === "login-failed") text = "Couldn't sign in. Check your sign-in in Settings.";
  else if (last && last.status === "error") text = `Last check failed ${ago(last.at)}.`;
  else if (last) text = `Last checked ${ago(last.at)}.`;
  else text = "Not checked yet.";
  if (!st.watchEnabled) text = "Off. " + (last ? text : "Turn on to get alerts when marks change.");
  $("status").textContent = text;

  const up = st.update;
  $("update").hidden = !up;
  if (up) { $("update").textContent = `Version ${up.version} is out. Download it`; $("update").href = up.url; }
}

const KEYS = ["watchEnabled", "lastCheck", "update", "flexRoll"];
chrome.storage.local.get(KEYS, render);
chrome.storage.onChanged.addListener(() => chrome.storage.local.get(KEYS, render));

$("watch").addEventListener("change", () => chrome.storage.local.set({ watchEnabled: $("watch").checked }));

$("check").addEventListener("click", () => {
  const b = $("check");
  b.disabled = true;
  b.textContent = "Checking…";
  chrome.runtime.sendMessage({ type: "check-now" }, () => {
    void chrome.runtime.lastError;
    b.disabled = false;
    b.textContent = "Check now";
  });
});

$("settings").addEventListener("click", (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });

// ---- Dark mode for the popup and Settings only (FLEX keeps its own switch) ----
const isDark = () => document.documentElement.classList.contains("dark");
setTimeout(() => ($("dark").checked = isDark()), 0);
chrome.storage.local.get("uiMode", () => ($("dark").checked = isDark()));
$("dark").addEventListener("change", () => {
  const mode = $("dark").checked ? "dark" : "light";
  try { localStorage.setItem("uiMode", mode); } catch (_) {}
  chrome.storage.local.set({ uiMode: mode });
});

// ---- Feedback quick fill, only when the active tab is a feedback form ----
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab || !/^https:\/\/flexstudent\.nu\.edu\.pk\/Student\/FeedBackQuestions/i.test(tab.url || "")) return;
  chrome.tabs.sendMessage(tab.id, { type: "feedback-status" }, (res) => {
    if (chrome.runtime.lastError || !res || !res.questions) return;
    for (const o of res.options) $("answer").add(new Option(o, o));
    $("answer").value = "Agree";
    $("feedback").hidden = false;
    $("fill").addEventListener("click", () => {
      chrome.tabs.sendMessage(tab.id, { type: "feedback-fill", answer: $("answer").value }, () => {
        void chrome.runtime.lastError;
        window.close();
      });
    });
  });
});
