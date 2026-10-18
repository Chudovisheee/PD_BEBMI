document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var REF = 1920;

  var PAN = 520;

  var PARALLAX = {
    forest_far: 0.15,    shadows_far: 0.15,
    forest_middle: 0.25, shadows_middle: 0.25,
    hunter: 0.38,
    fog: 0.45,
    forest_second: 0.5,  shadows_second: 0.5,
    bush_second: 0.7,    bush_second_2: 0.7,
    forest_front: 1.0,   shadows_front: 1.0,
    bushes_front: 1.1
  };

  var DRAG_GAIN  = 2.2;
  var KEY_SPEED  = 1.1;
  var TILT_RANGE = 22;
  var PAN_FOLLOW = 10;

  var ROUTE = [
    { x: 913,  wait: 1.8 },
    { x: 300,  wait: 2.2 },
    { x: 1100, wait: 2.4 },
    { x: 450,  wait: 2.0 },
    { x: 1700, wait: 1.8 },
    { x: 2200, wait: 0 }
  ];
  var ROUTE_JITTER = { x: 40, wait: 0.4 };
  var WALK_SPEED   = 140;
  var WALK_HZ      = 1.3;

  var GRACE      = 2.0;
  var FILL_STAND = 2.5;
  var FILL_WALK  = 5.0;
  var DECAY      = 0.45;
  var SEE_FROM   = 0.5;
  var SEE_FULL   = 0.85;

  var TEXT = {
    intro: {
      title: 'Спрячь Бемби от охотника',
      text: 'Охотник бродит по лесу. Поворачивай голову Бемби так, чтобы охотника всё время закрывали деревья, — тогда он не заметит тебя. Продержись, пока он не уйдёт.',
      button: 'Играть'
    },
    lose: {
      title: 'Охотник заметил Бемби!',
      text: 'Скорее в чащу! Попробуй ещё раз: держи между собой и охотником стволы деревьев.',
      button: 'Ещё раз'
    },
    win: {
      title: 'Охотник ушёл',
      text: 'Бемби остался незамеченным. Теперь он знает: в лесу нужно смотреть, слушать и вовремя прятаться.',
      button: 'Сыграть ещё раз'
    },
    hintMouse: 'Тяни картинку мышкой влево-вправо или нажимай ← →',
    hintTouch: 'Веди пальцем по картинке или наклоняй телефон влево-вправо'
  };

  var OCC_RES = 4;
  var OCC_TOP = 636;
  var OCC_MASKS = {
    forest_front: [
      [10,19,26,36,41,42,43,44,156,209,357,376,392,400,402,414,430,449],
      [10,20,26,36,41,42,43,44,75,76,156,209,358,376,392,400,401,415,430,449],
      [10,21,25,35,38,39,41,42,43,45,75,76,156,209,358,375,393,416,430,449],
      [11,23,25,35,38,39,41,42,43,45,75,76,156,209,358,375,393,416,430,449],
      [11,35,38,39,41,42,44,45,75,76,156,209,358,376,394,416,430,449],
      [11,34,38,39,41,42,44,45,75,76,157,209,358,378,394,404,406,415,430,449],
      [12,34,38,39,41,42,44,46,72,73,157,209,358,381,394,403,407,414,430,449],
      [12,34,38,39,41,42,44,46,72,73,157,209,358,401,430,449,463,465],
      [13,33,44,46,74,75,157,209,358,399,430,449,462,465],
      [14,33,42,43,44,46,74,75,157,209,358,397,430,449,462,466],
      [14,33,39,40,42,43,44,46,71,72,74,75,157,209,358,394,430,449,461,466],
      [15,32,39,40,42,43,44,47,71,72,74,75,157,209,358,375,377,386,430,449,460,465],
      [16,32,39,40,42,43,44,47,70,71,158,209,358,375,430,449,459,465],
      [18,32,39,40,42,43,46,47,70,71,73,74,158,209,358,375,430,449,457,464],
      [20,32,39,40,42,43,45,47,70,71,73,74,158,209,231,233,358,374,430,449,456,464],
      [21,31,39,40,42,43,45,47,158,209,230,231,233,234,358,374,430,449,454,463],
      [20,31,39,40,42,43,45,47,158,209,229,231,233,234,358,374,430,462],
      [20,31,39,40,42,43,45,46,72,73,158,209,228,230,232,234,357,374,430,461],
      [20,30,39,40,42,43,45,46,72,73,158,209,227,229,232,233,235,236,357,374,430,460],
      [19,30,42,43,45,46,158,210,227,228,231,233,235,236,357,374,406,410,430,459],
      [19,30,42,43,45,47,68,69,158,210,226,228,231,232,235,237,357,374,405,411,430,458],
      [19,29,42,43,45,47,158,210,225,227,236,237,357,374,404,412,430,456],
      [18,29,40,41,42,43,45,47,67,68,158,210,225,226,236,237,357,374,403,412,430,453],
      [18,29,40,41,42,43,45,46,158,210,236,238,357,374,391,392,402,411,430,449],
      [18,28,40,43,45,46,66,67,158,210,237,238,357,374,389,393,401,411,430,448],
      [18,28,40,43,158,210,357,374,389,394,401,411,430,448],
      [17,28,40,43,45,46,65,66,158,210,357,374,389,395,400,411,430,448],
      [17,28,40,43,45,46,158,210,358,374,389,395,400,410,430,448],
      [17,27,40,43,45,46,64,65,158,210,358,374,389,396,400,410,430,448],
      [17,27,40,43,45,46,158,210,358,374,389,396,399,410,430,448]
    ],
    forest_second: [
      [20,38,59,66,81,90,91,102,206,247,316,318,325,336,404,408],
      [20,38,59,66,81,101,207,247,316,319,325,336,403,408],
      [20,38,58,66,82,101,208,247,316,319,324,336,403,408],
      [20,38,58,66,82,101,210,246,316,320,324,336,403,408],
      [20,38,58,66,83,101,214,227,230,243,316,321,324,336,402,409],
      [20,39,58,65,83,100,214,227,317,322,324,336,401,409],
      [20,39,57,65,84,100,214,228,317,336,401,409],
      [21,39,57,65,84,99,213,228,318,336,400,409],
      [21,39,57,65,85,99,213,228,319,336,400,410],
      [21,39,56,65,86,99,212,228,320,336,400,410],
      [21,39,56,64,87,99,212,229,324,336,399,410],
      [21,39,55,64,88,98,211,229,324,336,399,411],
      [21,39,55,64,88,98,211,229,324,336,338,341,398,411],
      [21,39,55,64,88,98,210,229,324,336,338,341,398,412],
      [21,39,54,64,87,97,210,230,324,336,338,342,397,412],
      [21,40,54,63,87,97,209,230,324,336,338,342,396,412],
      [22,40,54,63,87,97,209,230,324,335,338,341,396,413],
      [22,40,53,63,87,97,208,231,324,335,338,341,395,413],
      [22,40,53,63,87,97,207,231,324,335,338,341,394,414],
      [22,40,53,62,86,97,207,231,324,335,337,341,393,415],
      [22,40,52,62,86,97,206,232,324,335,337,341,392,415],
      [22,40,52,62,86,96,205,232,324,335,336,340,391,415],
      [22,40,51,61,86,96,204,232,324,340,389,416],
      [22,40,51,61,86,96,106,108,204,233,324,340,388,416],
      [22,40,50,61,86,96,105,108,203,233,324,339,384,417],
      [22,40,50,61,86,96,105,109,203,234,324,338,382,417],
      [22,40,49,60,86,96,105,109,204,234,324,337,382,417],
      [22,40,48,60,86,96,105,109,205,234,324,337,383,418],
      [22,41,47,59,85,96,105,109,206,235,324,335,383,418],
      [22,41,47,58,85,96,105,109,212,235,324,334,384,419]
    ]
  };
  var HEAD_POINTS = [[202,10],[210,10],[218,10],[194,18],[202,18],[210,18],[218,18],[226,18],[234,18],[242,18],[250,18],[186,26],[194,26],[202,26],[210,26],[218,26],[226,26],[234,26],[242,26],[186,34],[194,34],[202,34],[210,34],[218,34],[226,34],[234,34],[186,42],[194,42],[202,42],[210,42],[218,42],[226,42],[186,50],[194,50],[202,50],[210,50],[218,50],[226,50],[186,58],[194,58],[202,58],[210,58],[218,58],[226,58],[186,66],[194,66],[202,66],[210,66],[218,66],[226,66],[234,66],[242,66],[186,74],[194,74],[202,74],[210,74],[218,74],[226,74],[234,74],[242,74],[186,82],[194,82],[202,82],[210,82],[218,82],[226,82],[234,82],[242,82],[250,82],[186,90],[194,90],[202,90],[210,90],[218,90],[226,90],[234,90],[242,90],[250,90]];

  function $(id) { return document.getElementById(id); }

  var scene = $('scene');
  if (!scene) return;

  var hunter = $('hunter'), hunterShadow = $('hunter_shadow'), bambi = $('bambi');
  var vignette = $('danger_vignette'), alertEl = $('hunter_alert');
  var hud = $('game_hud'), hudFill = $('hud_fill'), hudTime = $('hud_time');
  var overlay = $('game_overlay'), titleEl = $('game_title'), textEl = $('game_text');
  var hintEl = $('game_hint'), button = $('game_button');

  if (!hunter || !overlay || !button) return;

  [hunter, hunterShadow, alertEl].forEach(function (e) {
    if (!e) return;
    e.style.transformOrigin = '0 0';
    e.style.willChange = 'transform';
  });

  var layers = [];
  Object.keys(PARALLAX).forEach(function (id) {
    ['', '_l', '_r'].forEach(function (suffix) {
      var el = $(id + suffix);
      if (!el || id === 'hunter') return;
      layers.push({ el: el, f: PARALLAX[id], mirror: suffix !== '', fog: id === 'fog' });
    });
  });

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(x)      { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function px(v)          { return v.toFixed(2) + 'px'; }
  function rnd(a)         { return (Math.random() * 2 - 1) * a; }

  var u = 1;
  var G = {};

  function layout() {
    u = scene.clientWidth / REF || 1;
    scene.style.setProperty('--su', u + 'px');
    G.hunterX  = hunter.offsetLeft / u;
    G.hunterY  = hunter.offsetTop / u;
    G.hunterW  = hunter.offsetWidth / u;
    G.shadowX  = hunterShadow ? hunterShadow.offsetLeft / u : 0;
    G.occ = ['forest_front', 'forest_second'].map(function (id) {
      var el = $(id);
      return { mask: OCC_MASKS[id], left: el.offsetLeft / u, w: el.offsetWidth / u, f: PARALLAX[id] };
    });
  }

  var pan = { p: 0, drag: 0, tilt: 0, keys: 0, tiltBase: null, tiltOn: false };

  function panTarget() { return clamp(pan.drag + pan.tilt, -1, 1); }
  function clampDrag()  { pan.drag = clamp(pan.drag, -1 - pan.tilt, 1 - pan.tilt); }

  var dragId = null, dragX = 0;
  scene.addEventListener('pointerdown', function (e) {
    if (overlay.contains(e.target) && !overlay.classList.contains('is-hidden')) return;
    dragId = e.pointerId; dragX = e.clientX;
    scene.classList.add('is-dragging');
    try { scene.setPointerCapture(e.pointerId); } catch (err) {  }
  });
  scene.addEventListener('pointermove', function (e) {
    if (e.pointerId !== dragId) return;
    var dx = e.clientX - dragX; dragX = e.clientX;
    pan.drag += dx / (scene.clientWidth || 1) * DRAG_GAIN;
    clampDrag();
  });
  function endDrag(e) {
    if (e.pointerId !== dragId) return;
    dragId = null;
    scene.classList.remove('is-dragging');
  }
  scene.addEventListener('pointerup', endDrag);
  scene.addEventListener('pointercancel', endDrag);

  var held = {};
  function keyDir(e) {
    if (e.key === 'ArrowLeft'  || e.code === 'KeyA') return -1;
    if (e.key === 'ArrowRight' || e.code === 'KeyD') return 1;
    return 0;
  }
  window.addEventListener('keydown', function (e) {
    if (state !== 'play') return;
    var d = keyDir(e);
    if (!d) return;
    held[d] = true;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  window.addEventListener('keyup', function (e) {
    var d = keyDir(e);
    if (d) held[d] = false;
  }, true);
  window.addEventListener('blur', function () { held = {}; });

  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  function screenAngle() {
    if (window.screen && screen.orientation && typeof screen.orientation.angle === 'number') return screen.orientation.angle;
    return window.orientation || 0;
  }
  window.addEventListener('deviceorientation', function (e) {
    if (!pan.tiltOn || e.gamma === null || e.beta === null) return;
    var a = screenAngle(), v;
    if (a === 90)                 v = e.beta;
    else if (a === -90 || a === 270) v = -e.beta;
    else if (a === 180)           v = -e.gamma;
    else                          v = e.gamma;
    if (pan.tiltBase === null) pan.tiltBase = v;

    pan.tilt = clamp(-(v - pan.tiltBase) / TILT_RANGE, -1, 1);
    clampDrag();
  });

  function enableTilt() {
    if (!coarse || typeof DeviceOrientationEvent === 'undefined') return;
    pan.tiltBase = null;
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(function (r) { pan.tiltOn = (r === 'granted'); })
        .catch(function () { pan.tiltOn = false; });
    } else {
      pan.tiltOn = true;
    }
  }

  var H = {
    x: 0, mode: 'wait', idx: 0, waitLeft: 0, waitTotal: 0, dir: -1,
    face: -1, lookedBack: false, phase: 0, m: 0
  };
  var route = [], totalTime = 0;

  function makeRoute() {
    route = ROUTE.map(function (pt, i) {
      var last = i === ROUTE.length - 1;
      return {
        x: (i === 0 || last) ? pt.x : pt.x + rnd(ROUTE_JITTER.x),
        wait: last ? 0 : Math.max(0.6, pt.wait + rnd(ROUTE_JITTER.wait))
      };
    });
    totalTime = 0;
    for (var i = 0; i < route.length; i++) {
      totalTime += route[i].wait;
      if (i > 0) totalTime += Math.abs(route[i].x - route[i - 1].x) / WALK_SPEED;
    }
  }

  function resetHunter() {
    H.x = route.length ? route[0].x : G.hunterX;
    H.mode = 'wait'; H.idx = 0;
    H.waitLeft = H.waitTotal = route.length ? route[0].wait : 0;
    H.face = -1; H.lookedBack = false;
  }

  function updateRoute(dt) {
    if (H.mode === 'wait') {
      H.waitLeft -= dt;

      if (!H.lookedBack && H.waitTotal > 1.4 && H.waitLeft < H.waitTotal * 0.5) {
        H.lookedBack = true;
        H.face = -H.face;
      }
      if (H.waitLeft <= 0) {
        H.idx++;
        if (H.idx >= route.length) { H.mode = 'done'; return; }
        H.mode = 'walk';
        H.dir = route[H.idx].x > H.x ? 1 : -1;
        H.face = H.dir;
      }
    } else if (H.mode === 'walk') {
      var target = route[H.idx].x;
      H.x += H.dir * WALK_SPEED * dt;
      if ((H.dir > 0 && H.x >= target) || (H.dir < 0 && H.x <= target)) {
        H.x = target;
        H.mode = H.idx === route.length - 1 ? 'done' : 'wait';
        H.waitLeft = H.waitTotal = route[H.idx].wait;
        H.lookedBack = false;
      }
    }
  }

  function hiddenAt(X, Y, p) {
    var row = Math.floor((Y - OCC_TOP) / OCC_RES);
    for (var i = 0; i < G.occ.length; i++) {
      var o = G.occ[i];
      if (row < 0 || row >= o.mask.length) continue;
      var lx = X - (o.left + o.f * p * PAN);
      if (lx < 0) lx = -lx;
      else if (lx >= o.w) lx = 2 * o.w - lx;
      if (lx < 0 || lx >= o.w) continue;
      var col = Math.floor(lx / OCC_RES), runs = o.mask[row];
      for (var k = 0; k < runs.length; k += 2) {
        if (col >= runs[k] && col < runs[k + 1]) return true;
      }
    }
    return false;
  }

  function headVisible(screenX, bobY, p, face) {
    var nat = hunter.naturalWidth || G.hunterW;
    var k = G.hunterW / nat;
    var seen = 0;
    for (var i = 0; i < HEAD_POINTS.length; i++) {
      var hx = HEAD_POINTS[i][0], hy = HEAD_POINTS[i][1];
      if (face > 0) hx = nat - hx;
      if (!hiddenAt(screenX + hx * k, G.hunterY + bobY + hy * k, p)) seen++;
    }
    return HEAD_POINTS.length ? seen / HEAD_POINTS.length : 0;
  }

  var state = 'intro';
  var danger = 0, grace = 0, elapsed = 0, seeing = 0;

  function showCard(t) {
    titleEl.textContent = t.title;
    textEl.textContent = t.text;
    button.textContent = t.button;
    hintEl.textContent = coarse ? TEXT.hintTouch : TEXT.hintMouse;
    hintEl.hidden = (t === TEXT.win);
    overlay.classList.remove('is-hidden');
  }

  function startGame() {
    makeRoute();
    resetHunter();
    danger = 0; grace = GRACE; elapsed = 0; seeing = 0;
    held = {};
    overlay.classList.add('is-hidden');
    hud.hidden = false;
    scene.classList.remove('is-thunder');
    enableTilt();
    state = 'play';
  }

  function caught() {
    state = 'caught';
    scene.classList.remove('is-thunder');
    void scene.offsetWidth;
    scene.classList.add('is-thunder');
    setTimeout(function () { if (state === 'caught') showCard(TEXT.lose); }, 900);
  }

  function won() {
    state = 'won';
    setTimeout(function () { if (state === 'won') showCard(TEXT.win); }, 300);
  }

  button.addEventListener('click', startGame);

  if (/debug/.test(location.hash)) {
    window.page5 = function () {
      return { state: state, danger: +danger.toFixed(3), seeing: +seeing.toFixed(3), pan: +pan.p.toFixed(3),
               hunterX: Math.round(H.x), mode: H.mode, face: H.face, left: +(totalTime - elapsed).toFixed(1) };
    };
    window.page5.vis = function (q) { return headVisible(H.x + PARALLAX.hunter * q * PAN, 0, q, H.face); };
    window.page5.setPan = function (v) { pan.drag = v; clampDrag(); };
  }

  function fmt(sec) {
    sec = Math.max(0, Math.ceil(sec));
    return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
  }

  function rotAbout(a, x, y) {
    return 'translate(' + px(x) + ',' + px(y) + ') rotate(' + a.toFixed(3) + 'deg) translate(' + px(-x) + ',' + px(-y) + ')';
  }

  var clock = 0, last = null;

  function frame(now) {
    if (last === null) last = now;
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clock += dt;

    var kd = 0;
    if (held[-1]) kd -= 1;
    if (held[1])  kd += 1;
    if (kd) { pan.drag += -kd * KEY_SPEED * dt; clampDrag(); }
    pan.p += (panTarget() - pan.p) * (1 - Math.exp(-dt * PAN_FOLLOW));
    var p = pan.p;

    var fogDrift = Math.sin(clock * 2 * Math.PI / 24) * 25;
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      var dx = (L.f * p * PAN + (L.fog ? fogDrift : 0)) * u;
      L.el.style.transform = 'translate(' + px(dx) + ',0)' + (L.mirror ? ' scaleX(-1)' : '');
    }

    if (state === 'play' || state === 'won') updateRoute(dt);
    var walking = (state === 'play' || state === 'won') && H.mode === 'walk';
    H.m += ((walking ? 1 : 0) - H.m) * (1 - Math.exp(-dt * 8));
    H.phase += dt * 2 * Math.PI * WALK_HZ * H.m;

    var hx  = (state === 'intro') ? G.hunterX : H.x;
    var sx  = hx + PARALLAX.hunter * p * PAN;
    var bob = -H.m * 7 * Math.abs(Math.sin(H.phase));
    var rot = H.m * 1.2 * Math.sin(H.phase) + (1 - H.m) * 0.5 * Math.sin(clock * 0.9);
    var face = (state === 'intro') ? -1 : H.face;
    var w = hunter.offsetWidth, h = hunter.offsetHeight;

    hunter.style.transform =
      'translate(' + px((sx - G.hunterX) * u) + ',' + px(bob * u) + ') ' +
      'translate(' + px(w / 2) + ',0) scale(' + (face > 0 ? -1 : 1) + ',1) translate(' + px(-w / 2) + ',0) ' +
      rotAbout(rot, w / 2, h);

    if (hunterShadow) {
      var axis = (G.hunterX + G.hunterW / 2 - G.shadowX) * u;
      hunterShadow.style.transform =
        'translate(' + px((sx - G.hunterX) * u) + ',0) ' +
        'translate(' + px(axis) + ',0) scale(' + (face > 0 ? -1 : 1) + ',1) translate(' + px(-axis) + ',0)';
    }

    if (bambi) {
      bambi.style.transform = 'translate(' + px(-p * 18 * u) + ',0) rotate(' + (-p * 3).toFixed(3) + 'deg)';
    }

    if (state === 'play') {
      elapsed += dt;
      var vis = headVisible(sx, bob, p, face);
      seeing = grace > 0 ? 0 : smooth((vis - SEE_FROM) / (SEE_FULL - SEE_FROM));
      if (grace > 0) grace -= dt;
      var fill = H.mode === 'walk' ? FILL_WALK : FILL_STAND;
      danger = clamp(danger + dt * (seeing / fill - (1 - seeing) * DECAY), 0, 1);

      if (danger >= 1) caught();
      else if (H.mode === 'done' || sx > REF + 40) won();
    } else if (state !== 'caught') {
      seeing = Math.max(0, seeing - dt * 3);
      danger = Math.max(0, danger - dt * 0.8);
    }

    vignette.style.opacity = (danger * 0.9).toFixed(3);

    var headX = face > 0 ? (G.hunterW - 225) : 225;
    var aw = alertEl.offsetWidth, ah = alertEl.offsetHeight;
    var pulse = 1 + 0.12 * seeing * Math.sin(clock * 14);
    alertEl.style.opacity = (state === 'intro' ? 0 : seeing).toFixed(3);
    alertEl.style.transform =
      'translate(' + px((sx + headX) * u - aw / 2) + ',' + px((G.hunterY + bob - 40) * u - ah) + ') scale(' + pulse.toFixed(3) + ')';

    hudFill.style.width = (danger * 100).toFixed(1) + '%';
    hud.classList.toggle('is-danger', danger > 0.6 || seeing > 0.5);
    hudTime.textContent = fmt(state === 'play' ? totalTime - elapsed : (state === 'won' ? 0 : totalTime - elapsed));

    requestAnimationFrame(frame);
  }

  function start() {
    layout();
    makeRoute();
    resetHunter();
    showCard(TEXT.intro);
    requestAnimationFrame(frame);
  }

  if (window.ResizeObserver) {
    new ResizeObserver(function () { if (G.occ) layout(); }).observe(scene);
  } else {
    window.addEventListener('resize', function () { if (G.occ) layout(); });
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