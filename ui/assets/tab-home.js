// KidGuard parent page, part of ui/index.html (classic script, shared globals, load order = the <script> tags there).
// Once per kid, at home: nothing set up for when the kid is out (no Tailscale, no relay) -> one tip card.
function awayTip() {
  if (cur.via !== "lan" || isBasic() || (st.ts && st.ts.state !== "off") || st.relay || kidFlag(cur, "away")) return "";
  return `<div class="card mt16"><h2>${ic("route")} ${t("away.h")}</h2><p class="mute">${t("away.p")}</p>
    <div class="row"><button type="button" id="awayGo" class="pri">${ic("chevron-right")} ${t("away.go")}</button><button type="button" id="awayNo">${t("away.later")}</button></div></div>`;
}
// "Right now" (state.now, contract C2): why the phone is limited as a whole, until when. The page's own unsaved pass edits count at once.
function nowOf(r) {
  const n = st.now || { why: "", until: 0, name: "" }, pu = +r.passUntil || 0;
  if (n.why !== "lost" && pu > Date.now() && n.why !== "code") return { why: "pass", until: pu, name: "" };
  if (n.why === "pass" && pu <= Date.now()) return { why: "", until: 0, name: "" };   // ended here, the phone has not synced it yet
  return n;
}
// text of one state: "Đang giờ ngủ, mở lại 06:30" ...; key now.<why> (no end known) or now.<why>U (with {0} = when)
const nowText = n => n.why ? t("now." + n.why + (n.until ? "U" : ""), n.until ? whenTxt(n.until) : "", esc(n.name ? "(" + n.name + ")" : "")) : "";
// a new app waiting for approval (rules.blockNew): one row with [Cho phép] [Chặn]
function newAppsCard(r) {
  if (!r.blockNew) return "";
  const L = (st.apps || []).filter(x => x.new && !r.approved.includes(x.pkg) && !r.blocked.includes(x.pkg));
  if (!L.length) return "";
  return `<div class="card req" role="group" aria-label="${esc(t("na.aria"))}"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span class="ib t-warn" style="color:var(--warn);background:rgba(217,119,6,.16)">${ic("sparkles")}</span><b class="sp">${t("na.h", L.length)}</b></div>
    ${L.slice(0, 3).map(x => `<div class="app" style="margin-top:8px">${icon(x)}<div class="nm"><b>${esc(x.label)}</b><span class="mute">${t("na.sub", esc(cur.name))}</span></div></div>
    <div class="row"><button class="pri sp" data-naok="${esc(x.pkg)}">${ic("circle-check")} ${t("permit")}</button><button class="sp" data-nano="${esc(x.pkg)}">${ic("ban")} ${t("na.block")}</button></div>`).join("")}
    ${L.length > 3 ? `<button type="button" class="lfoot" id="naMore">${t("na.more", L.length - 3)} ${ic("chevron-right")}</button>` : ""}</div>`;
}
function homeTab(b) {
  const r = edit || st.rules || {};
  const reqs = !viewDay ? (st.requests || []).filter(q => !answered.has(q.id)) : [];
  const reqHtml = reqs.map(q => reqCard(q, r)).join("") + (!viewDay ? newAppsCard(r) : "");
  const nw = nowOf(r), nowTxt = nowText(nw);
  const paused = !viewDay && +r.pausedUntil > Date.now();
  const limitMin = +r.dailyMin || 0, bonusMin = r.bonus && r.bonus.day === st.day ? +r.bonus.min || 0 : 0;
  const totalMin = limitMin ? limitMin + bonusMin : 0, pct = totalMin ? Math.min(100, Math.round(st.usedMs / (totalMin * 60000) * 100)) : 0;
  const barCls = pct >= 100 ? " bad" : pct >= 85 ? " warn" : "";
  const hero = `<div class="hero">
    <div class="row"><span class="lab">${t("tab.home")}</span>${nowTxt ? `<span class="tag ${nw.why === "lost" ? "bad" : nw.why === "pass" ? "ok" : "warn"}">${nowTxt}</span>` : ""}<span class="sp"></span>${navOk("hist") ? `<button type="button" id="hmHist" class="hm-pill">${ic("history")} ${t("tab.hist")}</button>` : `<button type="button" id="hmLim" class="hm-pill">${ic("timer")} ${t("rules.segTime")}</button>`}</div>
    <div class="big">${fmt(st.usedMs)}</div>
    <div class="meta"><span>${totalMin ? t("limit") + ": " + fmt(totalMin * 60000) : t("noLimit")}</span>${totalMin ? `<span>${pct}%</span>` : ""}</div>
    ${totalMin ? `<div class="bar${barCls}"><i style="width:${pct}%"></i></div>` : ""}
    ${viewDay ? "" : `<div class="hm-acts">
      <button type="button" id="hmPause" class="${paused ? "pausing" : "pri"}">${ic(paused ? "play" : "pause")} ${paused ? t("resume") : t("pause")}</button>
      <button type="button" id="hmPlus15">${ic("plus")} 15m</button>
    </div>`}
  </div>`;
  const unread = chatUnread();
  const quick = viewDay ? "" : `<div class="quick" role="group" aria-label="${esc(t("now"))}">
    <button type="button" id="lock" class="act tile"></button>
    <button type="button" id="ring" class="act tile"></button>
    <button type="button" id="loc" class="act tile"></button>
    <button type="button" id="hmMsg" class="tile"><b>${ic("message-square")}${unread ? `<span class="n">${unread > 99 ? "99+" : unread}</span>` : ""}</b><span>${t("msg.tile")}</span></button>
    <button type="button" id="moreAct" class="tile"><b>${ic("ellipsis")}</b><span>${t("nav.more")}</span></button>
  </div><div id="strip"></div>`;
  const loc = st.location, zone = loc && loc.lat != null ? scrZone(loc.lat, loc.lon) : "";
  const locSub = loc && loc.t ? (zone ? zone + " · " + ago(loc.t) : ago(loc.t)) : t("none");
  const notifs = Array.isArray(st.notifs) ? st.notifs : [];
  const notifSub = notifs.length ? (notifs[0].title || notifs[0].app || t("hm.notifN", notifs.length)) : t("none");
  const scrSub = st.screenOn ? t("pc.on") : t("pc.off");
  const card = (id, icn, title, sub, dis = false) => `<button type="button" id="${id}" class="hm-card"${dis ? " disabled" : ""}>
    <span class="hm-ic">${ic(icn)}</span>
    <span class="hm-tx"><b>${esc(title)}</b><span>${esc(sub)}</span></span>
    <span class="hm-ch">${ic("chevron-right")}</span>
  </button>`;
  const bedOn = !!(r.bedStart && r.bedEnd), schN = (r.schedules || []).filter(s => s.on !== false).length, dnsOn = !!r.safeDns;
  const rulesStrip = `<div class="hm-rules" role="group" aria-label="${esc(t("tab.rules"))}">
    <button type="button" class="hm-rchip ${bedOn ? "on" : "off"}" data-hr="r-night|time">${ic("moon")} ${bedOn ? `${esc(r.bedStart)}–${esc(r.bedEnd)}` : t("bed.h")}</button>
    <button type="button" class="hm-rchip ${schN ? "on" : "off"}" data-hr="r-sch|time">${ic("book-open")} ${t("sch.h")}${schN ? ` (${schN})` : ""}</button>
    <button type="button" class="hm-rchip ${dnsOn ? "on" : "off"}" data-hr="r-net|safe">${ic("shield")} ${t("dns.h").split(" (")[0]}</button>
  </div>`;
  const topApps = (st.apps || []).filter(x => x.ms > 0).slice(0, 4);
  const topHtml = topApps.length ? `<div class="list" style="margin-top:12px"><div class="lhead"><h2>${ic("puzzle")} ${t("tab.apps")}</h2></div>${topApps.map(x => `<button type="button" class="app hm-app" data-ha="${esc(x.pkg)}">${icon(x)}<div class="nm"><b>${esc(x.label)}</b><span class="mute">${fmt(x.ms)}${x.suspended || x.blocked ? `<span class="tag bad">${reason(x.blocked)}</span>` : ""}</span></div>${ic("chevron-right")}</button>`).join("")}<button type="button" id="hmAllApps" class="lfoot">${t("tab.apps")} ${ic("chevron-right")}</button></div>` : "";
  b.innerHTML = reqHtml + awayTip() + hero + quick
    + `<div class="card" id="phoneCard" style="padding:0;margin-top:12px"></div>`
    + `<div class="hm-grid" role="group" aria-label="${esc(t("tab.home"))}">
        ${card("hmLoc", "map-pin", t("tab.where"), locSub)}
        ${card("hmNotif", "bell", t("seen.nh"), notifSub, !navOk("seen"))}
        ${card("hmScr", "smartphone", t("more.scr"), scrSub, !navOk("screen"))}
        ${card("hmCam", "video", t("hm.camAudio"), t("cam.more"), viewDay)}
      </div>`
    + rulesStrip
    + topHtml;
  if (reqs.length) wireReq(b, st.day, false);
  b.querySelectorAll("[data-naok]").forEach(x => x.onclick = async () => {
    const p = x.dataset.naok; r.approved = [...new Set([...(r.approved || []), p])]; r.blocked = (r.blocked || []).filter(v => v !== p);
    await putRules(cur, r).catch(e => toast("err|" + e.message)); render();
  });
  b.querySelectorAll("[data-nano]").forEach(x => x.onclick = async () => {
    const p = x.dataset.nano; r.blocked = [...new Set([...(r.blocked || []), p])]; r.approved = (r.approved || []).filter(v => v !== p);
    await putRules(cur, r).catch(e => toast("err|" + e.message)); render();
  });
  if ($("#naMore")) $("#naMore").onclick = () => goTab("apps");
  if ($("#awayGo")) $("#awayGo").onclick = () => { goTab("set"); subOpen("s-relay"); };
  if ($("#awayNo")) $("#awayNo").onclick = () => { setKidFlag(cur, "away", 1); render(); };
  if ($("#hmPause")) $("#hmPause").onclick = () => {
    if (paused) { r.pausedUntil = 0; putRules(cur, r).then(() => { toast("ok|" + t("resumed")); render(); }).catch(e => toast("err|" + e.message)); return; }
    pickTime("pause", "", async until => { r.pausedUntil = until; await putRules(cur, r); cmd({ type: "lock" }, t("paused"), false); render(); });
  };
  if ($("#hmPlus15")) $("#hmPlus15").onclick = async () => {
    try { const k = await grant(15); toast("ok|" + grantToast(k, edit, 15)); render(); } catch (e) { toast("err|" + e.message); }
  };
  if ($("#lock")) $("#lock").onclick = () => act("lock", () => cmd({ type: screenOff() ? "wake" : "lock" }, t(screenOff() ? "wake.done" : "locked"), false));
  if ($("#ring")) $("#ring").onclick = () => ringOn() ? ringStop() : earOn() ? toast("warn|" + t("act.noRing")) : act("ring", () => cmd({ type: "ring" }, t("ring.sent"), [t("ring.ask"), t("ring.go")]).then(res => { if (res && res.result !== "queued") expect("ring", true, "ring"); return res; }));
  if ($("#loc")) $("#loc").onclick = () => act("loc", () => cmd({ type: "locate" }, t("locating"), false).then(res => { if (res) locStart(); return res; }));
  if ($("#hmMsg")) $("#hmMsg").onclick = () => msgSheet();
  if ($("#moreAct")) $("#moreAct").onclick = () => moreSheet();
  if ($("#hmHist")) $("#hmHist").onclick = () => goTab("hist");
  if ($("#hmLim")) $("#hmLim").onclick = () => qsGo({ tab: "rules", sec: "r-day", seg: "time" });
  b.querySelectorAll("[data-hr]").forEach(x => x.onclick = () => { const [sec, seg] = x.dataset.hr.split("|"); qsGo({ tab: "rules", sec, seg }); });
  b.querySelectorAll("[data-ha]").forEach(x => x.onclick = () => goTab("apps"));
  $("#hmLoc").onclick = () => goTab("where");
  $("#hmNotif").onclick = () => { goTab("seen"); subOpen("seenNotif"); };
  $("#hmScr").onclick = () => goTab("screen");
  $("#hmCam").onclick = () => snapOpen(true);
  if ($("#hmAllApps")) $("#hmAllApps").onclick = () => goTab("apps");
  updateLive();
}

// device log lines "Lệnh: <type> → <result>" (the phone writes the prefix in Vietnamese, type/result as English codes): keys "cl.<type>", "cr.<result>".
// Every other log line is free text written by the phone and is shown as is.
function logTr(m) { const x = /^Lệnh: (\S+) → (.+)$/.exec(m); return x ? t("cl", tc("cl.", x[1], x[1]), tc("cr.", x[2], x[2])) : m; }
function drawHist() {
  const days = (st.history || []).slice().reverse().concat([{ day: st.day, ms: st.usedMs, top: st.apps.filter(x => x.ms > 0).slice(0, 5) }]);
  const mx = Math.max(60000, ...days.map(d => d.ms)), WD = t("wd");
  if (histSel < 0 || histSel >= days.length) histSel = days.length - 1;
  const show = () => {
    const d = days[histSel];
    $("#histPick").innerHTML = dayBtn("hist", { sel: d.day, days: days.map(x => x.day), onPick: k => { histSel = days.findIndex(x => x.day === k); show(); } }); dpBind($("#histPick"));
    $("#hist").querySelectorAll("button").forEach((x, i) => x.classList.toggle("on", i === histSel));
    $("#histTop").innerHTML = `<b>${esc(dm(d.day))}: ${fmt(d.ms)}</b>` + ((d.top || []).length ? (d.top || []).map(a => `<div>${esc(a.label || a.pkg)} · ${fmt(a.ms)}</div>`).join("") : "<div>" + ic("circle-dashed") + " " + t("noAppData") + "</div>");
  };
  $("#hist").innerHTML = days.map((d, i) => `<button data-h="${i}" aria-label="${esc(dm(d.day))}: ${fmt(d.ms)}"><i style="height:${Math.max(2, Math.round(d.ms / mx * 90))}px"></i>${WD[dayIdx(d.day)]}</button>`).join("");
  $("#hist").querySelectorAll("button").forEach(x => x.onclick = () => { histSel = +x.dataset.h; show(); });
  show();
}

// The relay logs request URLs: icons there use an icon-only key, sha256("icon:" + token) hex, never the token itself
// (LAN: the token goes to the phone only). Computed once per kid; the list redraws when it is ready.
function iconKey(k) {
  if (k.via === "lan") return k.token || (LOCAL ? "-" : "");   // on-device page: the cookie authenticates, token is ""
  if (k.ik) return k.ik;
  if (!k.ikP && window.crypto && crypto.subtle) k.ikP = crypto.subtle.digest("SHA-256", new TextEncoder().encode("icon:" + k.token))
    .then(b => { k.ik = [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); if (cur === k) render(); }).catch(() => {});
  return k.ikP ? "" : k.token;   // no WebCrypto (plain-http page): the old way
}
// relay icon map per kid {v, m, p}: null while loading (letters show), redraws once it lands
function relayIcons(k, key, v) {
  const c = k.icm;
  if (c && c.v === v) return c.m;
  if (c && (c.v === v + ":busy" || c.v === v + ":fail")) return c.old || null;
  const old = c && c.m;
  k.icm = { v: v + ":busy", old };
  fetch(`${base(k)}/icons?k=${encodeURIComponent(key)}&v=${encodeURIComponent(v)}`).then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(m => { k.icm = { v, m }; if (cur === k) { lastSig = ""; render(); } })
    .catch(() => { k.icm = { v: v + ":fail", m: old }; });   // stays on letters / the old map; next new v tries again
  return old || null;
}
function icon(x) {
  const l = ((x.label || "?").trim()[0] || "?").toUpperCase(), letter = esc(l), hue = (l.charCodeAt(0) * 47) % 360;
  const st0 = `background:hsl(${hue} 55% 45%);color:#fff`;
  // LAN: the phone draws it; relay: the 48 px copy the phone uploaded; app mode: same paths through the proxy.
  // lazy: a 200-app list fetches only the ~10 on screen first (LAN = one phone-side draw per icon); cached 24 h after
  const kq = iconKey(cur);
  if (!kq) return `<span class="ic" style="${st0}">${letter}</span>`;   // icon key still being computed: letter for one frame
  // relay: every icon in ONE request (GET /icons?v=, cached for good; a new upload changes v), not one per app
  if (cur.via === "relay" && st && st.iconV && cur.ik) {
    const m = relayIcons(cur, kq, st.iconV), b = m && m[x.pkg];
    return b ? `<span class="ic"><img alt="" decoding="async" src="data:image/webp;base64,${b}"></span>` : `<span class="ic" style="${st0}">${letter}</span>`;
  }
  return `<span class="ic" style="${st0}"><img alt="" loading="lazy" decoding="async" data-l="${letter}" src="${base(cur)}/icon?pkg=${encodeURIComponent(x.pkg)}&k=${encodeURIComponent(kq)}" onload="this.parentNode.style.background='none'" onerror="this.parentNode.textContent=this.dataset.l"></span>`;
}
function appRow(x) {
  return `<div class="app">${icon(x)}<div class="nm"><b>${esc(x.label)}</b><span class="mute">${fmt(x.ms)}${x.suspended || x.blocked ? `<span class="tag bad">${reason(x.blocked)}</span>` : ""}</span></div></div>`;
}

// Section = one row of a tab's list (icon tile, title, chip, one-line desc, chevron) + a body that STAYS in the DOM (controls keep
// their wiring, setChip keeps working). Rows of one group sit in ONE container (`secGrp()`, same look as the "Thêm" list).
// Phone: the list shows rows only; a tap opens that section's body as a sub-screen (top bar = back + title + chip; one history
// entry per open sub-screen, state {sub: id}). Wide (>= 960 px): two panes, list on the left, the selected body on the right.
// secNav() applies this to the DOM after every render (idempotent).
// Owner 2026-11-15: 17 collapsible cards per tab were tiring to open and close; then "still a lot": grouped rows + merged small sections.
// secP() = a section as data (so a merge can take it apart), toString() = the row; secMix() = ONE row whose sub-screen holds several of them
// (each keeps its title + chip + gate); secLazy[id] = fn(box) fills a heavy body only when its row is opened (re-armed by every render).
let subId = null, selId = null, subY = 0, subTop = false;   // phone: open sub-screen; wide: selected row; list scroll to restore
const wideMq = matchMedia("(min-width:960px)"), isWide = () => wideMq.matches;
const chipHtml = c => c ? `<span class="tag ${c[1] || ""}" data-chip>${c[0]}</span>` : `<span data-chip></span>`;
const secLazy = {};
const gateOf = id => FEAT_SEC[id] ? gateNote(FEAT_SEC[id]) : "";
const gBody = (id, body) => { const g = gateOf(id); return g ? g + `<div class="gated">${body}</div>` : body; };
function secRow(id, icn, title, desc, chip, inner, gate, lazy) {
  const gd = { "s-ts": "tailscale", "s-relay": "relay", "s-tg": "telegram", "s-watch": "watch", "s-danger": "remove" }[id];
  if (gd) inner = `<p class="glp">${gLink(gd)}</p>` + inner;
  return `<section class="cl${gate ? " gate" : ""}" data-sec="${id}"${lazy ? " data-lazy" : ""}><h2><button type="button" class="clh" id="sh-${id}" aria-controls="sb-${id}">
    <svg class="si bk" aria-hidden="true"><use href="#i-chevron-left"/></svg><span class="cli">${ic(icn)}</span><span class="clt"><b>${title}</b>${desc ? `<span>${desc}</span>` : ""}</span>${chipHtml(chip)}<svg class="si chev" aria-hidden="true"><use href="#i-chevron-right"/></svg></button></h2>
    <div class="clb" id="sb-${id}" role="region" aria-labelledby="sh-${id}"><div><div><div class="clbh" aria-hidden="true">${ic(icn)}<b>${title}</b></div><div class="clbc">${inner}</div></div></div></div></section>`;
}
function secP(id, icn, title, desc, chip, body) {
  return { id, icn, title, desc, chip, body, toString() { return secRow(id, icn, title, desc, chip, gBody(id, body), !!gateOf(id)); } };
}
const sec = (id, icn, title, desc, chip, body) => secRow(id, icn, title, desc, chip, gBody(id, body), !!gateOf(id));
const secL = (id, icn, title, desc, chip) => secRow(id, icn, title, desc, chip, "", !!gateOf(id), true);   // empty row: secLazy[id] fills the body when opened
const mixChip = tones => { const on = tones.filter(Boolean); return on.length ? [t("chip.nOn", on.length), on.includes("bad") ? "bad" : on.includes("warn") ? "warn" : "ok"] : [t("off")]; };
function secMix(id, icn, title, desc, parts, chip) {   // chip: undefined = "N on" from the parts (live), null = none, [text, tone] = fixed
  const ps = parts.filter(Boolean), fixed = chip !== undefined;
  const h = secRow(id, icn, title, desc, fixed ? chip : mixChip(ps.map(p => p.chip && p.chip[1] || "")),
    // a part named like the row (e.g. "Màn hình chính của bé" inside "Màn hình chính của bé"): no second title, only its chip (owner 2026-11-17)
    ps.map(p => `<div class="part" data-part="${p.id}">${p.title === title ? (p.chip ? `<div class="pth">${chipHtml(p.chip)}</div>` : "")
      : `<h3 class="pth">${ic(p.icn)}<b>${p.title}</b>${chipHtml(p.chip)}</h3>`}${gBody(p.id, p.body)}</div>`).join(""), false);
  return fixed ? h.replace(`data-sec="${id}"`, `data-sec="${id}" data-fixed`) : h;
}
// a group of rows in one container, with a heading above (like the "Thêm" screen); empty rows are dropped. id / note: for the heading
const secGrp = (h, rows, id, note) => { const r = rows.filter(Boolean).join(""); return r ? `${h ? `<div class="sec"${id ? ` id="${id}"` : ""}>${h}</div>` : ""}${note || ""}<div class="list sgl">${r}</div>` : ""; };
function setChip(root, id, c) {
  const el = root.querySelector(`[data-sec="${id}"] [data-chip], [data-part="${id}"] [data-chip]`); if (!el) return;
  el.outerHTML = chipHtml(c);
  const part = root.querySelector(`[data-part="${id}"]`), row = part && part.closest("[data-sec]"), rc = row && !row.hasAttribute("data-fixed") && row.querySelector(".clh [data-chip]");
  if (rc) rc.outerHTML = chipHtml(mixChip([...row.querySelectorAll("[data-part] [data-chip]")].map(x => ["ok", "warn", "bad"].find(k => x.classList.contains(k)) || "")));
}
function secFill(c) {
  const f = secLazy[c.dataset.sec]; if (!f || !c.hasAttribute("data-lazy") || c.dataset.filled) return;
  c.dataset.filled = "1"; f(c.querySelector(".clbc"));
}
function secNav() {
  const body = document.getElementById("body"); if (!body) return;
  document.querySelectorAll(".sg-hide,.sg-cur,.sg-flat,.sg-two,.sg-open,.gf,.gl").forEach(e => e.classList.remove("sg-hide", "sg-cur", "sg-flat", "sg-two", "sg-open", "gf", "gl"));
  document.body.classList.remove("sg-sub");
  const all = [...body.querySelectorAll("[data-sec]")].filter(s => !s.parentElement.closest("[data-sec]"));
  if (!all.length) return;
  body.querySelectorAll(".sgl").forEach(g => { const k = [...g.children].filter(x => x.matches("[data-sec]")); if (k.length) { k[0].classList.add("gf"); k[k.length - 1].classList.add("gl"); } });
  all.forEach(s => s.querySelector(".clh").setAttribute("aria-current", "false"));
  if (isWide()) {
    const c = all.find(s => s.dataset.sec === selId) || all[0]; c.classList.add("sg-cur"); c.querySelector(".clh").setAttribute("aria-current", "true");
    let lca = all[0].parentElement; while (lca !== body && !all.every(s => lca.contains(s))) lca = lca.parentElement;
    if (lca.classList.contains("sgl") && lca !== body) lca = lca.parentElement;   // one group only: the panes go around its container
    lca.classList.add("sg-two");
    for (const s of all) for (let p = s.parentElement; p !== lca; p = p.parentElement) p.classList.add("sg-flat");
    secFill(c); return;
  }
  const c = subId && all.find(s => s.dataset.sec === subId); if (!c) return;
  c.classList.add("sg-cur"); document.body.classList.add("sg-sub");
  for (let p = c; p !== body; p = p.parentElement) { if (p !== c) p.classList.add("sg-open"); for (const x of p.parentElement.children) if (x !== p && !x.matches(".hbar,.keep")) x.classList.add("sg-hide"); }
  secFill(c);
}
let secObs = null;
function secWatch() {   // a tab redraws parts of itself after render(): re-apply whenever its DOM is rebuilt
  if (secObs) secObs.disconnect();
  const b = document.getElementById("body"); if (!b) return;
  const go = () => { secObs.disconnect(); secNav(); secObs.observe(b, { childList: true, subtree: true }); };
  secObs = new MutationObserver(go); secObs.observe(b, { childList: true, subtree: true });
  secNav();
}
const noSub = s => { const o = { ...s }; delete o.sub; return o; };
function subOpen(id) {
  selId = id;
  if (isWide()) {   // one page scrollbar (no inner one): bring the detail pane into view when it starts above the screen
    secNav();
    const p = document.querySelector(".sg-two .sg-cur .clb");
    if (p && p.getBoundingClientRect().top < 0) p.scrollIntoView({ block: "start", behavior: "smooth" });
    return;
  }
  try { const s = history.state || {}; if (subId) history.replaceState({ ...s, sub: id }, ""); else { subY = scrollY; history.pushState({ ...s, kg: navLvl() + 1, sub: id }, ""); } } catch {}
  subId = id; secNav(); window.scrollTo(0, 0);
}
function subClose(top) {   // back: the popstate it causes closes the sub-screen
  subTop = !!top;
  try { if (history.state && history.state.sub) return history.back(); } catch {}
  subId = null; secNav(); window.scrollTo(0, top ? 0 : subY);
}
// popstate: true when only the sub-screen level changed on this tab (the caller has nothing else to do)
function subPop(s) {
  const want = s.sub || null; if (want === subId) return false;
  const top = subTop; subId = want; subTop = false;
  if ((s.td ? s.tab : "home") !== tab) return false;
  secNav(); window.scrollTo(0, want ? 0 : top ? 0 : subY); return true;
}
wideMq.addEventListener && wideMq.addEventListener("change", () => secNav());
document.addEventListener("click", e => {
  const h = e.target.closest && e.target.closest(".clh"); if (!h) return;
  const s = h.closest(".cl"); if (s.classList.contains("sg-cur") && !isWide()) return subClose();
  subOpen(s.dataset.sec);
});
