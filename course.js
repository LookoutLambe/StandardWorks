(() => {
  const els = {
    units: document.getElementById('units'),
    pathView: document.getElementById('pathView'),
    runnerView: document.getElementById('runnerView'),
    progressPill: document.getElementById('progressPill'),
    resumeBtn: document.getElementById('resumeBtn'),
    trackBar: document.getElementById('trackBar'),
    lessonPill: document.getElementById('lessonPill'),
    exitBtn: document.getElementById('exitBtn'),
    nextBtn: document.getElementById('nextBtn'),
    meaningsBtn: document.getElementById('meaningsBtn'),
    backBtn: document.getElementById('backBtn'),
    restartBtn: document.getElementById('restartBtn'),
    stepTitle: document.getElementById('stepTitle'),
    stepPrompt: document.getElementById('stepPrompt'),
    hebBig: document.getElementById('hebBig'),
    tiles: document.getElementById('tiles'),
    bank: document.getElementById('bank'),
    choices: document.getElementById('choices'),
    typeWrap: document.getElementById('typeWrap'),
    typeInput: document.getElementById('typeInput'),
    checkBtn: document.getElementById('checkBtn'),
    hearBtn: document.getElementById('hearBtn'),
    speakBtn: document.getElementById('speakBtn'),
    feedback: document.getElementById('feedback'),
    footerHint: document.getElementById('footerHint'),
  };

  // If anything throws during boot, show it instead of hanging on "Loading…"
  try {
    window.addEventListener('error', (e) => {
      try {
        if (els && els.progressPill) {
          els.progressPill.textContent = 'Error loading course. Please refresh.';
        }
      } catch (_) {}
      try { console.error(e && e.error ? e.error : e); } catch (_) {}
    });
  } catch (_) {}

  function randInt(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function hebLettersOnly(s) {
    const finals = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
    return String(s || '')
      .replace(/[\u0591-\u05C7]/g, '')
      .replace(/[^\u05D0-\u05EA]/g, '')
      .replace(/[ךםןףץ]/g, m => finals[m] || m);
  }

  function normalizeSpaces(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  // --- Optional tile meanings (teaching-first builds) ---
  const MEANINGS_KEY = 'sw-course-meanings-v1';
  let showMeanings = false;
  try { showMeanings = localStorage.getItem(MEANINGS_KEY) === '1'; } catch (e) {}

  // Minimal starter lexicon for early units (can be expanded continuously).
  // Keys are letters-only to tolerate niqqud.
  const WORD_MEANINGS = {
    'כי': 'for / because / that',
    'לא': 'not / no',
    'אם': 'if',
    'אל': 'to / unto',
    'על': 'on / upon / about',
    'מן': 'from',
    'ו': 'and',
    'ה': 'the',
    'ב': 'in',
    'ל': 'to / for',
    'מ': 'from',
    'כ': 'as / like',
    'ש': 'that / which',
    'יהוה': 'the LORD',
    'אלהים': 'God',
    'אמר': 'said',
    'ויאמר': 'and he said',
    'ויהי': 'and it came to pass',
    'בא': 'came (m)',
    'באה': 'came (f)',
    'הלך': 'went',
    'וילך': 'and he went',
    'ראה': 'saw',
    'וירא': 'and he saw',
    'שמע': 'heard',
    'וישמע': 'and he heard',
    'אדם': 'man / human',
    'אשה': 'woman',
    'בן': 'son',
    'בת': 'daughter',
    'מלך': 'king',
    'עם': 'people',
    'ארץ': 'land / earth',
    'בית': 'house',
    'ספר': 'book',
    'דבר': 'word / thing',
    'ברית': 'covenant',
    'תורה': 'law / teaching',
    'שם': 'name',
    'לב': 'heart',
    'יד': 'hand',
    'עין': 'eye',
    'דרך': 'way / path'
  };

  function tokenMeaning(token) {
    const key0 = hebLettersOnly(token);
    if (!key0) return '';
    const direct = WORD_MEANINGS[key0];
    if (direct) return direct;

    // Heuristic prefix handling so common forms like הָאָרֶץ / וְהָאָב get an English prompt.
    // We keep this intentionally simple (teaching-first, not a full morphology engine).
    function resolve(k, depth = 0) {
      if (!k || depth > 2) return '';
      if (WORD_MEANINGS[k]) return WORD_MEANINGS[k];

      // Definite article
      if (k.startsWith('ה') && k.length > 1) {
        const base = resolve(k.slice(1), depth + 1);
        if (base) return 'the ' + base;
      }

      // Single-letter prefixes
      const p = k[0];
      const rest = k.slice(1);
      const base = resolve(rest, depth + 1);
      if (!base) return '';
      if (p === 'ו') return 'and ' + base;
      if (p === 'ב') return 'in ' + base;
      if (p === 'ל') return 'to/for ' + base;
      if (p === 'מ') return 'from ' + base;
      if (p === 'כ') return 'as/like ' + base;
      if (p === 'ש') return 'that/which ' + base;
      return '';
    }

    return resolve(key0) || '';
  }

  function renderTile(el, heb) {
    if (!showMeanings) {
      el.textContent = heb;
      return;
    }
    const m = tokenMeaning(heb);
    if (!m) {
      el.textContent = heb;
      return;
    }
    el.innerHTML = `<div style="font-weight:800; direction:rtl;">${escapeHtml(heb)}</div>` +
      `<div style="font-size:0.72em; opacity:0.78; line-height:1.1; direction:ltr;">${escapeHtml(m)}</div>`;
  }

  // Scripture-style starter content: many tiny drills (Unit 1 has 17 lessons).
  // Note: grading uses letters-only Hebrew (niqqud ignored).
  function L(id, title, desc, steps) { return { id, title, desc, steps }; }
  function mcHeb(heb, answer, distract) {
    const choices = shuffle([answer, ...(distract || [])]).slice(0, 4);
    while (choices.length < 4) choices.push(answer);
    shuffle(choices);
    return { type: 'mc', title: 'Choose', prompt: 'What does this usually mean?', heb, choices, answer };
  }
  function mcChooseHebFromEn(en, answers) {
    const choices = shuffle(answers.slice());
    return { type: 'mc', title: 'Choose', prompt: 'Which Hebrew matches?', heb: en, choices, answer: answers[0] };
  }
  function buildWord(enPrompt, heb) { return { type: 'bank_he_from_en', title: 'Build', prompt: enPrompt, heb }; }
  function buildSentence(en, heb) { return { type: 'bank_he_sentence', title: 'Sentence', prompt: 'Build the sentence (Hebrew word bank).', en, heb }; }
  function typeSentence(prompt, heb) { return { type: 'type_he_from_en', title: 'Type', prompt, heb }; }
  function listenChoose(heb, choices) { return { type: 'listen_mc', title: 'Listen', prompt: 'Listen, then choose what you heard.', heb, choices, answer: heb }; }
  function speakRepeat(heb) { return { type: 'speak_repeat', title: 'Speak', prompt: 'Optional: say it aloud.', heb }; }

  function rootIntro(root, forms = [], gloss = '') {
    return {
      type: 'root_intro',
      title: 'Shoresh',
      prompt: 'Meet today’s root (shoresh).',
      root,
      forms,
      gloss
    };
  }

  // Odd-one-out: two share a root, one doesn't
  function shoreshSort(prompt, options, answerIdx) {
    return { type: 'shoresh_sort', title: 'Shoresh Sort', prompt, options, answerIdx };
  }

  const UNIT1 = [
    L('u1l1', 'Particles I', 'את / לא / כי / אם / אל / על', [
      { type: 'match', title: 'Match', prompt: 'Match the Hebrew particle to its meaning.', pairs: [
        ['לֹא', 'not'],
        ['כִּי', 'for/because/that'],
        ['אִם', 'if'],
        ['אֶל', 'to/unto'],
      ]},
      mcHeb('לֹא', 'not', ['to/unto', 'if', 'for/because']),
      mcHeb('כִּי', 'for/because', ['and', 'not', 'this']),
      buildWord('Build the Hebrew: “not”', 'לֹא'),
      buildWord('Build the Hebrew: “if”', 'אִם'),
    ]),

    L('u1l2', 'Prefixes (one-letter)', 'ו / ה / ב / ל / מ / כ / ש', [
      { type: 'match', title: 'Match', prompt: 'Match the prefix to its meaning.', pairs: [
        ['ו', 'and'],
        ['ה', 'the'],
        ['ב', 'in'],
        ['ל', 'to/for'],
      ]},
      { type: 'match', title: 'Match', prompt: 'Match the prefix to its meaning.', pairs: [
        ['מ', 'from'],
        ['כ', 'as/like'],
        ['ש', 'that/which'],
        ['ו', 'and'],
      ]},
      buildWord('Build the prefix for “and”', 'ו'),
      buildWord('Build the prefix for “the”', 'ה'),
    ]),

    L('u1l3', 'אב / אם', 'father / mother (biblical forms)', [
      rootIntro('א־ב', ['אָב', 'אֲבִי', 'אָבוֹת'], 'father / fathers'),
      mcHeb('אָב', 'father', ['mother', 'son', 'daughter']),
      mcHeb('אֵם', 'mother', ['father', 'son', 'daughter']),
      buildWord('Build: “father”', 'אָב'),
      buildWord('Build: “mother”', 'אֵם'),
      buildSentence('The father came.', 'הָאָב בָּא'),
      buildSentence('The mother came.', 'הָאֵם בָּאָה'),
    ]),

    L('u1l4', 'בן / בת', 'son / daughter', [
      rootIntro('ב־נ', ['בֵּן', 'בָּנִים', 'בָּנוֹת'], 'son / sons / daughters'),
      mcHeb('בֵּן', 'son', ['daughter', 'father', 'mother']),
      mcHeb('בַּת', 'daughter', ['son', 'father', 'mother']),
      buildWord('Build: “son”', 'בֵּן'),
      buildWord('Build: “daughter”', 'בַּת'),
      buildSentence('The son came.', 'הַבֵּן בָּא'),
      buildSentence('The daughter came.', 'הַבַּת בָּאָה'),
    ]),

    L('u1l5', 'Pronouns I', 'I / you / he / she', [
      { type: 'match', title: 'Match', prompt: 'Match the pronoun.', pairs: [
        ['אֲנִי', 'I'],
        ['אַתָּה', 'you (m)'],
        ['הוּא', 'he'],
        ['הִיא', 'she'],
      ]},
      buildSentence('I came.', 'אֲנִי בָּאתִי'),
      buildSentence('He came.', 'הוּא בָּא'),
      buildSentence('She came.', 'הִיא בָּאָה'),
    ]),

    L('u1l6', 'זה / זאת', 'this (m) / this (f)', [
      { type: 'match', title: 'Match', prompt: 'Match the demonstrative.', pairs: [
        ['זֶה', 'this (m)'],
        ['זֹאת', 'this (f)'],
        ['הוּא', 'he'],
        ['הִיא', 'she'],
      ]},
      mcChooseHebFromEn('this (m)', ['זֶה', 'זֹאת', 'לֹא', 'כִּי']),
      mcChooseHebFromEn('this (f)', ['זֹאת', 'זֶה', 'אִם', 'אֶל']),
      buildSentence('This is the father.', 'זֶה הָאָב'),
      buildSentence('This is the mother.', 'זֹאת הָאֵם'),
    ]),

    L('u1l7', 'בָּא / בָּאָה', 'came (m) / came (f)', [
      mcChooseHebFromEn('came (m)', ['בָּא', 'בָּאָה', 'אָמַר', 'הָיָה']),
      mcChooseHebFromEn('came (f)', ['בָּאָה', 'בָּא', 'אָמַר', 'הָיָה']),
      buildSentence('The father came.', 'הָאָב בָּא'),
      buildSentence('The mother came.', 'הָאֵם בָּאָה'),
      typeSentence('Type: “The father came.”', 'הָאָב בָּא'),
    ]),

    L('u1l8', 'אָמַר / וַיֹּאמֶר', 'said / and he said', [
      mcChooseHebFromEn('said', ['אָמַר', 'בָּא', 'הָיָה', 'לֹא']),
      mcChooseHebFromEn('and he said', ['וַיֹּאמֶר', 'וַיְהִי', 'לֹא', 'כִּי']),
      buildWord('Build: “and he said”', 'וַיֹּאמֶר'),
      buildSentence('And the LORD said.', 'וַיֹּאמֶר יְהוָה'),
      listenChoose('וַיֹּאמֶר', ['וַיֹּאמֶר', 'וַיְהִי', 'לֹא', 'כִּי']),
    ]),

    L('u1l9', 'וַיְהִי', 'and it came to pass', [
      { type: 'mc', title: 'Choose', prompt: 'What does this usually mean in narrative?', heb: 'וַיְהִי', choices: ['and it came to pass', 'and he said', 'not', 'if'], answer: 'and it came to pass' },
      buildWord('Build: “and it came to pass”', 'וַיְהִי'),
      listenChoose('וַיְהִי', ['וַיְהִי', 'וַיֹּאמֶר', 'לֹא', 'כִּי']),
    ]),

    L('u1l10', 'Negation (לֹא)', 'use “not” in tiny clauses', [
      buildSentence('Not I.', 'לֹא אֲנִי'),
      buildSentence('He is not (…)', 'לֹא הוּא'),
      typeSentence('Type: “Not I.”', 'לֹא אֲנִי'),
      listenChoose('לֹא', ['לֹא', 'כִּי', 'אִם', 'אֶל']),
    ]),

    L('u1l11', 'כִּי', 'for/because/that', [
      mcHeb('כִּי', 'for/because', ['not', 'if', 'to/unto']),
      buildSentence('For the LORD said.', 'כִּי אָמַר יְהוָה'),
      typeSentence('Type: “For the LORD said.”', 'כִּי אָמַר יְהוָה'),
    ]),

    L('u1l12', 'Prepositions: אֶל / עַל', 'to/unto · on/upon', [
      mcHeb('אֶל', 'to/unto', ['on/upon', 'not', 'if']),
      mcHeb('עַל', 'on/upon', ['to/unto', 'not', 'for/because']),
      buildSentence('And he said to the father.', 'וַיֹּאמֶר אֶל הָאָב'),
      buildSentence('And he said upon the earth.', 'וַיֹּאמֶר עַל הָאָרֶץ'),
    ]),

    L('u1l13', 'And (ו)', 'simple chaining', [
      buildSentence('And the father came.', 'וְהָאָב בָּא'),
      buildSentence('And the mother came.', 'וְהָאֵם בָּאָה'),
      typeSentence('Type: “And the father came.”', 'וְהָאָב בָּא'),
      listenChoose('וְהָאָב', ['וְהָאָב', 'הָאָב', 'וַיֹּאמֶר', 'וַיְהִי']),
    ]),

    L('u1l14', 'Mini sentences', 'repeat practical patterns', [
      shoreshSort('Which word does NOT share the same root as the other two?', [
        { heb: 'וַיֹּאמֶר', root: 'א־מ־ר' },
        { heb: 'אָמַר', root: 'א־מ־ר' },
        { heb: 'בָּא', root: 'ב־ו־א' },
      ], 2),
      buildSentence('He came.', 'הוּא בָּא'),
      buildSentence('She came.', 'הִיא בָּאָה'),
      buildSentence('And he said.', 'וַיֹּאמֶר'),
      typeSentence('Type: “He came.”', 'הוּא בָּא'),
      speakRepeat('הוּא בָּא'),
    ]),

    L('u1l15', 'Listen & choose (review)', 'train your ear on core forms', [
      listenChoose('הוּא', ['הוּא', 'הִיא', 'לֹא', 'כִּי']),
      listenChoose('הִיא', ['הִיא', 'הוּא', 'אִם', 'אֶל']),
      listenChoose('בָּא', ['בָּא', 'בָּאָה', 'אָמַר', 'הָיָה']),
      listenChoose('בָּאָה', ['בָּאָה', 'בָּא', 'לֹא', 'כִּי']),
    ]),

    L('u1l16', 'Speak (optional)', 'repeat short scripture-like clauses', [
      speakRepeat('וַיֹּאמֶר יְהוָה'),
      speakRepeat('וַיְהִי'),
      speakRepeat('הָאָב בָּא'),
      speakRepeat('הָאֵם בָּאָה'),
    ]),

    L('u1l17', 'Unit 1 checkpoint', 'mixed review', [
      { type: 'mc', title: 'Choose', prompt: 'Which means “and it came to pass”?', heb: 'Choose the Hebrew.', choices: ['וַיְהִי', 'וַיֹּאמֶר', 'לֹא', 'אִם'], answer: 'וַיְהִי' },
      { type: 'mc', title: 'Choose', prompt: 'Which means “and he said”?', heb: 'Choose the Hebrew.', choices: ['וַיֹּאמֶר', 'וַיְהִי', 'כִּי', 'עַל'], answer: 'וַיֹּאמֶר' },
      buildSentence('And the LORD said.', 'וַיֹּאמֶר יְהוָה'),
      typeSentence('Type: “Not I.”', 'לֹא אֲנִי'),
      buildSentence('This is the father.', 'זֶה הָאָב'),
      buildSentence('This is the mother.', 'זֹאת הָאֵם'),
    ]),
  ];

  function SU(id, title, desc, lessons) { return { id, title, desc, lessons }; }

  // --- Sub-unit normalization: ensure 4–5 lessons and a capstone last lesson ---
  function extractHebTokensFromLesson(lesson) {
    const out = [];
    (lesson && lesson.steps || []).forEach(s => {
      if (s && typeof s.heb === 'string' && /[\u05D0-\u05EA]/.test(s.heb)) {
        normalizeSpaces(s.heb).split(' ').forEach(t => { if (hebLettersOnly(t)) out.push(t); });
      }
      if (Array.isArray(s && s.choices)) {
        s.choices.forEach(c => {
          if (typeof c === 'string' && /[\u05D0-\u05EA]/.test(c)) {
            normalizeSpaces(c).split(' ').forEach(t => { if (hebLettersOnly(t)) out.push(t); });
          }
        });
      }
      if (Array.isArray(s && s.pairs)) {
        s.pairs.forEach(p => {
          if (p && typeof p[0] === 'string' && /[\u05D0-\u05EA]/.test(p[0])) {
            normalizeSpaces(p[0]).split(' ').forEach(t => { if (hebLettersOnly(t)) out.push(t); });
          }
        });
      }
    });
    return out;
  }

  function extractSentenceExamplesFromLesson(lesson) {
    const out = [];
    (lesson && lesson.steps || []).forEach(s => {
      if (s && s.type === 'bank_he_sentence' && s.heb && s.en) {
        out.push({ en: s.en, heb: s.heb });
      }
    });
    return out;
  }

  function uniqBy(arr, keyFn) {
    const seen = new Set();
    const out = [];
    for (const it of arr) {
      const k = keyFn(it);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(it);
    }
    return out;
  }

  function pickDistinctTokens(tokens, n) {
    const uniq = uniqBy(tokens.filter(Boolean), t => hebLettersOnly(t));
    shuffle(uniq);
    return uniq.slice(0, n);
  }

  function makeChooseTokenStep(tokens) {
    const picks = pickDistinctTokens(tokens, 4);
    if (picks.length < 2) return null;
    const answer = picks[0];
    const choices = shuffle(picks.slice());
    return {
      type: 'mc',
      title: 'Choose',
      prompt: 'Choose the exact Hebrew form.',
      heb: 'Choose the Hebrew.',
      choices,
      answer
    };
  }

  function makeListenTokenStep(tokens) {
    const picks = pickDistinctTokens(tokens, 4);
    if (picks.length < 2) return null;
    const answer = picks[0];
    return listenChoose(answer, picks);
  }

  function makeBuildTokenStep(tokens) {
    const picks = pickDistinctTokens(tokens, 1);
    if (!picks.length) return null;
    const tok = picks[0];
    return { type: 'bank_he_from_en', title: 'Build', prompt: 'Build this Hebrew from tiles.', heb: tok };
  }

  function makeCapstoneLesson(subunitId, lessons) {
    const toks = [];
    const ex = [];
    (lessons || []).forEach(l => {
      toks.push(...extractHebTokensFromLesson(l));
      ex.push(...extractSentenceExamplesFromLesson(l));
    });
    const tokens = pickDistinctTokens(toks, 10);
    const examples = uniqBy(ex, e => hebLettersOnly(e.heb)).slice(0, 2);

    const steps = [];
    const s1 = makeChooseTokenStep(tokens); if (s1) steps.push(s1);
    const s2 = makeBuildTokenStep(tokens); if (s2) steps.push(s2);
    if (examples[0]) steps.push(buildSentence(examples[0].en, examples[0].heb));
    const s3 = makeListenTokenStep(tokens); if (s3) steps.push(s3);
    if (examples[1]) steps.push(typeSentence(`Type: “${examples[1].en}”`, examples[1].heb));

    // Fallback so capstone is always playable
    if (!steps.length) {
      steps.push({ type: 'mc', title: 'Review', prompt: 'Capstone coming soon for this sub‑unit.', heb: 'OK', choices: ['OK'], answer: 'OK' });
    }

    return L(`${subunitId}cap`, 'Capstone', 'Mixed review of this sub‑unit.', steps);
  }

  function ensureSubunitLessons(subunit, minLessons = 4, maxLessons = 5) {
    const su = Object.assign({}, subunit);
    const base = (su.lessons || []).slice();

    // Always reserve the last slot for a capstone.
    const cap = makeCapstoneLesson(su.id, base);

    // Build practice lessons from extracted tokens/examples.
    const allTokens = [];
    const allExamples = [];
    base.forEach(l => {
      allTokens.push(...extractHebTokensFromLesson(l));
      allExamples.push(...extractSentenceExamplesFromLesson(l));
    });
    const tokens = pickDistinctTokens(allTokens, 12);
    const examples = uniqBy(allExamples, e => hebLettersOnly(e.heb));

    function makeNewWordsLesson() {
      // Only include words we can actually gloss (teaching-first).
      const picks = [];
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        const m = tokenMeaning(t);
        if (!m) continue;
        // Avoid tiny single-letter prefixes unless that's the point of the sub-unit.
        if (hebLettersOnly(t).length === 1 && su.id !== 'u1s2') continue;
        picks.push([t, m]);
        if (picks.length >= 6) break;
      }
      if (!picks.length) return null;
      return L(`${su.id}nw`, 'New words', 'Learn the words you will build in this sub‑unit.', [
        { type: 'match', title: 'Match', prompt: 'Match the Hebrew word to its meaning.', pairs: picks }
      ]);
    }

    function makePracticeLesson(n) {
      const steps = [];
      const s1 = makeChooseTokenStep(tokens); if (s1) steps.push(s1);
      const s2 = makeBuildTokenStep(tokens); if (s2) steps.push(s2);
      const ex = examples[n % Math.max(1, examples.length)];
      if (ex) steps.push(buildSentence(ex.en, ex.heb));
      const s3 = makeListenTokenStep(tokens); if (s3) steps.push(s3);
      if (ex) steps.push(typeSentence(`Type: “${ex.en}”`, ex.heb));
      if (!steps.length) steps.push({ type: 'mc', title: 'Practice', prompt: 'Practice step.', heb: 'OK', choices: ['OK'], answer: 'OK' });
      return L(`${su.id}p${n}`, `Practice ${n}`, 'Short drill for this sub‑unit.', steps);
    }

    // Start with original authored lessons (if any), but we may prepend a "New words" lesson.
    const lessons = base.slice(0, Math.max(0, maxLessons - 1)); // leave room for capstone
    const nw = makeNewWordsLesson();
    if (nw) lessons.unshift(nw);
    let practiceN = 1;
    while (lessons.length < Math.max(1, minLessons - 1)) {
      lessons.push(makePracticeLesson(practiceN++));
    }

    // Ensure capstone is last.
    lessons.push(cap);
    su.lessons = lessons;
    return su;
  }
  function makePlaceholderUnit(unitId, unitTitle, subunitCount) {
    const subs = [];
    for (let i = 1; i <= subunitCount; i++) {
      const sid = `${unitId}s${i}`;
      const su = SU(sid, `Sub‑unit ${i}`, 'Coming soon.', [
        L(`${sid}l1`, 'Coming soon', 'More Biblical Hebrew drills will appear here.', [
          { type: 'mc', title: 'Coming soon', prompt: 'This sub‑unit is not built yet.', heb: 'OK', choices: ['OK'], answer: 'OK' }
        ])
      ]);
      subs.push(ensureSubunitLessons(su, 4, 5));
    }
    return { id: unitId, title: unitTitle, desc: `${subunitCount} sub‑units (in progress).`, subunits: subs };
  }

  // Unit 1 needs 8 sub‑units. We group the 17 lessons into 8 practical blocks.
  const U1_SUBUNITS = [
    ensureSubunitLessons(SU('u1s1', 'Sub‑unit 1: Particles', 'Core function words (no / because / if / to).', [UNIT1[0], UNIT1[10], UNIT1[11]])),
    ensureSubunitLessons(SU('u1s2', 'Sub‑unit 2: Prefixes', 'One-letter prefixes that glue sentences together.', [UNIT1[1], UNIT1[12]])),
    ensureSubunitLessons(SU('u1s3', 'Sub‑unit 3: Family words', 'father / mother / son / daughter.', [UNIT1[2], UNIT1[3]])),
    ensureSubunitLessons(SU('u1s4', 'Sub‑unit 4: Pronouns', 'I / you / he / she.', [UNIT1[4]])),
    ensureSubunitLessons(SU('u1s5', 'Sub‑unit 5: This/that', 'זה / זאת.', [UNIT1[5]])),
    ensureSubunitLessons(SU('u1s6', 'Sub‑unit 6: Came', 'בָּא / בָּאָה patterns.', [UNIT1[6], UNIT1[13]])),
    ensureSubunitLessons(SU('u1s7', 'Sub‑unit 7: Said & narrative', 'וַיֹּאמֶר / וַיְהִי.', [UNIT1[7], UNIT1[8]])),
    ensureSubunitLessons(SU('u1s8', 'Sub‑unit 8: Review', 'Listening + speaking + checkpoint.', [UNIT1[14], UNIT1[15], UNIT1[16]])),
  ];

  // Unit 2: 35 sub‑units of practical sentence patterns (scripture vocabulary).
  // Keep it simple and repetitive: build → choose → type → listen.
  function lessonFromSentence(id, title, desc, en, heb, extra = {}) {
    // Teach the *parts* before asking for the full sentence:
    // build key words (with meanings when available) → then build/Type/Listen sentence.
    const toks = normalizeSpaces(heb).split(' ').filter(Boolean);
    const uniq = [];
    const seen = new Set();
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      const k = hebLettersOnly(t);
      if (!k) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(t);
    }

    // Keep this short: introduce up to 4 tokens.
    const intro = uniq.slice(0, 4).map(t => {
      const m = tokenMeaning(t);
      const prompt = m ? `Build the Hebrew: “${m}”` : 'Build this Hebrew word.';
      return { type: 'bank_he_from_en', title: 'Build', prompt, heb: t };
    });

    const steps = intro.concat([
      buildSentence(en, heb),
      typeSentence(`Type: “${en}”`, heb),
    ]);

    if (extra.listen) steps.push(listenChoose(heb, extra.listen));
    if (extra.mc) steps.push({ type: 'mc', title: 'Choose', prompt: extra.mc.prompt || 'Which matches?', heb: extra.mc.hebPrompt || en, choices: extra.mc.choices, answer: extra.mc.answer });

    return L(id, title, desc, steps);
  }

  function buildUnit2Subunits() {
    const subs = [];
    function add(i, title, desc, lessons) {
      subs.push(ensureSubunitLessons(SU(`u2s${i}`, `Sub‑unit ${i}: ${title}`, desc, lessons), 4, 5));
    }

    // Common vocab / phrases
    const LORD = 'יְהוָה';
    const GOD = 'אֱלֹהִים';
    const KING = 'הַמֶּלֶךְ';
    const LAND = 'הָאָרֶץ';
    const PEOPLE = 'הָעָם';
    const HOUSE = 'הַבַּיִת';
    const BOOK = 'הַסֵּפֶר';
    const WORD = 'הַדָּבָר';

    // 1–8: mirrors an “8 sub‑units in unit 1” feel but for sentences
    add(1, 'Word order', 'Basic S‑V and verbless clauses.', [
      lessonFromSentence('u2s1l1', 'A simple clause', 'Subject + verb.', 'He came.', 'הוּא בָּא', { listen: ['הוּא בָּא', 'הִיא בָּאָה', 'וַיְהִי', 'לֹא'] }),
      lessonFromSentence('u2s1l2', 'A verbless clause', '“This is …” pattern.', 'This is the king.', `זֶה ${KING}`),
    ]);
    add(2, 'Definite article', 'הַ / הָ as “the”.', [
      lessonFromSentence('u2s2l1', 'The king came', 'Article + noun.', 'The king came.', `${KING} בָּא`),
      lessonFromSentence('u2s2l2', 'The land', 'Article practice.', 'The land (the earth).', LAND, { mc: { hebPrompt: 'Choose the Hebrew.', prompt: 'Which means “the land/the earth”?', choices: [LAND, PEOPLE, HOUSE, BOOK], answer: LAND } }),
    ]);
    add(3, 'And (וְ)', 'Chaining clauses with וְ.', [
      lessonFromSentence('u2s3l1', 'And the people came', 'Prefix וְ.', 'And the people came.', `וְ${PEOPLE} בָּא`),
      lessonFromSentence('u2s3l2', 'And the king said', 'Narrative chain.', 'And the king said.', `וַיֹּאמֶר ${KING}`),
    ]);
    add(4, 'To/unto (אֶל)', 'Directing speech or motion.', [
      lessonFromSentence('u2s4l1', 'Said to', 'אֶל + noun.', 'And he said to the king.', `וַיֹּאמֶר אֶל ${KING}`),
      lessonFromSentence('u2s4l2', 'Came to', 'אֶל + noun.', 'He came to the house.', `הוּא בָּא אֶל ${HOUSE}`),
    ]);
    add(5, 'On/upon (עַל)', 'Location and “upon”.', [
      lessonFromSentence('u2s5l1', 'Upon the land', 'עַל + noun.', 'Upon the land.', `עַל ${LAND}`),
      lessonFromSentence('u2s5l2', 'Said upon', 'Scripture‑style phrasing.', 'And he said upon the land.', `וַיֹּאמֶר עַל ${LAND}`),
    ]);
    add(6, 'From (מִן)', 'Source: from X.', [
      lessonFromSentence('u2s6l1', 'From the land', 'מִן + noun.', 'From the land.', `מִן ${LAND}`),
      lessonFromSentence('u2s6l2', 'From the house', 'מִן + noun.', 'From the house.', `מִן ${HOUSE}`),
    ]);
    add(7, 'Not (לֹא)', 'Negation in clauses.', [
      lessonFromSentence('u2s7l1', 'Not the king', 'Negation + noun/pronoun.', 'Not the king.', `לֹא ${KING}`),
      lessonFromSentence('u2s7l2', 'He did not come', 'Negation + verb.', 'He did not come.', `לֹא בָּא`),
    ]);
    add(8, 'Because/that (כִּי)', 'Reason clauses.', [
      lessonFromSentence('u2s8l1', 'For the LORD said', 'כִּי + clause.', 'For the LORD said.', `כִּי אָמַר ${LORD}`),
      lessonFromSentence('u2s8l2', 'Because …', 'כִּי as “because”.', 'Because the word is true.', `כִּי ${WORD} אֱמֶת`),
    ]);

    // 9–20: core nouns + reading fluency (very repetitive on purpose)
    add(9, 'God/LORD names', 'Recognize אֱלֹהִים / יְהוָה.', [
      L('u2s9l1', 'Choose', 'Pick the correct form.', [
        mcChooseHebFromEn('the LORD', [LORD, GOD, KING, PEOPLE]),
        mcChooseHebFromEn('God', [GOD, LORD, KING, LAND]),
        buildSentence('And the LORD said.', `וַיֹּאמֶר ${LORD}`),
        listenChoose(LORD, [LORD, GOD, KING, LAND]),
      ])
    ]);
    add(10, 'People', 'הָעָם in clauses.', [
      lessonFromSentence('u2s10l1', 'The people came', 'Noun practice.', 'The people came.', `${PEOPLE} בָּא`),
      lessonFromSentence('u2s10l2', 'And the people said', 'Common pattern.', 'And the people said.', `וַיֹּאמֶר ${PEOPLE}`),
    ]);
    add(11, 'Land', 'הָאָרֶץ in clauses.', [
      lessonFromSentence('u2s11l1', 'Upon the land', 'Preposition + noun.', 'Upon the land.', `עַל ${LAND}`),
      lessonFromSentence('u2s11l2', 'In the land', 'בְּ + noun.', 'In the land.', `בְּ${LAND}`),
    ]);
    add(12, 'House', 'הַבַּיִת in clauses.', [
      lessonFromSentence('u2s12l1', 'To the house', 'אֶל + noun.', 'To the house.', `אֶל ${HOUSE}`),
      lessonFromSentence('u2s12l2', 'In the house', 'בְּ + noun.', 'In the house.', `בְּ${HOUSE}`),
    ]);
    add(13, 'Book', 'הַסֵּפֶר / reading words.', [
      lessonFromSentence('u2s13l1', 'The book', 'Noun recognition.', 'The book.', BOOK),
      lessonFromSentence('u2s13l2', 'In the book', 'Phrase.', 'In the book.', `בְּ${BOOK}`),
    ]);
    add(14, 'Hear/see (basic)', 'Recognition of common verbs.', [
      L('u2s14l1', 'Choose verbs', 'Choose the verb meaning.', [
        mcChooseHebFromEn('and he said', ['וַיֹּאמֶר', 'וַיְהִי', 'לֹא', 'כִּי']),
        mcChooseHebFromEn('and it came to pass', ['וַיְהִי', 'וַיֹּאמֶר', 'אֶל', 'עַל']),
        buildSentence('And he said.', 'וַיֹּאמֶר'),
        listenChoose('וַיֹּאמֶר', ['וַיֹּאמֶר', 'וַיְהִי', 'לֹא', 'כִּי']),
      ])
    ]);
    add(15, 'This is …', 'Verbless “this is” sentences.', [
      lessonFromSentence('u2s15l1', 'This is the land', 'זֶה + noun.', 'This is the land.', `זֶה ${LAND}`),
      lessonFromSentence('u2s15l2', 'This is the house', 'זֶה + noun.', 'This is the house.', `זֶה ${HOUSE}`),
    ]);
    add(16, 'And … and …', 'Two phrases chained.', [
      lessonFromSentence('u2s16l1', 'And the king, and the people', 'Two nouns.', 'And the king and the people.', `וְ${KING} וְ${PEOPLE}`),
      lessonFromSentence('u2s16l2', 'And he came, and he said', 'Two verbs.', 'And he came, and he said.', `וַיָּבֹא וַיֹּאמֶר`),
    ]);
    add(17, 'Preposition review', 'Mix אֶל / עַל / מִן.', [
      L('u2s17l1', 'Choose', 'Pick the correct phrase.', [
        mcChooseHebFromEn('to the king', ['אֶל הַמֶּלֶךְ', 'עַל הַמֶּלֶךְ', 'מִן הַמֶּלֶךְ', 'לֹא הַמֶּלֶךְ']),
        mcChooseHebFromEn('from the land', ['מִן הָאָרֶץ', 'אֶל הָאָרֶץ', 'עַל הָאָרֶץ', 'וְהָאָרֶץ']),
        buildSentence('To the king.', 'אֶל הַמֶּלֶךְ'),
      ])
    ]);
    add(18, 'Short dictation', 'Listen then choose.', [
      L('u2s18l1', 'Listen', 'Train your ear.', [
        listenChoose(`וַיֹּאמֶר ${LORD}`, [`וַיֹּאמֶר ${LORD}`, `וַיֹּאמֶר ${GOD}`, 'וַיְהִי', 'לֹא']),
        listenChoose(`כִּי ${WORD} אֱמֶת`, [`כִּי ${WORD} אֱמֶת`, `כִּי ${WORD} לֹא`, `אֶל ${WORD}`, `עַל ${WORD}`]),
      ])
    ]);
    add(19, 'Typing fluency', 'Type common clauses.', [
      L('u2s19l1', 'Type', 'Quick typing for fluency.', [
        typeSentence('Type: “And he said.”', 'וַיֹּאמֶר'),
        typeSentence('Type: “And it came to pass.”', 'וַיְהִי'),
        typeSentence('Type: “Not I.”', 'לֹא אֲנִי'),
      ])
    ]);
    add(20, 'Checkpoint 1', 'Mixed review of Unit 2 so far.', [
      L('u2s20l1', 'Checkpoint', 'A short mixed set.', [
        { type: 'mc', title: 'Choose', prompt: 'Which means “to/unto”?', heb: 'Choose the Hebrew.', choices: ['אֶל', 'עַל', 'מִן', 'לֹא'], answer: 'אֶל' },
        { type: 'mc', title: 'Choose', prompt: 'Which means “not”?', heb: 'Choose the Hebrew.', choices: ['לֹא', 'כִּי', 'אִם', 'אֶל'], answer: 'לֹא' },
        buildSentence('And the LORD said.', `וַיֹּאמֶר ${LORD}`),
        typeSentence('Type: “From the land.”', 'מִן הָאָרֶץ'),
      ])
    ]);

    // 21–35: keep structure but lighter content for now (still functional drills)
    for (let i = 21; i <= 35; i++) {
      add(i, 'More patterns', 'More scripture sentence drills (in progress).', [
        L(`u2s${i}l1`, 'Practice', 'Keep building and reading.', [
          buildSentence('And he said.', 'וַיֹּאמֶר'),
          buildSentence('And it came to pass.', 'וַיְהִי'),
          { type: 'mc', title: 'Choose', prompt: 'Which is “because/for”?', heb: 'Choose the Hebrew.', choices: ['כִּי', 'לֹא', 'אֶל', 'עַל'], answer: 'כִּי' },
          listenChoose('וַיְהִי', ['וַיְהִי', 'וַיֹּאמֶר', 'לֹא', 'כִּי']),
        ]),
      ]);
    }

    return subs;
  }

  const U2_SUBUNITS = buildUnit2Subunits();

  // Unit 3: 35 sub‑units expanding high-frequency vocabulary (scripture-focused).
  function buildUnit3Subunits() {
    const subs = [];
    function add(i, title, desc, lessons) {
      subs.push(ensureSubunitLessons(SU(`u3s${i}`, `Sub‑unit ${i}: ${title}`, desc, lessons), 4, 5));
    }

    // Core nouns/verbs that appear constantly in scripture narratives.
    const LORD = 'יְהוָה';
    const GOD = 'אֱלֹהִים';
    const MAN = 'הָאָדָם';
    const WOMAN = 'הָאִשָּׁה';
    const SON = 'הַבֵּן';
    const BOOK = 'הַסֵּפֶר';
    const HOUSE = 'הַבַּיִת';
    const LAND = 'הָאָרֶץ';
    const CITY = 'הָעִיר';
    const WORD = 'הַדָּבָר';
    const LAW = 'הַתּוֹרָה';
    const COV = 'הַבְּרִית';
    const NAME = 'הַשֵּׁם';
    const HEART = 'הַלֵּב';
    const HAND = 'הַיָּד';
    const EYE = 'הָעַיִן';
    const WAY = 'הַדֶּרֶךְ';
    const DAY = 'הַיּוֹם';
    const NIGHT = 'הַלַּיְלָה';
    const LIGHT = 'הָאוֹר';
    const WATER = 'הַמַּיִם';
    const FIRE = 'הָאֵשׁ';
    const KING = 'הַמֶּלֶךְ';
    const PEOPLE = 'הָעָם';

    // A few common verbs in simple patterns
    const SAID = 'וַיֹּאמֶר';
    const CAME = 'בָּא';
    const WENT = 'וַיֵּלֶךְ';
    const SAW = 'וַיַּרְא';
    const HEARD = 'וַיִּשְׁמַע';
    const TOOK = 'וַיִּקַּח';
    const GAVE = 'וַיִּתֵּן';
    const MADE = 'וַיַּעַשׂ';
    const CALLED = 'וַיִּקְרָא';

    function quickVocabLesson(id, title, desc, pairs, buildHeb) {
      const steps = [
        { type: 'match', title: 'Match', prompt: 'Match the Hebrew word to its meaning.', pairs },
        ...(buildHeb ? [buildWord('Build this Hebrew from tiles.', buildHeb)] : []),
      ];
      return L(id, title, desc, steps);
    }

    // 1–10: concrete nouns (easy imagery) + simple clauses
    add(1, 'People', 'Man / woman / son.', [
      quickVocabLesson('u3s1l1', 'Match', 'Core people words.', [
        ['אָדָם', 'man/human'],
        ['אִשָּׁה', 'woman'],
        ['בֵּן', 'son'],
        ['בַּת', 'daughter'],
      ], 'אָדָם'),
      lessonFromSentence('u3s1l2', 'A man came', 'Simple clause.', 'The man came.', `${MAN} ${CAME}`),
    ]);
    add(2, 'Places', 'House / city / land.', [
      quickVocabLesson('u3s2l1', 'Match', 'Core places.', [
        ['בַּיִת', 'house'],
        ['עִיר', 'city'],
        ['אֶרֶץ', 'land/earth'],
        ['דֶּרֶךְ', 'way/path'],
      ], 'בַּיִת'),
      lessonFromSentence('u3s2l2', 'To the city', 'Phrase drill.', 'To the city.', `אֶל ${CITY}`),
    ]);
    add(3, 'Time', 'Day / night.', [
      quickVocabLesson('u3s3l1', 'Match', 'Time words.', [
        ['יוֹם', 'day'],
        ['לַיְלָה', 'night'],
        ['אוֹר', 'light'],
        ['שֵׁם', 'name'],
      ], 'יוֹם'),
      lessonFromSentence('u3s3l2', 'In the day', 'Phrase drill.', 'In the day.', `בְּ${DAY}`),
    ]);
    add(4, 'Elements', 'Water / fire / light.', [
      quickVocabLesson('u3s4l1', 'Match', 'Elements.', [
        ['מַיִם', 'water'],
        ['אֵשׁ', 'fire'],
        ['אוֹר', 'light'],
        ['לֵב', 'heart'],
      ], 'מַיִם'),
      lessonFromSentence('u3s4l2', 'Upon the waters', 'Phrase drill.', 'Upon the waters.', `עַל ${WATER}`),
    ]);
    add(5, 'Body parts', 'Heart / hand / eye.', [
      quickVocabLesson('u3s5l1', 'Match', 'Body words.', [
        ['לֵב', 'heart'],
        ['יָד', 'hand'],
        ['עַיִן', 'eye'],
        ['שֵׁם', 'name'],
      ], 'יָד'),
      lessonFromSentence('u3s5l2', 'In his heart', 'Common phrase.', 'In his heart.', 'בְּלִבּוֹ'),
    ]);

    // 6–15: covenant/scripture terms + narrative verbs
    add(6, 'God / LORD', 'Names used constantly.', [
      quickVocabLesson('u3s6l1', 'Match', 'Divine names.', [
        ['יְהוָה', 'the LORD'],
        ['אֱלֹהִים', 'God'],
        ['מֶלֶךְ', 'king'],
        ['עָם', 'people'],
      ], 'יְהוָה'),
      lessonFromSentence('u3s6l2', 'And the LORD said', 'Narrative clause.', 'And the LORD said.', `${SAID} ${LORD}`),
    ]);
    add(7, 'Word / name', 'Key abstract nouns.', [
      quickVocabLesson('u3s7l1', 'Match', 'Abstract nouns.', [
        ['דָּבָר', 'word/thing'],
        ['שֵׁם', 'name'],
        ['תּוֹרָה', 'law/teaching'],
        ['בְּרִית', 'covenant'],
      ], 'דָּבָר'),
      lessonFromSentence('u3s7l2', 'The word is true', 'Simple predication.', 'The word is true.', `${WORD} אֱמֶת`),
    ]);
    add(8, 'Covenant', 'Covenant / law.', [
      quickVocabLesson('u3s8l1', 'Match', 'Covenant language.', [
        ['בְּרִית', 'covenant'],
        ['תּוֹרָה', 'law/teaching'],
        ['מֶלֶךְ', 'king'],
        ['עִיר', 'city'],
      ], 'בְּרִית'),
      lessonFromSentence('u3s8l2', 'My covenant', 'Possessive concept.', 'My covenant.', 'בְּרִיתִי'),
    ]);
    add(9, 'Go / come', 'Motion verbs in narrative.', [
      L('u3s9l1', 'Choose', 'Recognize motion verbs.', [
        mcChooseHebFromEn('and he went', [WENT, SAW, HEARD, SAID]),
        mcChooseHebFromEn('came (m)', [CAME, 'בָּאָה', SAW, SAID]),
        buildSentence('And he went to the city.', `${WENT} אֶל ${CITY}`),
        listenChoose(WENT, [WENT, SAW, HEARD, SAID]),
      ]),
      lessonFromSentence('u3s9l2', 'He came to the house', 'Phrase drill.', 'He came to the house.', `הוּא בָּא אֶל ${HOUSE}`),
    ]);
    add(10, 'See / hear', 'Perception verbs.', [
      L('u3s10l1', 'Choose', 'Recognize perception verbs.', [
        mcChooseHebFromEn('and he saw', [SAW, HEARD, TOOK, SAID]),
        mcChooseHebFromEn('and he heard', [HEARD, SAW, TOOK, GAVE]),
        buildSentence('And he saw the land.', `${SAW} ${LAND}`),
        listenChoose(SAW, [SAW, HEARD, SAID, 'וַיְהִי']),
      ]),
      lessonFromSentence('u3s10l2', 'And he heard', 'Short clause.', 'And he heard.', HEARD),
    ]);

    // 11–20: take/give/make/call + royal/people nouns
    add(11, 'Take / give', 'Common action verbs.', [
      L('u3s11l1', 'Choose', 'Recognize action verbs.', [
        mcChooseHebFromEn('and he took', [TOOK, GAVE, MADE, CALLED]),
        mcChooseHebFromEn('and he gave', [GAVE, TOOK, MADE, CALLED]),
        buildSentence('And he took the book.', `${TOOK} ${BOOK}`),
        listenChoose(TOOK, [TOOK, GAVE, MADE, CALLED]),
      ]),
      lessonFromSentence('u3s11l2', 'And he gave', 'Short clause.', 'And he gave.', GAVE),
    ]);
    add(12, 'Make / do', 'וַיַּעַשׂ pattern.', [
      L('u3s12l1', 'Choose', 'Recognize “made/did”.', [
        mcChooseHebFromEn('and he made/did', [MADE, TOOK, GAVE, SAID]),
        buildSentence('And he made a covenant.', `${MADE} בְּרִית`),
        listenChoose(MADE, [MADE, TOOK, GAVE, SAID]),
      ]),
      lessonFromSentence('u3s12l2', 'And he made', 'Short clause.', 'And he made.', MADE),
    ]);
    add(13, 'Call / name', 'וַיִּקְרָא pattern.', [
      L('u3s13l1', 'Choose', 'Recognize “called/named”.', [
        mcChooseHebFromEn('and he called', [CALLED, SAID, SAW, HEARD]),
        buildSentence('And he called a name.', `${CALLED} שֵׁם`),
        listenChoose(CALLED, [CALLED, SAID, SAW, HEARD]),
      ]),
      lessonFromSentence('u3s13l2', 'The name', 'Noun drill.', 'The name.', NAME),
    ]);
    add(14, 'King', 'Royal vocabulary.', [
      quickVocabLesson('u3s14l1', 'Match', 'Royal words.', [
        ['מֶלֶךְ', 'king'],
        ['עָם', 'people'],
        ['עִיר', 'city'],
        ['אֶרֶץ', 'land'],
      ], 'מֶלֶךְ'),
      lessonFromSentence('u3s14l2', 'The king said', 'Narrative clause.', 'And the king said.', `${SAID} ${KING}`),
    ]);
    add(15, 'People', 'People / land / city.', [
      lessonFromSentence('u3s15l1', 'The people', 'Noun drill.', 'The people.', PEOPLE),
      lessonFromSentence('u3s15l2', 'The people came', 'Clause drill.', 'The people came.', `${PEOPLE} ${CAME}`),
    ]);

    // 16–35: keep building breadth; still scripture-valid and playable.
    const fillers = [
      { t: 'Way / path', d: 'דֶּרֶךְ phrases.', en: 'In the way.', he: `בְּ${WAY}` },
      { t: 'Hand / heart', d: 'Common body phrases.', en: 'In his hand.', he: 'בְּיָדוֹ' },
      { t: 'Word / law', d: 'Scripture themes.', en: 'The law is good.', he: `${LAW} טוֹבָה` },
      { t: 'Covenant', d: 'Covenant language.', en: 'The covenant is everlasting.', he: `${COV} עוֹלָם` },
      { t: 'Day / night', d: 'Time phrases.', en: 'In the night.', he: `בְּ${NIGHT}` },
    ];
    for (let i = 16; i <= 35; i++) {
      const f = fillers[(i - 16) % fillers.length];
      add(i, f.t, f.d, [
        lessonFromSentence(`u3s${i}l1`, 'Sentence', 'Build and type.', f.en, f.he),
        L(`u3s${i}l2`, 'Choose', 'Quick recognition.', [
          { type: 'mc', title: 'Choose', prompt: 'Choose the correct word.', heb: 'Choose the Hebrew.', choices: shuffle([LAND, HOUSE, PEOPLE, KING].slice()), answer: LAND },
          listenChoose(SAID, [SAID, 'וַיְהִי', 'לֹא', 'כִּי']),
        ]),
      ]);
    }

    return subs;
  }

  const U3_SUBUNITS = buildUnit3Subunits();

  // Unit 4: Scripture Mastery (build exact Hebrew word order)
  function chunkHebrew(heb, maxWords) {
    const toks = normalizeSpaces(heb).split(' ').filter(Boolean);
    const out = [];
    const n = Math.max(6, Math.min(12, maxWords || 10));
    for (let i = 0; i < toks.length; i += n) {
      out.push(toks.slice(i, i + n).join(' '));
    }
    return out.length ? out : [heb];
  }

  function buildUnit4Subunits() {
    const deck = (window && window.MasteryHebrewDeck) ? window.MasteryHebrewDeck : [];
    if (!deck || !deck.length) {
      // Fallback: unit exists but tells user to regenerate / load deck.
      return makePlaceholderUnit('u4', 'Unit 4: Scripture Mastery', 35).subunits;
    }

    const totalSub = 35;
    const per = Math.max(1, Math.ceil(deck.length / totalSub));
    const subs = [];
    for (let si = 0; si < totalSub; si++) {
      const start = si * per;
      const items = deck.slice(start, start + per);
      if (!items.length) break;
      const sid = `u4s${si + 1}`;
      const lessons = [];

      items.forEach((it, idx) => {
        const ref = it.ref || `Mastery ${start + idx + 1}`;
        const full = it.hebrew || '';
        const chunks = chunkHebrew(full, 10);

        const steps = [];
        for (let ci = 0; ci < chunks.length; ci++) {
          steps.push({
            type: 'bank_he_sentence',
            title: 'Build',
            prompt: 'Build the word order (Hebrew).',
            en: `${ref} (part ${ci + 1}/${chunks.length})`,
            heb: chunks[ci]
          });
        }
        // Full verse build + type (letters-only grading already)
        steps.push({
          type: 'bank_he_sentence',
          title: 'Build (Full)',
          prompt: 'Build the full verse word order.',
          en: `${ref} (full)`,
          heb: full
        });
        steps.push({
          type: 'type_he_from_en',
          title: 'Type',
          prompt: `Type the full verse (letters-only ok): ${ref}`,
          heb: full
        });
        steps.push({
          type: 'listen_mc',
          title: 'Listen',
          prompt: 'Listen, then choose what you heard.',
          heb: chunks[0],
          choices: [chunks[0], chunks[chunks.length - 1], 'וַיְהִי', 'לֹא'],
          answer: chunks[0]
        });

        lessons.push(L(`${sid}l${idx + 1}`, ref, 'Build the exact Hebrew word order.', steps));
      });

      subs.push(ensureSubunitLessons(SU(sid, `Sub‑unit ${si + 1}: Mastery`, 'Build mastery verses in Hebrew word order.', lessons), 4, 6));
    }

    return subs;
  }

  const U4_SUBUNITS = buildUnit4Subunits();

  // Seed content we have today (will be replaced by real-verse Journeys).
  const OT_SEED = [
    { id: 'j1', title: 'Journey 1: Beginnings', desc: 'Genesis 1–11 · Aleph‑bet, niqqud, simple syntax. Exit: read Genesis 1 aloud.', subunits: U1_SUBUNITS },
    { id: 'j2', title: 'Journey 2: The Fathers', desc: 'Genesis 12–50 · Qal system, construct chain. Exit: read the Akedah (Genesis 22).', subunits: U2_SUBUNITS },
    { id: 'j3', title: 'Journey 3: Out of Egypt', desc: 'Exodus + selected Numbers · derived stems + covenant vocabulary. Exit: Exodus 14 + the Shema.', subunits: U3_SUBUNITS },
  ];

  function buildSevenJourneysCourse() {
    // We keep the Journey scaffolding now, and progressively swap in real verse-driven lessons.
    // For Journeys 4–7, we provide playable placeholders until seeded.
    const j4 = makePlaceholderUnit('j4', "Journey 4: Lehi's Family", 8);
    const j5 = makePlaceholderUnit('j5', 'Journey 5: The Land and the Kings', 8);
    const j6 = makePlaceholderUnit('j6', 'Journey 6: Covenant King', 8);
    const j7 = makePlaceholderUnit('j7', 'Journey 7: Prophets, Writings, and Restoration', 8);

    // Override descriptions to match the revised architecture.
    j4.desc = "1 Nephi 1–18 (Sefer Mormon) · the pivot: Tanakh-density in restoration scripture. Exit: 1 Nephi 1 + Nephi’s Psalm (2 Nephi 4).";
    j5.desc = 'Joshua/Judges/Samuel + selected Kings · narrative mastery. Exit: 1 Samuel 3 + Psalm 23.';
    j6.desc = 'Mosiah in full (Sefer Mormon) · covenant renewal pattern. Exit: Mosiah 2–5.';
    j7.desc = 'Isaiah + Psalms + Jonah + selected D&C + Moses 1 + Abraham 3. Exit: Jonah + Moses 1 + D&C 84.';

    const placeholderJourneys = [j4, j5, j6, j7].map(x => ({ id: x.id, title: x.title, desc: x.desc, subunits: x.subunits }));
    return OT_SEED.concat(placeholderJourneys);
  }

  // --- Multi-track: OT / NT / BOM / D&C / PGP ---
  const TRACK_KEY = 'alephtrail-track-v1';
  const TRACKS = [
    { id: 'trail', label: 'Trail' },
    { id: 'ot', label: 'OT' },
    { id: 'nt', label: 'NT' },
    { id: 'bom', label: 'BOM' },
    { id: 'dc', label: 'D&C' },
    { id: 'pgp', label: 'PGP' },
  ];

  function loadTrack() {
    try {
      const t = localStorage.getItem(TRACK_KEY) || 'trail';
      return TRACKS.some(x => x.id === t) ? t : 'trail';
    } catch (e) {
      return 'trail';
    }
  }
  function saveTrack(t) { try { localStorage.setItem(TRACK_KEY, t); } catch (e) {} }

  let currentTrack = loadTrack();

  function prefixCourse(course, trackId) {
    // Deep-ish clone and prefix ids to avoid collisions across tracks.
    return (course || []).map(u => ({
      id: `${trackId}-${u.id}`,
      title: u.title,
      desc: u.desc,
      subunits: (u.subunits || []).map(su => ({
        id: `${trackId}-${su.id}`,
        title: su.title,
        desc: su.desc,
        lessons: (su.lessons || []).map(l => ({
          id: `${trackId}-${l.id}`,
          title: l.title,
          desc: l.desc,
          steps: (l.steps || []).slice(),
        })),
      })),
    }));
  }

  function buildPlaceholderCourse(trackId) {
    // Keep the same Journey structure but mark as “in progress”.
    const c = [
      makePlaceholderUnit('j1', 'Journey 1: Beginnings', 8),
      makePlaceholderUnit('j2', 'Journey 2: The Fathers', 8),
      makePlaceholderUnit('j3', 'Journey 3: Out of Egypt', 8),
      makePlaceholderUnit('j4', "Journey 4: Lehi's Family", 8),
      makePlaceholderUnit('j5', 'Journey 5: The Land and the Kings', 8),
      makePlaceholderUnit('j6', 'Journey 6: Covenant King', 8),
      makePlaceholderUnit('j7', 'Journey 7: Prophets, Writings, and Restoration', 8),
    ];
    // makePlaceholderUnit returns {id,title,desc,subunits}; match seed format.
    const normalized = c.map(x => ({ id: x.id, title: x.title, desc: x.desc, subunits: x.subunits }));
    return prefixCourse(normalized, trackId);
  }

  function getCourseForTrack(trackId) {
    if (trackId === 'trail') return prefixCourse(buildSevenJourneysCourse(), 'trail');
    if (trackId === 'ot') return prefixCourse(OT_SEED, 'ot');
    // Other tracks will be filled with real verses next; keep playable placeholders now.
    return buildPlaceholderCourse(trackId);
  }

  let COURSE = getCourseForTrack(currentTrack);

  // --- Progress storage ---
  function progKeyForTrack(trackId) { return `alephtrail-progress-${trackId}-v1`; }
  function currentProgKey() { return progKeyForTrack(currentTrack); }
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(currentProgKey()) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(currentProgKey(), JSON.stringify(p)); } catch (e) {}
  }

  let progress = loadProgress(); // { completed: { [lessonId]: true }, xp: number }
  if (!progress.completed) progress.completed = {};
  if (!Number.isFinite(progress.xp)) progress.xp = 0;
  if (!progress.current) progress.current = null; // { unitId, subunitId, lessonId, stepIdx }

  function flattenLessons() {
    const out = [];
    (COURSE || []).forEach(u => {
      (u.subunits || []).forEach(su => {
        (su.lessons || []).forEach(l => {
          out.push({ unit: u, subunit: su, lesson: l });
        });
      });
    });
    return out;
  }

  function findLessonById(lessonId) {
    if (!lessonId) return null;
    const all = flattenLessons();
    return all.find(x => x.lesson && x.lesson.id === lessonId) || null;
  }

  function saveCurrentProgress() {
    try { saveProgress(progress); } catch (e) {}
  }

  function updateProgressPill() {
    const totalLessons = COURSE.reduce((acc, u) => {
      const subs = u.subunits || [];
      return acc + subs.reduce((a, s) => a + ((s.lessons || []).length), 0);
    }, 0);
    const done = Object.keys(progress.completed || {}).length;
    els.progressPill.textContent = `XP ${progress.xp} · ${done}/${totalLessons} lessons`;
  }

  function updateResumeButton() {
    if (!els.resumeBtn) return;
    const cur = progress.current;
    if (!cur || !cur.lessonId || (progress.completed && progress.completed[cur.lessonId])) {
      els.resumeBtn.style.display = 'none';
      return;
    }
    const found = findLessonById(cur.lessonId);
    if (!found) {
      els.resumeBtn.style.display = 'none';
      return;
    }
    const l = found.lesson;
    const idx = Math.max(0, Math.min(cur.stepIdx || 0, (l.steps || []).length - 1));
    els.resumeBtn.textContent = `Resume: ${l.title} (Step ${idx + 1})`;
    els.resumeBtn.style.display = '';
    els.resumeBtn.onclick = () => {
      // Ensure unit is visible in path first.
      showRunner();
      startLesson(found.unit, found.subunit, found.lesson, idx);
    };
  }

  function renderPath() {
    els.units.innerHTML = '';
    COURSE.forEach((u, ui) => {
      const unit = document.createElement('div');
      unit.className = 'unit' + (ui === 0 ? ' open' : '');
      const allLessons = [];
      (u.subunits || []).forEach(su => {
        (su.lessons || []).forEach(l => { allLessons.push(l); });
      });
      const doneCount = allLessons.filter(l => progress.completed && progress.completed[l.id]).length;
      unit.innerHTML = `
        <div class="u-top">
          <div>
            <div class="u-title">${escapeHtml(u.title)}</div>
            <div class="u-desc">${escapeHtml(u.desc || '')}</div>
          </div>
          <div style="display:flex; gap:10px; align-items:center; flex-wrap: wrap; justify-content:flex-end;">
            <div class="u-meta">${doneCount}/${allLessons.length} complete</div>
            <button class="u-toggle" type="button">${u.id === 'u1' ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        <div class="unitBody"></div>
      `;
      const toggle = unit.querySelector('.u-toggle');
      toggle.addEventListener('click', () => {
        unit.classList.toggle('open');
        toggle.textContent = unit.classList.contains('open') ? 'Hide' : 'Show';
      });

      const body = unit.querySelector('.unitBody');
      const order = allLessons.map(l => l.id);
      const idxById = new Map(order.map((id, i) => [id, i]));
      function prevDoneByIndex(i) {
        if (i === 0) return true;
        const prevId = order[i - 1];
        return !!(progress.completed && progress.completed[prevId]);
      }

      (u.subunits || []).forEach((su, sui) => {
        const suWrap = document.createElement('div');
        suWrap.className = 'subunit';
        const suLessons = su.lessons || [];
        const suDone = suLessons.filter(l => progress.completed && progress.completed[l.id]).length;
        suWrap.innerHTML = `
          <div class="subhead">
            <div>
              <div class="s-title">${escapeHtml(su.title)}</div>
              <div class="s-desc">${escapeHtml(su.desc || '')}</div>
            </div>
            <div class="s-meta">${suDone}/${suLessons.length} complete</div>
          </div>
          <div class="track" aria-label="Sub‑unit lesson path"></div>
        `;
        const track = suWrap.querySelector('.track');
        suLessons.forEach((l, liLocal) => {
          const globalIdx = idxById.has(l.id) ? idxById.get(l.id) : 0;
          const isDone = !!(progress.completed && progress.completed[l.id]);
          const prevOk = prevDoneByIndex(globalIdx);
          const isNext = !isDone && prevOk;
          const isLocked = !isDone && !prevOk;

          const wrap = document.createElement('div');
          wrap.className = 'nodeWrap ' + (((globalIdx) % 2 === 0) ? 'left' : 'right');

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'nodeBtn ' + (isDone ? 'completed' : (isNext ? 'next' : 'locked'));
          btn.disabled = isLocked;
          btn.setAttribute('aria-label', l.title);

          const icon = isLocked ? '🔒' : 'ה';
          btn.innerHTML = `
            <div class="nodeCircle"><div class="icon">${icon}</div></div>
            <div class="nodeLabel">${escapeHtml(l.title)}</div>
            <div class="nodeSub">${isDone ? 'Review' : (isNext ? 'Start' : 'Locked')} · ${l.steps.length} steps</div>
          `;
          btn.addEventListener('click', () => startLesson(u, su, l));
          wrap.appendChild(btn);
          track.appendChild(wrap);
        });
        body.appendChild(suWrap);
      });

      els.units.appendChild(unit);
    });
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- Lesson runner ---
  let currentUnit = null;
  let currentSubunit = null;
  let currentLesson = null;
  let stepIdx = 0;
  let locked = false;
  let currentAnswer = null;
  let builtTokens = [];
  let attempts = 0;
  const MAX_ATTEMPTS = 3;
  const AUTO_ADVANCE_MS = 550;

  function showPath() {
    els.runnerView.classList.remove('show');
    els.pathView.style.display = '';
  }
  function showRunner() {
    els.pathView.style.display = 'none';
    els.runnerView.classList.add('show');
  }

  function resetStepUI() {
    locked = false;
    currentAnswer = null;
    builtTokens = [];
    attempts = 0;
    els.feedback.innerHTML = '';
    els.footerHint.textContent = '';
    els.hebBig.style.display = 'none';
    els.tiles.style.display = 'none';
    els.bank.style.display = 'none';
    els.choices.style.display = 'none';
    els.typeWrap.style.display = 'none';
    // Ensure per-step controls can be re-shown (some steps hide these).
    els.typeInput.style.display = '';
    els.checkBtn.style.display = '';
    els.hearBtn.style.display = '';
    els.speakBtn.style.display = '';
    els.typeInput.value = '';
    els.nextBtn.disabled = true;
  }

  function attemptsHint() {
    const left = Math.max(0, MAX_ATTEMPTS - attempts);
    if (left <= 0) return '';
    return `Try again (${left} left).`;
  }

  function revealAnswerHtml(answer, rtl) {
    const dir = rtl ? 'rtl' : 'ltr';
    return `<span style="opacity:0.9">Answer: <strong dir="${dir}">${escapeHtml(answer)}</strong></span>`;
  }

  function setCorrectWrong(isCorrect, extraHtml = '') {
    if (isCorrect) {
      els.feedback.innerHTML = `<span style="color:var(--ok); font-weight:700;">Correct.</span> ${extraHtml}`;
    } else {
      els.feedback.innerHTML = `<span style="color:var(--danger); font-weight:700;">Not quite.</span> ${extraHtml}`;
    }
  }

  function autoAdvanceSoon() {
    // If already on next, avoid double-advancing.
    try { if (els.nextBtn && els.nextBtn.disabled) return; } catch (e) {}
    setTimeout(() => {
      try {
        // Only advance if still in runner and step already graded/locked.
        if (!currentLesson) return;
        if (!locked) return;
        nextStep();
      } catch (e) {}
    }, AUTO_ADVANCE_MS);
  }

  function startLesson(u, su, l, startAtStep = 0) {
    currentUnit = u;
    currentSubunit = su || null;
    currentLesson = l;
    stepIdx = Math.max(0, Math.min(startAtStep || 0, (l.steps || []).length - 1));
    showRunner();
    progress.current = { unitId: u && u.id, subunitId: su && su.id, lessonId: l && l.id, stepIdx };
    saveCurrentProgress();
    els.lessonPill.textContent = `${l.title} · Step ${stepIdx + 1}/${l.steps.length}`;
    renderStep();
  }

  function completeLesson() {
    progress.completed[currentLesson.id] = true;
    progress.xp += 10;
    progress.current = null;
    saveProgress(progress);
    updateProgressPill();
    updateResumeButton();
    renderPath();
    showPath();
  }

  function nextStep() {
    if (!currentLesson) return;
    if (stepIdx < currentLesson.steps.length - 1) {
      stepIdx++;
      if (progress.current && progress.current.lessonId === currentLesson.id) {
        progress.current.stepIdx = stepIdx;
        saveCurrentProgress();
        updateResumeButton();
      }
      renderStep();
    } else {
      completeLesson();
    }
  }

  function prevStep() {
    if (!currentLesson) return;
    if (stepIdx > 0) {
      stepIdx--;
      locked = false;
      if (progress.current && progress.current.lessonId === currentLesson.id) {
        progress.current.stepIdx = stepIdx;
        saveCurrentProgress();
        updateResumeButton();
      }
      renderStep();
    }
  }

  function restartLesson() {
    if (!currentLesson || !currentUnit) return;
    locked = false;
    stepIdx = 0;
    if (progress.current && progress.current.lessonId === currentLesson.id) {
      progress.current.stepIdx = 0;
      saveCurrentProgress();
      updateResumeButton();
    }
    renderStep();
  }

  function speakHebrew(text) {
    try {
      if (!('speechSynthesis' in window)) return false;
      // Never vocalize the Tetragrammaton; substitute the spoken form.
      const spoken = String(text || '')
        .replace(/יְהוָה/g, 'אֲדֹנָי')
        .replace(/יהוה/g, 'אדני');
      const u = new SpeechSynthesisUtterance(spoken);
      // Prefer Hebrew voice if present.
      u.lang = 'he-IL';
      u.rate = 0.95;
      u.pitch = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) {
      return false;
    }
  }

  function startSpeechRecognition(expectedHeb) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return Promise.resolve({ ok: false, reason: 'Speech recognition not available in this browser.' });
    return new Promise(resolve => {
      let rec;
      try { rec = new SR(); } catch (e) { resolve({ ok: false, reason: 'Speech recognition unavailable.' }); return; }
      rec.lang = 'he-IL';
      rec.interimResults = false;
      rec.maxAlternatives = 3;
      let finished = false;
      const timeout = setTimeout(() => {
        if (finished) return;
        finished = true;
        try { rec.abort(); } catch (e) {}
        resolve({ ok: false, reason: 'Timed out.' });
      }, 8000);
      rec.onresult = (evt) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        const txt = evt.results && evt.results[0] && evt.results[0][0] ? evt.results[0][0].transcript : '';
        const ok = hebLettersOnly(txt) === hebLettersOnly(expectedHeb);
        resolve({ ok, heard: txt });
      };
      rec.onerror = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        resolve({ ok: false, reason: 'Recognition error.' });
      };
      try { rec.start(); } catch (e) { clearTimeout(timeout); resolve({ ok: false, reason: 'Could not start recognition.' }); }
    });
  }

  function renderStep() {
    const step = currentLesson.steps[stepIdx];
    els.lessonPill.textContent = `${currentLesson.title} · Step ${stepIdx + 1}/${currentLesson.steps.length}`;
    resetStepUI();

    els.stepTitle.textContent = step.title || 'Step';
    els.stepPrompt.textContent = step.prompt || '';

    // Ensure meanings toggle state is reflected.
    if (els.meaningsBtn) {
      els.meaningsBtn.textContent = showMeanings ? 'Meanings: On' : 'Meanings: Off';
    }

    // --- Auto-teach words before any full sentence build ---
    // If a step asks to build a full sentence, insert word-build steps immediately before it.
    // This applies globally to all units/sub-units without hand-editing lesson content.
    if (step && step.type === 'bank_he_sentence' && step.heb && !step._wordIntroInjected) {
      step._wordIntroInjected = true;
      const toks = normalizeSpaces(step.heb).split(' ').filter(Boolean);
      const uniq = [];
      const seen = new Set();
      for (let i = 0; i < toks.length; i++) {
        const t = toks[i];
        const k = hebLettersOnly(t);
        if (!k) continue;
        if (seen.has(k)) continue;
        seen.add(k);
        uniq.push(t);
      }
      const introToks = uniq.slice(0, 4);
      const introSteps = introToks.map((t, i) => {
        const m = tokenMeaning(t);
        const prompt = m ? `Build the Hebrew: “${m}”` : 'Build this Hebrew word.';
        return { type: 'bank_he_from_en', title: 'Build', prompt, heb: t, _autoIntro: 1 };
      });

      if (introSteps.length) {
        // Insert before current step, then render the first intro step.
        currentLesson.steps.splice(stepIdx, 0, ...introSteps);
        // Keep progress pointer consistent if resuming mid-lesson.
        if (progress.current && progress.current.lessonId === currentLesson.id) {
          progress.current.stepIdx = stepIdx;
          saveCurrentProgress();
        }
        renderStep();
        return;
      }
    }

    if (step.type === 'mc') {
      // If step.heb is English prompt, show in hebBig only when looks Hebrew.
      if (step.heb && /[\u05D0-\u05EA]/.test(step.heb)) {
        els.hebBig.style.display = '';
        els.hebBig.textContent = step.heb;
      } else if (step.heb) {
        // Put as prompt extension
        els.stepPrompt.textContent = `${step.prompt} ${step.heb}`;
      }
      renderMultipleChoice(step.choices, step.answer, { rtl: false });
      els.footerHint.textContent = 'Tip: click an answer. You have 3 tries.';
      return;
    }

    if (step.type === 'root_intro') {
      // Root-first teaching: show the shoresh and a few related forms.
      els.hebBig.style.display = '';
      els.hebBig.textContent = String(step.root || '').trim();
      const forms = Array.isArray(step.forms) ? step.forms.filter(Boolean).slice(0, 6) : [];
      const gloss = String(step.gloss || '').trim();
      els.feedback.innerHTML =
        (gloss ? `<div style="margin-top:6px; opacity:0.92; direction:ltr;">Meaning: <strong>${escapeHtml(gloss)}</strong></div>` : '') +
        (forms.length ? `<div style="margin-top:10px; opacity:0.95;">Family:</div>
          <div style="margin-top:8px; display:flex; gap:10px; flex-wrap:wrap; justify-content:center; direction:rtl;">
            ${forms.map(f => `<span style="border:1px solid var(--rule); background: var(--card-bg); padding:8px 12px; border-radius:999px; font-weight:800;">${escapeHtml(f)}</span>`).join('')}
          </div>` : '');
      els.footerHint.textContent = 'Tip: the root stays the same; the pattern changes.';
      els.nextBtn.disabled = false;
      return;
    }

    if (step.type === 'shoresh_sort') {
      // Odd-one-out by root. We show Hebrew options; correctness based on answerIdx.
      const opts = Array.isArray(step.options) ? step.options : [];
      els.stepTitle.textContent = step.title || 'Shoresh Sort';
      els.stepPrompt.textContent = step.prompt || 'Choose the odd one out.';
      els.choices.style.display = '';
      els.choices.innerHTML = '';
      const correctIdx = Number.isFinite(step.answerIdx) ? step.answerIdx : 0;
      opts.forEach((o, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'choiceBtn';
        btn.style.direction = 'rtl';
        btn.innerHTML = `<div style="font-weight:900; font-size:1.15em; direction:rtl;">${escapeHtml(o && o.heb ? o.heb : '')}</div>` +
          `<div style="opacity:0.78; font-size:0.85em; direction:ltr;">root: ${escapeHtml(o && o.root ? o.root : '')}</div>`;
        btn.addEventListener('click', () => {
          if (locked) return;
          const isCorrect = idx === correctIdx;
          if (isCorrect) {
            locked = true;
            Array.from(els.choices.querySelectorAll('.choiceBtn')).forEach((b, bi) => {
              if (bi === correctIdx) b.classList.add('correct');
              b.disabled = true;
            });
            setCorrectWrong(true, '');
            els.nextBtn.disabled = false;
            autoAdvanceSoon();
            return;
          }
          attempts++;
          btn.classList.add('wrong');
          btn.disabled = true;
          if (attempts < MAX_ATTEMPTS) {
            setCorrectWrong(false, ` <span style="opacity:0.9">${escapeHtml(attemptsHint())}</span>`);
            return;
          }
          locked = true;
          Array.from(els.choices.querySelectorAll('.choiceBtn')).forEach((b, bi) => {
            if (bi === correctIdx) b.classList.add('correct');
            b.disabled = true;
          });
          const ansHeb = (opts[correctIdx] && opts[correctIdx].heb) ? opts[correctIdx].heb : '';
          setCorrectWrong(false, ` ${revealAnswerHtml(ansHeb, true)}`);
          els.nextBtn.disabled = false;
        });
        els.choices.appendChild(btn);
      });
      els.footerHint.textContent = 'Tip: look for the shared root letters.';
      return;
    }

    if (step.type === 'match') {
      // Render as a multiple choice per pair, one after the other (simple MVP).
      const pair = step.pairs[randInt(step.pairs.length)];
      const heb = pair[0];
      const ans = pair[1];
      els.hebBig.style.display = '';
      els.hebBig.textContent = heb;
      const pool = Array.from(new Set(step.pairs.map(p => p[1])));
      shuffle(pool);
      const opts = [ans];
      while (opts.length < 4 && pool.length) {
        const pick = pool[randInt(pool.length)];
        if (opts.includes(pick)) continue;
        opts.push(pick);
      }
      shuffle(opts);
      renderMultipleChoice(opts, ans, { rtl: false });
      els.footerHint.textContent = 'Tip: click an answer. You have 3 tries.';
      return;
    }

    if (step.type === 'bank_he_from_en') {
      // Build a single Hebrew word/form from tiles (letters-only compare).
      renderWordBankStep(step.heb, step.prompt);
      return;
    }

    if (step.type === 'bank_he_sentence') {
      renderSentenceBankStep(step.heb, step.en || '');
      return;
    }

    if (step.type === 'type_he_from_en') {
      renderTypeHebStep(step.heb, step.prompt);
      return;
    }

    if (step.type === 'listen_mc') {
      els.hebBig.style.display = 'none';
      els.footerHint.textContent = 'Tip: press Listen, then choose.';
      const okSpeak = speakHebrew(step.heb);
      if (!okSpeak) {
        els.feedback.innerHTML = `<span style="opacity:0.9">Listening not supported here. You can still answer normally.</span>`;
      }
      renderMultipleChoice(step.choices, step.answer, { rtl: true });
      // show listen button
      els.typeWrap.style.display = 'block';
      els.typeInput.style.display = 'none';
      els.checkBtn.style.display = 'none';
      els.speakBtn.style.display = 'none';
      els.hearBtn.style.display = '';
      els.hearBtn.onclick = () => speakHebrew(step.heb);
      return;
    }

    if (step.type === 'speak_repeat') {
      els.hebBig.style.display = '';
      els.hebBig.textContent = step.heb;
      els.typeWrap.style.display = 'block';
      els.typeInput.style.display = 'none';
      els.checkBtn.style.display = 'none';
      els.hearBtn.style.display = '';
      els.speakBtn.style.display = '';
      els.hearBtn.onclick = () => {
        const ok = speakHebrew(step.heb);
        if (!ok) els.feedback.innerHTML = `<span style="opacity:0.9">Listening not supported here.</span>`;
      };
      els.speakBtn.onclick = async () => {
        els.feedback.innerHTML = `<span style="opacity:0.9">Listening…</span>`;
        const res = await startSpeechRecognition(step.heb);
        if (res.ok) setCorrectWrong(true, ` <span style="opacity:0.9">Heard: <strong>${escapeHtml(res.heard || '')}</strong></span>`);
        else setCorrectWrong(false, ` <span style="opacity:0.9">${escapeHtml(res.reason || '')}${res.heard ? ` Heard: <strong>${escapeHtml(res.heard)}</strong>` : ''}</span>`);
        els.nextBtn.disabled = false;
      };
      els.footerHint.textContent = 'Tip: Listen first, then try Speak (optional).';
      return;
    }

    // Fallback
    els.feedback.textContent = 'This step type is not implemented yet.';
    els.nextBtn.disabled = false;
  }

  function renderMultipleChoice(choices, answer, opts = {}) {
    els.choices.style.display = '';
    els.choices.innerHTML = '';
    const rtl = !!opts.rtl;
    (choices || []).forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choiceBtn';
      btn.style.direction = rtl ? 'rtl' : 'ltr';
      btn.textContent = c;
      btn.addEventListener('click', () => {
        if (locked) return;
        const isCorrect = rtl
          ? (hebLettersOnly(btn.textContent) === hebLettersOnly(answer))
          : (btn.textContent === answer);

        if (isCorrect) {
          locked = true;
          // Mark correct + disable all
          const all = Array.from(els.choices.querySelectorAll('.choiceBtn'));
          all.forEach(b => {
            const val = b.textContent;
            const ok = rtl ? (hebLettersOnly(val) === hebLettersOnly(answer)) : (val === answer);
            if (ok) b.classList.add('correct');
            b.disabled = true;
          });
          setCorrectWrong(true, '');
          els.nextBtn.disabled = false;
          autoAdvanceSoon();
          return;
        }

        // Wrong attempt
        attempts++;
        btn.classList.add('wrong');
        btn.disabled = true;
        if (attempts < MAX_ATTEMPTS) {
          setCorrectWrong(false, ` <span style="opacity:0.9">${escapeHtml(attemptsHint())}</span>`);
          return;
        }

        // Out of attempts: reveal answer and lock the step
        locked = true;
        const all = Array.from(els.choices.querySelectorAll('.choiceBtn'));
        all.forEach(b => {
          const val = b.textContent;
          const ok = rtl ? (hebLettersOnly(val) === hebLettersOnly(answer)) : (val === answer);
          if (ok) b.classList.add('correct');
          b.disabled = true;
        });
        setCorrectWrong(false, ` ${revealAnswerHtml(answer, rtl)}`);
        els.nextBtn.disabled = false;
      });
      els.choices.appendChild(btn);
    });
  }

  function renderWordBankStep(heb, prompt) {
    els.stepTitle.textContent = 'Build';
    els.stepPrompt.textContent = prompt || 'Build the Hebrew from tiles.';
    els.tiles.style.display = '';
    els.bank.style.display = '';
    els.tiles.innerHTML = '';
    els.bank.innerHTML = '';

    const targetTokens = normalizeSpaces(heb).split(' ').filter(Boolean);
    // For single words like וַיְהִי, just tile the whole token + distractors (from same unit).
    const pool = collectHebTokensFromUnit(currentUnit).filter(t => hebLettersOnly(t));
    const distract = [];
    const targetKey = hebLettersOnly(heb);

    // 1) Prefer distractors from this unit
    const poolFiltered = pool.filter(p => hebLettersOnly(p) && hebLettersOnly(p) !== targetKey);
    let guard = 0;
    while (distract.length < 5 && poolFiltered.length && guard++ < 200) {
      const p = poolFiltered[randInt(poolFiltered.length)];
      const pk = hebLettersOnly(p);
      if (!pk || pk === targetKey) continue;
      if (distract.some(x => hebLettersOnly(x) === pk)) continue;
      distract.push(p);
    }

    // 2) If the unit doesn't have enough variety (common early on), pull from a global pool
    const GLOBAL_DISTRACTORS = [
      'כִּי','לֹא','אִם','אֶל','עַל','מִן','וַיְהִי','וַיֹּאמֶר','אָמַר','בָּא','בָּאָה','יְהוָה','אֱלֹהִים','הַמֶּלֶךְ','הָעָם','הָאָרֶץ','הַבַּיִת'
    ];
    for (let i = 0; distract.length < 7 && i < GLOBAL_DISTRACTORS.length; i++) {
      const p = GLOBAL_DISTRACTORS[i];
      const pk = hebLettersOnly(p);
      if (!pk || pk === targetKey) continue;
      if (distract.some(x => hebLettersOnly(x) === pk)) continue;
      distract.push(p);
    }

    // Always include at least 4 tiles (target + 3 distractors)
    const tiles = shuffle([].concat(targetTokens, distract).slice(0, 8));

    builtTokens = [];
    function syncBuilt() {
      els.tiles.innerHTML = '';
      builtTokens.forEach((t, idx) => {
        const sp = document.createElement('div');
        sp.className = 'tile';
        renderTile(sp, t);
        sp.title = 'Click to remove';
        sp.addEventListener('click', () => {
          if (locked) return;
          builtTokens.splice(idx, 1);
          // Re-enable bank tiles (simple: clear used marks, then re-mark in order)
          tileEls.forEach(el => el.classList.remove('used'));
          builtTokens.forEach(bt => {
            const el = tileEls.find(e => !e.classList.contains('used') && hebrewEq(e.textContent, bt));
            if (el) el.classList.add('used');
          });
          syncBuilt();
        });
        els.tiles.appendChild(sp);
      });
      if (!builtTokens.length) {
        els.tiles.innerHTML = `<div style="opacity:0.75; color: var(--ink-light);">Tap tiles to build…</div>`;
      }

      // Auto-check: when the built tokens match the target exactly, mark correct and enable Next.
      if (!locked && builtTokens.length === targetTokens.length) {
        const built = builtTokens.join(' ');
        if (hebrewSeqEq(built, heb)) {
          locked = true;
          setCorrectWrong(true, '');
          els.nextBtn.disabled = false;
          autoAdvanceSoon();
        }
      }
    }
    syncBuilt();

    const tileEls = [];
    tiles.forEach((t) => {
      const btn = document.createElement('div');
      btn.className = 'tile';
      renderTile(btn, t);
      btn.addEventListener('click', () => {
        if (locked) return;
        builtTokens.push(t);
        btn.classList.add('used');
        syncBuilt();
      });
      tileEls.push(btn);
      els.bank.appendChild(btn);
    });

    els.typeWrap.style.display = 'block';
    els.typeInput.style.display = 'none';
    els.hearBtn.style.display = 'none';
    els.speakBtn.style.display = 'none';
    els.checkBtn.style.display = '';
    els.checkBtn.textContent = 'Check';
    els.checkBtn.onclick = () => {
      if (locked) return;
      const built = builtTokens.join(' ');
      const ok = hebrewSeqEq(built, heb);
      if (ok) {
        locked = true;
        setCorrectWrong(true, '');
        els.nextBtn.disabled = false;
        autoAdvanceSoon();
        return;
      }
      attempts++;
      if (attempts < MAX_ATTEMPTS) {
        setCorrectWrong(false, ` <span style="opacity:0.9">${escapeHtml(attemptsHint())}</span>`);
        return;
      }
      locked = true;
      setCorrectWrong(false, ` ${revealAnswerHtml(heb, true)}`);
      els.nextBtn.disabled = false;
    };
    els.footerHint.textContent = 'Tip: tap tiles; click built tiles to remove. You have 3 tries.';
  }

  function renderSentenceBankStep(heb, en) {
    els.stepTitle.textContent = 'Build the sentence';
    els.stepPrompt.textContent = en ? `English: ${en}` : 'Build the Hebrew sentence.';
    els.tiles.style.display = '';
    els.bank.style.display = '';
    els.tiles.innerHTML = '';
    els.bank.innerHTML = '';

    const targetTokens = normalizeSpaces(heb).split(' ').filter(Boolean);
    const pool = collectHebTokensFromUnit(currentUnit).filter(t => hebLettersOnly(t));
    const distract = [];
    while (distract.length < 4 && pool.length) {
      const p = pool[randInt(pool.length)];
      if (targetTokens.some(tt => hebrewEq(tt, p))) continue;
      if (distract.some(x => hebrewEq(x, p))) continue;
      distract.push(p);
    }
    const tiles = shuffle([...targetTokens, ...distract]);

    builtTokens = [];
    function syncBuilt() {
      els.tiles.innerHTML = '';
      builtTokens.forEach((t, idx) => {
        const sp = document.createElement('div');
        sp.className = 'tile';
        renderTile(sp, t);
        sp.title = 'Click to remove';
        sp.addEventListener('click', () => {
          if (locked) return;
          builtTokens.splice(idx, 1);
          syncBuilt();
        });
        els.tiles.appendChild(sp);
      });
      if (!builtTokens.length) {
        els.tiles.innerHTML = `<div style="opacity:0.75; color: var(--ink-light);">Tap tiles to build…</div>`;
      }

      if (!locked && builtTokens.length === targetTokens.length) {
        const built = builtTokens.join(' ');
        if (hebrewSeqEq(built, heb)) {
          locked = true;
          setCorrectWrong(true, '');
          els.nextBtn.disabled = false;
          autoAdvanceSoon();
        }
      }
    }
    syncBuilt();

    tiles.forEach((t) => {
      const btn = document.createElement('div');
      btn.className = 'tile';
      renderTile(btn, t);
      btn.addEventListener('click', () => {
        if (locked) return;
        builtTokens.push(t);
        btn.classList.add('used');
        syncBuilt();
      });
      els.bank.appendChild(btn);
    });

    els.typeWrap.style.display = 'block';
    els.typeInput.style.display = 'none';
    els.checkBtn.style.display = '';
    els.hearBtn.style.display = '';
    els.speakBtn.style.display = 'none';
    els.checkBtn.textContent = 'Check';
    els.checkBtn.onclick = () => {
      if (locked) return;
      const built = builtTokens.join(' ');
      const ok = hebrewSeqEq(built, heb);
      if (ok) {
        locked = true;
        setCorrectWrong(true, '');
        els.nextBtn.disabled = false;
        autoAdvanceSoon();
        return;
      }
      attempts++;
      if (attempts < MAX_ATTEMPTS) {
        setCorrectWrong(false, ` <span style="opacity:0.9">${escapeHtml(attemptsHint())}</span>`);
        return;
      }
      locked = true;
      setCorrectWrong(false, ` ${revealAnswerHtml(heb, true)}`);
      els.nextBtn.disabled = false;
    };
    els.hearBtn.onclick = () => {
      const ok = speakHebrew(heb);
      if (!ok) els.feedback.innerHTML = `<span style="opacity:0.9">Listening not supported here.</span>`;
    };
    els.footerHint.textContent = 'Tip: tap tiles to build; press Listen if you want. You have 3 tries.';
  }

  function renderTypeHebStep(heb, prompt) {
    els.stepTitle.textContent = 'Type Hebrew';
    els.stepPrompt.textContent = prompt || 'Type the Hebrew.';
    els.typeWrap.style.display = 'block';
    els.typeInput.style.display = '';
    els.typeInput.placeholder = 'Type Hebrew (letters-only ok)…';
    els.checkBtn.style.display = '';
    els.hearBtn.style.display = '';
    els.speakBtn.style.display = 'none';
    els.hebBig.style.display = 'none';
    els.checkBtn.onclick = () => {
      if (locked) return;
      const user = els.typeInput.value || '';
      const ok = hebLettersOnly(user) === hebLettersOnly(heb);
      if (ok) {
        locked = true;
        setCorrectWrong(true, '');
        els.nextBtn.disabled = false;
        autoAdvanceSoon();
        return;
      }
      attempts++;
      if (attempts < MAX_ATTEMPTS) {
        setCorrectWrong(false, ` <span style="opacity:0.9">${escapeHtml(attemptsHint())}</span>`);
        return;
      }
      locked = true;
      setCorrectWrong(false, ` <span style="opacity:0.9">Answer: <strong dir="rtl">${escapeHtml(heb)}</strong> <span style="opacity:0.75">(letters: ${escapeHtml(hebLettersOnly(heb))})</span></span>`);
      els.nextBtn.disabled = false;
    };
    els.hearBtn.onclick = () => {
      const ok = speakHebrew(heb);
      if (!ok) els.feedback.innerHTML = `<span style="opacity:0.9">Listening not supported here.</span>`;
    };
    els.footerHint.textContent = 'Tip: niqqud is ignored when grading. You have 3 tries.';
    setTimeout(() => { try { els.typeInput.focus(); } catch (e) {} }, 0);
  }

  function collectHebTokensFromUnit(unit) {
    const out = [];
    (unit.lessons || []).forEach(l => {
      (l.steps || []).forEach(s => {
        if (s.heb && /[\u05D0-\u05EA]/.test(s.heb)) {
          normalizeSpaces(s.heb).split(' ').forEach(t => out.push(t));
        }
        if (Array.isArray(s.choices)) {
          s.choices.forEach(c => {
            if (c && /[\u05D0-\u05EA]/.test(c)) normalizeSpaces(c).split(' ').forEach(t => out.push(t));
          });
        }
      });
    });
    return out;
  }

  function hebrewEq(a, b) { return hebLettersOnly(a) === hebLettersOnly(b); }
  function hebrewSeqEq(a, b) {
    const aa = normalizeSpaces(a).split(' ').filter(Boolean).map(hebLettersOnly).join(' ');
    const bb = normalizeSpaces(b).split(' ').filter(Boolean).map(hebLettersOnly).join(' ');
    return aa === bb;
  }

  // --- Events ---
  if (els.meaningsBtn) {
    els.meaningsBtn.addEventListener('click', () => {
      showMeanings = !showMeanings;
      try { localStorage.setItem(MEANINGS_KEY, showMeanings ? '1' : '0'); } catch (e) {}
      // Re-render current step so tiles update immediately.
      try { renderStep(); } catch (e) {}
    });
  }
  if (els.backBtn) {
    els.backBtn.addEventListener('click', prevStep);
  }
  if (els.restartBtn) {
    els.restartBtn.addEventListener('click', restartLesson);
  }
  els.exitBtn.addEventListener('click', () => {
    // Keep progress.current so Resume works.
    updateResumeButton();
    showPath();
  });
  els.nextBtn.addEventListener('click', nextStep);
  els.checkBtn.addEventListener('click', () => {});

  document.addEventListener('keydown', (e) => {
    if (els.runnerView.classList.contains('show')) {
      if (e.key === 'Enter') {
        if (!els.nextBtn.disabled) els.nextBtn.click();
        else if (els.typeWrap.style.display !== 'none' && els.typeInput.style.display !== 'none') els.checkBtn.click();
      }
    }
  });

  // Init
  function renderTrackBar() {
    if (!els.trackBar) return;
    els.trackBar.innerHTML = '';
    TRACKS.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'trackbtn' + (t.id === currentTrack ? ' active' : '');
      b.textContent = t.label;
      b.addEventListener('click', () => {
        if (t.id === currentTrack) return;
        currentTrack = t.id;
        saveTrack(currentTrack);
        // Rebind course + progress for the selected track
        COURSE = getCourseForTrack(currentTrack);
        progress = loadProgress();
        if (!progress.completed) progress.completed = {};
        if (!Number.isFinite(progress.xp)) progress.xp = 0;
        if (!progress.current) progress.current = null;
        updateProgressPill();
        updateResumeButton();
        renderTrackBar();
        renderPath();
        showPath();
      });
      els.trackBar.appendChild(b);
    });
  }

  updateProgressPill();
  updateResumeButton();
  renderTrackBar();
  renderPath();
  showPath();
})();

