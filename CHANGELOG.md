# Changelog

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
