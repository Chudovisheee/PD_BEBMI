document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  /* ======================================================================
     УХО: медленный наклон → машет ×2 → медленный возврат → пауза
     ====================================================================== */
  function makeEarFlap(el, baseAngle, maxAngle, flapAngle, tiltTime, flapTime,
                       flapCount, pauseTime, origin, phaseShift) {
    if (!el) return;

    el.style.transformOrigin = origin;
    el.style.willChange = 'transform';

    var shift = phaseShift || 0;
    var flapTotal = flapTime * 2 * flapCount;
    var cycleLength = tiltTime + flapTotal + tiltTime + pauseTime;
    var start = null;

    function easeInOut(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function tick(now) {
      if (start === null) start = now;

      var t = (now - start + shift) % cycleLength;
      var angle = 0;

      if (t < tiltTime) {
        /* Фаза 1: медленный наклон от 0 к maxAngle */
        var p = t / tiltTime;
        angle = easeInOut(p) * maxAngle * baseAngle;

      } else if (t < tiltTime + flapTotal) {
        /* Фаза 2: быстрый мах вокруг уже достигнутого угла х2 */
        var ft = t - tiltTime;
        var halfIndex = Math.floor(ft / flapTime);
        var local = (ft % flapTime) / flapTime;
        var bump = Math.sin(local * Math.PI);
        var dir = (halfIndex % 2 === 0) ? 1 : -1;

        angle = maxAngle * baseAngle + bump * flapAngle * dir * baseAngle;

      } else if (t < tiltTime + flapTotal + tiltTime) {
        /* Фаза 3: медленный возврат в 0 */
        var p3 = (t - tiltTime - flapTotal) / tiltTime;
        angle = (1 - easeInOut(p3)) * maxAngle * baseAngle;

      } else {
        /* Фаза 4: пауза */
        angle = 0;
      }

      el.style.transform = 'rotate(' + angle.toFixed(3) + 'deg)';
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function makeSway(el, maxAngleR, maxAngleL, fullPeriod, pause, origin, phaseShift) {
    if (!el) return;

    el.style.transformOrigin = origin;
    el.style.willChange = 'transform';

    var totalAngle = maxAngleR + maxAngleL;
    var rightDuration = totalAngle === 0
      ? fullPeriod * 0.5
      : fullPeriod * (maxAngleR / totalAngle);
    var leftDuration = fullPeriod - rightDuration;

    var cycle = fullPeriod + pause;
    var shift = phaseShift || 0;
    var start = null;

    function tick(now) {
      if (start === null) start = now;

      var t = (now - start + shift) % cycle;
      var angle = 0;

      if (t < fullPeriod) {
        if (t < rightDuration) {
          angle = Math.sin((t / rightDuration) * Math.PI) * maxAngleR;
        } else {
          angle = -Math.sin(((t - rightDuration) / leftDuration) * Math.PI) * maxAngleL;
        }
      }

      el.style.transform = 'rotate(' + angle.toFixed(3) + 'deg)';
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function makeEyeLook(el, baseX, lookX, stepPeriod, transition) {
    if (!el) return;

    el.style.willChange = 'transform';
    el.style.transition = 'transform ' + transition + 'ms ease-in-out';

    var lookingAway = false;
    var start = null;

    function tick(now) {
      if (start === null) start = now;

      if (now - start >= stepPeriod) {
        start = now;
        lookingAway = !lookingAway;
        el.style.transform = 'translateX(' + (lookingAway ? lookX : baseX) + 'px)';
      }

      requestAnimationFrame(tick);
    }

    el.style.transform = 'translateX(' + baseX + 'px)';
    requestAnimationFrame(tick);
  }

  makeEarFlap(
    document.getElementById('ear_fg'),
    +1,
    14,
    4,
    1500,
    220,
    2,
    900,
    '50% 100%',
    0
  );

  makeEarFlap(
    document.getElementById('ear_bg'),
    -1,
    14,
    4,
    1500,
    220,
    2,
    900,
    '50% 100%',
    0
  );

  var PERIOD = 4000;
  makeSway(document.getElementById('falinas_tongue'), 20, 20, PERIOD, 0, '50% 0%', PERIOD / 2);

  var EYE_STEP = 2500;
  var EYE_TRANS = 600;
  makeEyeLook(document.getElementById('bembis_left_eye'), 0, -2, EYE_STEP, EYE_TRANS);
  makeEyeLook(document.getElementById('bembis_right_eye'), 0, -2, EYE_STEP, EYE_TRANS);

  makeSway(document.getElementById('life1'), 10, 3, 3400, 0, '0% 0%',    400);
  makeSway(document.getElementById('life2'), 8,  3, 3100, 0, '0% 100%',  900);
  makeSway(document.getElementById('life3'), 5,  5, 2800, 0, '50% 100%', 1500);
  makeSway(document.getElementById('life4'), 5,  5, 3200, 0, '50% 100%', 700);
  makeSway(document.getElementById('life5'), 7,  7, 3600, 0, '0% 50%',   1800);
});