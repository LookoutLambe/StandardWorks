// vocab.js — Vocabulary Builder game
(function() {
  const LS_KEY = 'sw-vocab-stats-v1';

  function $(id) { return document.getElementById(id); }

  const els = {
    modeSel: $('modeSel'),
    deckSel: $('deckSel'),
    choiceCount: $('choiceCount'),
    minFreq: $('minFreq'),
    showStrongs: $('showStrongs'),
    glossSource: $('glossSource'),
    skipNames: $('skipNames'),
    frontHeb: $('frontHeb'),
    frontMeta: $('frontMeta'),
    prompt: $('prompt'),
    typeWrap: $('typeWrap'),
    typeInput: $('typeInput'),
    submitBtn: $('submitBtn'),
    showAnswerBtn: $('showAnswerBtn'),
    typeFeedback: $('typeFeedback'),
    choices: $('choices'),
    revealBtn: $('revealBtn'),
    nextBtn: $('nextBtn'),
    resetBtn: $('resetBtn'),
    statsPill: $('statsPill'),
    footerHint: $('footerHint'),
    gamePicker: $('gamePicker'),
    beginnerPicker: $('beginnerPicker'),
    beginnerBackBtn: $('beginnerBackBtn'),
  };

  function loadStats() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return { seen: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0 };
      const parsed = JSON.parse(raw);
      return Object.assign({ seen: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0 }, parsed || {});
    } catch {
      return { seen: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0 };
    }
  }
  function saveStats(s) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
  }

  let stats = loadStats();
  function renderStats() {
    const acc = stats.seen ? Math.round((stats.correct / stats.seen) * 100) : 0;
    els.statsPill.textContent = `Seen ${stats.seen} · ✅ ${stats.correct} · ❌ ${stats.wrong} · ${acc}% · Streak ${stats.streak} (best ${stats.bestStreak})`;
  }

  function isLikelyProperName(gloss) {
    // Strong heuristic: single word starting with capital letter.
    const g = (gloss || '').trim();
    if (!g) return true;
    const words = g.split(/\s+/);
    if (words.length === 1 && /^[A-Z]/.test(words[0])) return true;
    return false;
  }

  // Prefer project-style glosses for some common function words where Strong's
  // short gloss can be misleading for learners.
  const VOCAB_GLOSS_OVERRIDES = {
    // נֶגֶד — “in front of / opposite / against”
    H5048: 'against',
  };

  function displayGloss(item) {
    if (!item) return '';
    const s = item.strongs;
    if (s && VOCAB_GLOSS_OVERRIDES[s]) return VOCAB_GLOSS_OVERRIDES[s];
    const prefer = (els.glossSource && els.glossSource.value) ? els.glossSource.value : 'scripture';
    if (prefer === 'strongs') return item.strongsGloss || item.gloss || '';
    // default: scripture wording
    return item.scriptureGloss || item.gloss || '';
  }

  function buildDeck() {
    const roots = window._strongsRoots || {};
    const decks = window.VocabDecks || null;

    // Frequency decks generated from actual project texts
    if (els.deckSel.value.startsWith('project_freq_') && decks) {
      const noNames = els.skipNames.checked;
      const mode = els.deckSel.value;
      const minFreq = parseInt(els.minFreq && els.minFreq.value ? els.minFreq.value : '1', 10) || 1;

      // project_freq_all / project_freq_ot / ... / project_freq_nt ...
      const vol = mode.replace('project_freq_', '');
      let source = [];
      if (vol === 'all') {
        source = noNames ? decks.overall_no_names : decks.overall_all;
      } else {
        const byVol = noNames ? decks.byVolume_no_names : decks.byVolume_all;
        source = (byVol && byVol[vol]) ? byVol[vol] : [];
      }

      // Limit to top N to keep gameplay snappy
      const topN = 800;
      const sliced = source.filter(it => (it.count || 0) >= minFreq).slice(0, topN);
      return sliced.map(it => ({
        strongs: it.strongs,
        heb: it.heb,
        // keep both; displayGloss chooses based on UI
        scriptureGloss: it.scriptureGloss || it.gloss || '',
        strongsGloss: it.strongsGloss || it.gloss || '',
        count: it.count || 0
      }));
    }

    // Surface phrase decks generated from scripture glosses (includes maqaf phrases)
    if (els.deckSel.value.startsWith('project_surface_') && decks) {
      const mode = els.deckSel.value;
      const minFreq = parseInt(els.minFreq && els.minFreq.value ? els.minFreq.value : '1', 10) || 1;
      const vol = mode.replace('project_surface_', '');
      let source = [];
      if (vol === 'all') source = decks.surface_overall || [];
      else source = (decks.surface_byVolume && decks.surface_byVolume[vol]) ? decks.surface_byVolume[vol] : [];

      const topN = 1200;
      const sliced = source.filter(it => (it.count || 0) >= minFreq).slice(0, topN);
      return sliced.map(it => ({ strongs: '', heb: it.heb, gloss: it.gloss, count: it.count || 0 }));
    }

    // Fallback: build from Strong's dictionary itself
    const items = [];
    for (const k of Object.keys(roots)) {
      if (!/^H\d+$/.test(k)) continue;
      const e = roots[k];
      if (!e || !e.w) continue;
      const heb = String(e.w).trim();
      const gloss = String(e.g || '').trim();
      if (!/[\u05D0-\u05EA]/.test(heb)) continue;
      if (!gloss) continue;
      if (els.skipNames.checked && isLikelyProperName(gloss)) continue;
      items.push({ strongs: k, heb, strongsGloss: gloss, scriptureGloss: '', gloss: gloss });
    }
    if (els.deckSel.value === 'strongs_hebrew_core') {
      return items.filter(it => it.heb.length <= 8 && it.gloss.split(/\s+/).length <= 3);
    }
    return items;
  }

  function randInt(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  let deck = [];
  let current = null;
  let locked = false;
  let revealed = false;
  let typedGraded = false;
  let masteryMode = false;
  let mastery = null; // { ref, text, clozeText, clozeAnswer }
  let beginnerMode = false;
  let beginnerKind = '';
  let stemsMode = false;
  let stemsCurrent = null; // { heb, stem, count }

  function setMeta(item) {
    const parts = [];
    if (els.showStrongs.checked && item.strongs) parts.push(`Strong’s ${item.strongs}`);
    if (typeof item.count === 'number' && item.count > 0) parts.push(`Seen ${item.count}× in project`);
    els.frontMeta.textContent = parts.join(' · ');
    els.frontMeta.style.display = parts.length ? '' : 'none';
  }

  function clearChoices() {
    els.choices.innerHTML = '';
  }

  function hebLettersOnly(s) {
    // Strip nikkud/cantillation + punctuation/spaces; normalize final forms.
    const finals = { 'ך':'כ', 'ם':'מ', 'ן':'נ', 'ף':'פ', 'ץ':'צ' };
    return String(s || '')
      .replace(/[\u0591-\u05C7]/g, '')
      .replace(/[^\u05D0-\u05EA]/g, '')
      .replace(/[ךםןףץ]/g, m => finals[m] || m);
  }

  function normEnglish(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[–—]/g, '-')
      .replace(/[^a-z0-9\s'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function setPrompt() {
    const mode = els.modeSel.value;
    if (mode === 'heb_to_eng') els.prompt.textContent = 'Choose the best English gloss.';
    else if (mode === 'eng_to_heb') els.prompt.textContent = 'Choose the matching Hebrew word.';
    else if (mode === 'type_eng_from_heb') els.prompt.textContent = 'Type the English gloss (as in the scripture).';
    else if (mode === 'type_heb_from_eng') els.prompt.textContent = 'Type the Hebrew spelling (letters only — nikkud ignored).';
    else els.prompt.textContent = 'Flashcard: reveal the meaning.';
  }

  function showTypingUI(show) {
    els.typeWrap.style.display = show ? '' : 'none';
    els.choices.style.display = show ? 'none' : '';
    if (!show) {
      els.typeInput.value = '';
      els.typeFeedback.textContent = '';
      typedGraded = false;
    }
  }

  function expectedAnswer() {
    const mode = els.modeSel.value;
    if (mode === 'type_eng_from_heb') return displayGloss(current);
    if (mode === 'type_heb_from_eng') return current.heb;
    return '';
  }

  function masteryExpectedAnswer() {
    return mastery && mastery.clozeAnswer ? mastery.clozeAnswer : '';
  }

  function gradeTyped() {
    if (typedGraded) return;
    const mode = els.modeSel.value;
    const user = els.typeInput.value || '';

    // Scripture mastery cloze grading
    if (masteryMode) {
      const exp = masteryExpectedAnswer();
      if (!exp) return;
      stats.seen++;
      const correct = hebLettersOnly(user) === hebLettersOnly(exp);
      typedGraded = true;
      if (correct) {
        stats.correct++;
        stats.streak++;
        if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
        els.typeFeedback.innerHTML = `<span style="color:var(--ok); font-weight:700;">Correct.</span>`;
      } else {
        stats.wrong++;
        stats.streak = 0;
        els.typeFeedback.innerHTML =
          `<span style="color:var(--danger); font-weight:700;">Not quite.</span> ` +
          `<span style="opacity:0.9">Answer: <strong>${escapeHtml(exp)}</strong> ` +
          `<span style="opacity:0.75">(letters: ${escapeHtml(hebLettersOnly(exp))})</span></span>`;
      }
      saveStats(stats);
      renderStats();
      els.nextBtn.disabled = false;
      return;
    }

    if (!current) return;
    const exp = expectedAnswer();
    if (!exp) return;

    stats.seen++;
    let correct = false;

    if (mode === 'type_heb_from_eng') {
      correct = hebLettersOnly(user) === hebLettersOnly(exp);
    } else {
      // English typing: normalize punctuation/spacing
      correct = normEnglish(user) === normEnglish(exp);
    }

    typedGraded = true;
    if (correct) {
      stats.correct++;
      stats.streak++;
      if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
      els.typeFeedback.innerHTML = `<span style="color:var(--ok); font-weight:700;">Correct.</span>`;
    } else {
      stats.wrong++;
      stats.streak = 0;
      const showExp = (mode === 'type_heb_from_eng')
        ? `${exp} <span style="opacity:0.75">(letters: ${hebLettersOnly(exp)})</span>`
        : exp;
      els.typeFeedback.innerHTML =
        `<span style="color:var(--danger); font-weight:700;">Not quite.</span> ` +
        `<span style="opacity:0.9">Answer: <strong>${escapeHtml(showExp)}</strong></span>`;
    }

    saveStats(stats);
    renderStats();
    els.nextBtn.disabled = false;
  }

  function showTypedAnswer() {
    const mode = els.modeSel.value;
    const exp = masteryMode ? masteryExpectedAnswer() : expectedAnswer();
    if (!exp) return;
    const showExp = (masteryMode || mode === 'type_heb_from_eng')
      ? `${exp} (letters: ${hebLettersOnly(exp)})`
      : exp;
    els.typeFeedback.innerHTML = `Answer: <strong>${escapeHtml(showExp)}</strong>`;
  }

  function renderFlashcard() {
    clearChoices();
    revealed = false;
    els.revealBtn.style.display = '';
    els.nextBtn.disabled = false;
    els.footerHint.textContent = 'Tip: press Space to reveal, Enter for next.';
    showTypingUI(false);
  }

  function renderMultipleChoice() {
    const mode = els.modeSel.value;
    const count = parseInt(els.choiceCount.value, 10) || 4;
    const opts = [current];
    const pool = deck;
    const used = new Set([current.strongs]);

    while (opts.length < count && pool.length > opts.length) {
      const pick = pool[randInt(pool.length)];
      if (!pick || used.has(pick.strongs)) continue;
      used.add(pick.strongs);
      opts.push(pick);
    }
    shuffle(opts);

    clearChoices();
    els.revealBtn.style.display = 'none';
    els.nextBtn.disabled = true;
    els.footerHint.textContent = 'Tip: press 1–8 to answer, Enter for next after grading.';
    showTypingUI(false);

    opts.forEach((it, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choiceBtn';
      btn.dataset.strongs = it.strongs;
      btn.dataset.idx = String(idx + 1);
      btn.textContent = mode === 'heb_to_eng'
        ? `${idx + 1}. ${displayGloss(it)}`
        : `${idx + 1}. ${it.heb}`;
      btn.addEventListener('click', () => gradeChoice(it.strongs, btn));
      els.choices.appendChild(btn);
    });
  }

  function showFront() {
    masteryMode = false;
    mastery = null;
    stemsMode = false;
    stemsCurrent = null;
    els.frontHeb.textContent = current.heb;
    setMeta(current);
    setPrompt();

    locked = false;
    revealed = false;
    typedGraded = false;

    if (els.modeSel.value === 'flashcard') {
      renderFlashcard();
    } else if (els.modeSel.value === 'type_eng_from_heb' || els.modeSel.value === 'type_heb_from_eng') {
      clearChoices();
      els.revealBtn.style.display = 'none';
      els.nextBtn.disabled = true;
      showTypingUI(true);
      els.typeInput.value = '';
      els.typeInput.placeholder = (els.modeSel.value === 'type_heb_from_eng')
        ? 'Type Hebrew letters (no nikkud)…'
        : 'Type the English gloss…';
      els.typeInput.focus();
      els.footerHint.textContent = 'Tip: press Enter to check, then Enter again for next.';
    } else {
      renderMultipleChoice();
    }
  }

  function nextCard() {
    if (masteryMode) {
      startMasteryRound();
      return;
    }
    if (beginnerMode) {
      if (beginnerKind === 'letters') beginRoundLetters();
      else if (beginnerKind === 'finals') beginRoundFinals();
      else if (beginnerKind === 'prefixes') beginRoundPrefixes();
      else if (beginnerKind === 'lookalikes') beginRoundLookalikes();
      else if (beginnerKind === 'particles') beginRoundParticles();
      return;
    }
    if (stemsMode) {
      startStemsRound();
      return;
    }
    if (!deck.length) {
      els.frontHeb.textContent = 'No words available.';
      els.frontMeta.textContent = '';
      els.prompt.textContent = 'Try changing deck options (e.g., allow names).';
      clearChoices();
      els.revealBtn.style.display = 'none';
      els.nextBtn.disabled = true;
      return;
    }
    current = deck[randInt(deck.length)];
    showFront();
  }

  function setMasteryPrompt() {
    els.prompt.textContent = 'Fill in the missing Hebrew word (letters only — nikkud ignored).';
  }

  function buildHebrewCloze(hebrewText) {
    const toks = String(hebrewText || '').split(/\s+/).filter(Boolean);
    const candidates = [];
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      const letters = hebLettersOnly(t);
      if (!letters) continue;
      if (letters.length < 2) continue;
      candidates.push({ i, token: t, letters });
    }
    if (!candidates.length) return { clozeText: hebrewText, answer: '' };
    const pick = candidates[randInt(candidates.length)];
    toks[pick.i] = '_____';
    return { clozeText: toks.join(' '), answer: pick.token };
  }

  function startMasteryRound() {
    const mdeck = window.MasteryHebrewDeck || [];
    if (!mdeck.length) {
      els.frontHeb.style.direction = 'ltr';
      els.frontHeb.textContent = 'Hebrew Scripture Mastery deck missing.';
      els.prompt.textContent = 'Run the build script to generate mastery_hebrew_deck.js.';
      clearChoices();
      els.nextBtn.disabled = true;
      return;
    }
    masteryMode = true;
    typedGraded = false;

    const it = mdeck[randInt(mdeck.length)];
    const cloze = buildHebrewCloze(it.hebrew);
    mastery = { ref: it.ref, hebrew: it.hebrew, clozeText: cloze.clozeText, clozeAnswer: cloze.answer };

    // Show Hebrew cloze as the main "card"
    els.frontHeb.style.direction = 'rtl';
    els.frontHeb.textContent = mastery.clozeText;
    els.frontMeta.style.display = '';
    els.frontMeta.textContent = mastery.ref;
    setMasteryPrompt();

    // Hide choices; typing only
    clearChoices();

    // Typing UI
    els.revealBtn.style.display = 'none';
    els.nextBtn.disabled = true;
    els.typeInput.value = '';
    els.typeInput.placeholder = 'Type the missing Hebrew word (letters only ok)…';
    els.typeFeedback.textContent = '';
    els.typeWrap.style.display = '';

    els.footerHint.textContent = 'Tip: press Enter to check, then Enter again for next.';
    setTimeout(() => { try { els.typeInput.focus(); } catch(e) {} }, 0);
  }

  function gradeChoice(strongs, btnEl) {
    if (locked) return;
    locked = true;
    stats.seen++;

    const correct = (strongs === current.strongs);
    if (correct) {
      stats.correct++;
      stats.streak++;
      if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
    } else {
      stats.wrong++;
      stats.streak = 0;
    }
    saveStats(stats);
    renderStats();

    // Mark all buttons
    const buttons = Array.from(els.choices.querySelectorAll('.choiceBtn'));
    for (const b of buttons) {
      const isCorrect = b.dataset.strongs === current.strongs;
      if (isCorrect) b.classList.add('correct');
      if (b === btnEl && !correct) b.classList.add('wrong');
      b.disabled = true;
    }
    els.nextBtn.disabled = false;
  }

  function reveal() {
    if (els.modeSel.value !== 'flashcard') return;
    if (revealed) return;
    revealed = true;
    // Count as "seen" but not graded; user can self-check.
    stats.seen++;
    saveStats(stats);
    renderStats();

    const p = document.createElement('div');
    p.className = 'prompt';
    p.style.marginTop = '10px';
    p.innerHTML = `<strong>Meaning:</strong> <span>${escapeHtml(displayGloss(current))}</span>`;
    els.choices.innerHTML = '';
    els.choices.appendChild(p);
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function rebuild() {
    deck = buildDeck();
    renderStats();
    nextCard();
  }

  function setUIStarted(started) {
    // Hide picker once a game is chosen; settings remain available.
    if (els.gamePicker) els.gamePicker.style.display = started ? 'none' : '';
  }

  function showBeginnerPicker(show) {
    if (!els.beginnerPicker) return;
    els.beginnerPicker.classList.toggle('show', !!show);
    if (els.gamePicker) els.gamePicker.style.display = show ? 'none' : '';
  }

  const ALEPH_BET = [
    { l: 'א', n: 'Aleph' }, { l: 'ב', n: 'Bet' }, { l: 'ג', n: 'Gimel' }, { l: 'ד', n: 'Dalet' },
    { l: 'ה', n: 'He' }, { l: 'ו', n: 'Vav' }, { l: 'ז', n: 'Zayin' }, { l: 'ח', n: 'Chet' },
    { l: 'ט', n: 'Tet' }, { l: 'י', n: 'Yod' }, { l: 'כ', n: 'Kaf' }, { l: 'ל', n: 'Lamed' },
    { l: 'מ', n: 'Mem' }, { l: 'נ', n: 'Nun' }, { l: 'ס', n: 'Samekh' }, { l: 'ע', n: 'Ayin' },
    { l: 'פ', n: 'Pe' }, { l: 'צ', n: 'Tsadi' }, { l: 'ק', n: 'Qof' }, { l: 'ר', n: 'Resh' },
    { l: 'ש', n: 'Shin' }, { l: 'ת', n: 'Tav' },
    { l: 'ך', n: 'Final Kaf' }, { l: 'ם', n: 'Final Mem' }, { l: 'ן', n: 'Final Nun' }, { l: 'ף', n: 'Final Pe' }, { l: 'ץ', n: 'Final Tsadi' },
  ];

  const FINAL_PAIRS = [
    { base: 'כ', fin: 'ך', name: 'Kaf' },
    { base: 'מ', fin: 'ם', name: 'Mem' },
    { base: 'נ', fin: 'ן', name: 'Nun' },
    { base: 'פ', fin: 'ף', name: 'Pe' },
    { base: 'צ', fin: 'ץ', name: 'Tsadi' },
  ];

  const PREFIX_MEANINGS = [
    { p: 'ו', m: 'and' },
    { p: 'ה', m: 'the' },
    { p: 'ב', m: 'in' },
    { p: 'ל', m: 'to' },
    { p: 'מ', m: 'from' },
    { p: 'כ', m: 'as/like' },
    { p: 'ש', m: 'that/which' },
  ];

  const PREFIX_NOUNS = ['ספר', 'בית', 'מלך', 'עם', 'ארץ', 'שם'];

  // Common visual confusions for brand-new readers.
  // We quiz "Which letter is <name>?" with a limited pool each round.
  const LOOKALIKE_SETS = [
    ['ד', 'ר'],
    ['ה', 'ח', 'ת'],
    ['ב', 'כ'],
    ['כ', 'פ'],
    ['ו', 'ז'],
    ['י', 'ו'],
    ['ס', 'ם'],
    ['נ', 'ג'],
  ];

  const LOOKALIKE_NAMES = {
    'ד': 'Dalet',
    'ר': 'Resh',
    'ה': 'He',
    'ח': 'Chet',
    'ת': 'Tav',
    'ב': 'Bet',
    'כ': 'Kaf',
    'פ': 'Pe',
    'ו': 'Vav',
    'ז': 'Zayin',
    'י': 'Yod',
    'ס': 'Samekh',
    'ם': 'Final Mem',
    'נ': 'Nun',
    'ג': 'Gimel',
  };

  // High-frequency function words beginners meet constantly (letters-only).
  const PARTICLES = [
    { h: 'את', e: '[direct object marker]' },
    { h: 'לא', e: 'not' },
    { h: 'כן', e: 'yes/so' },
    { h: 'כי', e: 'for/because/that' },
    { h: 'אם', e: 'if' },
    { h: 'על', e: 'on/upon/about' },
    { h: 'אל', e: 'to/unto' },
    { h: 'עם', e: 'with/people' },
    { h: 'מן', e: 'from' },
    { h: 'כל', e: 'all/every' },
    { h: 'זה', e: 'this' },
    { h: 'אשר', e: 'which/that' },
    { h: 'גם', e: 'also' },
    { h: 'עוד', e: 'again/still/yet' },
    { h: 'שם', e: 'there/name' },
    { h: 'פה', e: 'here/mouth' },
    { h: 'הנה', e: 'behold' },
  ];

  function setBeginnerHeader(text) {
    els.frontHeb.style.direction = 'rtl';
    els.frontHeb.textContent = text;
    els.frontMeta.textContent = '';
    els.frontMeta.style.display = 'none';
  }

  function beginRoundLetters() {
    beginnerMode = true;
    beginnerKind = 'letters';
    locked = false;
    typedGraded = false;
    revealed = false;
    masteryMode = false;
    mastery = null;

    const target = ALEPH_BET[randInt(ALEPH_BET.length)];
    setBeginnerHeader(target.l);
    els.prompt.textContent = 'Choose the letter name.';
    els.revealBtn.style.display = 'none';
    els.nextBtn.disabled = true;
    showTypingUI(false);

    const count = 6;
    const opts = [target];
    const used = new Set([target.n]);
    while (opts.length < count) {
      const p = ALEPH_BET[randInt(ALEPH_BET.length)];
      if (used.has(p.n)) continue;
      used.add(p.n);
      opts.push(p);
    }
    shuffle(opts);
    clearChoices();
    opts.forEach((it, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choiceBtn';
      btn.dataset.idx = String(idx + 1);
      btn.textContent = `${idx + 1}. ${it.n}`;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        stats.seen++;
        const ok = it.n === target.n;
        if (ok) { stats.correct++; stats.streak++; if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak; }
        else { stats.wrong++; stats.streak = 0; }
        saveStats(stats); renderStats();
        for (const b of Array.from(els.choices.querySelectorAll('.choiceBtn'))) {
          if (b.textContent.endsWith(target.n)) b.classList.add('correct');
          if (b === btn && !ok) b.classList.add('wrong');
          b.disabled = true;
        }
        els.nextBtn.disabled = false;
      });
      els.choices.appendChild(btn);
    });
    els.footerHint.textContent = 'Tip: press 1–6 to answer, Enter for next.';
  }

  function beginRoundFinals() {
    beginnerMode = true;
    beginnerKind = 'finals';
    locked = false;
    masteryMode = false;
    mastery = null;
    showTypingUI(false);

    const pair = FINAL_PAIRS[randInt(FINAL_PAIRS.length)];
    const askFinal = Math.random() < 0.5;
    const shown = askFinal ? pair.fin : pair.base;
    const answer = askFinal ? pair.base : pair.fin;
    setBeginnerHeader(shown);
    els.prompt.textContent = askFinal ? 'Choose the matching regular form.' : 'Choose the matching final form.';
    els.revealBtn.style.display = 'none';
    els.nextBtn.disabled = true;

    const opts = [answer];
    const pool = askFinal ? FINAL_PAIRS.map(p => p.base) : FINAL_PAIRS.map(p => p.fin);
    while (opts.length < 4) {
      const pick = pool[randInt(pool.length)];
      if (opts.includes(pick)) continue;
      opts.push(pick);
    }
    shuffle(opts);
    clearChoices();
    opts.forEach((it, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choiceBtn';
      btn.dataset.idx = String(idx + 1);
      btn.textContent = `${idx + 1}. ${it}`;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        stats.seen++;
        const ok = it === answer;
        if (ok) { stats.correct++; stats.streak++; if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak; }
        else { stats.wrong++; stats.streak = 0; }
        saveStats(stats); renderStats();
        for (const b of Array.from(els.choices.querySelectorAll('.choiceBtn'))) {
          if (b.textContent.endsWith(answer)) b.classList.add('correct');
          if (b === btn && !ok) b.classList.add('wrong');
          b.disabled = true;
        }
        els.nextBtn.disabled = false;
      });
      els.choices.appendChild(btn);
    });
    els.footerHint.textContent = 'Tip: press 1–4 to answer, Enter for next.';
  }

  function beginRoundPrefixes() {
    beginnerMode = true;
    beginnerKind = 'prefixes';
    locked = false;
    masteryMode = false;
    mastery = null;
    showTypingUI(false);

    const pref = PREFIX_MEANINGS[randInt(PREFIX_MEANINGS.length)];
    const noun = PREFIX_NOUNS[randInt(PREFIX_NOUNS.length)];
    const shown = pref.p + noun; // letters-only is fine for beginner drill
    setBeginnerHeader(shown);
    els.prompt.textContent = 'What does the prefix mean?';
    els.revealBtn.style.display = 'none';
    els.nextBtn.disabled = true;

    const opts = [pref.m];
    while (opts.length < 4) {
      const pick = PREFIX_MEANINGS[randInt(PREFIX_MEANINGS.length)].m;
      if (opts.includes(pick)) continue;
      opts.push(pick);
    }
    shuffle(opts);
    clearChoices();
    opts.forEach((it, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choiceBtn';
      btn.dataset.idx = String(idx + 1);
      btn.textContent = `${idx + 1}. ${it}`;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        stats.seen++;
        const ok = it === pref.m;
        if (ok) { stats.correct++; stats.streak++; if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak; }
        else { stats.wrong++; stats.streak = 0; }
        saveStats(stats); renderStats();
        for (const b of Array.from(els.choices.querySelectorAll('.choiceBtn'))) {
          if (b.textContent.endsWith(pref.m)) b.classList.add('correct');
          if (b === btn && !ok) b.classList.add('wrong');
          b.disabled = true;
        }
        els.nextBtn.disabled = false;
      });
      els.choices.appendChild(btn);
    });
    els.footerHint.textContent = 'Tip: press 1–4 to answer, Enter for next.';
  }

  function beginRoundLookalikes() {
    beginnerMode = true;
    beginnerKind = 'lookalikes';
    locked = false;
    masteryMode = false;
    mastery = null;
    showTypingUI(false);

    const set = LOOKALIKE_SETS[randInt(LOOKALIKE_SETS.length)];
    const target = set[randInt(set.length)];
    setBeginnerHeader(target);
    els.prompt.textContent = `Which letter is “${LOOKALIKE_NAMES[target] || 'this'}”?`;
    els.revealBtn.style.display = 'none';
    els.nextBtn.disabled = true;

    const opts = set.slice();
    shuffle(opts);
    clearChoices();
    opts.forEach((it, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choiceBtn';
      btn.dataset.idx = String(idx + 1);
      btn.textContent = `${idx + 1}. ${it}`;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        stats.seen++;
        const ok = it === target;
        if (ok) { stats.correct++; stats.streak++; if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak; }
        else { stats.wrong++; stats.streak = 0; }
        saveStats(stats); renderStats();
        for (const b of Array.from(els.choices.querySelectorAll('.choiceBtn'))) {
          if (b.textContent.endsWith(target)) b.classList.add('correct');
          if (b === btn && !ok) b.classList.add('wrong');
          b.disabled = true;
        }
        els.nextBtn.disabled = false;
      });
      els.choices.appendChild(btn);
    });
    els.footerHint.textContent = `Tip: press 1–${opts.length} to answer, Enter for next.`;
  }

  function beginRoundParticles() {
    beginnerMode = true;
    beginnerKind = 'particles';
    locked = false;
    masteryMode = false;
    mastery = null;
    showTypingUI(false);

    const target = PARTICLES[randInt(PARTICLES.length)];
    setBeginnerHeader(target.h);
    els.prompt.textContent = 'Choose the best English meaning.';
    els.revealBtn.style.display = 'none';
    els.nextBtn.disabled = true;

    const opts = [target.e];
    while (opts.length < 4) {
      const pick = PARTICLES[randInt(PARTICLES.length)].e;
      if (opts.includes(pick)) continue;
      opts.push(pick);
    }
    shuffle(opts);
    clearChoices();
    opts.forEach((it, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choiceBtn';
      btn.dataset.idx = String(idx + 1);
      btn.textContent = `${idx + 1}. ${it}`;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        stats.seen++;
        const ok = it === target.e;
        if (ok) { stats.correct++; stats.streak++; if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak; }
        else { stats.wrong++; stats.streak = 0; }
        saveStats(stats); renderStats();
        for (const b of Array.from(els.choices.querySelectorAll('.choiceBtn'))) {
          if (b.textContent.endsWith(target.e)) b.classList.add('correct');
          if (b === btn && !ok) b.classList.add('wrong');
          b.disabled = true;
        }
        els.nextBtn.disabled = false;
      });
      els.choices.appendChild(btn);
    });
    els.footerHint.textContent = 'Tip: press 1–4 to answer, Enter for next.';
  }

  function startBeginner(kind) {
    setUIStarted(true);
    showBeginnerPicker(false);
    beginnerMode = true;
    beginnerKind = kind;
    if (kind === 'letters') beginRoundLetters();
    else if (kind === 'finals') beginRoundFinals();
    else if (kind === 'prefixes') beginRoundPrefixes();
    else if (kind === 'lookalikes') beginRoundLookalikes();
    else if (kind === 'common25') {
      // Use the same engine but restrict deck to top 25, scripture gloss, no names.
      const decks = window.VocabDecks || null;
      const list = (decks && decks.overall_no_names) ? decks.overall_no_names.slice(0, 25) : [];
      deck = list.map(it => ({
        strongs: it.strongs,
        heb: it.heb,
        scriptureGloss: it.scriptureGloss || it.gloss || '',
        strongsGloss: it.strongsGloss || it.gloss || '',
        count: it.count || 0
      }));
      beginnerMode = false; // treat as normal multiple choice game
      els.modeSel.value = 'heb_to_eng';
      renderStats();
      nextCard();
    }
    else if (kind === 'particles') beginRoundParticles();
  }

  function startStemsRound() {
    const sdeck = window.VerbStemsDeck || [];
    if (!sdeck.length) {
      els.frontHeb.style.direction = 'ltr';
      els.frontHeb.textContent = 'Verb stems deck missing.';
      els.prompt.textContent = 'Run the build script to generate verb_stems_deck.js.';
      clearChoices();
      els.nextBtn.disabled = true;
      return;
    }
    stemsMode = true;
    masteryMode = false;
    beginnerMode = false;
    locked = false;
    revealed = false;
    typedGraded = false;

    stemsCurrent = sdeck[randInt(sdeck.length)];
    els.frontHeb.style.direction = 'rtl';
    els.frontHeb.textContent = stemsCurrent.heb;
    els.frontMeta.textContent = `Seen ${stemsCurrent.count}× (heuristic deck)`;
    els.frontMeta.style.display = '';
    els.prompt.textContent = 'Which verb stem (binyan) is this?';

    showTypingUI(false);
    els.revealBtn.style.display = 'none';
    els.nextBtn.disabled = true;

    const all = ['Qal','Nifal','Piel','Pual','Hifil','Hofal','Hitpael'];
    const opts = [stemsCurrent.stem];
    while (opts.length < 4) {
      const pick = all[randInt(all.length)];
      if (opts.includes(pick)) continue;
      opts.push(pick);
    }
    shuffle(opts);
    clearChoices();
    opts.forEach((label, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choiceBtn';
      btn.dataset.idx = String(idx + 1);
      btn.textContent = `${idx + 1}. ${label}`;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        stats.seen++;
        const ok = label === stemsCurrent.stem;
        if (ok) { stats.correct++; stats.streak++; if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak; }
        else { stats.wrong++; stats.streak = 0; }
        saveStats(stats); renderStats();
        for (const b of Array.from(els.choices.querySelectorAll('.choiceBtn'))) {
          if (b.textContent.endsWith(stemsCurrent.stem)) b.classList.add('correct');
          if (b === btn && !ok) b.classList.add('wrong');
          b.disabled = true;
        }
        els.nextBtn.disabled = false;
      });
      els.choices.appendChild(btn);
    });
    els.footerHint.textContent = 'Tip: press 1–4 to answer, Enter for next.';
  }

  function startGame(gameKey) {
    // Map game selection to an initial mode.
    if (gameKey === 'mc') els.modeSel.value = 'heb_to_eng';
    else if (gameKey === 'typing') els.modeSel.value = 'type_eng_from_heb';
    else if (gameKey === 'flash') els.modeSel.value = 'flashcard';
    else if (gameKey === 'mastery') {
      setUIStarted(true);
      startMasteryRound();
      return;
    }
    else if (gameKey === 'beginner') {
      showBeginnerPicker(true);
      return;
    }
    else if (gameKey === 'stems') {
      setUIStarted(true);
      startStemsRound();
      return;
    }
    setUIStarted(true);
    rebuild();
  }

  els.modeSel.addEventListener('change', rebuild);
  els.deckSel.addEventListener('change', rebuild);
  els.choiceCount.addEventListener('change', rebuild);
  if (els.minFreq) els.minFreq.addEventListener('change', rebuild);
  els.showStrongs.addEventListener('change', () => { if (current) setMeta(current); });
  if (els.glossSource) els.glossSource.addEventListener('change', rebuild);
  els.skipNames.addEventListener('change', rebuild);

  els.nextBtn.addEventListener('click', nextCard);
  els.revealBtn.addEventListener('click', reveal);
  if (els.submitBtn) els.submitBtn.addEventListener('click', gradeTyped);
  if (els.showAnswerBtn) els.showAnswerBtn.addEventListener('click', showTypedAnswer);
  els.resetBtn.addEventListener('click', () => {
    stats = { seen: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0 };
    saveStats(stats);
    renderStats();
    nextCard();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      reveal();
      return;
    }
    if (e.key === 'Enter') {
      if (masteryMode) {
        if (!typedGraded) gradeTyped();
        else nextCard();
      } else if (els.modeSel.value === 'type_eng_from_heb' || els.modeSel.value === 'type_heb_from_eng') {
        if (!typedGraded) gradeTyped();
        else nextCard();
      } else {
        nextCard();
      }
      return;
    }
    // 1-8 quick answer for multiple choice
    if (/^[1-8]$/.test(e.key) && els.modeSel.value !== 'flashcard') {
      const btn = els.choices.querySelector(`.choiceBtn[data-idx="${e.key}"]`);
      if (btn) btn.click();
    }
  });

  // Init
  renderStats();
  // Start on game picker (no auto-run until user chooses).
  setUIStarted(false);

  if (els.gamePicker) {
    els.gamePicker.addEventListener('click', (e) => {
      const card = e.target.closest('.gp-card');
      if (!card) return;
      const g = card.getAttribute('data-game');
      if (g) startGame(g);
    });
  } else {
    // Fallback: if picker missing, start immediately.
    rebuild();
  }

  if (els.beginnerPicker) {
    els.beginnerPicker.addEventListener('click', (e) => {
      const card = e.target.closest('.gp-card');
      if (card && card.getAttribute('data-beginner')) {
        const k = card.getAttribute('data-beginner');
        if (k) startBeginner(k);
      }
    });
  }
  if (els.beginnerBackBtn) {
    els.beginnerBackBtn.addEventListener('click', () => {
      showBeginnerPicker(false);
      setUIStarted(false);
    });
  }
})();

