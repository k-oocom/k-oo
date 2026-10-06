/* k-oo.com 共通スクリプト — すべてのページで /assets/js/main.js を defer で読み込みます */
(function () {
  'use strict';

  /* ====== 設定（ここだけ編集すれば全ページに反映されます） ====== */
  var GA_ID = 'G-3D5DEM27HH';       // GA4 の測定ID。取得したら置き換える（未設定の間は計測しません）
  var ADS_ENABLED = false;          // Google AdSense 承認後に true にすると広告枠(.ad-slot)が表示されます
  var ADSENSE_CLIENT = '';          // 例: 'ca-pub-0000000000000000'（承認後に入力）
  /* ============================================================== */

  var doc = document;
  var root = doc.documentElement;

  // --- Google Analytics 4 ---
  // 計測はすぐに始め（dataLayer に記録）、gtag.js 本体はページ表示が終わってから読み込みます。
  // → 表示速度（PageSpeed のブロック時間）を下げずに計測できます。
  if (/^G-[A-Z0-9]{6,}$/.test(GA_ID) && GA_ID !== 'G-XXXXXXXXXX') {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
    var loadGa = function () {
      var ga = doc.createElement('script');
      ga.async = true;
      ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
      doc.head.appendChild(ga);
    };
    var afterLoad = function () {
      if ('requestIdleCallback' in window) window.requestIdleCallback(loadGa, { timeout: 3000 });
      else window.setTimeout(loadGa, 1500);
    };
    if (doc.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
  }

  // --- AdSense（承認後に有効化） ---
  if (ADS_ENABLED && ADSENSE_CLIENT) {
    root.classList.add('ads-on');
    var ad = doc.createElement('script');
    ad.async = true;
    ad.crossOrigin = 'anonymous';
    ad.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ADSENSE_CLIENT);
    doc.head.appendChild(ad);
    doc.querySelectorAll('ins.adsbygoogle').forEach(function () {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* noop */ }
    });
  }

  // --- Amazon リンクの安全対策：rel / target を自動付与し、クリックを GA4 に送る ---
  doc.querySelectorAll('a[href*="amazon.co.jp"], a[href*="amzn.to"], a[href*="amzn.asia"], a[href*="link.amazon"]').forEach(function (a) {
    a.setAttribute('rel', 'sponsored nofollow noopener');
    a.setAttribute('target', '_blank');
    a.addEventListener('click', function () {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'affiliate_click', { link_domain: 'amazon', link_url: a.href, page_path: location.pathname });
      }
    });
  });

  // --- 閲覧数の記録（記事ページのみ・同じブラウザでは1日1回まで。数値は表示しません） ---
  var pagePath = location.pathname.replace(/\.html$/, '').replace(/\/+$/, '');
  if (/^\/posts\/\d{4}\/\d{2}\/[a-z0-9-]+$/.test(pagePath) && !navigator.webdriver) {
    var viewKey = 'koo-view:' + pagePath;
    var today = new Date().toISOString().slice(0, 10);
    var seen = null;
    try { seen = window.localStorage.getItem(viewKey); } catch (e) { /* noop */ }
    if (seen !== today) {
      window.setTimeout(function () {
        var body = JSON.stringify({ path: pagePath });
        var sent = false;
        try {
          if (navigator.sendBeacon) sent = navigator.sendBeacon('/api/view', new Blob([body], { type: 'text/plain;charset=UTF-8' }));
        } catch (e) { /* noop */ }
        if (!sent && window.fetch) {
          window.fetch('/api/view', { method: 'POST', headers: { 'content-type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
        }
        try { window.localStorage.setItem(viewKey, today); } catch (e) { /* noop */ }
      }, 3000); // 3秒以上ページにいた場合だけ数える
    }
  }

  // --- 人気記事（閲覧数の多い順。表示できる記事が MIN 件そろうまでは非表示） ---
  var POPULAR_MIN = 3;
  var POPULAR_LIMIT = 5;
  var popularBox = doc.querySelector('[data-popular]');
  if (popularBox && window.fetch) {
    window.fetch('/api/popular?limit=' + (POPULAR_LIMIT + 1))
      .then(function (r) { return r.ok ? r.json() : { items: [] }; })
      .then(function (data) {
        var items = (data.items || []).filter(function (p) { return p.url !== pagePath; }).slice(0, POPULAR_LIMIT);
        if (items.length < POPULAR_MIN) return;
        var list = popularBox.querySelector('.popular-list');
        items.forEach(function (p) {
          var li = doc.createElement('li');
          li.className = 'popular-item';
          var a = doc.createElement('a');
          a.href = p.url;
          var thumb = doc.createElement('span');
          thumb.className = 'popular-thumb';
          var img = doc.createElement('img');
          img.src = p.thumb; img.alt = ''; img.width = 120; img.height = 80;
          img.loading = 'lazy'; img.decoding = 'async';
          thumb.appendChild(img);
          var text = doc.createElement('span');
          text.className = 'popular-text';
          var title = doc.createElement('span');
          title.className = 'popular-title';
          title.textContent = p.title;
          var meta = doc.createElement('span');
          meta.className = 'popular-meta';
          meta.textContent = p.category || '';
          text.appendChild(title); text.appendChild(meta);
          a.appendChild(thumb); a.appendChild(text);
          li.appendChild(a);
          list.appendChild(li);
        });
        popularBox.hidden = false;
      })
      .catch(function () { /* 表示しないだけ */ });
  }

  // --- 現在ページのナビ強調 ---
  var path = location.pathname.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
  doc.querySelectorAll('.site-nav a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === path) a.setAttribute('aria-current', 'page');
  });

  // --- ページ先頭へ戻るボタン ---
  var btn = doc.querySelector('.to-top');
  if (btn) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        btn.classList.toggle('is-visible', window.scrollY > 600);
        ticking = false;
      });
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
