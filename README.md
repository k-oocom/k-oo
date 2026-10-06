# k-oo

k-oo.com — 日本の読者向け、韓国コスメ・スキンケア情報ブログ（静的 HTML + Cloudflare Workers）。

## 構成

- `index.html` / `about.html` / `privacy.html` / `404.html` — 固定ページ
- `posts/YYYY/MM/slug.html` — 記事（URL は拡張子なし：`/posts/YYYY/MM/slug`）
- `assets/css`, `assets/js`, `assets/img` — 全ページ共通
- `assets/data/posts.json` — 記事一覧（人気記事の表示と閲覧数の記録に使用）
- `worker/index.js` — `/api/view`（閲覧数 +1）と `/api/popular`（人気記事）
- `wrangler.jsonc` — Cloudflare Workers 設定（D1: `k-oo-views`）
- `.assetsignore` — 公開しないファイル
- `templates/post-template.html` — 記事テンプレート（非公開）

## 新しい記事を追加するとき

1. `templates/post-template.html` をコピーして `posts/YYYY/MM/slug.html` を作る
2. 画像を `assets/img/posts/` に置く（本文用 1200×675 webp、OG 用 1200×630 jpg）
3. `index.html` の記事一覧の先頭にカードを追加
4. `assets/data/posts.json` の先頭に記事情報を追加
5. `sitemap.xml` に URL を追加
6. main に push → Workers Builds が自動デプロイ
