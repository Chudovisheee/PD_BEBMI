document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var REF = 1920;

  var WALK = { hz: 0.85, legSwing: 7, bob: 9, armSway: 1.6, strapSwing: 4, shadowPulse: 0.03 };
  var PIVOT = {
    hunter_leg_left:  [0.30, 0.04],
    hunter_leg_right: [0.75, 0.03],
    hunter_arms:      [0.10, 0.50],
    hunter_strap:     [0.97, 0.03]
  };
  var RECOIL = { angle: -3, shift: 16, time: 0.45 };

  var DEER = {
    speed: [190, 260],
    startDelay: [0, 0.6],
    bob: 22,
    hz: 2.4,
    pitch: 4,
    fadeTime: 0.9,
    respawnDelay: [0.8, 3]
  };

  var SHOT = {
    first: 2.2,
    every: [4, 7],
    zone: [750, 1800]
  };

  var BIRDS = [
    { id: 'bird_1', wings: { wing_left: [182.0, 177.4], wing_right: [227.4, 211.5] }, side: { wing_left: -1, wing_right: 1 }, face: 1, firstRest: 1.2 },
    { id: 'bird_2', wings: { wing_left: [692.4, 49.7], wing_right: [731.9, 23.8] }, side: { wing_left: -1, wing_right: 1 }, face: -1, firstRest: 3.6 },
    { id: 'bird_3', wings: { wing_left: [1081.2, 57.1], wing_right: [1123.0, 41.6] }, side: { wing_left: -1, wing_right: 1 }, face: -1, firstRest: 0.6 },
    { id: 'bird_4', wings: { wing_left: [1605.4, 570.7], wing_right: [1654.7, 544.9] }, side: { wing_left: -1, wing_right: 1 }, face: -1, firstRest: 5.0 },
    { id: 'bird_5', wings: { wing_left: [1683.1, 203.8], wing_right: [1736.0, 178.1] }, side: { wing_left: -1, wing_right: 1 }, face: -1, firstRest: 2.4 }
  ];
  var FLAP = { restHz: 2.2, flyHz: 5, restAngle: 14, flyAngle: 30 };
  var FLIGHT = {
    rest: [2.5, 6],
    away: [2, 7],
    leaveSpeed: 150,
    leaveAccel: 520,
    returnTime: [2.4, 3.4],
    returnDist: 1500,
    arc: 140,
    tilt: 9
  };

  var SCROLL = {
    speed: 120,
    period: 1920,
    layers: { trees_far: 0.33, trees_middle: 0.6, trees_front: 1, snowdrifts: 1 },
    deer: 0.45
  };

  function $(id) { return document.getElementById(id); }

  var scene = $('scene');
  if (!scene) return;

  function rand(r) { return r[0] + Math.random() * (r[1] - r[0]); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function px(v) { return v.toFixed(2) + 'px'; }
  function deg(v) { return v.toFixed(3) + 'deg'; }

  var u = 1;

  function local(e, P) { return { x: P.x * u - e.offsetLeft, y: P.y * u - e.offsetTop }; }
  function rotAbout(a, p) {
    return 'translate(' + px(p.x) + ',' + px(p.y) + ') rotate(' + deg(a) + ') translate(' + px(-p.x) + ',' + px(-p.y) + ')';
  }
  function scaleAbout(sx, sy, p) {
    return 'translate(' + px(p.x) + ',' + px(p.y) + ') scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ') translate(' + px(-p.x) + ',' + px(-p.y) + ')';
  }
  function pivotOf(e, f) {
    return { x: (e.offsetLeft + e.offsetWidth * f[0]) / u, y: (e.offsetTop + e.offsetHeight * f[1]) / u };
  }

  var H = {
    body: $('hunter'), arms: $('hunter_arms'), strap: $('hunter_strap'), shadow: $('hunter_shadow'),
    legL: $('hunter_leg_left'), legR: $('hunter_leg_right')
  };
  var recoilAt = -10;

  var deer = ['deer_1', 'deer_2', 'deer_3', 'deer_4'].map(function (id) {
    return { id: id, el: $(id) };
  }).filter(function (d) { return d.el; });

  var scrollLayers = [];
  Object.keys(SCROLL.layers).forEach(function (id) {
    [$(id), $(id + '_2')].forEach(function (el) {
      if (el) { el.style.willChange = 'transform'; scrollLayers.push({ el: el, f: SCROLL.layers[id] }); }
    });
  });

  var birds = BIRDS.map(function (b) {
    var o = { c: b, body: $(b.id + '_body'), wings: {} };
    ['wing_left', 'wing_right'].forEach(function (w) { o.wings[w] = $(b.id + '_' + w); });
    return o;
  }).filter(function (b) { return b.body; });

  var all = [H.body, H.arms, H.strap, H.shadow, H.legL, H.legR];
  birds.forEach(function (b) { all.push(b.body, b.wings.wing_left, b.wings.wing_right); });
  all.filter(Boolean).forEach(function (e) { e.style.transformOrigin = '0 0'; e.style.willChange = 'transform'; });
  deer.forEach(function (d) { d.el.style.willChange = 'transform, opacity, filter'; });

  function layout() {
    u = scene.clientWidth / REF || 1;
    deer.forEach(function (d) {
      d.homeX = d.el.offsetLeft / u;
      d.w = d.el.offsetWidth / u;
    });
  }

  function planDeer(d, first) {
    d.speed = rand(DEER.speed);
    d.phase = Math.random() * 6.283;
    d.opacity = 1;
  }

  function initDeer() {
    deer.forEach(function (d) {
      d.x = d.homeX;
      d.mode = 'wait';
      d.waitLeft = rand(DEER.startDelay);
      planDeer(d, true);
    });
  }

  function respawnDeer(d) {
    d.mode = 'wait';
    d.waitLeft = rand(DEER.respawnDelay);
    d.x = REF + rand([40, 320]);
    planDeer(d, false);
    d.el.style.opacity = '0';
  }

  function updateDeer(now, dt) {
    deer.forEach(function (d) {
      var bob = 0, pitch = 0, rise = 0, blur = 0;
      if (d.mode === 'wait') {
        d.waitLeft -= dt;
        if (d.waitLeft <= 0) { d.mode = 'run'; d.opacity = 1; }
      }
      if (d.mode === 'run' || d.mode === 'fade') {
        d.x -= (d.speed * (d.mode === 'fade' ? 0.5 : 1) + SCROLL.speed * SCROLL.deer) * dt;
        d.phase += dt * 2 * Math.PI * DEER.hz;
        bob = -DEER.bob * Math.abs(Math.sin(d.phase));
        pitch = DEER.pitch * Math.sin(d.phase);
      }
      if (d.mode === 'fade') {
        d.fadeT += dt;
        var k = clamp(d.fadeT / DEER.fadeTime, 0, 1);
        d.opacity = 1 - smooth(k);
        rise = -40 * k;
        blur = 6 * k;
        if (k >= 1) respawnDeer(d);
      }
      if (d.mode === 'run' && d.x + d.w < -30) respawnDeer(d);

      d.el.style.transform = 'translate(' + px((d.x - d.homeX) * u) + ',' + px((bob + rise) * u) + ') rotate(' + deg(pitch) + ')';
      d.el.style.opacity = (d.mode === 'wait' && d.x > d.homeX + 1 ? 0 : d.opacity).toFixed(3);
      d.el.style.filter = blur > 0.05 ? 'blur(' + (blur * u).toFixed(2) + 'px)' : '';
    });
  }

  var nextShot = SHOT.first;

  function updateShots(now) {
    if (now < nextShot) return;
    var targets = deer.filter(function (d) {
      var c = d.x + d.w / 2;
      return d.mode === 'run' && c > SHOT.zone[0] && c < SHOT.zone[1];
    });
    if (!targets.length) return;
    var d = targets[Math.floor(Math.random() * targets.length)];
    d.mode = 'fade';
    d.fadeT = 0;
    recoilAt = now;
    nextShot = now + rand(SHOT.every);
  }

  function updateHunter(now) {
    var ph = now * 2 * Math.PI * WALK.hz;
    var s = Math.sin(ph);
    var bob = -WALK.bob * (1 - Math.abs(s));

    var rt = (now - recoilAt) / RECOIL.time, rk = 0;
    if (rt >= 0 && rt < 1) rk = rt < 0.18 ? smooth(rt / 0.18) : 1 - smooth((rt - 0.18) / 0.82);

    var lift = 'translate(0,' + px(bob * u) + ')';

    if (H.body) H.body.style.transform = lift;

    var shoulder = H.arms ? pivotOf(H.arms, PIVOT.hunter_arms) : null;
    var armAngle = WALK.armSway * Math.sin(ph * 0.5 + 0.7) + RECOIL.angle * rk;
    var armShift = 'translate(' + px(-RECOIL.shift * rk * u) + ',0)';

    if (H.arms) H.arms.style.transform = lift + ' ' + armShift + ' ' + rotAbout(armAngle, local(H.arms, shoulder));

    if (H.strap && shoulder) {
      var hook = pivotOf(H.strap, PIVOT.hunter_strap);
      H.strap.style.transform = lift + ' ' + armShift + ' ' + rotAbout(armAngle, local(H.strap, shoulder)) + ' ' +
        rotAbout(WALK.strapSwing * Math.sin(ph + 1.2), local(H.strap, hook));
    }

    [[H.legL, PIVOT.hunter_leg_left, 1], [H.legR, PIVOT.hunter_leg_right, -1]].forEach(function (l) {
      if (!l[0]) return;
      var hip = pivotOf(l[0], l[1]);
      l[0].style.transform = rotAbout(WALK.legSwing * s * l[2], local(l[0], hip));
    });

    if (H.shadow) {
      var sx = 1 + WALK.shadowPulse * Math.sin(2 * ph);
      H.shadow.style.transform = scaleAbout(sx, 1, { x: 0, y: H.shadow.offsetHeight / 2 });
    }
  }

  function birdHome(b) {
    var e = b.body;
    return { x: (e.offsetLeft + e.offsetWidth / 2) / u, y: (e.offsetTop + e.offsetHeight / 2) / u };
  }

  function norm(x, y) {
    var l = Math.sqrt(x * x + y * y) || 1;
    return [x / l, y / l];
  }

  function updateScroll(now) {
    scrollLayers.forEach(function (l) {
      var s = (now * SCROLL.speed * l.f) % SCROLL.period;
      l.el.style.transform = 'translate(' + px(-s * u) + ',0)';
    });
  }

  function birdNext(b, now) {
    var st = b.st;
    st.t0 = now;
    if (st.mode === 'rest') {
      st.mode = 'leave';
      st.dir = norm(b.c.face * 0.75, -1);
    } else if (st.mode === 'leave') {
      st.mode = 'away';
      st.dur = rand(FLIGHT.away);
    } else if (st.mode === 'away') {
      st.mode = 'return';
      st.dur = rand(FLIGHT.returnTime);
      var d = norm(-b.c.face * 0.9, -0.65);
      st.from = [d[0] * FLIGHT.returnDist, d[1] * FLIGHT.returnDist];
    } else {
      st.mode = 'rest';
      st.dur = rand(FLIGHT.rest);
    }
  }

  function updateBirds(now, dt) {
    birds.forEach(function (b, i) {
      var st = b.st, t = now - st.t0;
      var dx = 0, dy = 0, tilt = 0, hz = FLAP.restHz, amp = FLAP.restAngle;

      if (st.mode === 'rest') {
        dy = 6 * Math.sin(now * 2.1 + i);
        if (t > st.dur) birdNext(b, now);
      } else if (st.mode === 'leave') {
        var dist = FLIGHT.leaveSpeed * t + 0.5 * FLIGHT.leaveAccel * t * t;
        dx = st.dir[0] * dist;
        dy = st.dir[1] * dist;
        tilt = -b.c.face * FLIGHT.tilt * smooth(t / 0.6);
        hz = FLAP.flyHz; amp = FLAP.flyAngle;
        st.last = [dx, dy];
        var h = birdHome(b);
        if (h.y + dy < -300 || h.x + dx < -300 || h.x + dx > REF + 300) birdNext(b, now);
      } else if (st.mode === 'away') {
        dx = st.last[0]; dy = st.last[1];
        if (t > st.dur) birdNext(b, now);
      } else {
        var k = 1 - Math.pow(1 - clamp(t / st.dur, 0, 1), 3);
        var nx = -st.from[1], ny = st.from[0];
        if (ny < 0) { nx = -nx; ny = -ny; }
        var nl = Math.sqrt(nx * nx + ny * ny) || 1;
        var arc = FLIGHT.arc * Math.sin(Math.PI * k);
        dx = st.from[0] * (1 - k) + nx / nl * arc;
        dy = st.from[1] * (1 - k) + ny / nl * arc;
        tilt = b.c.face * FLIGHT.tilt * (1 - k);
        hz = FLAP.flyHz - (FLAP.flyHz - FLAP.restHz) * k;
        amp = FLAP.flyAngle - (FLAP.flyAngle - FLAP.restAngle) * k;
        if (t > st.dur) birdNext(b, now);
      }

      st.flap += dt * 2 * Math.PI * hz;
      var flap = Math.sin(st.flap);
      var C = { x: b.c.wings.wing_left[0] / 2 + b.c.wings.wing_right[0] / 2, y: b.c.wings.wing_left[1] / 2 + b.c.wings.wing_right[1] / 2 };
      var move = 'translate(' + px(dx * u) + ',' + px(dy * u) + ') ';

      b.body.style.transform = move + rotAbout(tilt, local(b.body, C));
      ['wing_left', 'wing_right'].forEach(function (w) {
        var el = b.wings[w];
        if (!el) return;
        var J = { x: b.c.wings[w][0], y: b.c.wings[w][1] };
        el.style.transform = move + rotAbout(tilt, local(el, C)) + ' ' + rotAbout(-b.c.side[w] * amp * flap, local(el, J));
      });
    });
  }

  var clock = 0, last = null;

  function frame(ts) {
    if (last === null) last = ts;
    var dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;
    clock += dt;

    updateScroll(clock);
    updateShots(clock);
    updateHunter(clock);
    updateDeer(clock, dt);
    updateBirds(clock, dt);

    requestAnimationFrame(frame);
  }

  var started = false;
  function start() {
    if (started) return;
    started = true;
    layout();
    initDeer();
    birds.forEach(function (b) {
      b.st = { mode: 'rest', t0: 0, dur: b.c.firstRest + Math.random(), flap: Math.random() * 6.283 };
    });
    requestAnimationFrame(frame);
  }

  if (window.ResizeObserver) {
    new ResizeObserver(function () { if (started) layout(); }).observe(scene);
  }

  var imgs = scene.querySelectorAll('img');
  var pending = imgs.length;
  function oneDone() { if (--pending <= 0) start(); }

  if (!pending) start();
  Array.prototype.forEach.call(imgs, function (img) {
    if (img.complete) {
      oneDone();
    } else {
      img.addEventListener('load', oneDone);
      img.addEventListener('error', oneDone);
    }
  });
  window.addEventListener('load', start);
});