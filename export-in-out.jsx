#target premierepro

(function () {
    // ---------- Helpers ----------
    function pad2(n) { return (n < 10 ? "0" : "") + n; }
    function timestamp() {
        var d = new Date();
        return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
    }
    function sanitizeName(name) {
        return (name || "Sequence").replace(/[\\\/:\*\?"<>\|]/g, "_").replace(/\s+/g, "_");
    }

    // Build a nice tokenized filename
    function buildOutputPath(dirFsName, seqName, inTC, outTC, versionStr, ext) {
        var base = sanitizeName(seqName) + "_" + timestamp();
        if (inTC && outTC) {
            base += "_IN" + inTC.replace(/:/g, "-") + "_OUT" + outTC.replace(/:/g, "-");
        }
        if (versionStr) {
            base += "_" + versionStr;
        }
        return dirFsName + "/" + base + (ext || ".mp4");
    }

    // Try to start AME
    function ensureAME() {
        try {
            app.encoder.launchEncoder();
            return true;
        } catch (e) {
            alert("Could not launch Adobe Media Encoder. Is it installed?\n\n" + e);
            return false;
        }
    }

    // Fetch In/Out timecode strings from the active sequence, if any
    function getInOutFromActiveSequence(seq) {
        // Many builds expose time properties via activeSequence.getPlayerPosition(), .getInPoint(), .getOutPoint()
        // and return time as a time object or a string. We'll try safe string fallbacks.
        var res = { inTC: null, outTC: null };

        try {
            if (seq && seq.getInPoint && seq.getOutPoint) {
                var inObj  = seq.getInPoint();
                var outObj = seq.getOutPoint();
                // Some versions return strings like "00;00;10;00" or "00:00:10:00"
                if (inObj && outObj) {
                    res.inTC  = "" + inObj;
                    res.outTC = "" + outObj;
                }
            }
        } catch (e1) {
            // ignore; fall back below
        }

        // Fallback: some builds expose .timecodeIn/.timecodeOut as strings.
        try {
            if ((!res.inTC || !res.outTC) && seq) {
                if (seq.timecodeIn && seq.timecodeOut) {
                    res.inTC  = "" + seq.timecodeIn;
                    res.outTC = "" + seq.timecodeOut;
                }
            }
        } catch (e2) {}

        return res;
    }

    // Some Premiere versions support passing an extra flag to encode ONLY the In/Out.
    // We’ll try a few known signatures, falling back to full-sequence export if needed.
    function queueInOutOrFull(seq, outPath, presetFsName) {
        // Preferred: 5th param toggles "in/out only" on some builds.
        // Signature variants seen in the wild:
        //   encodeSequence(seq, outPath, presetPath, removeOnCompletion)
        //   encodeSequence(seq, outPath, presetPath, removeOnCompletion, inOutOnly)
        //   encodeActiveSequence( outPath, presetPath, removeOnCompletion, inOutOnly )
        try {
            // Try with inOutOnly=true (5th param)
            return app.encoder.encodeSequence(seq, outPath, presetFsName, 1 /*removeOnCompletion?*/, true /*inOutOnly*/);
        } catch (e1) {
            // Try 4-arg form (queues full sequence)
            try {
                return app.encoder.encodeSequence(seq, outPath, presetFsName, 1);
            } catch (e2) {
                // Try active sequence path as last resort
                try {
                    var original = app.project.activeSequence;
                    if (original !== seq) {
                        // Make seq active if your build requires it for encodeActiveSequence
                        app.project.activeSequence = seq;
                    }
                    // Try with inOutOnly true
                    try {
                        return app.encoder.encodeActiveSequence(outPath, presetFsName, 1, true);
                    } catch (e3) {
                        // Try without inOut flag
                        return app.encoder.encodeActiveSequence(outPath, presetFsName, 1);
                    } finally {
                        // no reliable way to restore prior active seq across all builds, but harmless
                    }
                } catch (e4) {
                    alert("Failed to queue export for sequence: " + (seq && seq.name ? seq.name : "Unknown") + "\n" + e4);
                    return false;
                }
            }
        }
    }

    // ---------- Script entry ----------
    if (!app || !app.project) {
        alert("Open a Premiere Pro project first.");
        return;
    }

    var seq = app.project.activeSequence;
    if (!seq) {
        alert("Select a sequence in Premiere (active sequence required).");
        return;
    }

    // Ask user to set In/Out manually if they haven't
    var inOut = getInOutFromActiveSequence(seq);
    if (!inOut.inTC || !inOut.outTC) {
        alert("Tip: Set In/Out in the active sequence before running this script.\nWe'll still continue and queue the FULL sequence if we can't detect In/Out in your build.");
    }

    var outFolder = Folder.selectDialog("Choose output folder");
    if (!outFolder) { return; }

    var presetFile = File.openDialog("Choose an Adobe Media Encoder preset (.epr)", "*.epr");
    if (!presetFile) { alert("No preset selected. Export canceled."); return; }

    if (!ensureAME()) { return; }

    // Optional: quick version token
    var versionInput = prompt("Version tag for filename? (e.g., v01) — leave blank to skip.", "v01");
    if (versionInput && !/^v?\d+$/i.test(versionInput)) {
        // Keep it clean
        versionInput = versionInput.replace(/[^A-Za-z0-9]/g, "");
    }

    // Build output name with tokens
    var outPath = buildOutputPath(outFolder.fsName, (seq.name || "Sequence"), inOut.inTC, inOut.outTC, versionInput, ".mp4");

    // Queue export (tries In/Out-only first; falls back to full)
    var queued = queueInOutOrFull(seq, outPath, presetFile.fsName);

    if (!queued) {
        alert("Could not queue export. Check your preset and try again.");
        return;
    }

    // Start AME batch (some systems require pressing Start manually)
    try {
        app.encoder.startBatch();
        var msg = "Queued export for: " + (seq.name || "Sequence") + "\n";
        msg += "Output:\n" + outPath + "\n";
        if (inOut.inTC && inOut.outTC) { msg += "Range: " + inOut.inTC + " → " + inOut.outTC + "\n"; }
        alert(msg + "\nIf AME doesn't auto-start, press Start in AME.");
    } catch (eStart) {
        alert("Export queued. Open AME and press Start if it didn't auto-run.\n\n" + eStart);
    }
})();
