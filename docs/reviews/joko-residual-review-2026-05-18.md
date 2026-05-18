# JokoAI Residual Review - 2026-05-18

## Scope

Reviewed the current `Image` repository working tree for Joko/JokoAI leftovers and adjacent regressions. Excluded `node_modules`, `.git`, `dist`, `.tmp`, and the parent-folder `.mhtml` captures because their `joko` hits are base64/content false positives rather than product code.

The working tree already contains uncommitted frontend rebrand edits in `src/site.tsx`, `src/pages/Account.tsx`, `src/pages/Config.tsx`, and related UI files. This review treats the current working tree as the source of truth and does not count old values that are only visible in `git diff` removed lines.

## Findings

### P1 - Docker web build still copies the old logo file

- `Dockerfile:6` copies `joko.svg` into the frontend build stage.
- Current app shell expects `aethergenix.svg`: `index.html:6` and `src/components/TopNavBar.tsx:9`.
- Local `npm run build` passes because the repository root has `aethergenix.svg`; the Docker build context created by the Dockerfile will not copy it into `/app`, so production Docker web builds can fail or ship stale assets.
- Suggested fix: replace the copy line with `COPY aethergenix.svg ./aethergenix.svg`, then remove `joko.svg` once no references remain.

### P1 - Android and Capacitor identity still ship as Joko

- `capacitor.config.ts:4-5` uses `com.joko.image` and `joko-image`.
- `android/app/build.gradle:4,7` uses `com.joko.image` for namespace and applicationId.
- `android/app/src/main/res/values/strings.xml:3-6` uses `joko-image` and `com.joko.image`.
- `android/app/src/main/java/com/joko/image/MainActivity.java:1` still declares `package com.joko.image`.
- Impact: installed Android app identity, custom URL scheme, FileProvider authority, and package namespace remain Joko. If a mobile build is shipped, users and stores will see old identity.
- Decision needed: changing `applicationId` creates a new Android app identity and can break in-place upgrades. If no published mobile install must be preserved, rename all package paths and run Capacitor sync.

### P1 - Backend prompts and API errors still expose JokoAI

- Provider errors: `backend/app/provider.py:66,76,78`.
- Auth client errors: `backend/app/auth_client.py:62,89,101,113,124,135,147,171,225`.
- System prompts sent to the LLM: `backend/app/main.py:187,198,214,228,240`.
- FastAPI title and auth errors: `backend/app/main.py:357,595,1479,1631,1759,1901`.
- Default display name fallback: `backend/app/settings.py:107`.
- Impact: users can still see JokoAI in API errors, and model calls still receive "你是 JokoAI..." as role identity. This is not cosmetic only; it affects generated helper behavior and product trust.
- Suggested fix: introduce a single product/upstream label constant, probably `AetherGenix`, and use neutral "upstream service" wording for Sub2API failures where the brand should not be tied to the vendor.

### P1 - Single extra reference image uploads return 422

- Frontend appends a single extra ecommerce reference as `reference_image`: `src/api.ts:790`.
- Backend expects `reference_image: list[UploadFile] | None`: `backend/app/main.py:1178,1333`.
- With one extra file, FastAPI/Pydantic currently receives one `UploadFile`, not a list, and returns:

```json
{"detail":[{"type":"list_type","loc":["body","reference_image"],"msg":"Input should be a valid list"}]}
```

- The same pattern exists for history edit references: frontend appends `image` at `src/api.ts:718`, backend accepts `image: list[UploadFile] | None` at `backend/app/main.py:923`.
- Confirmed by tests: 3 ecommerce/history multi-reference tests fail with HTTP 422.
- Suggested fix: change these file-list parameters to a FastAPI shape that accepts one or many files, then normalize to a list before use. Add a regression test for exactly one optional extra reference.

### P2 - Docker Compose and deploy env defaults disagree with app defaults

- `docker-compose.yml:6,56` image names are `joko-image-*`.
- `docker-compose.yml:24-25` defaults cookie names to `joko_session` and `joko_guest`.
- `docker-compose.yml:32` defaults trial key prefix to `joko-image2-trial`.
- `deploy/joko-image.env.example:1,22,23,33` repeats the old name and defaults.
- Current app defaults in `.env.example` and `backend/app/settings.py` are already mostly AetherGenix (`aethergenix_session`, `aethergenix_guest`, `aethergenix-trial`), so production Docker defaults and local defaults diverge.
- Migration note: changing cookie names will log out existing sessions unless dual-read migration is added.

### P2 - Test suite still encodes the old brand contract

- Fixture defaults use `joko_session`, `joko_guest`, and `joko-image2-trial`: `backend/tests/test_app.py:496-504`.
- Assertions still expect `joko-image://user-gallery`, `joko-image`, `joko-image2 new user trial grant`, and `JokoAI`: `backend/tests/test_app.py:1438,1524,1533,1554,1593,1684,1719`.
- Current backend already returns AetherGenix values for user gallery, default announcement, normal key name, and trial grant notes, so tests are red partly because assertions lag behind product code.
- Impact: CI cannot distinguish a real regression from a stale brand assertion, and some tests still force old defaults into the app.

### P2 - README and public contact metadata still point to Joko

- `README.md:1,3,160,245,252,314,315,455,456,458` still refer to `joko-image`, `joko-image2`, `JokoAI`, `Joko`, and the old Telegram contact.
- Impact: deployment instructions and public handoff docs still tell maintainers to use the old env file and old cookie/key names.

### P3 - Repository metadata cleanup remains incomplete

- `joko.svg` remains at repository root and is still referenced by `Dockerfile:6`.
- `deploy/joko-image.env.example` filename still carries the old product name.
- `package.json:2` is still the scaffold name `react-example`. Not a Joko leak, but part of the same rebrand hardening pass.

## Verification

- `rg -n -i "JokoAI|Joko AI|Joko Image|joko-image2|joko-image|joko_session|joko_guest|com\\.joko\\.image|Joko User|\\bJoko\\b|joko" --hidden --glob '!**/.git/**' --glob '!**/node_modules/**' --glob '!package-lock.json'`
- `npm run lint`: passed.
- `npm run build`: passed locally.
- `PYTHONPATH=backend python -m pytest backend/tests/test_app.py -q`: failed, 49 passed and 8 failed.

## Suggested Fix Order

1. Fix upload list parsing first, because it is a real product regression unrelated to naming.
2. Update backend prompts/errors and test assertions in the same patch, then rerun backend tests.
3. Fix Dockerfile logo copy and remove `joko.svg`.
4. Decide Android package migration policy, then rename Capacitor/Android identity consistently.
5. Align Docker Compose, deploy env example, README, and package metadata.
