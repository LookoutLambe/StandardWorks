import AVFoundation
import WebKit

/// READ ALOUD ON THE MAC.
///
/// Mac Catalyst's WKWebView does not expose the Web Speech API at all —
/// `typeof window.speechSynthesis` is `undefined` there, measured on every
/// page of the bundle, while the same web view on iOS has it. read_aloud.js
/// opens with `if (!window.speechSynthesis) return;`, so on the Mac the
/// control was never built and the Read aloud button simply did not exist.
///
/// Carmit is installed at the OS level regardless (`say -v Carmit` speaks
/// her), so the voice was never the problem — only the route to her. This is
/// that route: AVSpeechSynthesizer, which IS available under Catalyst, driven
/// from the page through a message handler, with a shim standing in for the
/// missing `window.speechSynthesis` so read_aloud.js needs no change and iOS
/// is untouched (the shim installs only where the real API is absent).
///
/// The word highlighting survives the crossing: AVSpeechSynthesizer's
/// `willSpeakRangeOfSpeechString` gives the character range it is about to
/// utter, which is exactly what the page's `onboundary` handler consumes.
final class SpeechBridge: NSObject, WKScriptMessageHandler, AVSpeechSynthesizerDelegate {

    /// Must match the name the shim posts to.
    static let handlerName = "swSpeech"

    private let synthesizer = AVSpeechSynthesizer()
    private weak var webView: WKWebView?

    /// The page numbers each utterance so a late boundary from a cancelled
    /// one cannot mark a word in the chapter that replaced it.
    private var idForUtterance: [ObjectIdentifier: Int] = [:]

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    func attach(to webView: WKWebView) { self.webView = webView }

    // MARK: - page to native

    func userContentController(_ controller: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let op = body["op"] as? String else { return }

        switch op {
        case "speak":
            let id = body["id"] as? Int ?? -1
            let text = body["text"] as? String ?? ""
            guard !text.isEmpty else { send(id: id, type: "end"); return }
            speak(text: text,
                  lang: body["lang"] as? String ?? "he-IL",
                  rate: body["rate"] as? Double ?? 1,
                  pitch: body["pitch"] as? Double ?? 1,
                  id: id)
        case "cancel":
            synthesizer.stopSpeaking(at: .immediate)
        case "pause":
            synthesizer.pauseSpeaking(at: .immediate)
        case "resume":
            synthesizer.continueSpeaking()
        default:
            break
        }
    }

    private func speak(text: String, lang: String, rate: Double, pitch: Double, id: Int) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = SpeechBridge.voice(for: lang)
        utterance.rate = SpeechBridge.avRate(fromWebRate: rate)
        utterance.pitchMultiplier = Float(max(0.5, min(2.0, pitch)))
        // The page inserts its own silences between phrases; a second pause
        // here would double every gap it tuned by ear.
        utterance.preUtteranceDelay = 0
        utterance.postUtteranceDelay = 0

        idForUtterance[ObjectIdentifier(utterance)] = id
        synthesizer.speak(utterance)
    }

    /// he-IL if the system has it, otherwise any Hebrew voice, otherwise nil
    /// (AVSpeechSynthesizer then picks by locale and the reading is wrong but
    /// audible, which beats silence with no explanation).
    private static func voice(for lang: String) -> AVSpeechSynthesisVoice? {
        if let exact = AVSpeechSynthesisVoice(language: lang) { return exact }
        return AVSpeechSynthesisVoice.speechVoices()
            .first { $0.language.lowercased().hasPrefix("he") }
    }

    /// WEB RATE AND AV RATE ARE DIFFERENT SCALES and neither is linear.
    /// read_aloud.js speaks in Web Speech terms, where 1.0 is the browser's
    /// default and the reader's cycle runs 0.3 to 0.75 — 0.3 being what was
    /// tuned by ear against `say -v Carmit` output. AVSpeechUtterance runs
    /// 0 to 1 with 0.5 as normal, and below about 0.25 Carmit turns to
    /// treacle. So the web range is mapped onto a usable AV band rather than
    /// scaled: 0.3 to 0.30, 0.5 to 0.37, 0.75 to 0.46, 1.0 to 0.55.
    /// Monotonic, and every step of the reader's cycle stays audibly
    /// distinct. Tune the two ends here if the Mac reads faster or slower
    /// than the phone.
    private static func avRate(fromWebRate web: Double) -> Float {
        let webLow = 0.3, webHigh = 1.0
        let avLow = 0.30, avHigh = 0.55
        let clamped = max(webLow, min(webHigh, web))
        let t = (clamped - webLow) / (webHigh - webLow)
        return Float(avLow + t * (avHigh - avLow))
    }

    // MARK: - native to page

    private func send(id: Int, type: String, charIndex: Int = 0) {
        guard id >= 0, let webView else { return }
        let js = "window.__swSpeechEvent && window.__swSpeechEvent(\(id),'\(type)',\(charIndex))"
        DispatchQueue.main.async { webView.evaluateJavaScript(js) }
    }

    private func take(_ utterance: AVSpeechUtterance) -> Int {
        idForUtterance.removeValue(forKey: ObjectIdentifier(utterance)) ?? -1
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer,
                           willSpeakRangeOfSpeechString characterRange: NSRange,
                           utterance: AVSpeechUtterance) {
        guard let id = idForUtterance[ObjectIdentifier(utterance)] else { return }
        send(id: id, type: "boundary", charIndex: characterRange.location)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer,
                           didFinish utterance: AVSpeechUtterance) {
        send(id: take(utterance), type: "end")
    }

    /// A cancel still has to resolve the page's promise, or the chapter stops
    /// mid-reading with no way forward but a reload.
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer,
                           didCancel utterance: AVSpeechUtterance) {
        send(id: take(utterance), type: "end")
    }

    // MARK: - the shim

    /// Injected at document start. It defines `window.speechSynthesis` and
    /// `window.SpeechSynthesisUtterance` ONLY when the real ones are missing,
    /// so iOS keeps WebKit's implementation untouched and only Catalyst gets
    /// the bridge. The surface is exactly what read_aloud.js calls: speak,
    /// cancel, pause, resume, getVoices, addEventListener, and an utterance
    /// carrying voice/lang/rate/pitch/onboundary/onend/onerror.
    static let shimSource = """
    (function () {
      if (window.speechSynthesis) return;                 // iOS: leave it alone
      var port = window.webkit && window.webkit.messageHandlers
                 && window.webkit.messageHandlers.\(handlerName);
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
    """
}
