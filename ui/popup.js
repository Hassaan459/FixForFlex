// FixForFlex toolbar popup: on/off, notifications (with the FLEX sign-in they use), Check now, feedback quick fill, dark mode, update notice.
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
  $("login").hidden = !st.watchEnabled;
  // Only a problem gets a line under "Notifications"; on and off speak for themselves.
  const last = st.watchEnabled && st.lastCheck;
  let text = "";
  if (last && last.status === "signed-out") text = "Signed out of FLEX. Save your sign-in below.";
  else if (last && last.status === "login-failed") text = "Couldn't sign in. Fix your roll number and password below.";
  else if (last && last.status === "error") text = `Couldn't reach FLEX ${ago(last.at)}.`;
  $("status").textContent = text;
  $("status").hidden = !text;

  const up = st.update;
  $("update").hidden = !up;
  if (up) { $("update").textContent = `Version ${up.version} is out. Download it`; $("update").href = up.url; }
}

// ---- FixForFlex on/off: off hides everything but the header ----
chrome.storage.local.get("enabled", (st) => showEnabled(st.enabled !== false));
chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && ch.enabled) showEnabled(ch.enabled.newValue !== false); });
function showEnabled(on) {
  $("enabled").checked = on;
  $("main").hidden = !on;
}
$("enabled").addEventListener("change", () => chrome.storage.local.set({ enabled: $("enabled").checked }));

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

// ---- FLEX sign-in, shown only while notifications are on ----
chrome.storage.local.get(["flexRoll", "flexPass", "watchEvery"], (st) => {
  showSaved(st.flexRoll && st.flexPass ? st.flexRoll : "");
  $("watchEvery").value = String(st.watchEvery || 30);
  if (!$("watchEvery").value) $("watchEvery").value = "30";
  syncOwner();
});

// Only the developer's own copy (by roll number, hashed) can change the interval; everyone else updates every 30 minutes.
const OWNER_HASH = "c2f8eeb78c0a0b1a25d9640795f5782d2986cc132eef84574d90688173739706";
async function isOwner(roll) {
  const norm = String(roll || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!norm) return false;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(norm));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("") === OWNER_HASH;
}
let savedRoll = "";
async function syncOwner() { $("everyRow").hidden = !(await isOwner(savedRoll || $("flexRoll").value)); }

// Once saved, the form folds into one line: "Signed in as 22I-0000  [Remove account]".
function showSaved(roll) {
  savedRoll = roll;
  $("loginForm").hidden = !!roll;
  $("loginSaved").hidden = !roll;
  $("savedRoll").textContent = roll;
  syncOwner();
}
$("flexRoll").addEventListener("input", syncOwner);

$("showPass").addEventListener("click", () => {
  const p = $("flexPass");
  p.type = p.type === "password" ? "text" : "password";
  $("showPass").textContent = p.type === "password" ? "Show" : "Hide";
});

let savedTimer;
function said(text) {
  $("saved").textContent = text;
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => ($("saved").textContent = ""), 2500);
}

$("saveLogin").addEventListener("click", () => {
  const roll = $("flexRoll").value.trim().toUpperCase();
  const pass = $("flexPass").value;
  if (!roll || !pass) return said("Fill in both.");
  $("flexRoll").value = roll;
  chrome.storage.local.set({ flexRoll: roll, flexPass: pass, watchEvery: Number($("watchEvery").value) || 30 }, () => {
    $("flexPass").value = "";
    showSaved(roll);
  });
});
$("watchEvery").addEventListener("change", () => chrome.storage.local.set({ watchEvery: Number($("watchEvery").value) || 30 }));
$("clearLogin").addEventListener("click", () => {
  $("flexRoll").value = "";
  $("flexPass").value = "";
  chrome.storage.local.remove(["flexRoll", "flexPass"], () => showSaved(""));
});

// ---- Dark mode for the popup only (FLEX keeps its own switch) ----
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
