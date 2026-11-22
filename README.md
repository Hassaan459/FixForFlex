# FixForFlex

A Chrome extension that cleans up the FAST-NU FLEX student portal. It's unofficial and not made by FAST.

- A readable theme for every FLEX page, in light and dark mode
- Correct course totals and grand totals on the Marks page
- Absences left per course on the Attendance page
- What-if SGPA/CGPA, target CGPA and retakes on the Transcript page
- One-click answers on course feedback forms (you still review and submit)
- Credit hours and a fee estimate per semester on the Study Plan page
- Optional notifications when your marks change, even while FLEX is closed

## Install

1. Download the latest `FixForFlex-x.y.zip` from the Releases page and unzip it somewhere you'll keep it (for example `Documents\FixForFlex`).
2. Open `chrome://extensions` (or `edge://extensions` in Edge).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick the unzipped `FixForFlex` folder.
5. Pin it: click the puzzle icon in the toolbar, then the pin next to FixForFlex.

Open FLEX and the new look is there. Notifications are off until you turn them on.

## Update

The popup tells you when a new version is out. Download the new zip, unzip it over the old folder (replace the files), then click the reload icon on FixForFlex in `chrome://extensions`. Your settings are kept.

## Remember me

Tick **Remember me** when you sign in to FLEX and you stay signed in: FixForFlex keeps FLEX's session from timing out while Chrome is open, until you press Logout. If the session ends anyway (Chrome was closed or the PC slept) and your roll number and password are saved in the popup, FixForFlex signs you back in out of sight.

## Notifications

To get notifications, turn on Notifications in the toolbar popup and save your FLEX roll number and password there. FixForFlex then looks at your marks page every 30 minutes, even while FLEX is closed, and notifies you when something changes. With Notifications off, it sends none.

FLEX signs you out after a while. With your roll number and password saved, FixForFlex signs back in on its own, out of sight: no window pops up (it only shows one if you pressed Check now and FLEX needs you to click Sign In yourself). They're stored only in this browser's extension storage and only ever typed into FLEX's own sign-in page.

## For developers

- `manifest.json`: the extension manifest
- `background.js`: notifications, signing in again and the update check
- `content/`: per-page scripts and styles for flexstudent.nu.edu.pk
- `ui/`: the toolbar popup
- `offscreen/`: the hidden page used to sign in again in the background
- `fonts/`: bundled web fonts (see `fonts/LICENSE.txt`)

To make a release, bump `version` in `manifest.json`, commit, then push a matching tag (`git tag v1.1 && git push origin v1.1`). GitHub Actions builds the zip and attaches it to the release. To build the zip locally, run `scripts\build-zip.ps1`.

Don't commit saved FLEX pages (`*.html`, `*_files/`). They contain personal student data, and `.gitignore` blocks them.
