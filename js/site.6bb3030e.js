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

  // --- newsletter signup ---------------------------------------------------
  // Mailchimp does not send CORS headers on its subscribe endpoint, so a
  // fetch() from this origin is blocked however it is written. The supported
  // way to post from your own page is JSONP: /subscribe/post-json takes a `c`
  // parameter naming a callback it wraps the answer in.
  //
  // Nothing here is load-bearing. Without this file the forms are ordinary
  // POSTs to Mailchimp, which answers with its own hosted confirmation page in
  // a new tab. All this does is keep the reader on the page they were reading.
  (function newsletter() {
    var forms = document.querySelectorAll(
      '[data-newsletter-form][data-mc-endpoint]'
    );

    Array.prototype.forEach.call(forms, function (form) {
      var status = form.querySelector('[data-newsletter-status]');
      var email = form.querySelector('input[type="email"]');
      var button = form.querySelector('button[type="submit"]');
      var honeypot = form.querySelector('input[tabindex="-1"]');
      var pending = false;

      function say(text) {
        if (status) status.textContent = text;
      }

      function done(text) {
        pending = false;
        if (button) button.disabled = false;
        say(text);
      }

      form.addEventListener('submit', function (e) {
        if (!email || !form.checkValidity()) return;
        e.preventDefault();
        if (pending) return;
        pending = true;
        if (button) button.disabled = true;
        say('One moment…');

        var name = 'mcDone' + Date.now();
        var url =
          form.getAttribute('data-mc-endpoint') +
          '&EMAIL=' + encodeURIComponent(email.value) +
          '&c=' + name;
        if (honeypot && honeypot.name) {
          url += '&' + encodeURIComponent(honeypot.name) + '=';
        }

        var script = document.createElement('script');
        var settled = false;

        function cleanup() {
          settled = true;
          try { delete window[name]; } catch (err) { window[name] = undefined; }
          if (script.parentNode) script.parentNode.removeChild(script);
        }

        // Mailchimp answers with HTML inside `msg`, and prefixes an error with
        // a code and a dash ("0 - "). Neither belongs on the page, and the
        // markup certainly does not go in via innerHTML.
        window[name] = function (data) {
          if (settled) return;
          cleanup();
          var ok = data && data.result === 'success';
          var msg = ((data && data.msg) || '')
            .replace(/^\d+\s*-\s*/, '')
            .replace(/<[^>]*>/g, '')
            .trim();
          if (ok) {
            form.reset();
            done(msg || 'Thanks — check your inbox to confirm.');
          } else {
            done(msg || 'That did not go through. Please try again.');
          }
        };

        script.onerror = function () {
          if (settled) return;
          cleanup();
          done('Could not reach the sign-up service. Please try again.');
        };

        // A callback that never fires would otherwise leave the button
        // disabled and the reader staring at "One moment…" forever.
        window.setTimeout(function () {
          if (settled) return;
          cleanup();
          done('That took too long. Please try again.');
        }, 10000);

        script.src = url;
        document.body.appendChild(script);
      });
    });
  })();

})();
