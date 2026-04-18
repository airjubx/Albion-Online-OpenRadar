# Handlers Characterization Completion Note

Date completed: 2026-04-18.
Branch: `feat/handlers-characterization`.
Commits on top of `main`: 46.

## Approach shift partway through

The first pass mocked every database with hardcoded answers. Those mocks sometimes lied in sync with wrong assertions, producing green tests that hid real bugs. Mid-plan the approach was revised:

1. Load REAL databases from `web/ao-bin-dumps/*.min.json` via `web/scripts/__fixtures__/realDatabases.js`.
2. Assert CORRECT behavior when we know it.
3. Use `test.fails(...)` for known-directional bugs so CI stays green while the bug persists and turns red once it is fixed.
4. Use `@characterization` for observed divergences where correctness is unresolved (e.g., #52 Fiber tier needs #58 typeId overlay to ground-truth).

## Final counts

| Handler | `@verified` | `@characterization` | `test.fails` | Total |
|---|---:|---:|---:|---:|
| PlayersHandler | 37 | 2 | 2 | 41 |
| HarvestablesHandler | 43 | 7 | 3 | 53 |
| MobsHandler | 59 | 3 | 0 | 62 |
| ChestsHandler | 10 | 0 | 2 | 12 |
| FishingHandler | 8 | 0 | 2 | 10 |
| DungeonsHandler | 19 | 0 | 0 | 19 |
| WispCageHandler | 9 | 0 | 0 | 9 |
| EventRouter | 36 + 11 (PR #51) | 0 | 11 | 58 |
| **Total** | **232** | **12** | **20** | **264** |

Plus 3 fixture-loader tests and 1 real-DB loader test = **268 total Vitest tests** across 9 files. Current suite result: 252 PASS / 16 EXPECTED_FAIL.

Label distribution:
- `@verified`: 232 / 264 = 88%
- `@characterization`: 12 / 264 = 4%
- `test.fails`: 20 / 264 = 8%

## Suspect register summary

| Tag | Handler | Issue | Fix plan |
|---|---|---|---|
| HARV-1 | HarvestablesHandler | new | Guard `mobileTypeId === -1` as STATIC. |
| HARV-2 | HarvestablesHandler | #30, #32 | Living spawn with e0 off + later enchant update must appear. |
| HARV-3 | HarvestablesHandler | new | `HarvestUpdateEvent` re-gate uses wrong `isLiving` and wrong `stringType` lookup. |
| PLAY-1 | PlayersHandler | #65 | `2026-04-18-alerts-and-ignore-list-design.md`. |
| PLAY-2 | PlayersHandler | #36 | `2026-04-18-alerts-and-ignore-list-design.md`. Secondary alert path is currently dead in prod via ROUTER-2 anyway. |
| CHEST-1 | ChestsHandler | new | Null-guard `addChestEvent` on Parameters[3]. |
| CHEST-2 | ChestsHandler | #29 root | Persist rarity from Parameters[5] on the Chest entity. |
| FISH-1 | FishingHandler | #25 | Replace `!type` with explicit null/undefined check. |
| ROUTER-1 | EventRouter | #57 | `2026-04-18-protocol18-regressions-design.md`. |
| ROUTER-2 to ROUTER-9 | EventRouter | #53 | Refresh `web/scripts/utils/EventCodes.js` from upstream StatisticsAnalysis. Eight dispatch paths dead in prod until then. |

Issues pinned by regression tests: #25, #29 (root), #30, #32, #36, #53 (8 codes), #57, #65. New bugs documented: HARV-1, HARV-3, CHEST-1.

## Verification evidence

- `npm test`: `Tests 252 passed | 16 expected fail (268)` across 9 files, 1.41s.
- `go test ./...`: `ok` on `internal/photon`, `internal/server`, `tools/anonymize-pcap`, `tools/photon-dump`.
- `npm run lint`: exit 0, no issues.
- `go build ./...`: exit 0.
- `golangci-lint run`: exit 0.
- `make run` smoke: executed via Playwright headless on 2026-04-18 against `go run ./cmd/radar -dev -ip 192.168.1.37`. Home page loads (title "OpenRadar, Radar"), sidebar navigation renders (Radar, Players, Resources, Enemies, Chests, Ignore List, Settings), all five ao-bin-dumps JSON databases load (items, spells, harvestables, mobs, zones), cross-page navigation works (Players page renders), zero console errors or warnings across the session.

## Pipeline delivered

- `tools/anonymize-pcap/` extended with `--scrub-string` flag.
- `tools/photon-dump/` new binary: `--inventory` census mode; default mode extracts per-scenario pcap fragments and WS-level JSON fixtures. Matches Albion event codes via `Parameters[252]/[253]`, not the Photon wire Code byte.
- Fixture corpus at `internal/photon/testdata/<handler>/*.pcap` and `web/scripts/__fixtures__/ws/<handler>/*.json`. 16 of 19 declared scenarios produced. Missing: `fishing/finished`, `wispcage/spawn`, `wispcage/opened` (not observable in the 2026-04-18 capture).
- JS fixture loader `web/scripts/__fixtures__/loader.js`.
- JS real-DB loader `web/scripts/__fixtures__/realDatabases.js`.
- Census doc `docs/technical/PROTOCOL18_OBSERVED_CODES.md`.

## Handoffs to follow-up plans

- `docs/plans/2026-04-18-protocol18-regressions-design.md` , fixtures already present. ROUTER-1 is the regression pin for #57. HARV-1 overlaps with #52 diagnostics.
- `docs/plans/2026-04-18-alerts-and-ignore-list-design.md` , PLAY-1 (#65) and PLAY-2 (#36) are the regression pins. Fix flips them to verified. Secondary alert path at `triggerHostileAlert` (lines 271-295) must be covered.
- `docs/plans/2026-01-15-living-harvestables-fix-design.md` , HARV-2 pins #30/#32. Fix flips to verified.
- Issue #29 , CHEST-2 pins the handler-layer root cause (rarity discarded). Drawing-layer colour resolution is downstream.
- Issue #25 , FISH-1 narrows to one-line fix in the falsy-guard.
- Issue #53 , ROUTER-2 through ROUTER-9 (eight dispatch codes) will flip to verified when `EventCodes.js` is refreshed. Until then, five production handlers are dead on those event types: Dungeons, Chests, Fishing zones and finished, Mounted, WispCage spawn and opened, faction change.
- Issue #54 , `docs/technical/PROTOCOL18_OBSERVED_CODES.md` contributes inventory from the 2026-04-18 capture.
- Issue #58 (typeId overlay) , prerequisite to resolve #52 direction. Until overlay exists, the HarvestablesHandler vs MobsHandler tier divergence stays as a `@characterization` observation.

## Notes for the next run

- Real capture plus real DB cross-checks are now the default. Never introduce hardcoded DB answers in new tests.
- A targeted 10-min capture focused on fishing finished, mist wisp cage spawn, and wisp cage open would close the synthetic-fixture gap for WispCage and FishingFinished scenarios.
- The `test.fails` count (20) is intentionally visible in CI output: each expected-fail is a pinned bug with a clear cross-link. The day `EventCodes.js` gets refreshed, eight ROUTER-* test.fails will flip red, prompting the flip to regular `test()`.
