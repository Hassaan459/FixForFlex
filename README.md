# FixForFlex

A Chrome extension that cleans up the FAST-NU FLEX student portal. It's unofficial and not made by FAST.

- A readable theme for every FLEX page, in light and dark mode
- Correct course totals and grand totals on the Marks page
- Absences left per course on the Attendance page
- What-if SGPA/CGPA, target CGPA and retakes on the Transcript page
- One-click answers on course feedback forms (you still review and submit)
- Credit hours and a fee estimate per semester on the Study Plan page
- Optional background alerts when your marks change

## Install

1. Download the latest `FixForFlex-x.y.zip` from the Releases page and unzip it somewhere you'll keep it (for example `Documents\FixForFlex`).
2. Open `chrome://extensions` (or `edge://extensions` in Edge).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick the unzipped `FixForFlex` folder.
5. Pin it: click the puzzle icon in the toolbar, then the pin next to FixForFlex.

Open FLEX and the new look is there. Settings opens once after install. Marks alerts are off until you turn them on.

## Update

The popup tells you when a new version is out. Download the new zip, unzip it over the old folder (replace the files), then click the reload icon on FixForFlex in `chrome://extensions`. Your settings are kept.

## Marks alerts

Turn them on in the popup or in Settings. FixForFlex checks your marks page every few minutes and shows a notification when something changes.

FLEX signs you out after a while. If you save your roll number and password in Settings, FixForFlex signs back in on its own. They're stored only in this browser's extension storage and only ever typed into FLEX's own sign-in page. If you leave them empty, checks only work while you're signed in.

## For developers

- `manifest.json`: the extension manifest
- `background.js`: marks checks, notifications and the update check
- `content/`: per-page scripts and styles for flexstudent.nu.edu.pk
- `ui/`: the toolbar popup and the Settings page
- `fonts/`: bundled web fonts (see `fonts/LICENSE.txt`)

To make a release, bump `version` in `manifest.json`, commit, then push a matching tag (`git tag v3.1 && git push origin v3.1`). GitHub Actions builds the zip and attaches it to the release. To build the zip locally, run `scripts\build-zip.ps1`.

Don't commit saved FLEX pages (`*.html`, `*_files/`). They contain personal student data, and `.gitignore` blocks them.
