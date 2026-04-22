/* Learn Biblical Hebrew — curriculum-driven game (no build step) */
(function() {
  'use strict';

  var CURRICULUM_URL = 'curriculum/learn_hebrew.json';
  var STORAGE_KEY = 'sw-learn-hebrew-v2';

  // ── DOM ──
  var elStage = document.getElementById('stage-pill');
  var elMode = document.getElementById('mode-pill');
  var elStreak = document.getElementById('streak-pill');
  var elAcc = document.getElementById('acc-pill');
  var elPromptBig = document.getElementById('prompt-big');
  var elPromptSmall = document.getElementById('prompt-small');
  var elChoices = document.getElementById('choices');
  var elFeedback = document.getElementById('feedback');
  var btnNext = document.getElementById('next-btn');
  var btnReset = document.getElementById('reset-btn');
  var btnDark = document.getElementById('dark-btn');
  var btnHome = document.getElementById('home-btn');
  var btnReview = document.getElementById('review-btn');
  var btnMap = document.getElementById('map-btn');
  var mapModal = document.getElementById('map-modal');
  var btnCloseMap = document.getElementById('close-map-btn');
  var elStageList = document.getElementById('stage-list');
  var btnExport = document.getElementById('export-progress-btn');
  var btnImport = document.getElementById('import-progress-btn');

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function now() { return Date.now(); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function safeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function downloadJson(filename, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() { try { a.remove(); URL.revokeObjectURL(url); } catch (e) {} }, 0);
  }

  function pickJsonFile(onLoad) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    input.onchange = function() {
      var f = input.files && input.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function() {
        try { onLoad(JSON.parse(r.result)); } catch (e) { alert('Invalid JSON file.'); }
      };
      r.readAsText(f);
    };
    document.body.appendChild(input);
    input.click();
    setTimeout(function() { try { document.body.removeChild(input); } catch (e) {} }, 0);
  }

  // ── State (spaced repetition) ──
  // card state = SM-2-ish: ease, intervalDays, reps, dueTs, seen, correct
  var state = {
    version: 2,
    stageId: null,
    mode: 'stage', // 'stage' | 'review'
    total: 0,
    correct: 0,
    streak: 0,
    cards: {} // { [cardId]: { reps, ease, interval, due, seen, correct } }
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object') return;
      if (s.version !== 2) return;
      state = Object.assign(state, s);
      if (!state.cards) state.cards = {};
    } catch (e) {}
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function resetState() {
    state = { version: 2, stageId: null, mode: 'stage', total: 0, correct: 0, streak: 0, cards: {} };
    saveState();
  }

  function accuracyPct() {
    if (!state.total) return 0;
    return Math.round((state.correct / state.total) * 100);
  }

  // ── Curriculum ──
  var curriculum = null;
  function getStages() { return curriculum && Array.isArray(curriculum.stages) ? curriculum.stages : []; }
  function getStageById(id) {
    var stages = getStages();
    for (var i = 0; i < stages.length; i++) if (stages[i].id === id) return stages[i];
    return null;
  }

  function unlockedStages() {
    var stages = getStages();
    return stages.filter(function(s) { return isStageUnlocked(s); });
  }

  function totalDueAcrossUnlocked() {
    var us = unlockedStages();
    var due = 0;
    for (var i = 0; i < us.length; i++) {
      var stg = us[i];
      var cards = Array.isArray(stg.cards) ? stg.cards : [];
      for (var c = 0; c < cards.length; c++) {
        var cs = cardStats(cards[c].id);
        if ((cs.due || 0) <= now()) due++;
      }
    }
    return due;
  }

  function isStageUnlocked(stage) {
    if (!stage || !stage.unlock) return true;
    if (stage.unlock.type === 'start') return true;
    if (stage.unlock.type === 'after') return isStageMastered(stage.unlock.stageId);
    return true;
  }

  function cardStats(cardId) {
    if (!state.cards[cardId]) {
      state.cards[cardId] = { reps: 0, ease: 2.5, interval: 0, due: 0, seen: 0, correct: 0 };
    }
    return state.cards[cardId];
  }

  function stageProgress(stageId) {
    var stg = getStageById(stageId);
    if (!stg || !Array.isArray(stg.cards) || !stg.cards.length) return { pct: 0, due: 0, total: 0 };
    var due = 0;
    var mastered = 0;
    var total = stg.cards.length;
    for (var i = 0; i < stg.cards.length; i++) {
      var c = stg.cards[i];
      var cs = cardStats(c.id);
      if ((cs.due || 0) <= now()) due++;
      // mastery heuristic: interval >= 7 days or reps >= 6 and accuracy >= 80%
      var acc = cs.correct / Math.max(1, cs.seen);
      if ((cs.interval || 0) >= 7 || (cs.reps >= 6 && acc >= 0.8)) mastered++;
    }
    var pct = Math.round((mastered / Math.max(1, total)) * 100);
    return { pct: pct, due: due, total: total };
  }

  function isStageMastered(stageId) {
    var stg = getStageById(stageId);
    if (!stg) return false;
    var prog = stageProgress(stageId);
    var target = (stg.mastery && typeof stg.mastery.targetPct === 'number') ? stg.mastery.targetPct : 85;
    // also require minSeenEach if specified
    var minSeenEach = stg.mastery && typeof stg.mastery.minSeenEach === 'number' ? stg.mastery.minSeenEach : 0;
    if (minSeenEach > 0 && Array.isArray(stg.cards)) {
      for (var i = 0; i < stg.cards.length; i++) {
        if (cardStats(stg.cards[i].id).seen < minSeenEach) return false;
      }
    }
    return prog.pct >= target;
  }

  function defaultStageId() {
    var stages = getStages();
    for (var i = 0; i < stages.length; i++) {
      if (stages[i].unlock && stages[i].unlock.type === 'start') return stages[i].id;
    }
    return stages.length ? stages[0].id : null;
  }

  // ── SM-2-ish scheduling ──
  // grade: 0 (wrong) or 1 (right) for now; map to quality 2/5 vs 5/5
  function schedule(cardId, wasCorrect) {
    var cs = cardStats(cardId);
    cs.seen += 1;
    if (wasCorrect) cs.correct += 1;

    var quality = wasCorrect ? 5 : 2;
    var ease = cs.ease || 2.5;
    ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    ease = clamp(ease, 1.3, 2.7);

    if (!wasCorrect) {
      cs.reps = 0;
      cs.interval = 0;
      cs.due = now() + 10 * 60 * 1000; // 10 minutes
      cs.ease = ease;
      return;
    }

    cs.reps = (cs.reps || 0) + 1;
    if (cs.reps === 1) cs.interval = 1;
    else if (cs.reps === 2) cs.interval = 3;
    else cs.interval = Math.round((cs.interval || 3) * ease);
    cs.ease = ease;
    cs.due = now() + cs.interval * 24 * 60 * 60 * 1000;
  }

  // ── Round selection ──
  var round = { stage: null, card: null, answered: false, correctIdx: -1, choices: [] };

  function pickNextCard(stage) {
    var cards = Array.isArray(stage.cards) ? stage.cards : [];
    if (!cards.length) return null;

    // Prefer due cards; if none due, pick the "soonest due" to keep moving.
    var dueCards = [];
    var soonest = cards[0];
    var soonestDue = cardStats(soonest.id).due || 0;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var d = cardStats(c.id).due || 0;
      if (d <= now()) dueCards.push(c);
      if (d < soonestDue) { soonest = c; soonestDue = d; }
    }

    var pool = dueCards.length ? dueCards : cards;
    // Weight: newer and weaker get priority
    var weights = [];
    var sum = 0;
    for (var j = 0; j < pool.length; j++) {
      var cs = cardStats(pool[j].id);
      var acc = cs.correct / Math.max(1, cs.seen);
      var w = 1.5;
      if (cs.seen === 0) w += 2.5;
      w += (1.0 - acc) * 2.0;
      w += 1 / Math.sqrt(1 + cs.seen);
      weights.push(w);
      sum += w;
    }
    var r = Math.random() * sum;
    for (var k = 0; k < pool.length; k++) {
      r -= weights[k];
      if (r <= 0) return pool[k];
    }
    return pool[pool.length - 1];
  }

  function pickNextCardAcrossUnlocked() {
    var stages = unlockedStages();
    var all = [];
    for (var i = 0; i < stages.length; i++) {
      var cards = Array.isArray(stages[i].cards) ? stages[i].cards : [];
      for (var j = 0; j < cards.length; j++) all.push({ stage: stages[i], card: cards[j] });
    }
    if (!all.length) return null;

    // Prefer due cards; otherwise keep learning with lowest seen.
    var due = [];
    for (var k = 0; k < all.length; k++) {
      var d = cardStats(all[k].card.id).due || 0;
      if (d <= now()) due.push(all[k]);
    }
    var pool = due.length ? due : all;

    // Weight: new + weak + due (if in due pool, they’re all due already)
    var weights = [];
    var sum = 0;
    for (var p = 0; p < pool.length; p++) {
      var cs = cardStats(pool[p].card.id);
      var acc = cs.correct / Math.max(1, cs.seen);
      var w = 1.0;
      if (cs.seen === 0) w += 2.8;
      w += (1.0 - acc) * 2.2;
      w += 1 / Math.sqrt(1 + cs.seen);
      weights.push(w);
      sum += w;
    }
    var r = Math.random() * sum;
    for (var q = 0; q < pool.length; q++) {
      r -= weights[q];
      if (r <= 0) return pool[q];
    }
    return pool[pool.length - 1];
  }

  function normalizeMcq(card) {
    // Ensure correct answer present in choices, unique, length 4.
    var ans =
      (card.answer && card.answer.en) ? String(card.answer.en) :
      (card.answer && card.answer.gloss) ? String(card.answer.gloss) :
      (card.answer && card.answer.text) ? String(card.answer.text) :
      '';
    var choices = Array.isArray(card.choices) ? card.choices.map(String) : [];
    if (ans && choices.indexOf(ans) < 0) choices.push(ans);
    choices = Array.from(new Set(choices));
    while (choices.length < 4) choices.push(choices[Math.floor(Math.random() * choices.length)] || ans || '?');
    choices = shuffle(choices).slice(0, 4);
    if (ans && choices.indexOf(ans) < 0) choices[Math.floor(Math.random() * 4)] = ans;
    return { ans: ans, choices: choices };
  }

  function makeRound() {
    var stg = getStageById(state.stageId) || getStageById(defaultStageId());
    if (!stg) return;

    if (state.mode === 'review') {
      var pick = pickNextCardAcrossUnlocked();
      if (!pick || !pick.card) return;
      stg = pick.stage;
      var card = pick.card;
      if (card.type === 'mcq') {
        var cfgR = normalizeMcq(card);
        var correctIdxR = cfgR.choices.indexOf(cfgR.ans);
        round = { stage: stg, card: card, answered: false, correctIdx: correctIdxR, choices: cfgR.choices };
        return;
      }
      var fallbackR = normalizeMcq(card);
      round = { stage: stg, card: card, answered: false, correctIdx: fallbackR.choices.indexOf(fallbackR.ans), choices: fallbackR.choices };
      return;
    }

    if (!isStageUnlocked(stg)) {
      // If the stored stage is now locked (shouldn't happen), jump to first unlocked.
      var stages = getStages();
      for (var i = 0; i < stages.length; i++) {
        if (isStageUnlocked(stages[i])) { stg = stages[i]; break; }
      }
    }

    var card = pickNextCard(stg);
    if (!card) return;

    if (card.type === 'mcq') {
      var cfg = normalizeMcq(card);
      var correctIdx = cfg.choices.indexOf(cfg.ans);
      round = { stage: stg, card: card, answered: false, correctIdx: correctIdx, choices: cfg.choices };
      return;
    }

    // default fallback: treat unknown card types as mcq with placeholder
    var fallback = normalizeMcq(card);
    round = { stage: stg, card: card, answered: false, correctIdx: fallback.choices.indexOf(fallback.ans), choices: fallback.choices };
  }

  // ── Rendering ──
  function setFeedback(html) {
    if (!elFeedback) return;
    elFeedback.innerHTML = html || '';
  }

  function renderMeta() {
    var stg = round.stage || getStageById(state.stageId);
    var title = stg ? stg.title : '—';
    var prog = stg ? stageProgress(stg.id) : { pct: 0, due: 0, total: 0 };
    if (elMode) {
      if (state.mode === 'review') elMode.textContent = 'Mode: Review (' + totalDueAcrossUnlocked() + ' due)';
      else elMode.textContent = 'Mode: Stage';
    }
    if (elStage) elStage.textContent = 'Stage: ' + title + ' · ' + prog.pct + '%';
    if (elStreak) elStreak.textContent = 'Streak: ' + (state.streak || 0);
    if (elAcc) elAcc.textContent = 'Accuracy: ' + accuracyPct() + '%';
  }

  function renderRound() {
    renderMeta();
    if (!round || !round.card) return;
    var card = round.card;

    var he = card.prompt && card.prompt.he ? String(card.prompt.he) : '';
    var hint = card.prompt && card.prompt.hint ? String(card.prompt.hint) : 'Choose the best answer.';

    if (elPromptBig) elPromptBig.textContent = he || '…';
    if (elPromptSmall) elPromptSmall.textContent = hint;

    if (elChoices) elChoices.innerHTML = '';
    btnNext.disabled = true;

    setFeedback('Tip: press <span class="kbd">1</span>–<span class="kbd">4</span> to answer. Press <span class="kbd">Enter</span> for next.');

    if (card.type === 'mcq') {
      round.choices.forEach(function(label, idx) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'choice';
        b.textContent = (idx + 1) + '. ' + label;
        b.onclick = function() { answer(idx); };
        elChoices.appendChild(b);
      });
    }
  }

  function answer(idx) {
    if (!round || round.answered) return;
    round.answered = true;

    var card = round.card;
    var ok = idx === round.correctIdx;

    state.total += 1;
    if (ok) state.correct += 1;
    state.streak = ok ? (state.streak + 1) : 0;
    schedule(card.id, ok);
    saveState();

    var buttons = elChoices.querySelectorAll('button.choice');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = true;
      if (i === round.correctIdx) buttons[i].classList.add('ok');
      if (i === idx && !ok) buttons[i].classList.add('bad');
    }

    var ans =
      (card.answer && card.answer.en) ? String(card.answer.en) :
      (card.answer && card.answer.gloss) ? String(card.answer.gloss) :
      (card.answer && card.answer.text) ? String(card.answer.text) :
      '';
    if (ok) setFeedback('<strong>Correct.</strong> Answer: <strong>' + safeHtml(ans) + '</strong>.');
    else setFeedback('<strong>Not quite.</strong> Answer: <strong>' + safeHtml(ans) + '</strong>.');

    renderMeta();

    // Auto-advance stage if mastered (keep user moving)
    if (state.mode !== 'review' && isStageMastered(round.stage.id)) {
      var stages = getStages();
      for (var s = 0; s < stages.length; s++) {
        if (stages[s].id === round.stage.id && stages[s + 1] && isStageUnlocked(stages[s + 1])) {
          state.stageId = stages[s + 1].id;
          saveState();
          break;
        }
      }
    }

    btnNext.disabled = false;
    btnNext.focus();
  }

  function next() {
    makeRound();
    renderRound();
    refreshMapIfOpen();
  }

  // ── Map UI ──
  function openMap() {
    if (!mapModal) return;
    mapModal.classList.add('open');
    mapModal.setAttribute('aria-hidden', 'false');
    renderMap();
  }
  function closeMap() {
    if (!mapModal) return;
    mapModal.classList.remove('open');
    mapModal.setAttribute('aria-hidden', 'true');
  }
  function refreshMapIfOpen() {
    if (!mapModal) return;
    if (mapModal.classList.contains('open')) renderMap();
  }

  function renderMap() {
    if (!elStageList) return;
    var stages = getStages();
    var html = '';
    for (var i = 0; i < stages.length; i++) {
      var stg = stages[i];
      var unlocked = isStageUnlocked(stg);
      var prog = stageProgress(stg.id);
      var isActive = stg.id === state.stageId;
      html += '' +
        '<div class="stage-row ' + (unlocked ? '' : 'locked') + '">' +
          '<div class="stage-left">' +
            '<div class="stage-name">' + safeHtml(stg.title) + (isActive ? ' <span style="opacity:0.7">(current)</span>' : '') + '</div>' +
            '<div class="stage-desc">' + safeHtml(stg.desc || '') + '</div>' +
          '</div>' +
          '<div class="stage-right">' +
            '<div class="pill">Due: ' + prog.due + '/' + prog.total + '</div>' +
            '<div class="bar" aria-label="progress"><div style="width:' + prog.pct + '%"></div></div>' +
            '<div class="pill">' + prog.pct + '%</div>' +
            '<button class="btn ' + (unlocked ? 'primary' : '') + '" data-stage="' + safeHtml(stg.id) + '" ' + (unlocked ? '' : 'disabled') + '>Go</button>' +
          '</div>' +
        '</div>';
    }
    elStageList.innerHTML = html;

    elStageList.querySelectorAll('button[data-stage]').forEach(function(b) {
      b.onclick = function() {
        var id = b.getAttribute('data-stage');
        if (!id) return;
        var stg = getStageById(id);
        if (!stg || !isStageUnlocked(stg)) return;
        state.stageId = id;
        saveState();
        closeMap();
        next();
      };
    });
  }

  // ── Dark mode (match site) ──
  function toggleDark() {
    document.body.classList.toggle('dark-mode');
    var isDark = document.body.classList.contains('dark-mode');
    if (btnDark) btnDark.textContent = isDark ? '☀️' : '🌙';
    try { localStorage.setItem('sw-dark', isDark ? '1' : '0'); } catch (e) {}
  }
  function restoreDark() {
    try {
      if (localStorage.getItem('sw-dark') === '1') {
        document.body.classList.add('dark-mode');
        if (btnDark) btnDark.textContent = '☀️';
      }
    } catch (e) {}
  }

  function homeHref() {
    var p = (window.location && window.location.pathname) ? window.location.pathname : '';
    return (p.indexOf('/bom/') >= 0 || /\\bom\\/.test(p)) ? '../index.html' : 'index.html';
  }

  // ── Keyboard shortcuts ──
  function onKeydown(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
    if (e.key === 'd' || e.key === 'D') toggleDark();
    if (e.key === 'Escape') closeMap();
    if (e.key === 'm' || e.key === 'M') { if (mapModal && mapModal.classList.contains('open')) closeMap(); else openMap(); }
    if (e.key === 'r' || e.key === 'R') { toggleReviewMode(); }
    if (!round || !round.card) return;
    if (!round.answered) {
      if (e.key === '1') answer(0);
      if (e.key === '2') answer(1);
      if (e.key === '3') answer(2);
      if (e.key === '4') answer(3);
    } else {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
    }
  }

  function toggleReviewMode() {
    state.mode = (state.mode === 'review') ? 'stage' : 'review';
    saveState();
    closeMap();
    next();
  }

  // ── Init ──
  async function init() {
    loadState();
    restoreDark();

    try {
      var res = await fetch(CURRICULUM_URL, { cache: 'no-cache' });
      curriculum = await res.json();
    } catch (e) {
      alert('Learn curriculum failed to load. Are you running a local server?');
      curriculum = { stages: [] };
    }

    if (!state.stageId) state.stageId = defaultStageId();
    if (!state.stageId && getStages().length) state.stageId = getStages()[0].id;
    if (state.mode !== 'review' && state.mode !== 'stage') state.mode = 'stage';
    saveState();

    if (btnDark) btnDark.onclick = toggleDark;
    if (btnHome) btnHome.onclick = function() { window.location.href = homeHref(); };
    if (btnReview) btnReview.onclick = toggleReviewMode;
    if (btnMap) btnMap.onclick = openMap;
    if (btnCloseMap) btnCloseMap.onclick = closeMap;
    if (mapModal) mapModal.onclick = function(e) { if (e.target === mapModal) closeMap(); };

    if (btnNext) btnNext.onclick = next;
    if (btnReset) btnReset.onclick = function() {
      if (!confirm('Reset your Learn Hebrew progress?')) return;
      resetState();
      state.stageId = defaultStageId();
      saveState();
      next();
    };

    if (btnExport) btnExport.onclick = function() {
      downloadJson('learn-hebrew-progress.json', { exportedAt: new Date().toISOString(), state: state });
    };
    if (btnImport) btnImport.onclick = function() {
      pickJsonFile(function(payload) {
        if (!payload || !payload.state) return alert('Invalid progress file.');
        var s = payload.state;
        if (!s || s.version !== 2) return alert('Unsupported progress version.');
        state = Object.assign({ version: 2, stageId: null, total: 0, correct: 0, streak: 0, cards: {} }, s);
        if (!state.cards) state.cards = {};
        saveState();
        closeMap();
        next();
      });
    };

    document.addEventListener('keydown', onKeydown);

    // Ensure SW is registered (consistent with index.html behavior)
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js').then(function(r){ try { r.update(); } catch(e) {} });
      }
    } catch (e) {}

    next();
  }

  init();
})();

