document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var DELAY    = 0.6;
  var DURATION = 8;
  var EASE_POW = 2.2;
  var SOFTNESS = 40;
  var FROM     = -0.04;
  var TO       = 1.04;
  var FLOW_MAX = 250 / 255;

  var funcs = document.querySelectorAll('.pool__func');
  var poolImage = document.getElementById('pool_image');
  if (!funcs.length || !poolImage) return;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function setLevel(t) {
    var intercept = (SOFTNESS * t * FLOW_MAX).toFixed(4);
    var slope = (-SOFTNESS).toString();
    for (var i = 0; i < funcs.length; i++) {
      funcs[i].setAttribute('slope', slope);
      funcs[i].setAttribute('intercept', intercept);
    }
  }

  setLevel(FROM);

  var start = null;

  function frame(now) {
    if (start === null) start = now;
    var p = clamp(((now - start) / 1000 - DELAY) / DURATION, 0, 1);
    var eased = 1 - Math.pow(1 - p, EASE_POW);
    setLevel(FROM + (TO - FROM) * eased);

    if (p < 1) {
      requestAnimationFrame(frame);
    } else {
      poolImage.removeAttribute('mask');
    }
  }

  function run() { requestAnimationFrame(frame); }

  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run);
});