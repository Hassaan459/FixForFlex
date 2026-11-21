# FixForFlex

A Chrome (Manifest V3) extension that cleans up the FAST-NU FLEX student portal: a readable theme, course totals, attendance and transcript tools, and a notification when your marks change.

## Install (unpacked)

1. Clone this repo.
2. Copy `config.example.js` to `config.js` and put in your own FLEX roll number and password. The background worker uses them to sign in and check your marks. `config.js` is gitignored, so it never gets committed.
3. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick this folder.

## Layout

- `manifest.json`: the extension manifest
- `background.js`: service worker that checks your marks on a timer and sends notifications
- `content/`: per-page scripts and styles injected into flexstudent.nu.edu.pk
- `fonts/`: bundled web fonts (see `fonts/LICENSE.txt`)

Don't commit saved FLEX pages (`*.html`, `*_files/`). They contain personal student data, and `.gitignore` blocks them.
