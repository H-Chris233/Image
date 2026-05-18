# AetherGenix Joko Residual Cleanup · Local Task List

Source: `docs/reviews/joko-residual-review-2026-05-18.md` and Matt Pocock-style breakdown.

## Execution Status

| Task | Status | Notes |
|---|---|---|
| 1. Fix single-reference upload 422 | Done | `backend/app/main.py` now accepts 0/1/many optional file uploads; targeted backend tests pass. |
| 2. Centralize AetherGenix product identity constants | Done | Added `backend/app/branding.py`; settings, db, main, and backend tests share product constants. |
| 3. Remove runtime JokoAI backend leaks | Done | Backend app/tests have no `JokoAI` or `joko` hits; backend tests pass. |
| 4. Align Docker packaging with AetherGenix assets | Done | Dockerfile uses `aethergenix.svg`; Compose image/cookie/trial defaults are AetherGenix. |
| 5. Decide and apply Android package identity policy | Done | Applied `com.aethergenix.image` package identity and AetherGenix display name. |
| 6. Update docs/repo metadata and remove old Joko assets | Done | README/package metadata/deploy env renamed; `joko.svg` removed. |
| 7. Add brand-residual guard script | Done | Added `npm run check:brand`; check passes with historical docs allowlist. |

## Task 1 · Fix single-reference upload 422

### Problem

Endpoints that accept optional file lists reject exactly one uploaded optional reference image because FastAPI/Pydantic receives one `UploadFile`, while the annotation expects `list[UploadFile] | None`.

### Acceptance Criteria

- [ ] `/api/ecommerce/analyze` accepts one primary image plus one `reference_image`.
- [ ] `/api/ecommerce/generate` accepts one primary image plus one `reference_image`.
- [ ] `/api/history/{id}/edit` accepts one extra `image` upload.
- [ ] Existing multi-reference behavior remains intact.
- [ ] Backend regression tests pass for the affected cases.

### Verification

```powershell
$env:PYTHONPATH=(Resolve-Path backend).Path
python -m pytest backend\tests\test_app.py -q
```

## Task 2 · Centralize AetherGenix product identity constants

### Problem

Brand identity is scattered across backend code and tests as literal strings. This allowed `JokoAI`, `joko-image`, and `joko-image2` to survive in runtime paths and stale assertions.

### Acceptance Criteria

- [ ] Backend has explicit product/key/gallery constants.
- [ ] Tests assert AetherGenix values through the current contract.
- [ ] Existing AetherGenix defaults continue to work.

## Task 3 · Remove runtime JokoAI backend leaks

### Problem

Users and LLM prompts can still see `JokoAI` in provider errors, auth-client errors, system prompts, FastAPI title, and auth failures.

### Acceptance Criteria

- [ ] Runtime backend source has no `JokoAI`, `joko-image`, or `Joko User` values outside compatibility allowlist.
- [ ] User-facing upstream failures use neutral AetherGenix/Sub2API language.
- [ ] Prompt system roles identify as AetherGenix or neutral task roles.

## Task 4 · Align Docker packaging with AetherGenix assets

### Problem

Docker packaging still references `joko.svg` and `joko-image-*`, while the frontend uses `aethergenix.svg`.

### Acceptance Criteria

- [ ] Dockerfile copies the AetherGenix logo used by the app.
- [ ] Compose image names and env defaults use AetherGenix names.
- [ ] Web Docker target can build.

## Task 5 · Decide and apply Android package identity policy

### Problem

Android/Capacitor identity still uses `com.joko.image` and `joko-image`.

### Acceptance Criteria

- [ ] If mobile app was not published, rename package/applicationId to an AetherGenix identity.
- [ ] If upgrade compatibility matters, keep `applicationId` and document the decision in an ADR while changing display name where safe.
- [ ] Capacitor/Android config is internally consistent.

## Task 6 · Update docs/repo metadata and remove old Joko assets

### Problem

README, deploy env file names, stale logo assets, and package metadata still carry old or scaffold identity.

### Acceptance Criteria

- [ ] README no longer instructs users to deploy `joko-image`.
- [ ] Old deploy env example is renamed or replaced.
- [ ] `joko.svg` is removed after references are gone.
- [ ] `package.json` name is no longer `react-example`.

## Task 7 · Add brand-residual guard script

### Problem

Brand cleanup currently depends on manual grep/review.

### Acceptance Criteria

- [ ] A script or npm command scans for forbidden Joko runtime leaks.
- [ ] Intentional historical docs/review files are explicitly excluded.
- [ ] The check is documented and passes after cleanup.
