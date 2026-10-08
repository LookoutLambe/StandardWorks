/* votd.js — the front page's verse for today, from this week's Come, Follow Me reading.
   (User, 2026-10-08: "a verse of the day from the come follow me schedule ... without being a
   distraction".) Loaded by index.html only; never by a reading page.

   The verses are chosen ahead of time by tools/build_votd.js and written one small file per
   week, votd/<monday>.js, which calls window.__votdWeek. Only this week's file is fetched
   (about 4 KB), never the year.

   NOT A DISTRACTION, by construction: one verse in the page's own quiet type, no animation, no
   badge, no notification. The × hides it for the rest of the day; the footer's "Hide the daily
   verse" turns it off until turned back on. State is one localStorage key, sw-votd:
     ''               shown
     'off'            off until the footer turns it back on
     'hide:<date>'    hidden for that day only
   Every read and write is guarded: a private window simply shows the verse. */
(function () {
  'use strict';
  var KEY = 'sw-votd';
  var box = document.getElementById('votd');
  var toggle = document.getElementById('votd-toggle');
  if (!box) return;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function thisMonday() { var d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); }
  function getState() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function setState(v) { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function syncToggle() {
    if (!toggle) return;
    toggle.textContent = getState() === 'off' ? 'Show the daily verse' : 'Hide the daily verse';
  }

  /* A NEW DAY WITHOUT A RELOAD (user, 2026-10-08). A page left open, or an app brought
     back from the background, kept yesterday's verse: the day was read once, at load.
     refresh() reads it again when the page comes back to the front, when the browser
     restores it from its back/forward cache, and at local midnight; a new day in the
     same week renders from the week already loaded, a new week loads its file. */
  var weekWanted = '', weekData = null, shownDay = '';
  function load() {
    var monday = thisMonday();
    if (weekWanted === monday) { if (weekData) render(weekData); return; }
    weekWanted = monday;
    weekData = null;
    window.__votdWeek = function (week) {
      if (!week || week.week !== weekWanted) return;   // a late file from a week already past
      weekData = week;
      render(week);
    };
    var s = document.createElement('script');
    s.src = 'votd/' + monday + '.js';
    s.async = true;
    s.onerror = function () { box.hidden = true; };   // no file for this week: nothing is shown
    document.head.appendChild(s);
  }

  function refresh() {
    if (document.visibilityState === 'hidden') return;
    var st = getState(), t = today();
    if (st === 'off' || st === 'hide:' + t) return;
    if (st.indexOf('hide:') === 0) setState('');      // yesterday's "hide for today" has expired
    if (shownDay === t && !box.hidden) return;
    load();
  }

  function atMidnight() {
    var now = new Date();
    var next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    setTimeout(function () { refresh(); atMidnight(); }, next - now);
  }

  function render(week) {
    var day = null, list = (week && week.days) || [], t = today();
    for (var i = 0; i < list.length; i++) if (list[i].d === t) { day = list[i]; break; }
    if (!day) { box.hidden = true; return; }
    shownDay = t;
    /* The reference is the KJV's (Isaiah 9:6); the link is the site's own numbering, which for
       the Old Testament is the Hebrew's (9:5). NavEngineRefHref builds it exactly as a
       cross-reference does, and NavEngineFollow marks the way back. */
    var href = (typeof window.NavEngineRefHref === 'function' && window.NavEngineRefHref(day.b, day.c, day.v)) || '';
    box.innerHTML =
      '<div class="votd-head">' +
        '<span class="votd-label" id="votd-label">Come, Follow Me' + (week.reading ? ' · ' + esc(week.reading) : '') + '</span>' +
        '<button type="button" class="votd-close" aria-label="Hide the daily verse for today">×</button>' +
      '</div>' +
      '<a class="votd-link"' + (href ? ' href="' + esc(href) + '"' : '') + ' aria-label="Open ' + esc(day.ref) + ' in the reader">' +
        /* a maqqef joins its words: the word joiner after it keeps a narrow screen from
           breaking נִרְפָּא־ from לָנוּ */
        '<p class="votd-he" lang="he" dir="rtl">' + esc(day.he).replace(/־/g, '־⁠') + '</p>' +
        '<p class="votd-en">' + esc(day.en) + '</p>' +
        '<p class="votd-ref">' + esc(day.ref) + (href ? ' →' : '') + '</p>' +
      '</a>';
    var a = box.querySelector('.votd-link');
    if (href && a && typeof window.NavEngineFollow === 'function') {
      a.addEventListener('click', function (ev) {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;   // a new tab keeps the plain link
        if (window.NavEngineFollow(href)) ev.preventDefault();
      });
    }
    box.querySelector('.votd-close').addEventListener('click', function () {
      setState('hide:' + today());
      box.hidden = true;
    });
    box.hidden = false;
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      if (getState() === 'off') { setState(''); syncToggle(); load(); }
      else { setState('off'); box.hidden = true; syncToggle(); }
    });
  }
  syncToggle();
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pageshow', function (e) { if (e.persisted) refresh(); });
  atMidnight();
  refresh();
})();
