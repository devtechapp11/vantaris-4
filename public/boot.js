// Runs before first paint (same-origin, so the CSP allows it). Shows the
// pre-rendered hero in index.html only to signed-out visitors on the home
// page, so the headline paints before the JavaScript app has loaded.
(function () {
  try {
    var path = location.pathname;
    var home = path === '/' || path === '/welcome' || /\/(index\.html)?$/.test(path) && !/^\/(practice|ranking|profile|plans|onboarding)/.test(path);
    var session = false;
    for (var i = 0; i < localStorage.length; i++) {
      if (/^sb-.+-auth-token$/.test(localStorage.key(i))) session = true;
    }
    var preview = JSON.parse(localStorage.getItem('vantaris-preview-v1') || '{}');
    if (preview && preview.signedIn) session = true;
    if (home && !session) document.documentElement.setAttribute('data-prerender', '');
  } catch (e) {
    /* storage blocked: skip the pre-rendered hero */
  }
})();
