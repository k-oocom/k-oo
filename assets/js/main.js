/* k-oo.com 共通スクリプト — すべてのページで /assets/js/main.js を defer で読み込みます */
(function () {
  'use strict';

  /* ====== 設定（ここだけ編集すれば全ページに反映されます） ====== */
  var GA_ID = 'G-XXXXXXXXXX';       // GA4 の測定ID。取得したら置き換える（未設定の間は計測しません）
  var ADS_ENABLED = false;          // Google AdSense 承認後に true にすると広告枠(.ad-slot)が表示されます
  var ADSENSE_CLIENT = '';          // 例: 'ca-pub-0000000000000000'（承認後に入力）
  /* ============================================================== */

  var doc = document;
  var root = doc.documentElement;

  // --- Google Analytics 4 ---
  if (/^G-[A-Z0-9]{6,}$/.test(GA_ID) && GA_ID !== 'G-XXXXXXXXXX') {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
    var ga = doc.createElement('script');
    ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    doc.head.appendChild(ga);
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
