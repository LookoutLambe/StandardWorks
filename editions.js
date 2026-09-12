/* editions.js — the print editions of Sefer Mormon, ONE table.
   Rendered at runtime into the reader's In Print panel (bom/bom.html) and at
   build time into in-print.html (tools/build_static_pages.js), so the two can
   never disagree. Card CSS: .ed-* in reader.css. Loads in the browser (window
   .Editions) and in node (module.exports). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Editions = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var EDITIONS = [
    { key: 'interlinear', title: 'Interlinear Edition', name: 'Hebrew Book of Mormon: Interlinear Edition',
      format: 'Soft Cover', spec: 'Softcover · 8.5 × 11 in', seller: 'Amazon', href: 'https://www.amazon.com/dp/B0GVZFM6YR',
      img: 'cover-interlinear.jpg?v=5', alt: 'Hebrew Book of Mormon Interlinear Edition',
      blurb: 'The whole Book of Mormon with its English gloss set under every Hebrew word, two columns to a large page. The edition this site’s interlinear view is printed from.' },
    { key: 'hebrew', title: 'Full Hebrew Edition', name: 'Sefer Mormon: the Book of Mormon in Hebrew',
      format: 'Soft Cover', spec: 'Softcover · 6 × 9 in', seller: 'Amazon', href: 'https://www.amazon.com/dp/B0DVTJC9HJ',
      img: 'cover-hebrew.jpg?v=5', alt: 'Hebrew Book of Mormon',
      blurb: 'The Hebrew text alone, pointed, verse by verse, in a reader’s volume. Nothing on the page but the Book of Mormon in the Hebrew of the prophets.' },
    { key: 'footnote', title: 'Footnote Edition', name: 'Sefer Mormon: Footnote Edition, blue linen hardcover',
      format: 'Blue Linen · Dust Jacket', spec: 'Hardcover · Blue linen · Dust jacket', seller: 'Lulu',
      href: 'https://www.lulu.com/shop/christopher-lambe/%D7%A1%D7%A4%D7%A8-%D7%9E%D7%95%D7%A8%D7%9E%D7%95%D7%9F/hardcover/product-2m87weq.html',
      img: 'cover-hardcover.jpg?v=3', alt: 'Hebrew Book of Mormon, footnote edition — blue linen hardcover with dust jacket',
      blurb: 'The Hebrew text with the translator’s footnotes, bound in blue linen under a dust jacket. The edition for the shelf.' },
    { key: 'dual', title: 'Dual Language Edition', name: 'Sefer Mormon: Dual Language Edition, Hebrew and English',
      format: 'Soft Cover', spec: 'Softcover · 7 × 10 in', seller: 'Amazon', href: 'https://www.amazon.com/dp/B0GGQZG9K9',
      img: 'cover-dual.jpg?v=2', alt: 'Dual Language Book of Mormon',
      blurb: 'Hebrew on the left page and the English on the right, verse for verse, for reading the two side by side.' },
    { key: 'triple', title: 'Triple Combination', name: 'Sefer Mormon: Triple Combination in Hebrew',
      format: 'Soft Cover', spec: 'Softcover', seller: 'Amazon', href: 'https://www.amazon.com/dp/B0H11CV516',
      img: 'cover-triple.jpg?v=5', alt: 'Triple Combination',
      blurb: 'The Book of Mormon, the Doctrine and Covenants and the Pearl of Great Price in Hebrew, bound as one volume.' }
  ];
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* cards(imgBase, {detail}) -> the .ed-grid markup. imgBase is the path to
     bom/images/ from the page ('images/' in the reader, 'bom/images/' at the
     root). detail:true adds the blurb and the buy line (the in-print page);
     the reader's panel keeps the compact card. */
  function cards(imgBase, opts) {
    var detail = !!(opts && opts.detail), h = '<div class="ed-grid">';
    EDITIONS.forEach(function (e) {
      h += '<a class="ed-card" href="' + esc(e.href) + '" target="_blank" rel="noopener">' +
           '<span class="ed-cover"><img src="' + esc(imgBase + e.img) + '" alt="' + esc(e.alt) + '" loading="lazy"></span>' +
           '<span class="ed-title">' + esc(e.title) + '</span>' +
           '<span class="ed-format">' + (detail ? esc(e.spec) : e.format) + '</span>' +
           (detail ? '<span class="ed-blurb">' + esc(e.blurb) + '</span><span class="ed-buy">Buy on ' + esc(e.seller) + ' →</span>' : '') +
           '</a>';
    });
    return h + '</div>';
  }
  return { EDITIONS: EDITIONS, cards: cards };
});
