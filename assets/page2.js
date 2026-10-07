document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  /* ======================================================================
     СТРАНИЦА 2
       • Бабочка летает по сцене и машет крыльями
       • Кузнечик по клику/тапу выпрыгивает за экран и запрыгивает с другой стороны
       • Бемби следит глазами за бабочкой, шевелит ушами, чуть поворачивает голову

     Все координаты в НАСТРОЙКАХ — в «единицах сцены» (сцена = 1920 × 1920),
     как в исходной картинке. Скрипт сам пересчитывает их под размер экрана.
     ====================================================================== */

  /* ---------------------------- НАСТРОЙКИ ----------------------------- */

  var REF = 1920;                          // размер сцены в макете

  /* Голова */
  var NECK            = { x: 900, y: 620 };   // точка, вокруг которой голова чуть поворачивается
  var HEAD_MAX_ANGLE  = 3;                    // макс. поворот головы, градусы
  var HEAD_MAX_SHIFT  = 8;                    // макс. сдвиг головы, ед. сцены
  var HEAD_FOLLOW     = 2.2;                  // «ленивость» головы (больше = быстрее)

  /* Глаза */
  var EYE_MAX_MOVE    = 9;                    // насколько глаза смещаются за бабочкой, ед. сцены
  var EYE_FOLLOW      = 7;                    // скорость слежения глаз

  /* Уши: наклон → мах ×N → возврат → пауза (как на 1 странице).
     sign меняет направление (если ухо шевелится «не туда» — поставь -1 / +1) */
  var EARS = {
    left:  { pivot: '75% 88%', sign: -1, max: 7, flap: 3, tilt: 800, flapTime: 170, count: 2, pause: 2200, shift: 0 },
    right: { pivot: '12% 90%', sign: +1, max: 7, flap: 3, tilt: 800, flapTime: 170, count: 2, pause: 2600, shift: 1300 }
  };

  /* Бабочка */
  var BF_AXIS      = 56;      // угол тела бабочки (градусы) — вдоль него складываются крылья
  var BF_PIVOT     = { x: 558.5, y: 1450.5 }; // центр тела бабочки (ед. сцены): вокруг него наклон, зеркало и складывание крыльев
  var BF_FLAP_HZ   = 4.2;     // частота взмахов
  var BF_FLAP_MIN  = 0.28;    // насколько сильно крылья складываются (0.28 = до 28% ширины)
  var BF_INTRO     = 3000;    // мс плавного разлёта от стартового места
  var BF_FLIP_VX   = 25;      // скорость по X (ед. сцены/с), после которой бабочка разворачивается
  var BF_NATIVE_DIR = -1;     // куда бабочка смотрит на картинке: -1 = влево, +1 = вправо

  // траектория центра бабочки (ед. сцены), t — секунды
  function butterflyPath(t) {
    return {
      x: 1000 + 650 * Math.sin(0.33 * t) + 140 * Math.sin(1.1 * t + 1),
      y: 1050 + 430 * Math.sin(0.47 * t + 1.2) + 90 * Math.sin(1.7 * t) + 14 * Math.sin(9 * t)
    };
  }

  /* Кузнечик */
  var GH_PIVOT      = '50% 95%'; // точка под лапками (для «приседания»)
  var GH_CROUCH     = 230;       // мс приседание перед прыжком
  var GH_OUT        = 850;       // мс прыжок за экран
  var GH_GAP        = 250;       // мс пауза «за кадром»
  var GH_IN         = 850;       // мс прыжок обратно
  var GH_LAND       = 320;       // мс «пружинка» при приземлении
  var GH_ARC        = 0.35;      // высота дуги прыжка (доля ширины сцены)

  /* ------------------------------ ЭЛЕМЕНТЫ ----------------------------- */

  function $(id) { return document.getElementById(id); }

  var scene = $('scene');
  var el = {
    head: $('head'), leftEar: $('left_ear'), rightEar: $('right_ear'),
    leftEye: $('left_eye'), rightEye: $('right_eye'), eyelids: $('eyelids'),
    grasshopper: $('grasshopper'), wings: $('butterfly_wings'), body: $('butterfly_body')
  };

  if (!scene) return;
  for (var k in el) { if (!el[k]) return; }

  var headParts = [el.head, el.leftEar, el.rightEar, el.leftEye, el.rightEye, el.eyelids];
  var tfParts = headParts.concat([el.wings, el.body]);

  tfParts.forEach(function (e) {
    e.style.transformOrigin = '0 0';
    e.style.willChange = 'transform';
  });
  el.grasshopper.style.transformOrigin = GH_PIVOT;
  el.grasshopper.style.willChange = 'transform';

  /* ------------------------------ УТИЛИТЫ ------------------------------ */

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, k)  { return a + (b - a) * k; }
  function easeInOut(t)   { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function px(v)          { return v.toFixed(2) + 'px'; }
  function deg(v)         { return v.toFixed(3) + 'deg'; }

  // вращение вокруг точки p (в локальных координатах элемента, transform-origin = 0 0)
  function rotAbout(a, p) {
    return 'translate(' + px(p.x) + ',' + px(p.y) + ') rotate(' + deg(a) + ') translate(' + px(-p.x) + ',' + px(-p.y) + ')';
  }

  // точка сцены (в ед. сцены) → локальные координаты элемента в пикселях
  function local(e, P) {
    return { x: P.x * u - e.offsetLeft, y: P.y * u - e.offsetTop };
  }

  function centerOf(e) {
    return { x: (e.offsetLeft + e.offsetWidth / 2) / u, y: (e.offsetTop + e.offsetHeight / 2) / u };
  }

  /* ------------------------------ ГЕОМЕТРИЯ ---------------------------- */

  var u = 1;                           // пикселей в одной единице сцены
  var home = { x: 0, y: 0 };           // стартовый центр бабочки
  var eyeC = { l: { x: 0, y: 0 }, r: { x: 0, y: 0 } };
  var ghOutDX = 0, ghInDX = 0, ghArcH = 0;

  function parsePct(str, w, h) {
    var p = str.split(' ');
    return { x: parseFloat(p[0]) / 100 * w, y: parseFloat(p[1]) / 100 * h };
  }

  function layout() {
    u = scene.clientWidth / REF || 1;
    home = centerOf(el.body);
    eyeC.l = centerOf(el.leftEye);
    eyeC.r = centerOf(el.rightEye);

    var g = el.grasshopper;
    ghOutDX = -(g.offsetLeft + g.offsetWidth + 40 * u);       // за левый край (кузнечик смотрит влево)
    ghInDX  = scene.clientWidth - g.offsetLeft + 40 * u;      // из-за правого края
    ghArcH  = scene.clientWidth * GH_ARC;
  }

  /* ------------------------------ БАБОЧКА ------------------------------ */

  var bf = { x: 0, y: 0 };             // текущий центр бабочки (ед. сцены)

  var bfFlip = 1;                      // 1 = как на картинке, -1 = зеркально
  var bfFlipTarget = 1;

  function updateButterfly(now, dt) {
    var t = now / 1000;
    var blend = easeInOut(clamp(now / BF_INTRO, 0, 1));

    function at(tt) {
      var p = butterflyPath(tt);
      return { x: lerp(home.x, p.x, blend), y: lerp(home.y, p.y, blend) };
    }

    var p = at(t), p2 = at(t + 0.05);
    bf.x = p.x; bf.y = p.y;

    var vx = (p2.x - p.x) / 0.05;
    var tilt = clamp(vx / 12, -18, 18);          // наклон по ходу полёта
    var dx = (p.x - home.x) * u, dy = (p.y - home.y) * u;

    // --- разворот: летит «задом» → зеркалим по вертикали ---
    // (гистерезис по скорости, чтобы не дёргалась на изгибах траектории)
    if (vx > BF_FLIP_VX)  bfFlipTarget = (BF_NATIVE_DIR > 0) ? 1 : -1;
    if (vx < -BF_FLIP_VX) bfFlipTarget = (BF_NATIVE_DIR < 0) ? 1 : -1;
    bfFlip = bfFlipTarget;                       // зеркалим мгновенно
    var fl = bfFlip.toFixed(3);

    // ось зеркала — вертикаль через центр тела бабочки
    var bc = local(el.body, BF_PIVOT);
    var wc = local(el.wings, BF_PIVOT);

    // тело
    el.body.style.transform =
      'translate(' + px(dx) + ',' + px(dy) + ') ' +
      rotAbout(tilt, bc) + ' ' +
      'translate(' + px(bc.x) + ',0) scale(' + fl + ',1) translate(' + px(-bc.x) + ',0)';

    // крылья: наклон + зеркало + взмах поперёк оси тела
    var flap = 0.5 + 0.5 * Math.cos(t * 2 * Math.PI * BF_FLAP_HZ + 0.6 * Math.sin(t * 1.3));
    var k = BF_FLAP_MIN + (1 - BF_FLAP_MIN) * flap;
    var J = wc;                                  // крылья складываются вокруг центра тела

    el.wings.style.transform =
      'translate(' + px(dx) + ',' + px(dy) + ') ' +
      rotAbout(tilt, wc) + ' ' +
      'translate(' + px(wc.x) + ',0) scale(' + fl + ',1) translate(' + px(-wc.x) + ',0) ' +
      'translate(' + px(J.x) + ',' + px(J.y) + ') ' +
      'rotate(' + deg(BF_AXIS) + ') scale(1,' + k.toFixed(3) + ') rotate(' + deg(-BF_AXIS) + ') ' +
      'translate(' + px(-J.x) + ',' + px(-J.y) + ')';
  }

  /* ------------------------------ БЕМБИ -------------------------------- */

  var eyeS  = { l: { x: 0, y: 0 }, r: { x: 0, y: 0 } };
  var headS = { a: 0, x: 0, y: 0 };

  function eyeTarget(c) {
    var dx = bf.x - c.x, dy = bf.y - c.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var f = Math.min(d / 600, 1);
    return { x: dx / d * f * EYE_MAX_MOVE, y: dy / d * f * EYE_MAX_MOVE };
  }

  function earAngle(c, now) {
    var flapTotal = c.flapTime * 2 * c.count;
    var cycle = c.tilt + flapTotal + c.tilt + c.pause;
    var t = (now + c.shift) % cycle;
    var a = 0;

    if (t < c.tilt) {
      a = easeInOut(t / c.tilt) * c.max;
    } else if (t < c.tilt + flapTotal) {
      var ft = t - c.tilt;
      var idx = Math.floor(ft / c.flapTime);
      var loc = (ft % c.flapTime) / c.flapTime;
      a = c.max + Math.sin(loc * Math.PI) * c.flap * (idx % 2 === 0 ? 1 : -1);
    } else if (t < c.tilt + flapTotal + c.tilt) {
      a = (1 - easeInOut((t - c.tilt - flapTotal) / c.tilt)) * c.max;
    }
    return a * c.sign;
  }

  function updateDeer(now, dt) {
    // --- глаза ---
    var ke = 1 - Math.exp(-dt * EYE_FOLLOW);
    var tl = eyeTarget(eyeC.l), tr = eyeTarget(eyeC.r);
    eyeS.l.x = lerp(eyeS.l.x, tl.x, ke); eyeS.l.y = lerp(eyeS.l.y, tl.y, ke);
    eyeS.r.x = lerp(eyeS.r.x, tr.x, ke); eyeS.r.y = lerp(eyeS.r.y, tr.y, ke);

    // --- голова: чуть поворачивается к бабочке ---
    var kh = 1 - Math.exp(-dt * HEAD_FOLLOW);
    var hc = centerOf(el.head);
    var nx = clamp((hc.x - bf.x) / 900, -1, 1);   // бабочка левее головы → +1
    var ny = clamp((bf.y - hc.y) / 900, -1, 1);   // бабочка ниже → +1
    headS.a = lerp(headS.a, nx * HEAD_MAX_ANGLE, kh);
    headS.x = lerp(headS.x, -nx * HEAD_MAX_SHIFT, kh);
    headS.y = lerp(headS.y, ny * HEAD_MAX_SHIFT * 0.6, kh);

    function headTf(e) {
      return 'translate(' + px(headS.x * u) + ',' + px(headS.y * u) + ') ' + rotAbout(headS.a, local(e, NECK));
    }

    el.head.style.transform    = headTf(el.head);
    el.eyelids.style.transform = headTf(el.eyelids);

    el.leftEye.style.transform  = headTf(el.leftEye)  + ' translate(' + px(eyeS.l.x * u) + ',' + px(eyeS.l.y * u) + ')';
    el.rightEye.style.transform = headTf(el.rightEye) + ' translate(' + px(eyeS.r.x * u) + ',' + px(eyeS.r.y * u) + ')';

    // --- уши: движение головы + собственный мах ---
    var pl = parsePct(EARS.left.pivot,  el.leftEar.offsetWidth,  el.leftEar.offsetHeight);
    var pr = parsePct(EARS.right.pivot, el.rightEar.offsetWidth, el.rightEar.offsetHeight);
    el.leftEar.style.transform  = headTf(el.leftEar)  + ' ' + rotAbout(earAngle(EARS.left, now), pl);
    el.rightEar.style.transform = headTf(el.rightEar) + ' ' + rotAbout(earAngle(EARS.right, now), pr);
  }

  /* ------------------------------ КУЗНЕЧИК ----------------------------- */

  var gh = { state: 'idle', t0: 0 };

  function setGH(dx, dy, a, sx, sy) {
    el.grasshopper.style.transform =
      'translate(' + px(dx) + ',' + px(dy) + ') rotate(' + deg(a) + ') scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';
  }

  // дуга прыжка: x от fromX до toX, высота ghArcH
  function arc(p, fromX, toX) {
    var dxTotal = Math.abs(toX - fromX) || 1;
    var vy = 4 * ghArcH * (1 - 2 * p);              // >0 пока летит вверх
    var ang = Math.atan2(vy, dxTotal) * 180 / Math.PI * 0.8;
    return { x: lerp(fromX, toX, p), y: -4 * ghArcH * p * (1 - p), a: clamp(ang, -45, 45) };
  }

  function updateGrasshopper(now) {
    if (gh.state === 'idle') return;
    var e = now - gh.t0, p, r;

    if (gh.state === 'crouch') {
      p = clamp(e / GH_CROUCH, 0, 1);
      setGH(0, 0, 0, 1 + 0.12 * p, 1 - 0.18 * p);
      if (p >= 1) { gh.state = 'out'; gh.t0 = now; }

    } else if (gh.state === 'out') {
      p = clamp(e / GH_OUT, 0, 1);
      r = arc(p, 0, ghOutDX);
      setGH(r.x, r.y, r.a, 1, 1);
      if (p >= 1) { gh.state = 'gap'; gh.t0 = now; }

    } else if (gh.state === 'gap') {
      setGH(ghInDX, 0, 0, 1, 1);                     // ждём за правым краем
      if (e >= GH_GAP) { gh.state = 'in'; gh.t0 = now; }

    } else if (gh.state === 'in') {
      p = clamp(e / GH_IN, 0, 1);
      r = arc(p, ghInDX, 0);
      setGH(r.x, r.y, r.a, 1, 1);
      if (p >= 1) { gh.state = 'land'; gh.t0 = now; }

    } else if (gh.state === 'land') {
      p = clamp(e / GH_LAND, 0, 1);
      var sq = Math.sin(p * Math.PI) * (1 - p);      // быстрая «пружинка»
      setGH(0, 0, 0, 1 + 0.14 * sq, 1 - 0.18 * sq);
      if (p >= 1) { gh.state = 'idle'; setGH(0, 0, 0, 1, 1); }
    }
  }

  /* --- клик / тап: попадаем только по самому кузнечику (по прозрачности) --- */

  var ghCtx = null;
  function prepAlphaMask() {
    try {
      var img = el.grasshopper;
      var c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      var ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      ctx.getImageData(0, 0, 1, 1);                  // бросит ошибку, если холст «заражён» (file://)
      ghCtx = ctx;
    } catch (err) {
      ghCtx = null;                                  // тогда ловим клик по прямоугольнику картинки
    }
  }

  function hitGH(cx, cy) {
    var r = el.grasshopper.getBoundingClientRect();
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return false;
    if (!ghCtx) return true;
    var c = ghCtx.canvas;
    var x = Math.round((cx - r.left) / r.width * c.width);
    var y = Math.round((cy - r.top) / r.height * c.height);
    var R = 14;                                      // небольшой «запас», чтобы попадать по тонким лапкам
    var d = ghCtx.getImageData(Math.max(0, x - R), Math.max(0, y - R), 2 * R + 1, 2 * R + 1).data;
    for (var i = 3; i < d.length; i += 4) { if (d[i] > 20) return true; }
    return false;
  }

  document.addEventListener('pointerdown', function (ev) {
    if (gh.state !== 'idle') return;
    if (hitGH(ev.clientX, ev.clientY)) {
      gh.state = 'crouch';
      gh.t0 = performance.now();
    }
  });

  document.addEventListener('pointermove', function (ev) {
    if (ev.pointerType === 'touch') return;
    scene.style.cursor = (gh.state === 'idle' && hitGH(ev.clientX, ev.clientY)) ? 'pointer' : '';
  });

  /* ------------------------------ ЦИКЛ -------------------------------- */

  var startTime = null, last = null;

  function frame(now) {
    if (startTime === null) { startTime = now; last = now; }
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    updateButterfly(now - startTime, dt);
    updateDeer(now - startTime, dt);
    updateGrasshopper(now);

    requestAnimationFrame(frame);
  }

  function start() {
    layout();
    prepAlphaMask();
    requestAnimationFrame(frame);
  }

  // пересчёт при изменении размера
  if (window.ResizeObserver) {
    new ResizeObserver(layout).observe(scene);
  } else {
    window.addEventListener('resize', layout);
  }

  // стартуем, когда загрузятся все картинки сцены
  var imgs = scene.querySelectorAll('img');
  var pending = imgs.length;
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