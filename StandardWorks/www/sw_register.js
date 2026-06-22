/**
 * Dynamic service worker registration — uses version.json from each deploy
 * so pushes invalidate caches without manual ?v= bumps on every file.
 */
(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  function assetBase() {
    var p = (location.pathname || '').toLowerCase();
    return p.indexOf('/bom/') !== -1 ? '../' : '';
  }

  function onBomPage() {
    return (location.pathname || '').toLowerCase().indexOf('/bom/') !== -1;
  }

  function handleResetSw() {
    try {
      if (new URLSearchParams(location.search).get('reset_sw') !== '1') return false;
      Promise.resolve()
        .then(function () { return navigator.serviceWorker.getRegistrations(); })
        .then(function (regs) {
          return Promise.all((regs || []).map(function (r) { return r.unregister(); }));
        })
        .then(function () {
          if (!('caches' in window)) return;
          return caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) { return caches.delete(k); }));
          });
        })
        .then(function () {
          try { sessionStorage.clear(); } catch (e) {}
          try {
            if (new URLSearchParams(location.search).get('reset_ls') === '1') {
              localStorage.clear();
            }
          } catch (e) {}
        })
        .then(function () {
          var url = new URL(location.href);
          url.searchParams.delete('reset_sw');
          url.searchParams.delete('reset_ls');
          location.replace(url.toString());
        });
      return true;
    } catch (e) {
      return false;
    }
  }

  if (handleResetSw()) return;

  var reloadOnce = false;
  var base = assetBase();
  var DEPLOY_KEY = 'sw-deploy-build';

  function fetchBuildMeta() {
    var bust = 'v=' + Date.now();
    var url = base + 'version.json' + (base.indexOf('?') === -1 ? '?' : '&') + bust;
    return fetch(url, { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function skipWaitingOnAll() {
    return navigator.serviceWorker.getRegistrations().then(function (regs) {
      (regs || []).forEach(function (reg) {
        if (reg.waiting) {
          try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {}
        }
      });
    });
  }

  function purgeAllCaches() {
    if (!('caches' in window)) return Promise.resolve();
    return caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    });
  }

  /** New deploy detected — clear PWA caches and activate waiting workers. */
  function applyDeployUpgrade(meta) {
    var build = meta && meta.build;
    if (!build) return Promise.resolve(false);
    var prev = '';
    try { prev = sessionStorage.getItem(DEPLOY_KEY) || ''; } catch (e) {}
    try { sessionStorage.setItem(DEPLOY_KEY, build); } catch (e) {}
    if (!prev || prev === build) return Promise.resolve(false);

    return purgeAllCaches()
      .then(function () {
        return navigator.serviceWorker.getRegistrations();
      })
      .then(function (regs) {
        return Promise.all((regs || []).map(function (r) { return r.update(); }));
      })
      .then(skipWaitingOnAll)
      .then(function () { return true; });
  }

  function registerSw(buildId) {
    var id = buildId || 'local';
    var url = (onBomPage() ? './sw.js' : base + 'service-worker.js') +
      '?build=' + encodeURIComponent(id);
    var opts = onBomPage() ? undefined : (base ? { scope: base } : undefined);
    return navigator.serviceWorker.register(url, opts)
      .then(function (reg) {
        reg.update();
        if (reg.waiting) {
          try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {}
        }
        return reg;
      });
  }

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloadOnce) return;
    reloadOnce = true;
    location.reload();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    fetchBuildMeta().then(function (meta) {
      return applyDeployUpgrade(meta);
    }).then(function (upgraded) {
      if (upgraded) return;
      return navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all((regs || []).map(function (r) { return r.update(); }));
      });
    });
  });

  fetchBuildMeta()
    .then(function (meta) {
      return applyDeployUpgrade(meta).then(function () {
        return registerSw(meta && meta.build);
      });
    });

})();
