/* Web Speech API over Android's native text-to-speech.
 *
 * Android's WebView ships no speechSynthesis, so read_aloud.js would find no
 * engine and hide the read-aloud control entirely. This installs the parts of
 * the API the reader actually uses, backed by the phone's TTS engine through
 * the SMTTS interface. It must run before the page's own scripts, so it is
 * injected as a document-start script.
 *
 * One honest gap: Android's engine cannot pause mid-utterance. pause() stops
 * the voice and resume() speaks the current verse again from its start.
 */
(function () {
  if (window.speechSynthesis || !window.SMTTS) return;

  var seq = 0;
  var live = null;          /* utterance currently being spoken */
  var paused = false;
  var voices = [];
  var listeners = { voiceschanged: [] };

  function Utterance(text) {
    this.text = text == null ? '' : String(text);
    this.lang = '';
    this.voice = null;
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
    this.onboundary = null;
    this.onpause = null;
    this.onresume = null;
    this._id = 'u' + (++seq);
    this._handlers = {};
  }
  Utterance.prototype.addEventListener = function (type, fn) {
    (this._handlers[type] = this._handlers[type] || []).push(fn);
  };
  Utterance.prototype.removeEventListener = function (type, fn) {
    var a = this._handlers[type] || [], i = a.indexOf(fn);
    if (i >= 0) a.splice(i, 1);
  };
  Utterance.prototype._emit = function (type) {
    var ev = { type: type, target: this, utterance: this, charIndex: 0, elapsedTime: 0 };
    var direct = this['on' + type];
    if (typeof direct === 'function') { try { direct.call(this, ev); } catch (e) {} }
    var a = this._handlers[type] || [];
    for (var i = 0; i < a.length; i++) { try { a[i].call(this, ev); } catch (e) {} }
  };

  function refreshVoices() {
    try {
      var raw = JSON.parse(window.SMTTS.voices() || '[]');
      voices = raw.map(function (v) {
        return {
          name: v.name, lang: v.lang, localService: !!v.localService,
          default: !!v['default'], voiceURI: v.name
        };
      });
    } catch (e) { voices = []; }
  }

  var synth = {
    get speaking() { return !!live && !paused; },
    get paused() { return paused; },
    get pending() { return false; },

    getVoices: function () {
      if (!voices.length) refreshVoices();
      return voices;
    },

    speak: function (u) {
      if (!u) return;
      live = u;
      paused = false;
      var name = u.voice && u.voice.name ? u.voice.name : '';
      try {
        window.SMTTS.speak(u._id, u.text, u.lang || 'he-IL', name,
                           u.rate || 1, u.pitch || 1);
      } catch (e) { u._emit('error'); live = null; }
    },

    cancel: function () {
      var u = live;
      live = null;
      paused = false;
      try { window.SMTTS.cancel(); } catch (e) {}
      /* The reader relies on cancel() being silent; it drives its own cleanup. */
      if (u) u._cancelled = true;
    },

    pause: function () {
      if (!live || paused) return;
      paused = true;
      try { window.SMTTS.cancel(); } catch (e) {}
      live._emit('pause');
    },

    resume: function () {
      if (!paused || !live) { paused = false; return; }
      paused = false;
      var u = live;
      u._emit('resume');
      synth.speak(u);
    },

    addEventListener: function (type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    removeEventListener: function (type, fn) {
      var a = listeners[type] || [], i = a.indexOf(fn);
      if (i >= 0) a.splice(i, 1);
    },
    onvoiceschanged: null
  };

  window.__smTTS = {
    _on: function (type, id) {
      var u = live;
      if (!u || u._id !== id) return;
      if (type === 'start') { u._emit('start'); return; }
      /* A pause is a deliberate stop, not the end of the verse: staying quiet
         here keeps the reader from advancing to the next one. */
      if (paused) return;
      live = null;
      if (u._cancelled) return;
      u._emit(type === 'error' ? 'error' : 'end');
    },
    _voiceschanged: function () {
      refreshVoices();
      var ev = { type: 'voiceschanged' };
      if (typeof synth.onvoiceschanged === 'function') {
        try { synth.onvoiceschanged(ev); } catch (e) {}
      }
      var a = listeners.voiceschanged || [];
      for (var i = 0; i < a.length; i++) { try { a[i](ev); } catch (e) {} }
    }
  };

  window.SpeechSynthesisUtterance = Utterance;
  try {
    Object.defineProperty(window, 'speechSynthesis', {
      value: synth, configurable: false, enumerable: true, writable: false
    });
  } catch (e) { window.speechSynthesis = synth; }

  refreshVoices();
})();
