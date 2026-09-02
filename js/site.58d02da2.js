/**
 * The two pieces of behaviour the design expresses as component state, and
 * which a static page therefore has to do itself: the hero video reveal and
 * the mobile menu. (The photo columns used to be a third; the design now
 * crossfades them with a CSS animation, so nothing here drives them.)
 *
 * Generated markup carries the hooks (`data-hero-video`, `data-menu-toggle`);
 * this file is hand-written and stable.
 */
(function () {
  'use strict';

  // --- hero video ----------------------------------------------------------
  // A still sits underneath and the video is layered over it at opacity 0. The
  // video only fades in once it is genuinely playing, so a blocked autoplay or
  // a slow connection leaves the still in place instead of a black rectangle.
  (function heroVideo() {
    var el = document.querySelector('[data-hero-video]');
    if (!el) return;

    // Safari wants all three of these before it will honour autoplay.
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

  // --- mobile menu ---------------------------------------------------------
  (function mobileMenu() {
    var button = document.querySelector('[data-menu-toggle]');
    var drawer = document.getElementById('mobile-menu');
    if (!button || !drawer) return;

    var iconOpen = button.querySelector('[data-menu-icon="open"]');
    var iconClosed = button.querySelector('[data-menu-icon="closed"]');

    function setOpen(open) {
      drawer.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      if (iconOpen) iconOpen.hidden = !open;
      if (iconClosed) iconClosed.hidden = open;
    }

    button.addEventListener('click', function (e) {
      e.preventDefault();
      setOpen(drawer.hidden);
    });

    // Escape closes it, and focus goes back to the control that opened it.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.hidden) {
        setOpen(false);
        button.focus();
      }
    });

    // Returning to desktop width leaves the drawer hidden rather than stranded
    // open behind a burger that is no longer on screen.
    var wide = window.matchMedia('(min-width: 901px)');
    var onChange = function (e) {
      if (e.matches) setOpen(false);
    };
    if (wide.addEventListener) wide.addEventListener('change', onChange);
    else if (wide.addListener) wide.addListener(onChange);
  })();

})();
