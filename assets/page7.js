document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var REF = 1920;

  var LEAF = {
    speed: [80, 130],
    sway: [40, 90],
    swayPeriod: [3, 5],
    spin: [40, 110],
    flutterHz: [0.4, 0.9],
    startDelay: [0, 1.5],
    respawnDelay: [0.3, 2.5],
    respawnX: [60, 1700]
  };

  var CLOUDS = [
    { id: 'cloud_1', amp: 70, period: 19, phase: 0.0 },
    { id: 'cloud_2', amp: 55, period: 16, phase: 2.1 },
    { id: 'cloud_3', amp: 80, period: 22, phase: 4.0 }
  ];

  var SNOW = {
    speed: [28, 70],
    sway: [4, 14],
    swaySpeed: [0.6, 1.4],
    twinkleSpeed: [1.5, 4],
    minAlpha: 0.25,
    margin: 60
  };

  var FLAKES = [
    [47,0,11,24], [659,0,40,83], [1354,0,61,87], [529,19,61,123], [768,26,34,130], [1555,27,32,100],
    [472,42,35,60], [261,60,25,58], [916,62,42,105], [1727,124,28,54], [1422,126,46,109], [600,155,63,113],
    [62,172,64,116], [1636,189,30,78], [893,207,29,69], [213,232,29,54], [394,253,27,94], [1682,259,28,61],
    [290,282,42,53], [1769,293,14,53], [0,300,26,81], [470,316,23,62], [596,328,27,38], [719,355,43,65],
    [1623,370,87,195], [1358,376,34,87], [1468,380,40,62], [1400,420,55,133], [342,422,50,83], [1277,430,36,61],
    [250,451,44,59], [26,468,32,128], [525,500,41,141], [893,564,54,87], [1699,573,26,74], [778,582,36,67],
    [1517,593,59,96], [1727,605,28,66], [54,606,42,77], [443,612,46,103], [549,688,53,122], [199,702,34,58],
    [1691,748,16,55], [1519,757,35,51], [35,771,39,128], [1583,781,49,60], [268,908,27,44], [885,927,30,59],
    [336,943,31,49], [179,963,30,84], [453,980,33,44], [382,988,46,65], [245,998,76,128], [879,1011,53,173],
    [966,1092,21,80], [762,1098,80,77], [1434,1101,66,123], [468,1118,49,75], [64,1135,58,124], [550,1186,45,56],
    [1059,1187,41,96], [254,1210,26,64], [902,1217,44,101], [1175,1221,50,90], [855,1256,32,71], [451,1259,37,78],
    [507,1265,29,58], [1632,1362,73,143], [931,1396,44,83], [520,1437,41,126], [1434,1443,49,112], [1193,1449,48,117],
    [164,1531,148,253], [1079,1541,39,60], [21,1560,46,138], [883,1572,30,85], [432,1578,38,65], [1631,1629,57,120],
    [1462,1652,52,118], [963,1685,51,81], [1201,1772,71,148], [1027,1832,26,47]
  ];

  function $(id) { return document.getElementById(id); }

  var scene = $('scene');
  if (!scene) return;

  function rand(r) { return r[0] + Math.random() * (r[1] - r[0]); }
  function sign()  { return Math.random() < 0.5 ? -1 : 1; }
  function px(v)   { return v.toFixed(2) + 'px'; }

  var u = 1;

  var leaves = [];
  for (var i = 1; i <= 6; i++) {
    var el = $('leaf_' + i);
    if (el) leaves.push({ el: el });
  }

  var clouds = CLOUDS.map(function (c) { return { c: c, el: $(c.id) }; })
    .filter(function (c) { return c.el; });

  var snowImg = $('snow'), canvas = $('snow_canvas');
  var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  var flakes = [], k = 1;

  function resetLeaf(l, now, first) {
    if (first) {
      l.baseX = l.homeX;
      l.y = l.homeY;
      l.wait = rand(LEAF.startDelay);
    } else {
      l.baseX = rand(LEAF.respawnX);
      l.y = -l.h - 40 - Math.random() * 160;
      l.wait = rand(LEAF.respawnDelay);
    }
    l.t0 = now + l.wait;
    l.angle = first ? 0 : Math.random() * 360;
    l.speed = rand(LEAF.speed);
    l.swayAmp = rand(LEAF.sway);
    l.swayPeriod = rand(LEAF.swayPeriod);
    l.spin = rand(LEAF.spin) * sign();
    l.flutter = rand(LEAF.flutterHz);
  }

  function layout() {
    u = scene.clientWidth / REF || 1;
    leaves.forEach(function (l) {
      l.homeX = l.el.offsetLeft / u;
      l.homeY = l.el.offsetTop / u;
      l.w = l.el.offsetWidth / u;
      l.h = l.el.offsetHeight / u;
    });
    if (ctx) {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(scene.clientWidth * dpr);
      canvas.height = Math.round(scene.clientHeight * dpr);
      k = canvas.width / REF;
    }
  }

  function initSnow() {
    if (!ctx || !snowImg) return;
    var left = snowImg.offsetLeft / u, top = snowImg.offsetTop / u;
    var scale = (snowImg.offsetWidth / u) / (snowImg.naturalWidth || 1);
    flakes = FLAKES.map(function (f) {
      return {
        sx: f[0], sy: f[1], sw: f[2], sh: f[3],
        x: left + f[0] * scale, y: top + f[1] * scale,
        w: f[2] * scale, h: f[3] * scale,
        speed: rand(SNOW.speed),
        swayA: rand(SNOW.sway), swayW: rand(SNOW.swaySpeed), swayP: Math.random() * 6.283,
        twW: rand(SNOW.twinkleSpeed), twP: Math.PI / 2
      };
    });
  }

  function updateLeaves(now, dt) {
    leaves.forEach(function (l) {
      if (now < l.t0) {
        if (l.y < 0) l.el.style.visibility = 'hidden';
        return;
      }
      l.el.style.visibility = 'visible';
      var t = now - l.t0;
      l.y += l.speed * dt;
      l.angle += l.spin * dt;
      var sway = l.swayAmp * Math.sin(2 * Math.PI * t / l.swayPeriod);
      var flutter = 1 - 0.3 * (0.5 - 0.5 * Math.cos(2 * Math.PI * l.flutter * t));
      l.el.style.transform =
        'translate(' + px((l.baseX + sway - l.homeX) * u) + ',' + px((l.y - l.homeY) * u) + ') ' +
        'rotate(' + l.angle.toFixed(2) + 'deg) scaleY(' + flutter.toFixed(3) + ')';
      if (l.y > REF + 20) resetLeaf(l, now, false);
    });
  }

  function updateClouds(now) {
    clouds.forEach(function (c) {
      var w = 2 * Math.PI / c.c.period;
      var dx = c.c.amp * (Math.sin(w * now + c.c.phase) - Math.sin(c.c.phase));
      var dy = 6 * (Math.sin(w * 1.3 * now + c.c.phase) - Math.sin(c.c.phase));
      c.el.style.transform = 'translate(' + px(dx * u) + ',' + px(dy * u) + ')';
    });
  }

  function drawSnow(now, dt) {
    if (!ctx || !flakes.length) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var span = REF + 2 * SNOW.margin;
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.y += f.speed * dt;
      if (f.y > REF + SNOW.margin) f.y -= span + f.h;
      var x = f.x + f.swayA * Math.sin(f.swayW * now + f.swayP) - f.swayA * Math.sin(f.swayP);
      ctx.globalAlpha = SNOW.minAlpha + (1 - SNOW.minAlpha) * (0.5 + 0.5 * Math.sin(f.twW * now + f.twP));
      ctx.drawImage(snowImg, f.sx, f.sy, f.sw, f.sh, x * k, f.y * k, f.w * k, f.h * k);
    }
    ctx.globalAlpha = 1;
  }

  var clock = 0, last = null;

  function frame(ts) {
    if (last === null) last = ts;
    var dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;
    clock += dt;

    updateLeaves(clock, dt);
    updateClouds(clock);
    drawSnow(clock, dt);

    requestAnimationFrame(frame);
  }

  function start() {
    layout();
    leaves.forEach(function (l) { resetLeaf(l, 0, true); });
    initSnow();
    if (ctx && flakes.length) snowImg.style.visibility = 'hidden';
    requestAnimationFrame(frame);
  }

  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      if (!flakes.length && !leaves.length) return;
      var oldU = u;
      layout();
      if (oldU !== u) initSnow();
    }).observe(scene);
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