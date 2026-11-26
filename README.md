# Cookie Capture — Current Tab

A minimal Manifest V3 Chromium extension that reads the cookies of the
page you're currently on — including `HttpOnly` ones — and lets you
inspect, copy, export, and delete them. JSON, Netscape `cookies.txt`, or
a ready-to-paste `cURL` command.

Built for quick session debugging, API testing with `curl`, and
red-team work against **your own** sessions and lab targets.

## Features

- **Two-source capture** — reads via `chrome.cookies` (gets `HttpOnly`
  cookies) *and* `document.cookie` inside the page (catches cookies the
  extension store can't see, e.g. partitioned stores). Cookies sourced
  from the page get a `JS` badge.
- **CHIPS-aware** — queries partitioned cookies across candidate
  top-level sites (`app.example.com` → `example.com`).
- **Dense table UI** — name, domain, path, relative expiry
  (`in 14d` / `Session` / `Expired`), and color-coded flags
  (`HttpOnly`, `Secure`, `SameSite`, `Session`, `JS`).
- **Full values** — each cookie gets a full-width value row that wraps
  and scrolls, so long JWTs stay readable and selectable.
- **Per-row actions** — `a=b` copies `name=value`, `val` copies the
  value only, `×` deletes the cookie (with confirmation).
- **Filter** — live search across name, domain, and value.
- **Values mask** — toggle to hide values on screen; exports always
  contain full values.
- **Export formats**:
  - **JSON** — full cookie objects
  - **Netscape `.txt`** — importable by `curl --cookie`, browser cookie
    importers, and most tooling
  - **cURL header** — `curl '<url>' -H 'Cookie: …'` snippet
- **Copy to clipboard or download** as a file; footer shows cookie count
  and payload size.
- **Save captures** — snapshot any tab's cookies into
  `chrome.storage.local` and manage them in the **Saved** view: reopen
  in the table, copy as JSON, or delete. Survives restarts.
- **Import** — paste a Netscape `.txt`, a cURL command, a `Cookie:`
  header, or JSON to inject cookies into the current tab's host via
  `chrome.cookies.set` (auto-detected format).
- **Library backup** — `⇩ all` / `⇧ all` in the Saved view export or
  merge-import every saved capture as a single JSON file.
- **Diagnostics** — when a page shows no cookies, the popup prints the
  raw per-query results so you can see exactly what the API returned.

## Privacy

**Everything stays local.** No `host_permissions` (temporary `activeTab`
grant only, on click), no `webRequest`, no remote code, no network
requests. `chrome.storage.local` is used only to persist saved captures
on your machine. Source is ~350 lines you can read in a minute.

## Install (load unpacked)

1. Open `chrome://extensions` (or `chromium://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select this folder — or the extracted
   `dist/cookie-capture-<version>/` folder from the release zip
4. Pin the extension, open any http(s) page, click the 🍪 icon

Or launch Chromium directly with it preloaded:

```bash
chromium --load-extension=/home/teycir/Repos/cookie-capture
```

> `dist/cookie-capture-<version>.zip` is a ready-to-share package —
> `manifest.json` sits at the zip root. Unzip it and point **Load
> unpacked** at the extracted folder.

> Note: `--load-extension` loads it for that session only. For a
> persistent install use the `chrome://extensions` steps above —
> Chromium remembers unpacked extensions across restarts. After
> changing files, click the reload (↻) icon on the extension card.

## Permissions explained

| Permission | Why |
|---|---|
| `cookies` | Read/remove cookie store entries for the current URL (incl. `HttpOnly`) |
| `tabs` / `activeTab` | Identify the active tab and its URL; `activeTab` grants temporary host access only when you click the icon |
| `scripting` | Read `document.cookie` inside the tab as a fallback when the cookie store is unreachable (partitioned store, wrong profile view) — misses `HttpOnly`, which `cookies` still covers |
| `storage` | Persist saved cookie captures in `chrome.storage.local` (local only, ~10 MB quota) |

## Usage

1. Navigate to the site whose cookies you want
2. Click the extension icon
3. Filter if needed, click a row (or `a=b` / `val`) to copy, or pick a
   format and **Copy** / **Download**

### cURL example output

```bash
curl 'https://app.example.com/api/me' \
  -H 'Cookie: session=abc123; theme=dark'
```

### Netscape example output

```
# Netscape HTTP Cookie File — captured by Cookie Capture
.example.com	TRUE	/	TRUE	1767225600	session	abc123
app.example.com	FALSE	/	FALSE	0	theme	dark
```

## Develop

Source is TypeScript (`popup.ts`); `popup.js` is the compiled artifact
Chrome loads — it's committed so the extension works without a build.

```bash
npm install     # typescript + @types/chrome (dev only)
npm run build   # tsc -> popup.js
npm run typecheck
```

## Files

```
manifest.json   MV3 manifest
popup.html      popup UI
popup.css       dark theme styles
popup.ts        capture + export + row actions (source)
popup.js        compiled output loaded by Chrome
icons/          16/32/48/128 px PNG icons
dist/           versioned zip + extracted folder
CHANGELOG.md    release notes
```

## License

[MIT](LICENSE) — Copyright (c) 2026 Teycir — teycir@pxdmail.net

## Legal note

Only capture cookies for systems you're authorized to test — your own
accounts, lab environments, or engagements in scope. Session cookies are
credentials; treat exports accordingly.
