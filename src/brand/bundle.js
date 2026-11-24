/* @ds-bundle: {"format":4,"namespace":"Flexxo","components":[{"name":"Wordmark"},{"name":"Icon"},{"name":"Button"},{"name":"StatusBadge"},{"name":"Card"},{"name":"ModuleTile"},{"name":"StatTile"},{"name":"Field"},{"name":"Alert"},{"name":"DataTable"},{"name":"CheckItem"},{"name":"ActionBar"},{"name":"PlanBoard"},{"name":"AppShell"}]} */
(function () {
  var React = window.React, h = React.createElement;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }
  function omit(o, keys) { var r = {}; for (var k in o) if (keys.indexOf(k) < 0) r[k] = o[k]; return r; }

  /* Lijn-iconen in Lucide-stijl (24x24, 1.75 stroke). In de app: lucide-react met dezelfde namen. */
  var ICONS = {
    home: ["M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
    calendar: ["r:3,4,18,18,2", "M16 2v4", "M8 2v4", "M3 10h18", "M8 14h.01", "M12 14h.01", "M16 14h.01", "M8 18h.01", "M12 18h.01"],
    wrench: ["M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"],
    truck: ["M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2", "M15 18H9", "M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14", "c:17,18,2", "c:7,18,2"],
    factory: ["M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z", "M17 18h1", "M12 18h1", "M7 18h1"],
    gantt: ["M3 3v16a2 2 0 0 0 2 2h16", "M8 7h8", "M11 12h8", "M8 17h5"],
    users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "c:9,7,4", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
    search: ["c:11,11,8", "m21 21-4.3-4.3"],
    bell: ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 0 0 3.4 0"],
    check: ["M20 6 9 17l-5-5"],
    "check-circle": ["c:12,12,10", "m9 12 2 2 4-4"],
    alert: ["m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3", "M12 9v4", "M12 17h.01"],
    info: ["c:12,12,10", "M12 16v-4", "M12 8h.01"],
    error: ["c:12,12,10", "m15 9-6 6", "m9 9 6 6"],
    plus: ["M5 12h14", "M12 5v14"],
    clock: ["c:12,12,10", "M12 6v6l4 2"],
    "chevron-right": ["m9 18 6-6-6-6"],
    file: ["M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", "M14 2v4a2 2 0 0 0 2 2h4", "M16 13H8", "M16 17H8"],
    menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
    send: ["M22 2 11 13", "M22 2 15 22l-4-9-9-4z"],
    filter: ["M22 3H2l8 9.46V19l4 2v-8.54z"]
  };
  function Icon(p) {
    var parts = ICONS[p.name] || ICONS.info;
    return h("svg", { className: cx("fx-icon", p.size === "lg" && "fx-icon-lg", p.className), viewBox: "0 0 24 24", "aria-hidden": p.label ? undefined : "true", role: p.label ? "img" : undefined, "aria-label": p.label },
      parts.map(function (d, i) {
        if (d.indexOf("c:") === 0) { var c = d.slice(2).split(","); return h("circle", { key: i, cx: c[0], cy: c[1], r: c[2] }); }
        if (d.indexOf("r:") === 0) { var r = d.slice(2).split(","); return h("rect", { key: i, x: r[0], y: r[1], width: r[2], height: r[3], rx: r[4] }); }
        return h("path", { key: i, d: d });
      }));
  }
  Icon.names = Object.keys(ICONS);

  function Wordmark(p) {
    return h("span", { className: "fx-wordmark", style: p.size ? { fontSize: p.size } : undefined, "aria-label": "FlexxoApp" },
      h("span", { className: "fx-mark", "aria-hidden": "true" }, h("svg", { viewBox: "0 0 24 24" }, h("path", { d: "m5 6 6 6-6 6" }), h("path", { d: "m13 6 6 6-6 6" }))),
      p.markOnly ? null : h("span", null, "Flexxo", h("b", null, "App")));
  }

  function Button(p) {
    var rest = omit(p, ["variant", "size", "icon", "iconRight", "block", "children", "className", "label"]);
    var iconOnly = p.icon && !p.children;
    return h("button", Object.assign({ type: "button", "aria-label": iconOnly ? p.label : undefined }, rest, {
      className: cx("fx-btn", "fx-btn-" + (p.variant || "secondary"), p.size && p.size !== "md" && "fx-btn-" + p.size, p.block && "fx-btn-block", iconOnly && "fx-btn-icononly", p.className)
    }), p.icon ? h(Icon, { name: p.icon }) : null, p.children, p.iconRight ? h(Icon, { name: p.iconRight }) : null);
  }

  var STATUS = {
    "te-plannen": ["warning", "Te plannen"], gepland: ["info", "Gepland"], actief: ["active", "Actief"],
    "in-productie": ["info", "In productie"], gereed: ["success", "Gereed"], afwijking: ["danger", "Afwijking"],
    concept: ["neutral", "Concept"], wacht: ["warning", "Wacht op materiaal"], aangevraagd: ["warning", "Aangevraagd"],
    akkoord: ["success", "Akkoord"], afgewezen: ["danger", "Afgewezen"], verzonden: ["success", "Verzonden"]
  };
  function StatusBadge(p) {
    var s = STATUS[p.status] || [p.tone || "neutral", p.status];
    return h("span", { className: "fx-badge fx-badge-" + (p.tone || s[0]) }, p.children || s[1]);
  }
  StatusBadge.statuses = Object.keys(STATUS);

  function Card(p) {
    var clickable = !!p.onClick;
    return h(clickable ? "button" : "section", { className: cx("fx-card", clickable && "fx-card-clickable", p.className), onClick: p.onClick, style: clickable ? { textAlign: "left", font: "inherit", color: "inherit", width: "100%" } : undefined },
      (p.title || p.action) ? h("div", { className: "fx-card-head" },
        h("div", null, p.title ? h("h3", { className: "fx-card-title" }, p.title) : null, p.subtitle ? h("p", { className: "fx-card-sub" }, p.subtitle) : null),
        p.action || null) : null,
      p.children);
  }

  function ModuleTile(p) {
    return h("button", { type: "button", className: "fx-tile", onClick: p.onClick },
      h("div", { className: "fx-tile-top" },
        h("span", { className: "fx-tile-icon" }, h(Icon, { name: p.icon, size: "lg" })),
        p.count ? h("span", { className: "fx-tile-count", "aria-label": p.count + " open" }, p.count) : null),
      h("div", null, h("div", { className: "fx-tile-name" }, p.name), p.meta ? h("div", { className: "fx-tile-meta" }, p.meta) : null));
  }

  function StatTile(p) {
    return h("div", { className: "fx-stat" },
      h("div", { className: "fx-stat-label" }, p.label),
      h("div", { className: "fx-stat-value" }, p.value, p.unit ? h("span", { className: "fx-stat-unit" }, p.unit) : null),
      p.progress != null ? h("div", { className: "fx-progress", role: "progressbar", "aria-valuenow": p.progress, "aria-valuemin": 0, "aria-valuemax": 100 }, h("span", { style: { width: p.progress + "%" } })) : null,
      p.foot ? h("div", { className: "fx-stat-foot" }, p.trend ? h("span", { className: p.trend === "up" ? "fx-stat-up" : "fx-stat-down" }, p.trend === "up" ? "▲" : "▼") : null, p.foot) : null);
  }

  function Field(p) {
    var id = p.id, hintId = id + "-hint", errId = id + "-err";
    var control = p.children;
    if (!control) {
      var common = { id: id, "aria-invalid": p.error ? "true" : undefined, "aria-describedby": p.error ? errId : (p.hint ? hintId : undefined), required: p.required, disabled: p.disabled, defaultValue: p.defaultValue, placeholder: p.placeholder };
      if (p.options) control = h("select", Object.assign({ className: "fx-select" }, common), p.options.map(function (o) { return h("option", { key: o }, o); }));
      else if (p.multiline) control = h("textarea", Object.assign({ className: "fx-textarea" }, common));
      else control = h("input", Object.assign({ className: "fx-input", type: p.type || "text", inputMode: p.inputMode }, common));
    }
    return h("div", { className: "fx-field" },
      h("label", { className: "fx-label", htmlFor: id }, p.label, p.required ? h("span", { className: "fx-req", "aria-hidden": "true" }, "*") : null),
      control,
      p.error ? h("div", { className: "fx-error", id: errId }, h(Icon, { name: "error" }), p.error) : (p.hint ? h("div", { className: "fx-hint", id: hintId }, p.hint) : null));
  }

  var ALERT_ICON = { info: "info", success: "check-circle", warning: "alert", danger: "error" };
  function Alert(p) {
    var tone = p.tone || "info";
    return h("div", { className: "fx-alert fx-alert-" + tone, role: tone === "danger" ? "alert" : "status" },
      h(Icon, { name: ALERT_ICON[tone] }), h("div", null, p.title ? h("strong", null, p.title) : null, p.children));
  }

  function DataTable(p) {
    return h("div", { className: "fx-table-wrap" },
      h("table", { className: cx("fx-table", p.density === "compact" && "fx-table-compact", p.mobileCards !== false && "fx-table-cards") },
        p.caption ? h("caption", { className: "fx-sr", style: { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" } }, p.caption) : null,
        h("thead", null, h("tr", null, p.columns.map(function (c) { return h("th", { key: c.key, scope: "col", className: c.numeric ? "fx-num" : undefined }, c.label); }))),
        h("tbody", null, p.rows.map(function (r, i) {
          return h("tr", { key: r.id || i, onClick: p.onRowClick ? function () { p.onRowClick(r); } : undefined },
            p.columns.map(function (c) {
              var v = c.render ? c.render(r) : r[c.key];
              return h("td", { key: c.key, "data-label": c.mobileLabel === false ? undefined : c.label, className: c.numeric ? "fx-num" : undefined }, v);
            }));
        }))));
  }

  function CheckItem(p) {
    var st = React.useState(p.defaultValue || null), v = p.value !== undefined ? p.value : st[0];
    function set(x) { if (p.value === undefined) st[1](x); if (p.onChange) p.onChange(x); }
    var opts = [["ok", "OK", "check"], ["nok", "Afwijking", "alert"]];
    if (p.allowNA !== false) opts.push(["na", "N.v.t.", null]);
    return h("div", { className: "fx-check" },
      h("div", { className: "fx-check-text", id: p.id + "-l" }, h("div", { className: "fx-check-label" }, p.label), p.hint ? h("div", { className: "fx-check-hint" }, p.hint) : null),
      h("div", { className: "fx-seg", role: "radiogroup", "aria-labelledby": p.id + "-l" },
        opts.map(function (o) { return h("button", { key: o[0], type: "button", role: "radio", "data-v": o[0], "aria-checked": v === o[0] ? "true" : "false", onClick: function () { set(o[0]); } }, o[2] ? h(Icon, { name: o[2] }) : null, o[1]); })),
      v === "nok" && p.onNok !== false ? h("div", { style: { flexBasis: "100%" } }, h(Field, { id: p.id + "-nok", label: "Wat wijkt af?", multiline: true, placeholder: "Beschrijf de afwijking; voeg zo nodig een foto toe." })) : null);
  }

  function ActionBar(p) {
    return h("div", { className: "fx-actionbar", role: "region", "aria-label": p.label || "Acties" },
      p.info ? h("div", { className: "fx-actionbar-info" }, p.info) : null, p.children);
  }

  var TONE = { gepland: "t-gepland", info: "t-info", warning: "t-warning", danger: "t-danger" };
  function PlanBoard(p) {
    var days = p.days, rows = p.rows, n = days.length;
    var cells = [];
    cells.push(h("div", { key: "corner", className: "fx-board-h", style: { gridColumn: 1, gridRow: 1, left: 0, zIndex: 3 } }, p.rowLabel || "Monteur"));
    days.forEach(function (d, i) { cells.push(h("div", { key: "h" + i, className: cx("fx-board-h", d.today && "is-today"), style: { gridColumn: i + 2, gridRow: 1 } }, d.label)); });
    rows.forEach(function (r, ri) {
      var over = r.planned != null && r.capacity != null && r.planned > r.capacity;
      cells.push(h("div", { key: "n" + ri, className: "fx-board-name", style: { gridColumn: 1, gridRow: ri + 2 } }, h("b", null, r.name),
        h("span", null, r.meta, r.capacity != null ? h("span", { className: cx("fx-board-cap", over && "is-over") }, (r.meta ? " · " : "") + r.planned + "/" + r.capacity + " u") : null)));
      for (var c = 0; c < n; c++) cells.push(h("div", { key: "c" + ri + "-" + c, className: "fx-board-cell", style: { gridColumn: c + 2, gridRow: ri + 2 } }));
    });
    (p.items || []).forEach(function (it, ii) {
      cells.push(h("div", { key: "i" + ii, tabIndex: 0, role: "button", className: cx("fx-board-item", TONE[it.tone || "gepland"]), title: it.label + (it.sub ? " · " + it.sub : ""),
        style: { gridColumn: (it.start + 2) + " / span " + (it.span || 1), gridRow: it.row + 2 }, onClick: p.onItemClick ? function () { p.onItemClick(it); } : undefined },
        h("b", null, it.label), it.sub ? h("span", null, it.sub) : null));
    });
    return h("div", { className: "fx-board-wrap" },
      h("div", { className: cx("fx-board", p.density === "compact" && "is-compact"), role: "grid", "aria-label": p.label || "Planbord",
        style: { gridTemplateColumns: "var(--planboard-label) repeat(" + n + ", minmax(120px, 1fr))" } }, cells));
  }

  function AppShell(p) {
    var nav = p.nav || [];
    return h("div", { className: "fx-root fx-shell" },
      h("aside", { className: "fx-sidebar", "aria-label": "Hoofdmenu" },
        h(Wordmark, null),
        nav.map(function (n, i) {
          if (n.group) return h("div", { key: i, className: "fx-nav-group" }, n.group);
          return h("a", { key: i, href: n.href || "#", className: "fx-nav-item", title: n.label, "aria-current": n.id === p.active ? "page" : undefined }, h(Icon, { name: n.icon }), h("span", { className: "fx-nav-long" }, n.label), h("span", { className: "fx-nav-short", "aria-hidden": "true" }, n.tabLabel || n.label));
        })),
      h("div", { className: "fx-shell-col" },
        h("header", { className: "fx-topbar" },
          h(Wordmark, { size: 19 }),
          h("div", { className: "fx-search" }, h(Icon, { name: "search" }), "Zoek project, klant of order"),
          h("div", { style: { marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" } },
            h(Button, { variant: "quiet", icon: "bell", label: "Meldingen" }),
            h("span", { className: "fx-avatar", title: p.user || "" }, (p.user || "?").split(" ").map(function (s) { return s[0]; }).join("").slice(0, 2)))),
        h("main", { className: "fx-main" },
          p.title ? h("div", { className: "fx-page-head" }, h("div", null, p.eyebrow ? h("div", { className: "fx-stat-label" }, p.eyebrow) : null, h("h1", { className: "fx-page-title" }, p.title)), p.actions || null) : null,
          p.children),
        p.actionBar || null,
        h("nav", { className: "fx-tabbar", "aria-label": "Snelmenu" },
          nav.filter(function (n) { return n.tab; }).slice(0, 5).map(function (n, i) {
            return h("a", { key: i, href: n.href || "#", className: "fx-tab", "aria-current": n.id === p.active ? "page" : undefined }, h(Icon, { name: n.icon }), n.tabLabel || n.label);
          }))));
  }

  window.Flexxo = Object.assign(window.Flexxo || {}, { Wordmark: Wordmark, Icon: Icon, Button: Button, StatusBadge: StatusBadge, Card: Card, ModuleTile: ModuleTile, StatTile: StatTile, Field: Field, Alert: Alert, DataTable: DataTable, CheckItem: CheckItem, ActionBar: ActionBar, PlanBoard: PlanBoard, AppShell: AppShell });
})();
