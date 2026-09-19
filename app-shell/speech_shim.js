(function () {
  if (window.speechSynthesis) return;                 // iOS: leave it alone
  var port = window.webkit && window.webkit.messageHandlers
             && window.webkit.messageHandlers.swSpeech;
  if (!port) return;                                  // no bridge: no control

  var seq = 0, live = Object.create(null);

  function Utterance(text) {
    this.text = text == null ? '' : String(text);
    this.lang = ''; this.rate = 1; this.pitch = 1; this.volume = 1;
    this.voice = null;
    this.onboundary = null; this.onend = null; this.onerror = null;
    this.onstart = null;
  }

  /* One entry, because that is what the page asks of getVoices(): a
     Hebrew voice to exist. The native side does the real picking. */
  var VOICES = [{ name: 'Carmit', lang: 'he-IL',
                  localService: true, default: true, voiceURI: 'he-IL' }];

  window.SpeechSynthesisUtterance = Utterance;
  window.speechSynthesis = {
    speaking: false, pending: false, paused: false,
    speak: function (u) {
      if (!u) return;
      var id = ++seq;
      live[id] = u;
      this.speaking = true;
      if (typeof u.onstart === 'function') { try { u.onstart(); } catch (e) {} }
      port.postMessage({ op: 'speak', id: id, text: String(u.text || ''),
                         lang: u.lang || 'he-IL',
                         rate: +u.rate || 1, pitch: +u.pitch || 1 });
    },
    cancel: function () {
      live = Object.create(null);
      this.speaking = false; this.paused = false;
      port.postMessage({ op: 'cancel' });
    },
    pause: function () { this.paused = true; port.postMessage({ op: 'pause' }); },
    resume: function () { this.paused = false; port.postMessage({ op: 'resume' }); },
    getVoices: function () { return VOICES; },
    addEventListener: function () {}, removeEventListener: function () {}
  };

  /* Native calls this. A boundary for an utterance already cancelled is
     dropped, so a stale word never lights up in the next chapter. */
  window.__swSpeechEvent = function (id, type, charIndex) {
    var u = live[id];
    if (!u) return;
    if (type === 'boundary') {
      if (typeof u.onboundary === 'function') {
        try { u.onboundary({ charIndex: charIndex | 0, name: 'word' }); } catch (e) {}
      }
      return;
    }
    delete live[id];
    var still = false; for (var k in live) { still = true; break; }
    window.speechSynthesis.speaking = still;
    if (type === 'end') {
      if (typeof u.onend === 'function') { try { u.onend(); } catch (e) {} }
    } else if (typeof u.onerror === 'function') {
      try { u.onerror({ error: 'synthesis-failed' }); } catch (e) {}
    }
  };
})();
