| Date | Deep | Finding | Issue | PR | Evaluated? | Verdict | Effect | Witness | Prior-night fates |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
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
| 2026-09-02 | operator-overlay | Given kit pins sit at parity on HEAD (all three workflows `a7544687…`, crates `1 | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/49 | yes | ACCEPT |  | 558df079ca29 |  |
| 2026-09-03 | ci-workflows | Given kit-pin-guard (PR #49) compares only KIT_REF SHAs against the record's CAN | NONE | NONE | yes | ACCEPT |  | ab575703a85a |  |
| 2026-09-04 | kit-pin-integrity | Given HEAD's kit-pin parity logic lives in two independent copies (the GitHub gu | NONE | NONE | yes | ACCEPT |  | 5782b8777649 |  |
| 2026-09-05 | site-build-content | Given HEAD `7e243741`'s bench run emits both React Router v7 future-flag warning | NONE | NONE | yes | ACCEPT |  | 67497bc79bb8 |  |
| 2026-09-06 | operator-overlay | Given tonight's pin-parity entrypoint is an inline command containing nested dou | NONE | NONE | yes | INCONCLUSIVE |  | c638ed372d40 |  |
| 2026-09-07 | ci-workflows | VETOED: Given the 09-06 dispatch layer mangled the inline pin-parity entrypoint  | NONE | NONE | yes | BLOCKED-ENV |  | 11a09998ce64 |  |
| 2026-09-07 | operator-handoff | 09-01 ran no dream: report.md is an Ontology Loom scaffold dump, receipts green | NONE | NONE | n/a | OPERATOR |  | operator | 2026-09-01 |
| 2026-09-07 | operator-handoff | 09-07 gate was green on parent f3ee5405: 201/201, 0e/10w, PIN-PARITY-OK | NONE | NONE | n/a | OPERATOR |  | operator | 2026-09-07 |
| 2026-09-07 | operator-handoff | No 09-03 or 09-04 draft branches or PRs ever existed; phantom-PR thread shut | NONE | NONE | n/a | OPERATOR |  | operator | 2026-09-03, 2026-09-04 |
| 2026-09-07 | operator-handoff | React Router v7 future flags landed by operator from the 09-05 finding | NONE | NONE | n/a | OPERATOR |  | operator | 2026-09-05 |
| 2026-09-09 | site-build-content | VETOED: Bench test now guards prebuild↔generate-*.mjs parity + non-empty src/dat | NONE | VETOED | yes | REJECT |  | 6cee8ae3737b |  |
| 2026-09-10 | operator-overlay | Given the parent at `9a3dd883` shows 10 static lint warnings, of which 6 are `re | NONE | NONE | yes | INCONCLUSIVE |  | af1cdf448646 |  |
| 2026-09-11 | ci-workflows | No tree (2nd night): lint carry-over unexecutable; kit repin b9->b10 unledgered | NONE | NONE | yes | INCONCLUSIVE |  | 14f572f938b8 |  |
| 2026-09-12 | kit-pin-integrity | Kit pins verified clean at 1.0.0-beta.10; b10 repin stable`. | NONE | NONE | yes | INCONCLUSIVE |  | b2a3ba05b10c |  |
| 2026-09-13 | site-build-content | Lint-refactor unexecutable 3rd night; capture lacks source text, not tree | NONE | NONE | yes | INCONCLUSIVE |  | c67abc8deaa1 |  |
| 2026-09-27 | ci-workflows | Given the pin-parity receipt verifies the kit crates resolve at 1.0.0-beta.11 ag | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/50 | yes | ACCEPT |  | 71beb121e36c |  |  |  |
| 2026-09-28 | kit-pin-integrity | VETOED: Given the shipped manifest comment in `forum-config/Cargo.toml` restates | NONE | NONE | yes | INCONCLUSIVE |  | 2e776f0b4d24 |  |  |  |
| 2026-09-29 | site-build-content | VETOED: Given tonight's pin-parity receipt verifies all four kit crates pinned a | NONE | VETOED | yes | REJECT |  | 0c593404d42e |  |  |  |
| 2026-09-30 | operator-overlay | Given the uncertainty of the schema, and the fact that the required evaluators d | NONE | NONE | yes | INCONCLUSIVE |  | 5b96ed1de3b7 |  |  |  |
| 2026-10-01 | site-build-content | VETOED: Given `fetchMarkdown` (src/lib/markdown.ts:40-49) never inspects `respon | NONE | NONE | yes | BLOCKED-ENV |  | a0868fbbcbc1 |  |  |  |
| 2026-10-02 | operator-overlay | Given `forum-config/dreamlab.toml [branding]` (the authored source of truth per  | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/51 | yes | ACCEPT |  | 90134885d896 |  |  |  |
| 2026-10-03 | ci-workflows | Given deploy.yml's push trigger includes `index.html` but ci.yml's push and pull | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/52 | yes | ACCEPT |  | a7bfb9c88f66 |  |  |  |
| 2026-10-04 | kit-pin-integrity | Given the manifest `forum-config/Cargo.toml` restates the kit pin in prose ("All | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/53 | yes | ACCEPT |  | 8a9e594aae43 |  |  |  |
| 2026-10-04 | kit-pin-integrity | Given the pin-parity gate requires full 40-hex commit SHAs for workflow `uses:`  | NONE | PERSIST-LOCAL | yes | ACCEPT |  | 27dad02c42a1 |  |  |  |
| 2026-10-05 | site-build-content | Given `fetchMarkdown` (src/lib/markdown.ts:40-49) returns `response.text()` with | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/54 | yes | ACCEPT |  | aa63e80a062b |  |  |  |
| 2026-10-06 | operator-overlay | Given forum-config/dreamlab.toml [branding] (the authored source of truth per .. | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/55 | yes | ACCEPT |  | 794f3a1f8887 |  |  |  |
| 2026-10-07 | ci-workflows | Workflow KIT_REF comments restated beta.14 (canonical beta.15); prose removed | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/56 | yes | ACCEPT |  | ed8fe02af35d |  |  |  |
| 2026-10-08 | kit-pin-integrity | Cargo.lock: kit crate resolved twice is now PIN-DRIFT (last-wins parser hid it) | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/57 | yes | ACCEPT |  | 24015ee35b0b |  |  |  |
| 2026-10-09 | site-build-content | ACCEPT vetoed → BLOCKED-ENV: candidate: candidate patch did not apply to the… | NONE | NONE | yes | BLOCKED-ENV |  | dfbb4a24cca9 |  |  |  |
| 2026-10-10 | operator-overlay | VETOED: [branding] vs branding.rs parity now witnessed by new vitest bench test | NONE | VETOED | yes | REJECT |  | fe7f5eae30af |  |  |  |
| 2026-10-09 | site-build-content | predev/prebuild generator parity check + bench smoke test for inventory | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/58 | yes | ACCEPT |  | 6f0b0a79ae4e |  |  |  |
| 2026-10-10 | operator-overlay | webauthn+mesh TOML-to-wrangler mirrors unenumerated; bench test now enforces | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/59 | yes | ACCEPT |  | 919165feba7e |  |  |  |
| 2026-10-11 | ci-workflows | deploy.yml missed prebuild generator scripts in push paths; now scripts/** | NONE | PERSIST-LOCAL | yes | ACCEPT |  | e5ac9e35711c |  |  |  |
| 2026-10-11 | ci-workflows | rust-ci.yml KIT_REF comment restated beta.14 (canonical beta.15); removed | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/60 | yes | ACCEPT |  | 0d42a5e9ef90 |  |  |  |
| 2026-10-13 | site-build-content | inventory now enforces workshop-list path === /workshops/<id> (was unguarded) | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/61 | yes | ACCEPT |  | 51db9bdd2a01 |  |  |  |
| 2026-10-14 | operator-overlay | workers.rs POD/RELAY URL constants mirror TOML unguarded; bench enforces | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/62 | yes | ACCEPT |  | 183dbd87fb1f |  |  |  |
| 2026-10-15 | ci-workflows | VETOED: deploy/workers push paths ⊆ ci.yml now enforced by guard script+test+ci… | NONE | VETOED | yes | REJECT |  | 4436a9d056fa |  |  |  |
| 2026-10-17 | site-build-content | WORKSHOP_META ids vs generated workshop-list unguarded; bench enforces equality | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/63 | yes | ACCEPT |  | 93e394e052da |  |  |  |
| 2026-10-18 | operator-overlay | VETOED: branding.rs <-> dreamlab.toml [branding] parity unguarded at bench; now… | NONE | VETOED | yes | REJECT |  | f51542f545de |  |  |  |
| 2026-10-19 | ci-workflows | VETOED: test-and-lint.yml gate-step/Summary-loop link unguarded; bench now… | NONE | NONE | yes | REJECT |  | 7e40e670da57 |  |  |  |
| 2026-10-20 | kit-pin-integrity | KIT_CRATES never checked vs manifest kit deps; ungoverned nostr-bbs-* now fails | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/71 | yes | ACCEPT |  | 77f79bcde0d7 |  |  |  |
| 2026-10-22 | operator-overlay | branding.rs and deploy.yml BBS_* branding unguarded; bench now binds the pair | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/73 | yes | ACCEPT |  | 73e6009b4a4f |  |  |  |
| 2026-10-24 | kit-pin-integrity | duplicate RESOLVED record lines collapsed last-wins; gate now fails naming them | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/77 | yes | ACCEPT |  | 3456a87f4126 |  |  |  |
| 2026-10-25 | site-build-content | hand-written course index workshop links unguarded; inventory now binds them | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/78 | yes | ACCEPT |  | e3a61ff1ac2b |  |  |  |
| 2026-10-26 | operator-overlay | nip05 resolver_mode/pod_base_url unguarded vs auth vars; bench binds them | NONE | https://github.com/DreamLab-AI/dreamlab-ai-website/pull/79 | yes | ACCEPT |  | 153b4ac73cf2 |  |  |  |
