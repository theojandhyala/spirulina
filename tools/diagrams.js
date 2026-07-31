/**
 * Live diagrams for the production manual.
 *
 * Each `<figure class="diagram" data-diagram="NAME">` in the markdown gets a
 * canvas and an animation. Renderers are pure draw functions:
 *
 *   render(g, W, H, t, C)
 *     g  2D context, already scaled for devicePixelRatio
 *     W  css width, H css height
 *     t  seconds since the diagram started
 *     C  theme colours read from CSS custom properties
 *
 * Only diagrams that are on screen animate. Reduced-motion draws one frame.
 * This file is inlined verbatim into the built reader.
 */
(function () {
  var D = {};

  /* ---------- helpers ---------- */

  function lerp(a, b, k) { return a + (b - a) * k; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function axes(g, W, H, pad, C) {
    g.strokeStyle = C.line; g.lineWidth = 1;
    g.beginPath();
    g.moveTo(pad.l, pad.t); g.lineTo(pad.l, H - pad.b); g.lineTo(W - pad.r, H - pad.b);
    g.stroke();
  }

  // colour with an alpha applied; CSS vars in this project are hex
  function hexA(c, a) {
    c = (c || "").trim();
    var m = /^#?([0-9a-f]{6})$/i.exec(c);
    if (!m) return c;
    var v = parseInt(m[1], 16);
    return "rgba(" + ((v >> 16) & 255) + "," + ((v >> 8) & 255) + "," + (v & 255) + "," + a + ")";
  }

  function label(g, x, y, text, colour, size, align) {
    g.fillStyle = colour;
    g.font = (size || 11) + "px ui-monospace, SFMono-Regular, Menlo, monospace";
    g.textAlign = align || "left";
    g.textBaseline = "middle";
    g.fillText(text, x, y);
    g.textAlign = "left";
  }

  /* ---------- 1. raceway pond, plan view ---------- */

  D.raceway = (function () {
    var parts = null, geo = null;

    function layout(W, H) {
      var pad = Math.max(16, Math.min(W, H) * 0.07);
      var OUT = Math.min((H - 2 * pad) / 2, (W - 2 * pad) / 4.2);
      var IN = Math.max(3, OUT * 0.12);
      var R = (OUT + IN) / 2, CW = OUT - IN;
      var L = Math.max(W - 2 * pad - 2 * OUT, OUT);
      return { OUT: OUT, IN: IN, R: R, CW: CW, L: L, cx: W / 2, cy: H / 2,
               P: 2 * L + 2 * Math.PI * R };
    }

    // position and outward normal at arc length s along the channel centreline
    function at(G, s, off) {
      s = ((s % G.P) + G.P) % G.P;
      var x, y, nx, ny, a;
      if (s < G.L) { x = G.cx - G.L / 2 + s; y = G.cy - G.R; nx = 0; ny = -1; }
      else if (s < G.L + Math.PI * G.R) {
        a = -Math.PI / 2 + (s - G.L) / G.R; nx = Math.cos(a); ny = Math.sin(a);
        x = G.cx + G.L / 2 + G.R * nx; y = G.cy + G.R * ny;
      } else if (s < 2 * G.L + Math.PI * G.R) {
        var u = s - (G.L + Math.PI * G.R);
        x = G.cx + G.L / 2 - u; y = G.cy + G.R; nx = 0; ny = 1;
      } else {
        var v = s - (2 * G.L + Math.PI * G.R);
        a = Math.PI / 2 + v / G.R; nx = Math.cos(a); ny = Math.sin(a);
        x = G.cx - G.L / 2 + G.R * nx; y = G.cy + G.R * ny;
      }
      return { x: x + nx * off, y: y + ny * off };
    }

    function stadium(g, G, radius) {
      g.beginPath();
      g.moveTo(G.cx - G.L / 2, G.cy - radius);
      g.lineTo(G.cx + G.L / 2, G.cy - radius);
      g.arc(G.cx + G.L / 2, G.cy, radius, -Math.PI / 2, Math.PI / 2);
      g.lineTo(G.cx - G.L / 2, G.cy + radius);
      g.arc(G.cx - G.L / 2, G.cy, radius, Math.PI / 2, -Math.PI / 2);
      g.closePath();
    }

    function seed(G, W, H) {
      var n = Math.round(clamp((W * H) / 420, 140, 420));
      var a = [];
      for (var i = 0; i < n; i++) {
        var lat = Math.random() - 0.5;
        a.push({
          s: Math.random() * G.P,
          off: lat * G.CW * 0.86,
          drift: (Math.random() - 0.5) * 0.05,
          // parabolic profile: fastest mid-channel, slowest against the walls
          v: (26 + Math.random() * 7) * (1 - Math.pow(lat * 2, 2) * 0.55),
          a: 0.25 + Math.random() * 0.6,
          r: 0.7 + Math.random() * 1.2,
          hot: Math.random() < 0.16
        });
      }
      return a;
    }

    return function (g, W, H, t, C, dt) {
      var G = layout(W, H);
      if (!parts || !geo || geo.W !== W || geo.H !== H) {
        parts = seed(G, W, H); geo = { W: W, H: H };
      }

      // water
      g.save();
      stadium(g, G, G.OUT); stadium(g, G, G.IN);
      g.fillStyle = C.accent; g.globalAlpha = 0.13; g.fill("evenodd");
      g.restore();

      g.lineWidth = 1.1; g.strokeStyle = C.ink; g.globalAlpha = 0.45;
      stadium(g, G, G.OUT); g.stroke();
      g.fillStyle = C.ink; g.globalAlpha = 0.1; stadium(g, G, G.IN); g.fill();
      g.globalAlpha = 0.4; g.stroke();
      g.globalAlpha = 1;

      // culture
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var a0 = at(G, p.s, p.off);
        p.s += p.v * dt;
        p.off += p.drift * dt * 20;
        var lim = G.CW * 0.43;
        if (p.off > lim || p.off < -lim) { p.drift *= -1; p.off = clamp(p.off, -lim, lim); }
        var a1 = at(G, p.s, p.off);
        g.strokeStyle = p.hot ? C.accentLt : C.accent;
        g.globalAlpha = p.hot ? Math.min(1, p.a + 0.3) : p.a;
        g.lineWidth = p.r; g.lineCap = "round";
        g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(a1.x, a1.y); g.stroke();
      }
      g.globalAlpha = 1;

      // paddle wheel across the top channel
      var y0 = G.cy - G.OUT, y1 = G.cy - G.IN;
      g.strokeStyle = C.ink; g.globalAlpha = 0.85; g.lineWidth = 2.5; g.lineCap = "butt";
      g.beginPath(); g.moveTo(G.cx, y0 - 4); g.lineTo(G.cx, y1 + 4); g.stroke();
      g.lineWidth = 1.4;
      for (var b = 0; b < 4; b++) {
        var ph = ((t / 1.4) + b / 4) % 1;
        var fade = 1 - Math.abs(ph - 0.5) * 1.7;
        if (fade <= 0) continue;
        g.globalAlpha = 0.5 * fade;
        var dx = (ph - 0.5) * 14;
        g.beginPath(); g.moveTo(G.cx + dx, y0 + 2); g.lineTo(G.cx + dx, y1 - 2); g.stroke();
      }
      g.globalAlpha = 1;

      // flow chevrons
      [[G.L * 0.75], [G.L + Math.PI * G.R + G.L * 0.25]].forEach(function (q) {
        var a = at(G, q[0], 0), b2 = at(G, q[0] + G.P * 0.01, 0);
        var ang = Math.atan2(b2.y - a.y, b2.x - a.x);
        var sz = clamp(G.CW * 0.3, 6, 11);
        g.save(); g.translate(a.x, a.y); g.rotate(ang);
        g.strokeStyle = C.accentLt; g.lineWidth = 1.5;
        g.lineCap = "round"; g.lineJoin = "round";
        g.beginPath();
        g.moveTo(-sz, -sz * 0.72); g.lineTo(sz * 0.45, 0); g.lineTo(-sz, sz * 0.72);
        g.stroke(); g.restore();
      });

      label(g, G.cx, G.cy - G.OUT - 14, "PADDLE WHEEL", C.muted, 10, "center");
      label(g, G.cx, G.cy, "BAFFLE", C.muted, 10, "center");
    };
  })();

  /* ---------- 2. filaments (trichomes) ---------- */

  D.filament = (function () {
    var fils = null, geo = null;

    function make(W, H, i, n) {
      return {
        x: W * (0.1 + 0.8 * Math.random()),
        y: H * ((i + 0.5) / n) + (Math.random() - 0.5) * H * 0.1,
        len: W * (0.14 + Math.random() * 0.16),
        amp: 5 + Math.random() * 4,
        turns: 3 + Math.random() * 3,
        ang: (Math.random() - 0.5) * 0.5,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 3,
        phase: Math.random() * 10,
        spin: 0.7 + Math.random() * 0.7,
        // fragmentation cycle: each filament breaks, drifts apart, then resets
        frag: Math.random() * 14 + 6,
        split: 0
      };
    }

    function draw(g, f, t, C, W) {
      var steps = 90;
      var k = f.turns * Math.PI * 2 / f.len;
      g.save();
      g.translate(f.x, f.y); g.rotate(f.ang);
      // body
      g.strokeStyle = C.accent; g.lineWidth = 3.1; g.lineCap = "round";
      g.globalAlpha = 0.95;
      var gap = f.split > 0 ? f.split : 0;
      for (var half = 0; half < 2; half++) {
        g.beginPath();
        var from = half === 0 ? 0 : steps / 2, to = half === 0 ? steps / 2 : steps;
        for (var i = from; i <= to; i++) {
          var s = (i / steps) * f.len;
          var off = (half === 0 ? -gap : gap) * 0.5;
          var px = s - f.len / 2 + off;
          var py = f.amp * Math.sin(s * k + f.phase + t * f.spin);
          if (i === from) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.stroke();
      }
      // cell divisions
      g.strokeStyle = C.bg; g.lineWidth = 1; g.globalAlpha = 0.55;
      for (var c = 1; c < f.turns * 4; c++) {
        var s2 = (c / (f.turns * 4)) * f.len;
        var px2 = s2 - f.len / 2, py2 = f.amp * Math.sin(s2 * k + f.phase + t * f.spin);
        var d = Math.cos(s2 * k + f.phase + t * f.spin);
        g.beginPath();
        g.moveTo(px2 - d * 1.4, py2 - 2.2); g.lineTo(px2 + d * 1.4, py2 + 2.2);
        g.stroke();
      }
      g.restore();
      g.globalAlpha = 1;
    }

    return function (g, W, H, t, C, dt) {
      var n = W < 420 ? 3 : 5;
      if (!fils || !geo || geo.W !== W || geo.H !== H) {
        fils = []; for (var i = 0; i < n; i++) fils.push(make(W, H, i, n));
        geo = { W: W, H: H };
      }
      for (var j = 0; j < fils.length; j++) {
        var f = fils[j];
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.x < -f.len) f.x = W + f.len; if (f.x > W + f.len) f.x = -f.len;
        if (f.y < 10) f.vy = Math.abs(f.vy); if (f.y > H - 10) f.vy = -Math.abs(f.vy);
        f.frag -= dt;
        if (f.frag <= 0) { f.split += 26 * dt; if (f.split > 34) { f.split = 0; f.frag = 12 + Math.random() * 10; } }
        draw(g, f, t, C, W);
      }
      label(g, 10, H - 14, "TRICHOME · 100–500 µm · OPEN HELIX", C.muted, 10);
    };
  })();

  /* ---------- 3. one day of pH, light and CO2 ---------- */

  D.daycycle = function (g, W, H, t, C) {
    var pad = { l: 40, r: 12, t: 16, b: 26 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var head = (t / 16) % 1;             // 16 s per simulated day
    var X = function (h) { return pad.l + (h / 24) * iw; };
    var Y = function (v) { return pad.t + (1 - v) * ih; };

    // light: a bump between 06:00 and 18:00
    var lightAt = function (h) {
      if (h < 6 || h > 18) return 0;
      return Math.sin(((h - 6) / 12) * Math.PI);
    };
    // pH climbs while carbon is consumed; CO2 dosing pulls it back
    var phAt = function (h) {
      var v = 0.28, dose = 0;
      for (var q = 0; q <= h; q += 0.1) {
        v += lightAt(q) * 0.016;
        if (v > 0.78) { v -= 0.19; dose = q; }
        v -= 0.0009;
      }
      return { v: clamp(v, 0, 1), dose: dose };
    };

    axes(g, W, H, pad, C);
    // daylight band
    g.fillStyle = C.accent; g.globalAlpha = 0.06;
    g.fillRect(X(6), pad.t, X(18) - X(6), ih); g.globalAlpha = 1;

    // light curve
    g.strokeStyle = C.muted; g.lineWidth = 1.4; g.setLineDash([3, 3]);
    g.beginPath();
    for (var h = 0; h <= 24 * head; h += 0.2) {
      var y = Y(lightAt(h) * 0.9);
      if (h === 0) g.moveTo(X(h), y); else g.lineTo(X(h), y);
    }
    g.stroke(); g.setLineDash([]);

    // pH curve with dosing pulses
    g.strokeStyle = C.accent; g.lineWidth = 2.2;
    g.beginPath();
    var doses = [], prev = null;
    for (var h2 = 0; h2 <= 24 * head; h2 += 0.15) {
      var p = phAt(h2);
      if (prev !== null && p.v > prev + 0.05) { g.stroke(); g.beginPath(); doses.push(h2); }
      var yy = Y(p.v * 0.85 + 0.08);
      if (prev === null) g.moveTo(X(h2), yy); else g.lineTo(X(h2), yy);
      prev = p.v;
    }
    g.stroke();

    // dosing markers
    doses.forEach(function (d) {
      g.strokeStyle = C.accentLt; g.lineWidth = 2;
      g.beginPath(); g.moveTo(X(d), H - pad.b); g.lineTo(X(d), H - pad.b - 9); g.stroke();
    });

    // playhead
    g.strokeStyle = C.ink; g.globalAlpha = 0.35; g.lineWidth = 1;
    g.beginPath(); g.moveTo(X(24 * head), pad.t); g.lineTo(X(24 * head), H - pad.b); g.stroke();
    g.globalAlpha = 1;

    label(g, pad.l - 6, Y(0.85), "pH 10.5", C.muted, 10, "right");
    label(g, pad.l - 6, Y(0.15), "pH 9.5", C.muted, 10, "right");
    ["00", "06", "12", "18", "24"].forEach(function (hh, i) {
      label(g, X(i * 6), H - pad.b + 12, hh, C.muted, 10, "center");
    });
    label(g, X(12), pad.t + 8, "DAYLIGHT", C.muted, 10, "center");
    label(g, W - pad.r, H - pad.b + 12, "CO₂ DOSING ▏", C.accentLt, 10, "right");
    label(g, X(1), Y(0.93), "pH", C.accent, 10);
  };

  /* ---------- 4. light against depth, with mixing ---------- */

  D.lightdepth = function (g, W, H, t, C, dt) {
    var pad = { l: 44, r: 96, t: 22, b: 24 };
    var pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;

    // water column: a real gradient, since stepped rects band visibly
    var grad = g.createLinearGradient(0, pad.t, 0, pad.t + ph);
    for (var i = 0; i <= 10; i++) {
      var f = i / 10;
      grad.addColorStop(f, hexA(C.accent, 0.30 * Math.exp(-3.2 * f) + 0.05));
    }
    g.fillStyle = grad;
    g.fillRect(pad.l, pad.t, pw, ph);
    g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(pad.l, pad.t, pw, ph);

    // sun rays
    for (var r = 0; r < 7; r++) {
      var x = pad.l + (r + 0.5) * (pw / 7);
      var a = 0.5 + 0.5 * Math.sin(t * 1.6 + r);
      g.strokeStyle = C.accentLt; g.globalAlpha = 0.25 + a * 0.4; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(x, 4); g.lineTo(x, pad.t - 3); g.stroke();
    }
    g.globalAlpha = 1;

    // attenuation curve on the right
    g.strokeStyle = C.ink; g.lineWidth = 1.6; g.globalAlpha = .8;
    g.beginPath();
    for (var d = 0; d <= 1; d += 0.02) {
      var lx = W - pad.r + 6 + Math.exp(-3.2 * d) * (pad.r - 18);
      var ly = pad.t + d * ph;
      if (d === 0) g.moveTo(lx, ly); else g.lineTo(lx, ly);
    }
    g.stroke(); g.globalAlpha = 1;
    label(g, W - pad.r + 6, pad.t - 9, "LIGHT", C.muted, 10);

    // circulating cells; brightness follows local light
    if (!D.lightdepth.cells || D.lightdepth.W !== W) {
      D.lightdepth.cells = [];
      for (var c = 0; c < 46; c++) D.lightdepth.cells.push({ a: Math.random() * Math.PI * 2, r: 0.25 + Math.random() * 0.72, sp: 0.5 + Math.random() * 0.5 });
      D.lightdepth.W = W;
    }
    D.lightdepth.cells.forEach(function (p) {
      p.a += dt * 0.55 * p.sp;
      var cx = pad.l + pw / 2 + Math.cos(p.a) * (pw * 0.36) * p.r;
      var cy = pad.t + ph / 2 + Math.sin(p.a) * (ph * 0.38) * p.r;
      var depth = (cy - pad.t) / ph;
      var lit = Math.exp(-3.2 * depth);
      g.fillStyle = C.accentLt;
      g.globalAlpha = 0.25 + lit * 0.75;
      g.beginPath(); g.arc(cx, cy, 2.4, 0, Math.PI * 2); g.fill();
    });
    g.globalAlpha = 1;

    label(g, pad.l - 6, pad.t + 2, "0", C.muted, 10, "right");
    label(g, pad.l - 6, pad.t + ph / 2, "100", C.muted, 10, "right");
    label(g, pad.l - 6, pad.t + ph, "200", C.muted, 10, "right");
    label(g, pad.l - 6, pad.t + ph + 14, "mm", C.muted, 10, "right");
  };

  /* ---------- 5. screening ---------- */

  D.screening = function (g, W, H, t, C, dt) {
    var mesh = W * 0.58, pad = 14;
    var S = D.screening;
    if (!S.items || S.W !== W) {
      S.items = []; S.W = W; S.caught = [];
      for (var i = 0; i < 26; i++) S.items.push(spawn(W, H, i));
    }
    function spawn(W, H, i) {
      var big = Math.random() < 0.55;
      return {
        x: -Math.random() * W * 0.8, y: pad + Math.random() * (H - pad * 2),
        v: 34 + Math.random() * 26, big: big,
        len: big ? 22 + Math.random() * 16 : 0, r: big ? 0 : 1.6 + Math.random() * 1.4,
        ph: Math.random() * 6, held: false, hy: 0
      };
    }

    // mesh
    g.strokeStyle = C.ink; g.globalAlpha = 0.55; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(mesh, pad * 0.4); g.lineTo(mesh, H - pad * 0.4); g.stroke();
    g.lineWidth = 1; g.globalAlpha = 0.32;
    for (var m = pad * 0.4; m < H - pad * 0.4; m += 7) {
      g.beginPath(); g.moveTo(mesh - 4, m); g.lineTo(mesh + 4, m); g.stroke();
    }
    g.globalAlpha = 1;

    S.items.forEach(function (p, idx) {
      if (!p.held) {
        p.x += p.v * dt;
        if (p.big && p.x + p.len / 2 >= mesh - 2) { p.held = true; p.hy = p.y; }
      } else {
        // retained biomass slides down the screen and builds up
        p.hy += 6 * dt;
        if (p.hy > H - pad) { S.items[idx] = spawn(W, H, idx); return; }
      }
      if (p.x > W + 40) S.items[idx] = spawn(W, H, idx);

      if (p.big) {
        var y = p.held ? p.hy : p.y;
        var x = p.held ? mesh - p.len / 2 - 2 : p.x;
        g.save(); g.translate(x, y);
        g.strokeStyle = C.accent; g.lineWidth = 2.6; g.lineCap = "round";
        g.globalAlpha = 0.95;
        g.beginPath();
        for (var s = -p.len / 2; s <= p.len / 2; s += 1.5) {
          var yy = 3.4 * Math.sin(s * 0.55 + p.ph + t * 1.4);
          if (s === -p.len / 2) g.moveTo(s, yy); else g.lineTo(s, yy);
        }
        g.stroke(); g.restore();
      } else {
        g.fillStyle = C.muted; g.globalAlpha = 0.65;
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
      }
    });
    g.globalAlpha = 1;

    label(g, 10, 14, "CULTURE IN →", C.muted, 10);
    label(g, mesh - 8, H - 10, "BIOMASS RETAINED", C.accent, 10, "right");
    label(g, mesh + 10, 14, "FILTRATE THROUGH →", C.muted, 10);
    label(g, mesh, H - 10, "30–50 µm", C.muted, 10, "center");
  };

  /* ---------- 6. the drying temperature trap ---------- */

  D.dryingtrap = function (g, W, H, t, C) {
    var pad = { l: 42, r: 14, t: 18, b: 26 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var head = (t / 14) % 1;
    var X = function (h) { return pad.l + (h / 8) * iw; };
    var Y = function (c) { return pad.t + (1 - (c - 20) / 80) * ih; };   // 20–100 °C

    // free water falls away, then runs out
    var moisture = function (h) { return clamp(1 - Math.pow(h / 6.4, 1.6), 0, 1); };
    var product = function (h) {
      var m = moisture(h);
      return m > 0.02 ? 48 + (1 - m) * 6 : 54 + (1 - Math.exp(-(h - 6.4) * 2.6)) * 34;
    };

    axes(g, W, H, pad, C);

    // the 60 C limit
    g.strokeStyle = C.warn; g.lineWidth = 1.4; g.setLineDash([5, 4]);
    g.beginPath(); g.moveTo(pad.l, Y(60)); g.lineTo(W - pad.r, Y(60)); g.stroke();
    g.setLineDash([]);
    label(g, W - pad.r, Y(60) - 9, "60 °C LIMIT", C.warn, 10, "right");

    // air temperature
    g.strokeStyle = C.muted; g.lineWidth = 1.4; g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(pad.l, Y(90)); g.lineTo(X(8 * head), Y(90)); g.stroke();
    g.setLineDash([]);
    label(g, pad.l + 6, Y(90) - 9, "DRYING AIR", C.muted, 10);

    // moisture
    g.strokeStyle = C.accentLt; g.lineWidth = 1.6; g.globalAlpha = .75;
    g.beginPath();
    for (var h = 0; h <= 8 * head; h += 0.05) {
      var y = pad.t + (1 - moisture(h)) * ih;
      if (h === 0) g.moveTo(X(h), y); else g.lineTo(X(h), y);
    }
    g.stroke(); g.globalAlpha = 1;

    // product temperature
    var over = false;
    g.strokeStyle = C.accent; g.lineWidth = 2.4;
    g.beginPath();
    for (var h2 = 0; h2 <= 8 * head; h2 += 0.03) {
      var c = product(h2);
      if (c > 60) over = true;
      if (h2 === 0) g.moveTo(X(h2), Y(c)); else g.lineTo(X(h2), Y(c));
    }
    g.stroke();

    // head marker, flashing once the product is past the limit
    var hc = product(8 * head);
    g.fillStyle = hc > 60 ? C.warn : C.accent;
    g.globalAlpha = hc > 60 ? 0.6 + 0.4 * Math.sin(t * 9) : 1;
    g.beginPath(); g.arc(X(8 * head), Y(hc), 4, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;

    label(g, pad.l + 6, Y(50) + 2, "PRODUCT", C.accent, 10);
    label(g, pad.l - 6, Y(100), "100°", C.muted, 10, "right");
    label(g, pad.l - 6, Y(60), "60°", C.muted, 10, "right");
    label(g, pad.l - 6, Y(20), "20°", C.muted, 10, "right");
    label(g, X(0), H - pad.b + 12, "0 h", C.muted, 10, "center");
    label(g, X(8), H - pad.b + 12, "8 h", C.muted, 10, "center");
    if (over) label(g, X(7.4), Y(88), "⚠ PIGMENT LOST", C.warn, 10, "right");
  };

  /* ---------- engine ---------- */

  var live = [];
  var running = false;   // guard: refreshDiagrams() re-runs init on every
                         // navigation, and each start would add another loop

  function colours() {
    var cs = getComputedStyle(document.documentElement);
    var v = function (n, d) { return (cs.getPropertyValue(n) || "").trim() || d; };
    return {
      accent: v("--phyco", "#1160C4"),
      accentLt: v("--phyco-lt", "#57A0F0"),
      ink: v("--ink", "#06201E"),
      muted: v("--muted", "#5D6F69"),
      line: v("--line", "rgba(0,0,0,.15)"),
      bg: v("--ground", "#ECEFEA"),
      warn: "#C2410C"
    };
  }

  var C = colours();
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function size(d) {
    var r = d.fig.getBoundingClientRect();
    if (!r.width) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    d.W = r.width; d.H = d.cv.clientHeight || r.width * 0.5;
    d.cv.width = Math.round(d.W * dpr);
    d.cv.height = Math.round(d.H * dpr);
    d.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function frame(now) {
    var any = false;
    for (var i = 0; i < live.length; i++) {
      var d = live[i];
      if (!d.on) continue;
      if (!d.W && !size(d)) continue;
      any = true;
      var dt = d.last ? Math.min((now - d.last) / 1000, 0.05) : 0.016;
      d.last = now; d.t += dt;
      d.g.clearRect(0, 0, d.W, d.H);
      try { D[d.name](d.g, d.W, d.H, d.t, C, dt); } catch (e) { d.on = false; }
    }
    if (!reduce.matches) requestAnimationFrame(frame);
    else running = false;
  }

  function start() {
    if (running || reduce.matches) return;
    running = true;
    requestAnimationFrame(frame);
  }

  function init() {
    var figs = document.querySelectorAll("figure.diagram[data-diagram]");
    for (var i = 0; i < figs.length; i++) {
      var fig = figs[i];
      if (fig.dataset.ready) continue;
      var name = fig.dataset.diagram;
      if (!D[name]) continue;
      var cv = document.createElement("canvas");
      cv.className = "diagram-canvas";
      cv.setAttribute("role", "img");
      var cap = fig.querySelector("figcaption");
      cv.setAttribute("aria-label", cap ? cap.textContent : name);
      fig.insertBefore(cv, fig.firstChild);
      fig.dataset.ready = "1";
      var d = { fig: fig, cv: cv, g: cv.getContext("2d"), name: name, t: 0, last: 0, on: false, W: 0, H: 0 };
      live.push(d);
      if ("IntersectionObserver" in window) {
        (function (d) {
          new IntersectionObserver(function (es) {
            d.on = es[0].isIntersecting;
            if (d.on) { d.last = 0; if (!d.W) size(d); if (reduce.matches) once(d); }
          }, { rootMargin: "80px" }).observe(d.fig);
        })(d);
      } else { d.on = true; }
    }
    start();
  }

  function once(d) {
    if (!d.W && !size(d)) return;
    d.g.clearRect(0, 0, d.W, d.H);
    try { D[d.name](d.g, d.W, d.H, 2.5, C, 0.016); } catch (e) {}
  }

  // Sections are hidden until selected, so canvases must be re-measured when
  // one becomes visible; the reader calls this after every navigation.
  window.refreshDiagrams = function () {
    init();
    for (var i = 0; i < live.length; i++) { live[i].W = 0; if (reduce.matches && live[i].on) once(live[i]); }
  };

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { for (var i = 0; i < live.length; i++) live[i].W = 0; }, 150);
  });

  function themeChanged() {
    C = colours();
    if (reduce.matches) for (var i = 0; i < live.length; i++) if (live[i].on) once(live[i]);
  }
  new MutationObserver(themeChanged).observe(document.documentElement,
    { attributes: true, attributeFilter: ["data-theme"] });
  if (window.matchMedia) {
    var dm = window.matchMedia("(prefers-color-scheme: dark)");
    if (dm.addEventListener) dm.addEventListener("change", themeChanged);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
