# premierepro-scripting-tutorial-05-export-in-out
Tutorial 5 — export only the In/Out range of the active sequence to Adobe Media Encoder with smart filenames.

## Prerequisites
- Adobe Premiere Pro (open with a project + active sequence).
- Adobe Media Encoder installed.
- Visual Studio Code + **Adobe ExtendScript Debugger** extension.

## Files
- `export-in-out.jsx` — main script that queues the In/Out (or full sequence fallback) to AME.
- `.vscode/settings.json` — treat `.jsx` as JavaScript.
- `screenshots/` — add tutorial images here.

## How to run
1. In Premiere, open your sequence and set **In (I)** and **Out (O)** markers.
2. In VS Code, open `export-in-out.jsx`.
3. Press **Ctrl/Cmd+Shift+P → "ExtendScript: Run Script" → Adobe Premiere Pro**.
4. Choose an **output folder** and an **.epr preset** when prompted.
5. (Optional) enter a version tag (e.g., `v01`).
6. The script queues to **AME** and attempts to use **In/Out-only** (falls back to full sequence if unsupported on your build).

## Troubleshooting
- **AME won’t launch**: Update/install AME via Creative Cloud.
- **Exports whole sequence**: Your Premiere/AME build may not accept an In/Out flag via scripting; the script still queues successfully.
- **Preset issues**: Test a stock H.264 preset (*Match Source – High Bitrate*), then save a custom `.epr`.

## License
MIT — see `LICENSE`.
