// Cookie Capture — reads cookies for the ACTIVE tab only.
// Everything stays local: display, clipboard, or a file download. No network.
"use strict";
const $ = (id) => document.getElementById(id);
const listEl = $("cookies");
const filterEl = $("filter");
const countEl = $("count");
const formatEl = $("format");
const showValuesEl = $("show-values");
let cookies = [];
let pageUrl = "";
let queryReport = [];
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
// chrome.cookies.getAll({url}) returns unpartitioned cookies only.
// CHIPS-partitioned cookies need an explicit partitionKey whose
// topLevelSite is scheme + registrable domain — try the origin and
// every parent domain (app.grayswan.ai -> grayswan.ai).
function cookieQueries(u) {
    const queries = [{ url: u.href }];
    const labels = u.hostname.split(".");
    for (let i = 0; i < labels.length - 1; i++) {
        queries.push({
            url: u.href,
            partitionKey: { topLevelSite: `${u.protocol}//${labels.slice(i).join(".")}` },
        });
    }
    return queries;
}
// Runs every query variant, returns cookie lists + a diagnostic report.
async function queryCookiesApi(u) {
    const settled = await Promise.all(cookieQueries(u).map(async (q) => {
        const label = q.partitionKey ? String(q.partitionKey.topLevelSite) : "unpartitioned";
        try {
            const list = (await chrome.cookies.getAll(q));
            return { label, list, err: null };
        }
        catch (e) {
            return { label, list: [], err: e instanceof Error ? e.message : String(e) };
        }
    }));
    // global count: every cookie this extension context can see at all
    let globalCount;
    try {
        globalCount = (await chrome.cookies.getAll({})).length;
    }
    catch (e) {
        globalCount = "ERR " + (e instanceof Error ? e.message : String(e));
    }
    const report = settled
        .map((s) => `${s.label}: ${s.err ? "ERR " + s.err : s.list.length}`)
        .concat([`ALL cookies visible: ${globalCount}`]);
    return { settled, report };
}
// document.cookie inside the page — catches cookies the extension's
// cookie store can't see (partitioned store, wrong profile view).
// Misses HttpOnly cookies; those only come via chrome.cookies.
async function readPageCookies(tab, u) {
    const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.cookie,
    });
    const raw = typeof res?.result === "string" ? res.result : "";
    const out = [];
    for (const pair of raw.split(";").map((s) => s.trim()).filter(Boolean)) {
        const eq = pair.indexOf("=");
        if (eq < 1)
            continue;
        out.push({
            name: pair.slice(0, eq),
            value: pair.slice(eq + 1),
            domain: u.hostname,
            path: "/",
            secure: u.protocol === "https:",
            httpOnly: false,
            session: true,
            sameSite: "unspecified",
            _viaPage: true,
        });
    }
    return out;
}
async function load() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url || !/^https?:/.test(tab.url)) {
            $("page-info").textContent = tab?.url ? "not an http(s) page" : "no active tab";
            $("empty").textContent = "No cookies on this page.";
            $("empty").hidden = false;
            return;
        }
        pageUrl = tab.url;
        const u = new URL(tab.url);
        $("page-info").textContent = `${tab.title || u.hostname} — ${u.hostname}`;
        const { settled, report } = await queryCookiesApi(u);
        queryReport = report;
        cookies = [
            ...new Map(settled.flatMap((s) => s.list)
                .map((c) => [`${c.name}|${c.domain}|${c.path}|${c.partitionKey ? 1 : 0}`, c])).values(),
        ];
        try {
            const pageCookies = await readPageCookies(tab, u);
            const known = new Set(cookies.map((c) => c.name));
            const added = pageCookies.filter((c) => !known.has(c.name));
            cookies.push(...added);
            queryReport.push(`document.cookie pairs added: ${added.length}`);
        }
        catch (e) {
            queryReport.push(`document.cookie: ERR ${e instanceof Error ? e.message : String(e)}`);
        }
        cookies.sort((a, b) => a.name.localeCompare(b.name));
        render();
    }
    catch (err) {
        $("error").hidden = false;
        $("error").textContent = `Could not read cookies: ${err instanceof Error ? err.message : String(err)}`;
    }
}
function matches(c, q) {
    return (c.name.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q) ||
        c.value.toLowerCase().includes(q));
}
function visible() {
    const q = filterEl.value.trim().toLowerCase();
    if (!q)
        return cookies;
    return cookies.filter((c) => matches(c, q));
}
function flags(c) {
    const out = [];
    if (c.httpOnly)
        out.push('<span class="flag">HttpOnly</span>');
    if (c.secure)
        out.push('<span class="flag secure">Secure</span>');
    if (c.session)
        out.push('<span class="flag session">Session</span>');
    if (c.sameSite && c.sameSite !== "unspecified")
        out.push(`<span class="flag samesite">${escapeHtml(c.sameSite)}</span>`);
    if (c._viaPage)
        out.push('<span class="flag page" title="read via document.cookie — HttpOnly cookies may be missing">JS</span>');
    return out.join("");
}
function expiresText(c) {
    if (c.session || c.expirationDate === undefined)
        return "Session";
    const ms = c.expirationDate * 1000 - Date.now();
    if (ms < 0)
        return "Expired";
    const m = Math.floor(ms / 60000);
    if (m < 1)
        return "in <1m";
    if (m < 60)
        return `in ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24)
        return `in ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 30)
        return `in ${d}d`;
    return new Date(c.expirationDate * 1000).toLocaleDateString();
}
function render() {
    const rows = visible();
    countEl.textContent = `${rows.length}/${cookies.length}`;
    const bytes = cookies.reduce((s, c) => s + c.name.length + c.value.length, 0);
    $("hint").textContent =
        `stays local — never sent anywhere · ${cookies.length} cookies · ${(bytes / 1024).toFixed(1)} KB`;
    const emptyEl = $("empty");
    emptyEl.hidden = rows.length > 0;
    if (rows.length === 0 && queryReport.length) {
        emptyEl.innerHTML =
            `No cookies on this page.<br><span class="dbg">${queryReport.map(escapeHtml).join("<br>")}</span>`;
    }
    const show = showValuesEl.checked;
    const indexOf = new Map(cookies.map((c, i) => [c, i]));
    listEl.innerHTML = rows
        .map((c) => {
        const idx = indexOf.get(c);
        const expires = expiresText(c);
        const vtext = show ? escapeHtml(c.value) : "••••••••  ••••••••  ••••••••";
        // delete only works for cookies the cookies API returned (has storeId)
        const del = c.storeId !== undefined
            ? `<button class="mini-btn danger" data-act="del" title="Delete cookie">×</button>`
            : "";
        return `<tr class="meta" data-idx="${idx}">
        <td class="col-idx">${idx + 1}</td>
        <td class="cookie-name mono" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</td>
        <td class="domain mono" title="${escapeHtml(c.domain)}">${escapeHtml(c.domain)}</td>
        <td class="path mono" title="${escapeHtml(c.path)}">${escapeHtml(c.path)}</td>
        <td class="expires" title="${expires}">${expires}</td>
        <td><span class="flags">${flags(c)}</span></td>
        <td class="actions">
          <button class="mini-btn" data-act="pair" title="Copy name=value">a=b</button>
          <button class="mini-btn" data-act="value" title="Copy value only">val</button>
          ${del}
        </td>
      </tr>
      <tr class="val-row" data-idx="${idx}">
        <td colspan="7" class="val-cell${show ? "" : " masked"}">${vtext}</td>
      </tr>`;
    })
        .join("");
}
function flash(el) {
    el.style.outline = "1px solid var(--accent)";
    setTimeout(() => (el.style.outline = ""), 400);
}
listEl.addEventListener("click", async (e) => {
    const target = e.target;
    const btn = target?.closest("button[data-act]");
    const tr = target?.closest("tr[data-idx]");
    if (!tr)
        return;
    const c = cookies[Number(tr.dataset.idx)];
    if (!c)
        return;
    const act = btn?.getAttribute("data-act");
    if (act === "del") {
        if (!confirm(`Delete cookie "${c.name}" on ${c.domain}?`))
            return;
        try {
            await chrome.cookies.remove({
                url: pageUrl,
                name: c.name,
                storeId: c.storeId,
                partitionKey: c.partitionKey,
            });
            load();
        }
        catch (err) {
            $("error").hidden = false;
            $("error").textContent = `Delete failed: ${err instanceof Error ? err.message : String(err)}`;
        }
        return;
    }
    const text = act === "value" ? c.value : `${c.name}=${c.value}`;
    await navigator.clipboard.writeText(text);
    flash(btn || tr);
});
// ---- export formats -------------------------------------------------------
function toJSON() {
    return JSON.stringify(cookies, null, 2);
}
function toNetscape() {
    const lines = [
        "# Netscape HTTP Cookie File — captured by Cookie Capture",
        "# https://curl.se/docs/http-cookies.html",
    ];
    for (const c of cookies) {
        // Netscape flag: TRUE = domain cookie (leading dot), FALSE = host-only
        const isDomain = c.domain.startsWith(".");
        const secure = c.secure ? "TRUE" : "FALSE";
        const expires = c.session || c.expirationDate === undefined ? 0 : Math.floor(c.expirationDate);
        lines.push([c.domain, isDomain ? "TRUE" : "FALSE", c.path, secure, expires, c.name, c.value].join("\t"));
    }
    return lines.join("\n") + "\n";
}
function shQuote(s) {
    return `'${String(s).replace(/'/g, `'\\''`)}'`;
}
function toCurl() {
    const header = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    return `curl ${shQuote(pageUrl)} \\\n  -H ${shQuote(`Cookie: ${header}`)}`;
}
function exportText() {
    switch (formatEl.value) {
        case "netscape": return toNetscape();
        case "curl": return toCurl();
        default: return toJSON();
    }
}
function filename() {
    if (!pageUrl)
        return "cookies.txt";
    const host = new URL(pageUrl).hostname.replace(/[^a-z0-9.-]/gi, "_");
    const ext = { json: "json", netscape: "txt", curl: "sh" }[formatEl.value] ?? "txt";
    return `cookies-${host}.${ext}`;
}
$("copy").addEventListener("click", async () => {
    if (!pageUrl)
        return;
    const text = exportText();
    await navigator.clipboard.writeText(text);
    const btn = $("copy");
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = "Copy"), 1200);
});
$("download").addEventListener("click", () => {
    if (!pageUrl)
        return;
    const blob = new Blob([exportText()], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename();
    a.click();
    URL.revokeObjectURL(a.href);
});
filterEl.addEventListener("input", render);
showValuesEl.addEventListener("change", render);
load();
