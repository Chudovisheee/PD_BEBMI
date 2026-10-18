document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var REF   = 1920;
  var CYCLE = 15;

  var CROUCH_AT  = 2.2;
  var RUN_OUT_AT = 2.55;
  var RUN_IN_AT  = 8.4;
  var RUN_IN_T   = 3.2;

  var V_MAX    = 760;
  var ACCEL_T  = 0.7;
  var OUT_DIST = 2150;
  var IN_DIST  = 850;
  var STRIDE   = 340;

  var DEPTH_RUN   = 650;
  var DEPTH_DY    = -100;
  var DEPTH_SCALE = 0.88;

  var LEG_SWING = { front: 30, back: 24 };
  var LEG_PHASE = { zd: 0, zb: -0.55, pd: Math.PI, pb: Math.PI - 0.55 };
  var GALLOP_PITCH = 5;
  var GALLOP_BOB   = 24;

  var STAG_PIVOT = {
    zb: { x: 0.40, y: 0.10 },
    zd: { x: 0.22, y: 0.08 },
    pb: { x: 0.31, y: 0.08 },
    pd: { x: 0.78, y: 0.08 }
  };
  var BAMBI_PIVOT = {
    zb: { x: 0.40, y: 0.10 },
    zd: { x: 0.48, y: 0.08 },
    pb: { x: 0.24, y: 0.08 },
    pd: { x: 0.34, y: 0.08 }
  };

  var STARTLE_AT_X = 1250;
  var STARTLE_T    = 0.9;

  var BREATH_STAG  = { amp: 0.005, period: 3.6 };
  var BREATH_BAMBI = { amp: 0.008, period: 2.6 };

  var SUN_PULSE = { amp: 0.03, period: 8 };
  var FOG_DRIFT = { amp: 0.015, period: 22 };

  function $(id) { return document.getElementById(id); }

  var scene = $('scene');
  if (!scene) return;

  var sun = $('sun'), fog = $('fog');

  var stag = {
    body: $('stag'), shadow: $('stag_shadow'),
    legs: { zb: $('stag_leg_zb'), zd: $('stag_leg_zd'), pb: $('stag_leg_pb'), pd: $('stag_leg_pd') }
  };
  var bambi = {
    body: $('bambi'), shadow: $('bambi_shadow'),
    legs: { zb: $('bambi_leg_zb'), zd: $('bambi_leg_zd'), pb: $('bambi_leg_pb'), pd: $('bambi_leg_pd') }
  };

  if (!stag.body || !bambi.body) return;

  function partsOf(a) {
    var list = [a.body];
    for (var k in a.legs) { if (a.legs[k]) list.push(a.legs[k]); }
    return list;
  }

  var allMoving = partsOf(stag).concat(partsOf(bambi), [stag.shadow, bambi.shadow, sun, fog]);
  allMoving.filter(Boolean).forEach(function (e) {
    e.style.transformOrigin = '0 0';
    e.style.willChange = 'transform';
  });

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, k)  { return a + (b - a) * k; }
  function smooth(x)      { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function px(v)          { return v.toFixed(2) + 'px'; }
  function deg(v)         { return v.toFixed(3) + 'deg'; }

  var u = 1;

  function local(e, P) { return { x: P.x * u - e.offsetLeft, y: P.y * u - e.offsetTop }; }

  function rotAbout(a, p) {
    return 'translate(' + px(p.x) + ',' + px(p.y) + ') rotate(' + deg(a) + ') translate(' + px(-p.x) + ',' + px(-p.y) + ')';
  }
  function scaleAbout(sx, sy, p) {
    return 'translate(' + px(p.x) + ',' + px(p.y) + ') scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ') translate(' + px(-p.x) + ',' + px(-p.y) + ')';
  }

  function groundPoint(a) {
    var b = a.body, bottom = 0;
    partsOf(a).forEach(function (e) { bottom = Math.max(bottom, e.offsetTop + e.offsetHeight); });
    return { x: (b.offsetLeft + b.offsetWidth / 2) / u, y: bottom / u };
  }
  function centerOf(e) {
    return { x: (e.offsetLeft + e.offsetWidth / 2) / u, y: (e.offsetTop + e.offsetHeight / 2) / u };
  }

  var OUT_T = ACCEL_T + (OUT_DIST - 0.5 * V_MAX * ACCEL_T) / V_MAX;

  function stagPath(tc) {
    if (tc < RUN_OUT_AT) return { dx: 0, k: 0, gone: false };

    if (tc < RUN_OUT_AT + OUT_T) {
      var t = tc - RUN_OUT_AT;
      var d = t < ACCEL_T
        ? 0.5 * V_MAX * t * t / ACCEL_T
        : 0.5 * V_MAX * ACCEL_T + V_MAX * (t - ACCEL_T);
      return { dx: -d, k: smooth(d / DEPTH_RUN), gone: false };
    }

    if (tc < RUN_IN_AT) return { dx: -OUT_DIST, k: 1, gone: true };

    if (tc < RUN_IN_AT + RUN_IN_T) {
      var p = (tc - RUN_IN_AT) / RUN_IN_T;
      return { dx: IN_DIST * (1 - p) * (1 - p), k: 0, gone: false };
    }

    return { dx: 0, k: 0, gone: false };
  }

  var sState = { phase: 0, m: 0, home: null, center: null, shadowC: null };

  function updateStag(tc, clock, dt) {
    var P  = stagPath(tc);
    var P2 = stagPath(Math.min(tc + 0.02, CYCLE));
    var v  = (P2.gone || P.gone) ? 0 : Math.min(Math.abs(P2.dx - P.dx) / 0.02, V_MAX * 1.2);

    sState.m = lerp(sState.m, clamp(v / 420, 0, 1), 1 - Math.exp(-dt * 8));
    sState.phase += dt * 2 * Math.PI * (v / STRIDE);
    var m = sState.m, ph = sState.phase;

    var crouch = 0;
    if (tc >= CROUCH_AT && tc < RUN_OUT_AT) crouch = smooth((tc - CROUCH_AT) / (RUN_OUT_AT - CROUCH_AT));
    else if (tc >= RUN_OUT_AT) crouch = 1 - smooth((tc - RUN_OUT_AT) / 0.3);

    var s     = 1 - (1 - DEPTH_SCALE) * P.k;
    var bobN  = m * (0.5 + 0.5 * Math.sin(ph + Math.PI / 2));
    var dx    = P.dx * u;
    var dy    = (DEPTH_DY * P.k - GALLOP_BOB * bobN + 10 * crouch) * u;
    var pitch = GALLOP_PITCH * m * Math.sin(ph) - 3 * crouch;

    var G = sState.home, C = sState.center;

    var legAngle = {
      zd: LEG_SWING.back  * m * Math.sin(ph + LEG_PHASE.zd) + 7 * crouch,
      zb: LEG_SWING.back  * m * Math.sin(ph + LEG_PHASE.zb) + 7 * crouch,
      pd: LEG_SWING.front * m * Math.sin(ph + LEG_PHASE.pd) - 5 * crouch,
      pb: LEG_SWING.front * m * Math.sin(ph + LEG_PHASE.pb) - 5 * crouch
    };

    var breath = 1 + BREATH_STAG.amp * (1 - m) * Math.sin(clock * 2 * Math.PI / BREATH_STAG.period);
    var vis = P.gone ? 'hidden' : 'visible';

    partsOf(stag).forEach(function (e) {
      var tf = 'translate(' + px(dx) + ',' + px(dy) + ') ' +
               scaleAbout(s, s, local(e, G)) + ' ' +
               rotAbout(pitch, local(e, C));
      if (e === stag.body) {
        tf += ' ' + scaleAbout(1, breath, { x: e.offsetWidth / 2, y: e.offsetHeight });
      }
      for (var k in stag.legs) {
        if (stag.legs[k] === e) {
          tf += ' ' + rotAbout(legAngle[k], { x: e.offsetWidth * STAG_PIVOT[k].x, y: e.offsetHeight * STAG_PIVOT[k].y });
        }
      }
      e.style.transform = tf;
      e.style.visibility = vis;
    });

    if (stag.shadow) {
      var sh = stag.shadow;
      var shk = s * (1 - 0.18 * bobN);
      sh.style.transform =
        'translate(' + px(dx) + ',' + px(DEPTH_DY * P.k * u) + ') ' +
        scaleAbout(shk, s, local(sh, sState.shadowC));
      sh.style.opacity = (1 - 0.35 * bobN).toFixed(3);
      sh.style.visibility = vis;
    }

    return { centerX: G.x + P.dx, dx: P.dx, gone: P.gone };
  }

  var bState = { home: null, startleAt: -1, startled: false };

  function resetBambiCycle() {
    bState.startled = false;
  }

  function updateBambi(tc, clock, st) {
    if (!bState.startled && !st.gone && st.dx < 0 && st.centerX < STARTLE_AT_X) {
      bState.startled = true;
      bState.startleAt = tc;
    }

    var c = 0;
    if (bState.startleAt >= 0 && tc >= bState.startleAt) {
      var tau = (tc - bState.startleAt) / STARTLE_T;
      if (tau < 1) c = tau < 0.15 ? smooth(tau / 0.15) : 1 - smooth((tau - 0.15) / 0.85);
    }

    var G = bState.home;
    var dy = 8 * c * u;
    var lean = -3 * c;
    var breath = 1 + BREATH_BAMBI.amp * Math.sin(clock * 2 * Math.PI / BREATH_BAMBI.period);

    var legAngle = { pb: -4 * c, pd: -4 * c, zb: 3 * c, zd: 3 * c };

    partsOf(bambi).forEach(function (e) {
      var g = local(e, G);
      var tf = 'translate(0,' + px(dy) + ') ' +
               scaleAbout(1, 1 - 0.03 * c, g) + ' ' +
               rotAbout(lean, g);
      if (e === bambi.body) {
        tf += ' ' + scaleAbout(1, breath, { x: e.offsetWidth / 2, y: e.offsetHeight });
      }
      for (var k in bambi.legs) {
        if (bambi.legs[k] === e) {
          tf += ' ' + rotAbout(legAngle[k], { x: e.offsetWidth * BAMBI_PIVOT[k].x, y: e.offsetHeight * BAMBI_PIVOT[k].y });
        }
      }
      e.style.transform = tf;
    });

    if (bambi.shadow) {
      var sh = bambi.shadow;
      sh.style.transform = scaleAbout(1 - 0.05 * c, 1, local(sh, centerOf(sh)));
    }
  }

  function updateBackground(clock) {
    if (sun) {
      var k = Math.sin(clock * 2 * Math.PI / SUN_PULSE.period);
      sun.style.transform = scaleAbout(1 + SUN_PULSE.amp * k, 1 + SUN_PULSE.amp * k,
                                       { x: sun.offsetWidth / 2, y: sun.offsetHeight / 2 });
      sun.style.opacity = (0.93 + 0.07 * k).toFixed(3);
    }
    if (fog) {
      var x = Math.sin(clock * 2 * Math.PI / FOG_DRIFT.period) * FOG_DRIFT.amp * REF * u;
      fog.style.transform = 'translate(' + px(x) + ',0)';
    }
  }

  function layout() {
    u = scene.clientWidth / REF || 1;
    sState.home    = groundPoint(stag);
    sState.center  = centerOf(stag.body);
    sState.shadowC = stag.shadow ? centerOf(stag.shadow) : sState.home;
    bState.home    = groundPoint(bambi);
  }

  var clock = 0, last = null, prevTc = 0;
  var hashT = (location.hash || '').match(/t=([\d.]+)/);
  if (hashT) { clock = parseFloat(hashT[1]) || 0; prevTc = clock % CYCLE; }

  function frame(now) {
    if (last === null) last = now;
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clock += dt;

    var tc = clock % CYCLE;
    if (tc < prevTc) resetBambiCycle();
    prevTc = tc;

    updateBackground(clock);
    var st = updateStag(tc, clock, dt);
    updateBambi(tc, clock, st);

    requestAnimationFrame(frame);
  }

  function start() {
    layout();
    requestAnimationFrame(frame);
  }

  if (window.ResizeObserver) {
    new ResizeObserver(function () { if (sState.home) layout(); }).observe(scene);
  } else {
    window.addEventListener('resize', function () { if (sState.home) layout(); });
  }

  var imgs = scene.querySelectorAll('img');
  var pending = imgs.length;
  if (!pending) { start(); return; }
  function oneDone() { if (--pending === 0) start(); }

  Array.prototype.forEach.call(imgs, function (img) {
    if (img.complete && img.naturalWidth) {
      oneDone();
    } else {
      img.addEventListener('load', oneDone);
      img.addEventListener('error', oneDone);
    }
  });
});