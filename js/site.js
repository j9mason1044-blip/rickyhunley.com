/**
 * Hero video reveal.
 *
 * The hero has a still image underneath and the video layered over it at
 * opacity 0. The video only fades in once it is actually playing, so a browser
 * that blocks autoplay — or a slow connection — just keeps showing the still
 * instead of a black rectangle. Mirrors the `heroVideoRef` behaviour in the
 * design source.
 */
(function () {
  var el = document.querySelector('[data-hero-video]');
  if (!el) return;

  // Safari needs all three of these set before it will honour autoplay.
  el.muted = true;
  el.setAttribute('muted', '');
  el.defaultMuted = true;

  function reveal() {
    el.style.opacity = '1';
  }

  if (el.readyState >= 3 && !el.paused) requestAnimationFrame(reveal);
  el.addEventListener('playing', reveal);
  el.addEventListener('timeupdate', function () {
    if (el.currentTime > 0.05) reveal();
  });

  var playing = el.play();
  if (playing && playing.catch) playing.catch(function () {});
})();
