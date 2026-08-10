/* ══════════════════════════════════════════════════════
   NOTES ENGINE — Per-verse notes backed by IndexedDB
   - Stable key: data-verse-key ("Book|Chapter|Verse")
   - iOS-ready: export/import JSON
   ══════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var DB_NAME = 'standard-works';
  var DB_VERSION = 1;
  var STORE = 'notes';

  function openDb() {
    return new Promise(function(resolve, reject) {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB not supported'));
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function() {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var os = db.createObjectStore(STORE, { keyPath: 'verseKey' });
          os.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error || new Error('Failed to open DB')); };
    });
  }

  function tx(db, mode) {
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  function reqToPromise(req) {
    return new Promise(function(resolve, reject) {
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error || new Error('IDB request failed')); };
    });
  }

  async function getNote(verseKey) {
    if (!verseKey) return null;
    var db = await openDb();
    try {
      var os = tx(db, 'readonly');
      return await reqToPromise(os.get(verseKey));
    } finally {
      db.close();
    }
  }

  async function upsertNote(verseKey, text) {
    if (!verseKey) return;
    var trimmed = (text || '').trim();
    var db = await openDb();
    try {
      var os = tx(db, 'readwrite');
      if (!trimmed) {
        await reqToPromise(os.delete(verseKey));
        return;
      }
      await reqToPromise(os.put({
        verseKey: verseKey,
        text: trimmed,
        updatedAt: Date.now()
      }));
    } finally {
      db.close();
    }
  }

  async function deleteNote(verseKey) {
    if (!verseKey) return;
    var db = await openDb();
    try {
      var os = tx(db, 'readwrite');
      await reqToPromise(os.delete(verseKey));
    } finally {
      db.close();
    }
  }

  function chapterKeyFromVerseKey(verseKey) {
    var parts = (verseKey || '').split('|');
    if (parts.length < 2) return '';
    return parts[0] + '|' + parts[1] + '|';
  }

  async function listNotesForChapter(chapterKeyPrefix) {
    var prefix = chapterKeyPrefix || '';
    if (!prefix) return [];
    var db = await openDb();
    try {
      var os = tx(db, 'readonly');
      var all = await reqToPromise(os.getAll());
      return (all || []).filter(function(n) { return n && n.verseKey && n.verseKey.indexOf(prefix) === 0; });
    } finally {
      db.close();
    }
  }

  async function exportAll() {
    var db = await openDb();
    try {
      var os = tx(db, 'readonly');
      var all = await reqToPromise(os.getAll());
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        notes: (all || []).map(function(n) { return { verseKey: n.verseKey, text: n.text, updatedAt: n.updatedAt }; })
      };
    } finally {
      db.close();
    }
  }

  async function importAll(payload, opts) {
    var mode = (opts && opts.mode) || 'merge'; // merge | replace
    if (!payload || !payload.notes || !Array.isArray(payload.notes)) throw new Error('Invalid import payload');
    var db = await openDb();
    try {
      var os = tx(db, 'readwrite');
      if (mode === 'replace') {
        await reqToPromise(os.clear());
      }
      for (var i = 0; i < payload.notes.length; i++) {
        var n = payload.notes[i];
        if (!n || !n.verseKey) continue;
        var text = (n.text || '').trim();
        if (!text) continue;
        await reqToPromise(os.put({
          verseKey: n.verseKey,
          text: text,
          updatedAt: n.updatedAt || Date.now()
        }));
      }
    } finally {
      db.close();
    }
  }

  window.NotesEngine = {
    getNote: getNote,
    upsertNote: upsertNote,
    deleteNote: deleteNote,
    exportAll: exportAll,
    importAll: importAll,
    listNotesForChapter: listNotesForChapter,
    chapterKeyFromVerseKey: chapterKeyFromVerseKey
  };
})();

