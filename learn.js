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
  var btnWeak = document.getElementById('weak-btn');
  var btnConf = document.getElementById('conf-btn');
  var btnReview = document.getElementById('review-btn');
  var btnMap = document.getElementById('map-btn');
  var mapModal = document.getElementById('map-modal');
  var btnCloseMap = document.getElementById('close-map-btn');
  var elStageList = document.getElementById('stage-list');
  var btnExport = document.getElementById('export-progress-btn');
  var btnImport = document.getElementById('import-progress-btn');
  var btnUnlockAll = document.getElementById('unlock-all-btn');
  var weakModal = document.getElementById('weak-modal');
  var btnCloseWeak = document.getElementById('close-weak-btn');
  var btnWeakPractice = document.getElementById('weak-practice-btn');
  var elWeakList = document.getElementById('weak-list');
  var btnAudio = document.getElementById('audio-btn');
  var btnBreakdown = document.getElementById('breakdown-btn');
  var btnDict = document.getElementById('dict-btn');
  var elBreakdown = document.getElementById('breakdown');
  var elLesson = document.getElementById('lesson');
  var typeinWrap = document.getElementById('typein');
  var typeinInput = document.getElementById('typein-input');
  var btnTypeinSubmit = document.getElementById('typein-submit');

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

  function stripCantillationAndMeteg(s) {
    // Keep vowel points (nikkud), drop cantillation marks and meteg to match lookup build normalization.
    return String(s || '')
      .replace(/[\u0591-\u05AF]/g, '')
      .replace(/\u05BD/g, '')
      .normalize('NFC');
  }

  function resolveStrongsFromHebrew(he) {
    if (!he) return '';
    var lookup = window._strongsLookup || null;
    if (!lookup) return '';
    var nfc = String(he).normalize('NFC');
    var k1 = stripCantillationAndMeteg(nfc);
    return lookup[k1] || lookup[nfc] || '';
  }

  function dictHrefForStrongs(hNum) {
    if (!hNum) return '';
    var p = (window.location && window.location.pathname) ? window.location.pathname : '';
    var base = (p.indexOf('/bom/') >= 0 || /\\bom\\/.test(p)) ? '../dictionary.html' : 'dictionary.html';
    return base + '#' + encodeURIComponent(hNum);
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
    mode: 'stage', // 'stage' | 'review' | 'weak'
    unlockAll: false,
    hasSeenMap: false,
    total: 0,
    correct: 0,
    streak: 0,
    cards: {}, // { [cardId]: { reps, ease, interval, due, seen, correct, wrong, lastWrong } }
    confusions: {}, // { "correct||wrong": count }
    recent: [] // recent card ids (avoid repeats)
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
    state = { version: 2, stageId: null, mode: 'stage', unlockAll: false, hasSeenMap: false, total: 0, correct: 0, streak: 0, cards: {}, confusions: {}, recent: [] };
    saveState();
  }

  function pushRecent(cardId) {
    if (!cardId) return;
    if (!state.recent) state.recent = [];
    state.recent = state.recent.filter(function(x) { return x !== cardId; });
    state.recent.unshift(cardId);
    state.recent = state.recent.slice(0, 15);
  }
  function isRecent(cardId) {
    if (!cardId) return false;
    var r = state.recent || [];
    return r.indexOf(cardId) >= 0;
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
    if (state.unlockAll) return true;
    if (stage.unlock.type === 'start') return true;
    if (stage.unlock.type === 'after') return isStageMastered(stage.unlock.stageId);
    return true;
  }

  function cardStats(cardId) {
    if (!state.cards[cardId]) {
      state.cards[cardId] = { reps: 0, ease: 2.5, interval: 0, due: 0, seen: 0, correct: 0, wrong: 0, lastWrong: 0 };
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
    else { cs.wrong = (cs.wrong || 0) + 1; cs.lastWrong = now(); }

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
    // Avoid repeats if possible
    var nonRecent = pool.filter(function(c) { return !isRecent(c.id); });
    if (nonRecent.length >= 3) pool = nonRecent;
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
    // Avoid repeats if possible
    var nonRecent = pool.filter(function(x) { return !isRecent(x.card.id); });
    if (nonRecent.length >= 6) pool = nonRecent;

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

  function getWeakCards(limit) {
    var stages = unlockedStages();
    var items = [];
    for (var i = 0; i < stages.length; i++) {
      var stg = stages[i];
      var cards = Array.isArray(stg.cards) ? stg.cards : [];
      for (var j = 0; j < cards.length; j++) {
        var c = cards[j];
        // Don't include lessons in weak practice (they're informational)
        if (c && c.type === 'lesson') continue;
        var cs = cardStats(c.id);
        if (!cs.seen) continue;
        var acc = cs.correct / Math.max(1, cs.seen);
        var wrong = cs.wrong || 0;
        var recencyDays = cs.lastWrong ? ((now() - cs.lastWrong) / (24 * 60 * 60 * 1000)) : 999;

        // Weak if missed at least once AND either low accuracy or recent miss.
        if (wrong < 1) continue;
        if (!(acc < 0.8 || recencyDays < 14)) continue;

        // Score: lower accuracy + more wrong + more recent wrong.
        var recencyBoost = Math.max(0, 14 - recencyDays); // 0..14
        var score = (1 - acc) * 100 + wrong * 8 + recencyBoost * 2;
        items.push({ stage: stg, card: c, stats: cs, score: score, acc: acc, recencyDays: recencyDays });
      }
    }
    items.sort(function(a, b) { return b.score - a.score; });
    return items.slice(0, Math.max(0, limit || 40));
  }

  function pickNextWeakCard() {
    var weak = getWeakCards(200);
    if (!weak.length) return null;
    // Avoid repeats if possible
    var pool = weak.filter(function(x) { return !isRecent(x.card && x.card.id); });
    if (pool.length >= 6) weak = pool;
    // Weight toward top-ranked weak cards.
    var sum = 0;
    var weights = [];
    for (var i = 0; i < weak.length; i++) {
      var w = 1 + (weak.length - i) / weak.length * 3; // 4..1
      weights.push(w);
      sum += w;
    }
    var r = Math.random() * sum;
    for (var j = 0; j < weak.length; j++) {
      r -= weights[j];
      if (r <= 0) return weak[j];
    }
    return weak[0];
  }

  function _confKey(correctLabel, wrongLabel) {
    return String(correctLabel || '') + '||' + String(wrongLabel || '');
  }
  function recordConfusion(correctLabel, wrongLabel) {
    if (!correctLabel || !wrongLabel) return;
    if (!state.confusions) state.confusions = {};
    var k = _confKey(correctLabel, wrongLabel);
    state.confusions[k] = (state.confusions[k] || 0) + 1;
  }

  function topConfusions(limit) {
    var out = [];
    var m = state.confusions || {};
    Object.keys(m).forEach(function(k) {
      out.push({ key: k, count: m[k] || 0 });
    });
    out.sort(function(a, b) { return (b.count || 0) - (a.count || 0); });
    return out.slice(0, Math.max(0, limit || 50));
  }

  function startConfusionDrill() {
    state.mode = 'weak'; // use weak pipeline but pick from confusion set via flag on round
    state._confDrill = true;
    saveState();
    closeMap(); closeWeak();
    next();
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
    // If choices are missing, try to seed from confusion history for this correct answer.
    if (choices.length < 4 && ans && state.confusions) {
      var conf = topConfusions(200)
        .map(function(x) { return x.key.split('||'); })
        .filter(function(pair) { return pair[0] === ans && pair[1]; })
        .map(function(pair) { return pair[1]; });
      conf.forEach(function(w) { if (choices.length < 4) choices.push(w); });
    }
    while (choices.length < 4) choices.push(choices[Math.floor(Math.random() * choices.length)] || ans || '?');
    choices = shuffle(choices).slice(0, 4);
    if (ans && choices.indexOf(ans) < 0) choices[Math.floor(Math.random() * 4)] = ans;
    return { ans: ans, choices: choices };
  }

  function makeRound() {
    var stg = getStageById(state.stageId) || getStageById(defaultStageId());
    if (!stg) return;

    if (state.mode === 'weak') {
      var pickW = (state._confDrill && state.confusions && Object.keys(state.confusions).length)
        ? (function() {
            var list = topConfusions(200);
            if (!list.length) return null;
            // Pick weighted
            var sum = 0; var weights = [];
            for (var i = 0; i < list.length; i++) { var w = Math.max(1, (list[i].count || 1)); weights.push(w); sum += w; }
            var r = Math.random() * sum;
            var chosen = list[0];
            for (var j = 0; j < list.length; j++) { r -= weights[j]; if (r <= 0) { chosen = list[j]; break; } }
            var parts = chosen.key.split('||');
            var correct = parts[0]; var wrong = parts[1];
            // Find a card whose answer matches correct label
            var stages = unlockedStages();
            for (var s = 0; s < stages.length; s++) {
              var cards = Array.isArray(stages[s].cards) ? stages[s].cards : [];
              for (var c = 0; c < cards.length; c++) {
                var cd = cards[c];
                var a =
                  (cd.answer && cd.answer.en) ? String(cd.answer.en) :
                  (cd.answer && cd.answer.gloss) ? String(cd.answer.gloss) :
                  (cd.answer && cd.answer.text) ? String(cd.answer.text) : '';
                if (a === correct) {
                  // Ensure wrong is included as distractor via choices
                  cd = Object.assign({}, cd);
                  var baseChoices = Array.isArray(cd.choices) ? cd.choices.slice() : [];
                  if (wrong && baseChoices.indexOf(wrong) < 0) baseChoices.push(wrong);
                  cd.choices = baseChoices;
                  return { stage: stages[s], card: cd };
                }
              }
            }
            return null;
          })()
        : pickNextWeakCard();
      if (!pickW || !pickW.card) return;
      stg = pickW.stage;
      var cardW = pickW.card;
      // Track recent to prevent loops
      pushRecent(cardW.id);
      var cfgW = normalizeMcq(cardW);
      round = { stage: stg, card: cardW, answered: false, correctIdx: cfgW.choices.indexOf(cfgW.ans), choices: cfgW.choices };
      return;
    }

    if (state.mode === 'review') {
      var pick = pickNextCardAcrossUnlocked();
      if (!pick || !pick.card) return;
      stg = pick.stage;
      var card = pick.card;
      pushRecent(card.id);
      if (card.type === 'lesson' || card.type === 'type') {
        round = { stage: stg, card: card, answered: false, correctIdx: -1, choices: [] };
        return;
      }
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
    pushRecent(card.id);

    if (card.type === 'lesson' || card.type === 'type') {
      round = { stage: stg, card: card, answered: false, correctIdx: -1, choices: [] };
      return;
    }

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
      else if (state.mode === 'weak') elMode.textContent = 'Mode: Weak practice';
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
    if (elBreakdown) { elBreakdown.classList.remove('open'); elBreakdown.innerHTML = ''; }
    if (elLesson) { elLesson.classList.remove('open'); elLesson.innerHTML = ''; }
    if (typeinWrap) typeinWrap.classList.remove('open');
    btnNext.disabled = true;

    setFeedback('Tip: press <span class="kbd">1</span>–<span class="kbd">4</span> to answer. Press <span class="kbd">Enter</span> for next.');

    if (card.type === 'lesson') {
      // A lesson card is informational: show content and allow Continue.
      var title = (card.prompt && card.prompt.title) ? String(card.prompt.title) : 'Lesson';
      if (elPromptBig) elPromptBig.textContent = title;
      if (elPromptSmall) elPromptSmall.textContent = hint || 'Read, then continue.';
      if (elLesson) {
        elLesson.innerHTML = card.contentHtml ? String(card.contentHtml) : '<div>No lesson content.</div>';
        elLesson.classList.add('open');
      }
      btnNext.disabled = false;
      btnNext.textContent = 'Continue';
      return;
    }

    // Non-lesson cards use "Next"
    btnNext.textContent = 'Next';

    if (card.type === 'type') {
      if (typeinWrap) typeinWrap.classList.add('open');
      if (typeinInput) { typeinInput.value = ''; typeinInput.focus(); }
      if (btnTypeinSubmit) btnTypeinSubmit.disabled = false;
      return;
    }

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

  function openDictionaryForCurrentCard() {
    if (!round || !round.card) return;
    var card = round.card;
    var he = card.prompt && card.prompt.he ? String(card.prompt.he) : '';
    if (!he) { setFeedback('No Hebrew prompt to look up on this card.'); return; }
    var hNum = resolveStrongsFromHebrew(he);
    if (!hNum) { setFeedback('No Strong’s entry found for this form.'); return; }
    window.location.href = dictHrefForStrongs(hNum);
  }

  function answer(idx) {
    if (!round || round.answered) return;
    round.answered = true;

    var card = round.card;
    var ok = idx === round.correctIdx;
    var chosenLabel = (round.choices && typeof idx === 'number') ? String(round.choices[idx] || '') : '';

    state.total += 1;
    if (ok) state.correct += 1;
    state.streak = ok ? (state.streak + 1) : 0;
    schedule(card.id, ok);
    if (!ok) {
      // record confusion (correct vs chosen label) for MCQ
      var correctLabel = (round.choices && round.correctIdx >= 0) ? String(round.choices[round.correctIdx] || '') : '';
      recordConfusion(correctLabel, chosenLabel);
    }
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
    var why = card.explain ? String(card.explain) : '';
    var ref = (card.meta && card.meta.ref) ? String(card.meta.ref) : '';
    var extra = '';
    if (ref) extra += ' <span style="opacity:0.75">(' + safeHtml(ref) + ')</span>';
    var stageId = (round && round.stage && round.stage.id) ? String(round.stage.id) : '';
    var isExam = /^final-/.test(stageId) || /exam/i.test(stageId);
    var actions = '';
    if (isExam && !ok) {
      actions =
        '<div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">' +
          '<button class="btn primary" data-action="weak" type="button">Practice weak</button>' +
          '<button class="btn" data-action="review" type="button">Review due</button>' +
          '<button class="btn" data-action="dict" type="button">Open dictionary</button>' +
        '</div>';
    }
    if (ok) setFeedback('<strong>Correct.</strong> Answer: <strong>' + safeHtml(ans) + '</strong>.' + extra + (why ? '<br><span style=\"opacity:0.9\"><strong>Why:</strong> ' + safeHtml(why) + '</span>' : '') + actions);
    else setFeedback('<strong>Not quite.</strong> Answer: <strong>' + safeHtml(ans) + '</strong>.' + extra + (why ? '<br><span style=\"opacity:0.9\"><strong>Why:</strong> ' + safeHtml(why) + '</span>' : '') + actions);

    if (actions && elFeedback) {
      elFeedback.querySelectorAll('button[data-action]').forEach(function(b) {
        b.onclick = function() {
          var a = b.getAttribute('data-action');
          if (a === 'weak') { state.mode = 'weak'; state._confDrill = false; saveState(); closeMap(); closeWeak(); next(); }
          else if (a === 'review') { state.mode = 'review'; saveState(); closeMap(); closeWeak(); next(); }
          else if (a === 'dict') { openDictionaryForCurrentCard(); }
        };
      });
    }

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

  function normalizeText(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.,;:!?'"()]/g, '');
  }

  function submitTypein() {
    if (!round || !round.card || round.answered) return;
    var card = round.card;
    var expected =
      (card.answer && card.answer.text) ? String(card.answer.text) :
      (card.answer && card.answer.en) ? String(card.answer.en) :
      (card.answer && card.answer.gloss) ? String(card.answer.gloss) : '';
    var got = typeinInput ? typeinInput.value : '';
    var ok = normalizeText(got) === normalizeText(expected);
    // Fake MCQ answer path using index=-1 (no confusion)
    round.choices = [expected];
    round.correctIdx = 0;
    answer(ok ? 0 : 0);
  }

  function renderBreakdownForCard(card) {
    if (!elBreakdown || !card) return;
    var parts = card.breakdown;
    if (!parts && card.prompt && card.prompt.he) {
      // basic heuristic: detect common prefixes and article
      var he = String(card.prompt.he);
      var items = [];
      var rest = he;
      function take(re, label, gloss) {
        var m = rest.match(re);
        if (!m) return false;
        items.push({ label: label, he: m[0], gloss: gloss });
        rest = rest.slice(m[0].length);
        return true;
      }
      take(/^וְ/, 'prefix', 'and (wə-)');
      take(/^הַ/, 'article', 'the (ha-)');
      take(/^בַּ|^בְּ|^בְ/, 'prefix', 'in/at (bə-/ba-)');
      take(/^לַ|^לְ/, 'prefix', 'to/for (lə-/la-)');
      take(/^כַּ|^כְ/, 'prefix', 'like/as (kə-/ka-)');
      items.push({ label: 'word', he: rest, gloss: '' });
      parts = items;
    }
    if (!parts || !parts.length) {
      elBreakdown.innerHTML = 'No breakdown available for this card yet.';
      elBreakdown.classList.add('open');
      return;
    }
    var html = '<div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">';
    parts.forEach(function(p) {
      html += '<div class="pill"><span style="font-family:David Libre, serif; direction:rtl">' + safeHtml(p.he || '') + '</span>' +
        (p.gloss ? (' <span style="opacity:0.75">· ' + safeHtml(p.gloss) + '</span>') : '') +
        '</div>';
    });
    html += '</div>';
    elBreakdown.innerHTML = html;
    elBreakdown.classList.add('open');
  }

  function speakHebrew(text) {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text || ''));
      u.lang = 'he-IL';
      // pick a Hebrew voice if available
      var voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      var v = null;
      for (var i = 0; i < voices.length; i++) {
        if ((voices[i].lang || '').toLowerCase().indexOf('he') === 0) { v = voices[i]; break; }
      }
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function next() {
    makeRound();
    renderRound();
    refreshMapIfOpen();
  }

  function completeLessonIfNeeded() {
    if (!round || !round.card) return false;
    if (round.card.type !== 'lesson') return false;
    // Mark as "learned" for scheduling, but don't affect accuracy/streak.
    schedule(round.card.id, true);
    saveState();
    return true;
  }

  // ── Map UI ──
  function openMap() {
    if (!mapModal) return;
    mapModal.classList.add('open');
    mapModal.setAttribute('aria-hidden', 'false');
    renderMap();
    try {
      if (btnUnlockAll) btnUnlockAll.textContent = state.unlockAll ? 'Lock progression' : 'Unlock all';
    } catch (e) {}
  }
  function closeMap() {
    if (!mapModal) return;
    mapModal.classList.remove('open');
    mapModal.setAttribute('aria-hidden', 'true');
    if (!state.hasSeenMap) {
      state.hasSeenMap = true;
      saveState();
    }
  }

  function openWeak() {
    if (!weakModal) return;
    weakModal.classList.add('open');
    weakModal.setAttribute('aria-hidden', 'false');
    renderWeakList();
  }
  function closeWeak() {
    if (!weakModal) return;
    weakModal.classList.remove('open');
    weakModal.setAttribute('aria-hidden', 'true');
  }

  function renderWeakList() {
    if (!elWeakList) return;
    var weak = getWeakCards(60);
    if (!weak.length) {
      elWeakList.innerHTML = '<div class="stage-row"><div class="stage-left"><div class="stage-name">No weak cards yet</div><div class="stage-desc">Answer a few cards first. Missed cards will show up here.</div></div></div>';
      return;
    }
    var html = '';
    weak.forEach(function(w) {
      var he = (w.card.prompt && w.card.prompt.he) ? String(w.card.prompt.he) : '';
      var hint = (w.card.prompt && w.card.prompt.hint) ? String(w.card.prompt.hint) : '';
      var accPct = Math.round((w.acc || 0) * 100);
      var wrong = w.stats && w.stats.wrong ? w.stats.wrong : 0;
      html += '' +
        '<div class="stage-row">' +
          '<div class="stage-left">' +
            '<div class="stage-name"><span style="font-family:David Libre, serif; font-size:1.15em; margin-right:10px;">' + safeHtml(he) + '</span> <span style="opacity:0.75">' + safeHtml(w.stage.title) + '</span></div>' +
            '<div class="stage-desc">' + safeHtml(hint) + '</div>' +
          '</div>' +
          '<div class="stage-right">' +
            '<div class="pill">Acc: ' + accPct + '%</div>' +
            '<div class="pill">Misses: ' + wrong + '</div>' +
          '</div>' +
        '</div>';
    });
    elWeakList.innerHTML = html;
  }
  function refreshMapIfOpen() {
    if (!mapModal) return;
    if (mapModal.classList.contains('open')) renderMap();
  }

  function renderMap() {
    if (!elStageList) return;
    var stages = getStages();
    var html = '';
    var lastUnit = null;
    for (var i = 0; i < stages.length; i++) {
      var stg = stages[i];
      var unit = stg.unit || null;
      if (unit && unit !== lastUnit) {
        html += '' +
          '<div class="stage-row" style="background:rgba(200,168,78,0.10); border-style:solid;">' +
            '<div class="stage-left">' +
              '<div class="stage-name">' + safeHtml(unit) + '</div>' +
              '<div class="stage-desc">Unit</div>' +
            '</div>' +
            '<div class="stage-right"></div>' +
          '</div>';
        lastUnit = unit;
      } else if (!unit) {
        lastUnit = null;
      }
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
        // Picking a stage from the map should always enter Stage mode,
        // otherwise users stay stuck in Weak/Review and it feels like a loop.
        state.mode = 'stage';
        state._confDrill = false;
        state.recent = [];
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
    if (e.key === 'Escape') { closeMap(); closeWeak(); }
    if (e.key === 'm' || e.key === 'M') { if (mapModal && mapModal.classList.contains('open')) closeMap(); else openMap(); }
    if (e.key === 'r' || e.key === 'R') { toggleReviewMode(); }
    if (e.key === 'w' || e.key === 'W') { if (weakModal && weakModal.classList.contains('open')) closeWeak(); else openWeak(); }
    if (e.key === 'c' || e.key === 'C') { startConfusionDrill(); }
    if (e.key === 'b' || e.key === 'B') { if (round && round.card) renderBreakdownForCard(round.card); }
    if (!round || !round.card) return;
    if (!round.answered) {
      if (round.card && round.card.type === 'lesson') {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (completeLessonIfNeeded()) next(); }
        return;
      }
      if (round.card && round.card.type === 'type') {
        if (e.key === 'Enter') { e.preventDefault(); submitTypein(); }
        return;
      }
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
    closeWeak();
    next();
  }

  function startWeakPractice() {
    state.mode = 'weak';
    saveState();
    closeMap();
    closeWeak();
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
    if (state.mode !== 'review' && state.mode !== 'stage' && state.mode !== 'weak') state.mode = 'stage';
    if (typeof state.unlockAll !== 'boolean') state.unlockAll = false;
    if (typeof state.hasSeenMap !== 'boolean') state.hasSeenMap = false;
    saveState();

    if (btnDark) btnDark.onclick = toggleDark;
    if (btnHome) btnHome.onclick = function() { window.location.href = homeHref(); };
    if (btnWeak) btnWeak.onclick = openWeak;
    if (btnConf) btnConf.onclick = startConfusionDrill;
    if (btnReview) btnReview.onclick = toggleReviewMode;
    if (btnMap) btnMap.onclick = openMap;
    if (btnCloseMap) btnCloseMap.onclick = closeMap;
    if (mapModal) mapModal.onclick = function(e) { if (e.target === mapModal) closeMap(); };
    if (btnCloseWeak) btnCloseWeak.onclick = closeWeak;
    if (btnWeakPractice) btnWeakPractice.onclick = startWeakPractice;
    if (weakModal) weakModal.onclick = function(e) { if (e.target === weakModal) closeWeak(); };

    if (btnNext) btnNext.onclick = function() {
      if (completeLessonIfNeeded()) return next();
      return next();
    };
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
        state = Object.assign({ version: 2, stageId: null, mode: 'stage', unlockAll: false, hasSeenMap: false, total: 0, correct: 0, streak: 0, cards: {} }, s);
        if (!state.cards) state.cards = {};
        if (typeof state.unlockAll !== 'boolean') state.unlockAll = false;
        if (typeof state.hasSeenMap !== 'boolean') state.hasSeenMap = false;
        saveState();
        closeMap();
        next();
      });
    };

    if (btnUnlockAll) btnUnlockAll.onclick = function() {
      state.unlockAll = !state.unlockAll;
      saveState();
      renderMap();
      renderMeta();
      if (btnUnlockAll) btnUnlockAll.textContent = state.unlockAll ? 'Lock progression' : 'Unlock all';
    };

    if (btnAudio) btnAudio.onclick = function() {
      if (round && round.card && round.card.prompt && round.card.prompt.he) speakHebrew(round.card.prompt.he);
    };
    if (btnBreakdown) btnBreakdown.onclick = function() {
      if (round && round.card) renderBreakdownForCard(round.card);
    };
    if (btnDict) btnDict.onclick = openDictionaryForCurrentCard;
    if (btnTypeinSubmit) btnTypeinSubmit.onclick = submitTypein;

    document.addEventListener('keydown', onKeydown);

    // Ensure SW is registered (consistent with index.html behavior)
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js?v=73').then(function(r){ try { r.update(); } catch(e) {} });
      }
    } catch (e) {}

    next();

    // On first entry, show the learning map so users can see the full scope.
    // Default to "Unlock all" so it’s obvious this is more than the alphabet.
    // Only do this if they haven't started answering yet.
    if (!state.hasSeenMap && !state.total) {
      state.unlockAll = true;
      saveState();
      setTimeout(function() { openMap(); }, 50);
    }
  }

  init();
})();

