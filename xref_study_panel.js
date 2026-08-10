/* ── Unified Study drawer: Refs · Bookmarks · Notes · More ── */
(function () {
  'use strict';

  function panelEl() {
    return document.getElementById('xref-panel');
  }

  function setXrefStudyTab(which) {
    var panel = panelEl();
    if (!panel) return;
    var tabs = panel.querySelectorAll('.xref-study-tab');
    var panes = panel.querySelectorAll('.xref-pane');

    tabs.forEach(function (t) {
      var active = t.getAttribute('data-xref-tab') === which;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    panes.forEach(function (p) {
      var id =
        (p.getAttribute('data-pane') || p.id.replace(/^xref-pane-/, '')).trim();
      p.classList.toggle('active', id === which);
    });
  }

  /** Open right Study drawer and optionally select a tab */
  function openXrefStudyAt(which) {
    which = which || 'refs';
    var xp = panelEl();
    if (!xp) return;
    try {
      if (typeof closeGlossary === 'function') closeGlossary();
    } catch (e) {}
    try {
      if (typeof closeAnnotationsPanel === 'function') closeAnnotationsPanel();
    } catch (e2) {}
    setXrefStudyTab(which);
    xp.scrollTop = 0;
    xp.classList.add('open');
    try {
      if (window.NavEngine) {
        if (which === 'bookmarks' && typeof NavEngine.refreshBookmarksUI === 'function') {
          NavEngine.refreshBookmarksUI();
        }
        if (
          which === 'more' &&
          typeof NavEngine.renderOfflineStatusPublic === 'function'
        ) {
          NavEngine.renderOfflineStatusPublic();
        }
      }
    } catch (e3) {}
  }

  /** Wire tab buttons once */
  function bindStudyTabsOnce() {
    var panel = panelEl();
    if (!panel || panel.getAttribute('data-study-tab-bound') === '1') return;
    panel.setAttribute('data-study-tab-bound', '1');
    panel.querySelectorAll('.xref-study-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-xref-tab');
        if (!tab) return;
        setXrefStudyTab(tab);
        if (
          tab === 'more' &&
          window.NavEngine &&
          NavEngine.renderOfflineStatusPublic
        ) {
          NavEngine.renderOfflineStatusPublic();
        }
      });
    });
  }

  /** Pages without unified nav sidebar (e.g. JST) omit bookmark/note/offline tools */
  function deferHideUnusedStudyTabs() {
    setTimeout(function () {
      if (document.getElementById('nav-sidebar')) return;
      ['bookmarks', 'notes', 'more'].forEach(function (k) {
        var btn = document.querySelector('.xref-study-tab[data-xref-tab="' + k + '"]');
        if (btn) btn.style.display = 'none';
      });
      try {
        setXrefStudyTab('refs');
      } catch (e) {}
    }, 0);
  }

  function wrapXrefOpens() {
    var names = ['openXrefPanel', 'openRootXrefPanel'];
    names.forEach(function (fname) {
      var fn = window[fname];
      if (typeof fn !== 'function' || fn._studyTabWrapped) return;
      var orig = fn;
      var wrapped = function () {
        setXrefStudyTab('refs');
        return orig.apply(this, arguments);
      };
      wrapped._studyTabWrapped = true;
      window[fname] = wrapped;
    });
  }

  function boot() {
    bindStudyTabsOnce();
    deferHideUnusedStudyTabs();
    setTimeout(function () {
      wrapXrefOpens();
    }, 0);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.setXrefStudyTab = setXrefStudyTab;
  window.openXrefStudyAt = openXrefStudyAt;
})();
