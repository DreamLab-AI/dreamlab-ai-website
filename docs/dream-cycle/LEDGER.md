| Date | Deep | Finding | Issue | PR | Evaluated? | Verdict | Effect | Witness | Prior-night fates |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-08-15 | ci-workflows | INCONCLUSIVE — see report | NONE | NONE | yes | INCONCLUSIVE |  | e958dd021289 |  |
| 2026-08-15 | ci-workflows | INCONCLUSIVE — see report | NONE | NONE | yes | INCONCLUSIVE |  | e958dd021289 |  |
| 2026-08-15 | ci-workflows | Given `pin-parity` reports PIN-DRIFT with KIT_REF `9cec2222afefecde2bfe69f110b7b | NONE | NONE | yes | INCONCLUSIVE |  | 3c8fb07dfcaa |  |
| 2026-08-16 | kit-pin-integrity | Given evaluator `pin-parity` in-session reports `KIT_REF 9cec2222afefecde2bfe69f | NONE | NONE | yes | INCONCLUSIVE |  | c016f62572b4 |  |
| 2026-08-16 | kit-pin-integrity | Given pin-parity (2026-08-15 receipt) reports KIT_REF `9cec2222afefecde2bfe69f11 | NONE | NONE | yes | INCONCLUSIVE |  | 5cc073d4979f |  |
| 2026-08-18 | operator-overlay | Given `pin-parity` reports `PIN-DRIFT-RECORD-SHA` with workflows uniformly at `K | NONE | NONE | yes | INCONCLUSIVE |  | 37a2cc7ec37e |  |
| 2026-08-18 | operator-overlay | Given workflows uniformly pin KIT_REF `2f01e339…` while `docs/architecture/kit-c | NONE | NONE | yes | ACCEPT |  | c50c22db8170 |  |
| 2026-08-18 | operator-overlay | Given workflows uniformly pin KIT_REF `2f01e33995a9ce193b7c9ed08aedd716d038f639` | NONE | NONE | yes | ACCEPT |  | 70cc0803f3b2 |  |
| 2026-08-19 | ci-workflows | Given the prior-night ACCEPTs that repinned all three workflows and the compatib | NONE | NONE | yes | ACCEPT |  | 0ae8d68dbac3 |  |
| 2026-08-20 | kit-pin-integrity | Given the workflows and compatibility record were repinned on 2026-08-18/19, whe | NONE | NONE | yes | REJECT |  | a21a5296d4f6 |  |
| 2026-08-21 | site-build-content | Given the production build emits un-gzipped JS chunks of 690.56 kB (cynefin) and | NONE | NONE | yes | INCONCLUSIVE |  | b624c230e321 |  |
| 2026-08-21 | site-build-content | Given the annexe checkout at `~/dream-annexe/2026-08-21-dreamlab-ai-website/drea | NONE | NONE | yes | INCONCLUSIVE |  | 26a5e1047fdd |  |
| 2026-08-22 | operator-overlay | A REJECT verdict can be a healthy result — the drift hypothesis was the right fa | NONE | NONE | yes | REJECT |  | f1f748bf996c |  |
| 2026-08-22 | operator-overlay | Given the KIT_REF was repinned from `2f01e339…` to `90ffe74c…` across workflows  | NONE | NONE | yes | REJECT |  | d4f24a45f8e1 |  |
| 2026-08-23 | ci-workflows | Given the three workflows pin KIT_REF `93dcf055…` while `kit-compatibility-recor | NONE | NONE | yes | ACCEPT |  | e1a4957f1a19 |  |
| 2026-08-24 | kit-pin-integrity | Given the three workflows pin KIT_REF `93dcf055…` while `kit-compatibility-recor | NONE | NONE | yes | ACCEPT |  | b05011e91bfb |  |
| 2026-08-25 | site-build-content | Given the production build emits a single lazy cynefin chunk of 690.56 kB (gzip  | NONE | NONE | yes | INCONCLUSIVE |  | 6dc27f6e38df |  |
| 2026-08-26 | operator-overlay | Given the KIT_REF was repinned from `93dcf055…` to `a7544687…` across the three  | NONE | NONE | yes | REJECT |  | 7d48d6f146a0 |  |
| 2026-08-28 | operator-handoff | OPERATOR FIX: evaluatorEntrypoints with nested double quotes were mangled by the annexe ssh dispatch (bash -lc consumes one escaping level); affected evaluators converted to checked-in scripts (scripts/dream-*.sh) invoked quote-free. Verified passing locally. Dream cycle: trust the script form; never inline double-quoted logic in dream.config.json. RuVector key: dream-evaluator-ssh-quoting-bug-class (patterns ns) | NONE | NONE | n/a | OPERATOR |  | session-018aCYi4 |  |
| 2026-09-01 | site-build-content | INCONCLUSIVE — see report | NONE | NONE | yes | INCONCLUSIVE |  | 2cd6fe24ca32 |  |
