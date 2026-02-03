(() => {
  // 文字数が多く、リンクやナビが少ない方を好む
  function score(el) {
    const text = (el.innerText || '').trim();
    if (!text) return 0;
    const len = text.length;
    const aCount = el.querySelectorAll('a').length;
    const navPenalty = /nav|menu|breadcrumb|footer|header|aside|comment/i.test(el.className + ' ' + el.id) ? 0.4 : 1;
    return len * (1 / (1 + aCount * 0.3)) * navPenalty;
  }

  function pickBiggest(container) {
    let best = { el: container, sc: score(container) };
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const el = walker.currentNode;
      // 小さすぎる要素やフォーム類はスキップ
      const tag = el.tagName;
      if (/^(NAV|ASIDE|FOOTER|HEADER|FORM|INPUT|BUTTON|SVG|CANVAS|SCRIPT|STYLE)$/.test(tag)) continue;
      const sc = score(el);
      if (sc > best.sc) best = { el, sc };
    }
    return (best.el.innerText || '').trim();
  }

  function clean(t) {
    // ゴミ削り：連続空行を1つに、ページ固有のUI痕跡を軽減
    return t
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // 1) <article>
  const art = document.querySelector('article');
  if (art) return clean(pickBiggest(art));

  // 2) main / role=main
  const main = document.querySelector('main, [role="main"]');
  if (main) return clean(pickBiggest(main));

  // 3) body 全体から最大スコア
  return clean(pickBiggest(document.body || document.documentElement));
})();
