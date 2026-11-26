# Changelog

## 1.3.0 — 2026-11-26

### Added

- **Import** button: paste a Netscape `.txt` cookie file, a cURL
  command, a bare `Cookie:` header, or JSON (bare array, `{cookies}`,
  or `{captures}` export) — format auto-detected, cookies injected via
  `chrome.cookies.set` on the current tab's host, then the list reloads
- **Library backup**: `⇩ all` in the Saved view downloads every saved
  capture as one JSON file; `⇧ all` re-imports it (merges, dedupes by id)

### Fixed

- Replaced native `confirm()` dialogs (which render as a dead dark
  popup in extension popups) with an inline two-step `sure?` button on
  both cookie-row and saved-capture deletes — click again within 3s to
  confirm, click elsewhere or wait to cancel
- Version badge in the popup header (`v1.3.0`), read from the manifest
- Saved view gets a `← Home` button and auto-returns to the Current
  view whenever the library is empty (no more blank pane)

## 1.2.0 — 2026-11-26

### Added

- **Save** button: snapshot the current tab's cookies into
  `chrome.storage.local` with an auto-suggested name
- **Saved view**: library of saved captures — open into the table,
  copy as JSON, or delete; badge shows capture count
- `storage` permission (local persistence only, still no network)

## 1.1.0 — 2026-11-26

### Added

- Per-row actions: `a=b` copies `name=value`, `val` copies the value
  only, `×` deletes the cookie (confirmed; API-owned cookies only)
- `JS` badge on cookies captured via the `document.cookie` fallback
- Relative expiry column (`in 14d`, `Session`, `Expired`)
- Footer stats: cookie count and payload size
- Empty-state diagnostics: raw per-query API results when no cookies
  are found
- TypeScript source (`popup.ts`, strict mode) compiled to `popup.js`;
  `npm run build` / `npm run typecheck`

### Changed

- Two-row table layout: meta row + full-width scrollable value row —
  long JWTs no longer force horizontal scrolling
- CHIPS-aware partition queries across candidate top-level sites
- Capture pipeline split into `cookieQueries` / `queryCookiesApi` /
  `readPageCookies` helpers; export buttons guarded before first load

## 1.0.0 — 2026-11-26

Initial release.

### Features

- Capture cookies for the active tab via `chrome.cookies` (includes
  `HttpOnly`) merged with a `document.cookie` page read as fallback
- CHIPS-aware queries across candidate partition top-level sites
- Table UI: name, domain, path, relative expiry, flag badges
  (`HttpOnly` / `Secure` / `SameSite` / `Session` / `JS` source marker)
- Full-width per-cookie value rows (wrap + internal scroll)
- Per-row actions: copy `name=value`, copy value, delete cookie
  (confirmed, API-owned cookies only)
- Live filter across name/domain/value; mask-values toggle
- Export: JSON, Netscape `cookies.txt`, cURL `Cookie:` header
- Clipboard copy and file download; cookie count + size stats
- Empty-state diagnostics showing raw per-query API results

### Privacy

- No host permissions beyond temporary `activeTab` on click
- No storage, webRequest, or network access — fully local
