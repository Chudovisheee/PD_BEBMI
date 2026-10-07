document.addEventListener('DOMContentLoaded', function () {
  'use strict';


  var QUARTER_MS = 12000;  
  var FADE       = 0.30;    

  var BG_ORDER = ['morning', 'day', 'afternoon', 'night'];
  var BASE_ID  = 'day';    

  var SUN = {
    cx: 0.50, cy: 0.412,
    rx: 0.43, ry: 0.33, 
    horizon: 0.2,
    band: 0.14
  };

  var FOG_ALPHA = { morning: 1.0, day: 0.0, afternoon: 0.12, night: 0.40 };
  var FOG_DRIFT = 0.012;

  var DEER_EVENTS = [
    { a: 0.10, b: 0.45, from: 1, to: 0 },
    { a: 1.00, b: 1.35, from: 0, to: 1 },
    { a: 2.25, b: 2.65, from: 1, to: 0 },
    { a: 3.05, b: 3.40, from: 0, to: 1 }
  ];
  var POACHER_EVENTS = [
    { a: 1.25, b: 1.60, from: 1, to: 0 },
    { a: 1.85, b: 2.20, from: 0, to: 1 }
  ];


  var DEER_HIDE = {
    dx: -0.1,              
    dy: -0.1,              
    scale: 0.78,            
    fadeFrom: 0.30,         
    behindForestAt: 0.42,   
    behindForest: true      
  };
  var WALK_HZ    = 1.6;     
  var LEG_PIVOT  = {
    pb: { x: 0.30, y: 0.07 },   
    pd: { x: 0.80, y: 0.07 },   
    zb: { x: 0.45, y: 0.12 },   
    zd: { x: 0.27, y: 0.09 }    
  };
  var LEG_SWING  = { front: 20, back: 16 };   
  var WALK_BOB   = 0.003;   

  var POACHER_WALK_HZ = 1.3;
  var POACHER_BOB     = 0.004;

  var BUTTERFLIES = [
    { body: 'butterfly', left: 'left_wing', right: 'right_wing', tilt:  -12.2, pv: { x: 0.518, y: 0.605 }, hz: 4.6, phase: 0.0, float: 0.008, speed: 0.7 },
    { body: 'butterfly1', left: 'left_wing1', right: 'right_wing1', tilt:  -39.2, pv: { x: 0.604, y: 0.609 }, hz: 5.2, phase: 1.3, float: 0.007, speed: 0.55 },
    { body: 'butterfly2', left: 'left_wing2', right: 'right_wing2', tilt:   35.6, pv: { x: 0.416, y: 0.601 }, hz: 4.2, phase: 2.1, float: 0.009, speed: 0.8 },
    { body: 'butterfly3', left: 'left_wing3', right: 'right_wing3', tilt:  -39.2, pv: { x: 0.604, y: 0.609 }, hz: 4.9, phase: 3.4, float: 0.007, speed: 0.62 },
    { body: 'butterfly4', left: 'left_wing4', right: 'right_wing4', tilt:   45.9, pv: { x: 0.386, y: 0.608 }, hz: 4.4, phase: 4.6, float: 0.008, speed: 0.75 }
  ];
  var WING_MIN = 0.20;      

  var START_Q = 0.35;       
  var hashMatch = (location.hash || '').match(/q=([\d.]+)/);
  if (hashMatch) START_Q = parseFloat(hashMatch[1]) || 0;

  var scene = document.getElementById('scene');
  if (!scene) return;

  function $(id) { return document.getElementById(id); }

  var bgs = BG_ORDER.map($).filter(Boolean);
  var sun = $('sun'), fogs = $('fogs'), forest = $('forest');
  var deer = $('deer');
  var legs = {
    pb: $('leg_pb'), pd: $('leg_pd'), zb: $('leg_zb'), zd: $('leg_zd')
  };
  var poacher = $('poacher');

  var deerParts = [deer, legs.pb, legs.pd, legs.zb, legs.zd].filter(Boolean);

  var bflies = BUTTERFLIES.map(function (c) {
    return { c: c, body: $(c.body), left: $(c.left), right: $(c.right), phase: c.phase * 7 };
  }).filter(function (b) { return b.body; });

  var allMoving = deerParts.concat([poacher, sun, fogs]);
  bflies.forEach(function (b) { allMoving.push(b.body, b.left, b.right); });
  allMoving.filter(Boolean).forEach(function (e) {
    e.style.transformOrigin = '0 0';
    e.style.willChange = 'transform';
  });

  var W = 1;  

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, k)  { return a + (b - a) * k; }
  function smooth(x)      { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function px(v)          { return v.toFixed(2) + 'px'; }
  function deg(v)         { return v.toFixed(3) + 'deg'; }

  function local(e, P) { return { x: P.x - e.offsetLeft, y: P.y - e.offsetTop }; }
  function centerOf(e) { return { x: e.offsetLeft + e.offsetWidth / 2, y: e.offsetTop + e.offsetHeight / 2 }; }

  function rotAbout(a, p) {
    return 'translate(' + px(p.x) + ',' + px(p.y) + ') rotate(' + deg(a) + ') translate(' + px(-p.x) + ',' + px(-p.y) + ')';
  }
  function scaleAbout(sx, sy, p) {
    return 'translate(' + px(p.x) + ',' + px(p.y) + ') scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ') translate(' + px(-p.x) + ',' + px(-p.y) + ')';
  }

  function zOf(e) { return parseInt(getComputedStyle(e).zIndex, 10) || 0; }

  function track(events, q, init) {
    var v = init, dir = 0;
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (q >= e.b) { v = e.to; continue; }
      if (q >= e.a) {
        var p = (q - e.a) / (e.b - e.a);
        p = lerp(p, smooth(p), 0.35);                 
        v = lerp(e.from, e.to, p);
        dir = e.to > e.from ? 1 : -1;
      }
      break;
    }
    return { v: v, dir: dir };
  }

  var ovEls = {};
  BG_ORDER.forEach(function (id) { if (id !== BASE_ID && $(id)) ovEls[id] = $(id); });
  var bgCur = -1;

  function bringOverlayToTop(el) {
    var parent = el.parentNode, last = null;
    Array.prototype.forEach.call(parent.children, function (ch) {
      for (var id in ovEls) { if (ovEls[id] === ch) last = ch; }
    });
    if (last && last !== el) parent.insertBefore(el, last.nextSibling);
  }

  function updateBackgrounds(q, qAbs) {
    var n = BG_ORDER.length;
    var cur = Math.floor(q) % n, f = q - Math.floor(q);
    var prev = (cur + n - 1) % n;
    var curId = BG_ORDER[cur], prevId = BG_ORDER[prev];

    if (Math.floor(qAbs) === Math.floor(START_Q) && (START_Q - Math.floor(START_Q)) < FADE) f = Math.max(f, FADE);

    var blend = smooth(f / FADE);                       
    var wIn  = (f >= FADE) ? 1 : smooth(f / (FADE * 0.75));
    var wOut = (f >= FADE) ? 0 : 1 - smooth((f - FADE * 0.5) / (FADE * 0.5));
    if (curId === BASE_ID) wOut = 1 - blend;            

    if (cur !== bgCur) {
      if (ovEls[curId]) bringOverlayToTop(ovEls[curId]);   
      bgCur = cur;
    }
    for (var id in ovEls) {
      var o = 0;
      if (id === curId)  o = wIn;
      if (id === prevId) o = wOut;
      ovEls[id].style.opacity = o.toFixed(3);
    }
    return { w: blend, cur: cur, prev: prev };
  }

  function updateSun(q) {
    if (!sun) return;
    var s = ((q / 4 - 0.125) % 1 + 1) % 1;            
    var th = s * 2 * Math.PI;
    var x = (SUN.cx - SUN.rx * Math.cos(th)) * W;
    var y = (SUN.cy - SUN.ry * Math.sin(th)) * W;
    var home = centerOf(sun);
    sun.style.transform = 'translate(' + px(x - home.x) + ',' + px(y - home.y) + ')';
    var o = 1 - clamp((y / W - SUN.horizon) / SUN.band, 0, 1);
    sun.style.opacity = o.toFixed(3);
  }

  function updateFog(bg, clock) {
    if (!fogs) return;
    var cur = BG_ORDER[bg.cur], prev = BG_ORDER[bg.prev];
    var a = lerp(FOG_ALPHA[prev] || 0, FOG_ALPHA[cur] || 0, bg.w);
    fogs.style.opacity = a.toFixed(3);
    fogs.style.transform = 'translate(' + px(Math.sin(clock * 0.12) * FOG_DRIFT * W) + ',0)';
  }

  var deerState = { m: 0, phase: 0, behind: false, z: null };

  function prepDeerZ() {
    if (!deerParts.length) return;
    deerState.z = deerParts.map(zOf);
  }

  function setDeerBehind(on) {
    if (!deerState.z || !forest) return;
    if (deerState.behind === on) return;
    deerState.behind = on;
    var fz = zOf(forest);
    deerParts.forEach(function (e, i) {
      e.style.zIndex = on ? (fz - 1) : deerState.z[i];
    });
  }

  function updateDeer(q, loop, dt) {
    if (!deer) return;
    var d = track(DEER_EVENTS, q, 1);
    if (loop === 0 && q < 1) d = { v: 0, dir: 0 };    
    var h = d.v;

    var moving = d.dir !== 0 ? 1 : 0;
    deerState.m = lerp(deerState.m, moving, 1 - Math.exp(-dt * 7));
    deerState.phase += dt * 2 * Math.PI * WALK_HZ * deerState.m;
    var m = deerState.m;

    var mirror = (d.dir < 0) ? -1 : 1;                
    var s = 1 - (1 - DEER_HIDE.scale) * h;
    var dx = DEER_HIDE.dx * h * W;
    var dy = DEER_HIDE.dy * h * W - m * WALK_BOB * W * (0.5 + 0.5 * Math.cos(2 * deerState.phase));

    var o = 1 - smooth((h - DEER_HIDE.fadeFrom) / (1 - DEER_HIDE.fadeFrom));
    var vis = h < 0.999;

    if (DEER_HIDE.behindForest) setDeerBehind(h > DEER_HIDE.behindForestAt);

    var dc = centerOf(deer);
    var bottom = Math.max.apply(null, deerParts.map(function (e) { return e.offsetTop + e.offsetHeight; }));
    var G = { x: dc.x, y: bottom };

    var legAngle = {
      pb: Math.sin(deerState.phase)            * LEG_SWING.front * m,
      zd: Math.sin(deerState.phase)            * LEG_SWING.back  * m,
      pd: Math.sin(deerState.phase + Math.PI)  * LEG_SWING.front * m,
      zb: Math.sin(deerState.phase + Math.PI)  * LEG_SWING.back  * m
    };

    deerParts.forEach(function (e) {
      var g = local(e, G);
      var tf = 'translate(' + px(dx) + ',' + px(dy) + ') ' + scaleAbout(s * mirror, s, g);
      for (var k in legs) {
        if (legs[k] === e) {
          tf += ' ' + rotAbout(legAngle[k], { x: e.offsetWidth * LEG_PIVOT[k].x, y: e.offsetHeight * LEG_PIVOT[k].y });
        }
      }
      e.style.transform = tf;
      e.style.opacity = o.toFixed(3);
      e.style.visibility = vis ? 'visible' : 'hidden';
    });
  }

  var pState = { m: 0, phase: 0 };

  function updatePoacher(q, clock, dt) {
    if (!poacher) return;
    var d = track(POACHER_EVENTS, q, 1);
    var h = d.v;

    var moving = d.dir !== 0 ? 1 : 0;
    pState.m = lerp(pState.m, moving, 1 - Math.exp(-dt * 7));
    pState.phase += dt * 2 * Math.PI * POACHER_WALK_HZ * pState.m;
    var m = pState.m;

    var mirror = (d.dir > 0) ? -1 : 1;
    var off = (W - poacher.offsetLeft) + 0.03 * W;    
    var dx = off * h;
    var dy = -m * POACHER_BOB * W * Math.abs(Math.sin(pState.phase));
    var rot = m * 0.8 * Math.sin(pState.phase) + (1 - m) * 0.25 * Math.sin(clock * 0.7);

    var cx = poacher.offsetWidth / 2;
    var feet = { x: cx, y: poacher.offsetHeight };

    poacher.style.transform =
      'translate(' + px(dx) + ',' + px(dy) + ') ' +
      'translate(' + px(cx) + ',0) scale(' + mirror + ',1) translate(' + px(-cx) + ',0) ' +
      rotAbout(rot, feet);
    poacher.style.visibility = h < 0.999 ? 'visible' : 'hidden';
  }

  function updateButterflies(clock, dt) {
    bflies.forEach(function (b, i) {
      var c = b.c;

      b.phase += dt * 2 * Math.PI * c.hz * (0.82 + 0.18 * Math.sin(clock * 0.37 + i * 1.7));
      var flap = 0.5 + 0.5 * Math.cos(b.phase);
      var k = WING_MIN + (1 - WING_MIN) * flap;

      var fx = Math.sin(clock * c.speed + c.phase) * c.float * W;
      var fy = Math.cos(clock * c.speed * 1.3 + c.phase * 1.7) * c.float * W;
      var rot = 4 * Math.sin(clock * c.speed * 0.9 + c.phase);

      var C = { x: b.body.offsetLeft + b.body.offsetWidth * c.pv.x, y: b.body.offsetTop + b.body.offsetHeight * c.pv.y };
      var move = 'translate(' + px(fx) + ',' + px(fy) + ') ';

      b.body.style.transform = move + rotAbout(rot, local(b.body, C));

      [b.left, b.right].forEach(function (w) {
        if (!w) return;
        var cw = local(w, C);
        w.style.transform =
          move + rotAbout(rot, cw) + ' ' +
          'translate(' + px(cw.x) + ',' + px(cw.y) + ') ' +
          'rotate(' + deg(c.tilt) + ') scale(' + k.toFixed(3) + ',1) rotate(' + deg(-c.tilt) + ') ' +
          'translate(' + px(-cw.x) + ',' + px(-cw.y) + ')';
      });
    });
  }

  var clock = 0, last = null;

  function frame(now) {
    if (last === null) last = now;
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clock += dt;

    W = scene.clientWidth || 1;

    var qAbs = START_Q + clock * 1000 / QUARTER_MS;
    var q = qAbs % 4;
    var loop = Math.floor(qAbs / 4);

    var bg = updateBackgrounds(q, qAbs);
    updateSun(q);
    updateFog(bg, clock);
    updateDeer(q, loop, dt);
    updatePoacher(q, clock, dt);
    updateButterflies(clock, dt);

    requestAnimationFrame(frame);
  }

  function start() {
    prepDeerZ();
    requestAnimationFrame(frame);
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