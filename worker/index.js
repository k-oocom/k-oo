/**
 * k-oo.com Worker
 * 静的ファイル（HTML / CSS / JS / 画像）は Cloudflare が直接配信し、このスクリプトは通りません。
 * ここで処理するのは /api/* だけです。
 *
 *   POST /api/view      { "path": "/posts/2026/10/slug" }  → 閲覧数を +1（記事ページのみ）
 *   GET  /api/popular?limit=5                              → 人気記事（閲覧数の多い順）
 *
 * 閲覧数は D1（binding: DB, table: views）に保存します。数値そのものは画面に出しません。
 */

const POSTS_JSON = '/assets/data/posts.json';
const BOT_UA = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|vkshare|w3c_validator|lighthouse|pagespeed|headless|preview|monitor|curl|wget|python|axios|node-fetch|go-http/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/view') return handleView(request, env, ctx);
    if (url.pathname === '/api/popular') return handlePopular(request, env, ctx, url);

    // それ以外で静的ファイルが見つからなかったもの → 404.html を 404 ステータスで返す
    const page = await env.ASSETS.fetch(new Request(new URL('/404', url)));
    return new Response(page.body, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    });
  },
};

/* 記事一覧（posts.json）を読み込む。新しい記事を追加したら posts.json にも追記します */
async function loadPosts(env, request) {
  const res = await env.ASSETS.fetch(new Request(new URL(POSTS_JSON, request.url)));
  if (!res.ok) return [];
  try { return await res.json(); } catch (e) { return []; }
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });
}

async function handleView(request, env, ctx) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405, { allow: 'POST' });

  // 自サイト以外からの送信・ボットは数えない
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ ok: false }, 403);
  if (BOT_UA.test(request.headers.get('user-agent') || '')) return json({ ok: true, counted: false });

  let path = '';
  try { path = String((await request.json()).path || ''); } catch (e) { /* noop */ }
  path = path.replace(/\.html$/, '').replace(/\/+$/, '');

  // posts.json に載っている記事だけを数える（でたらめなパスでDBが埋まらないように）
  const posts = await loadPosts(env, request);
  if (!posts.some((p) => p.url === path)) return json({ ok: true, counted: false });

  ctx.waitUntil(
    env.DB.prepare(
      "INSERT INTO views (path, count, updated_at) VALUES (?1, 1, datetime('now')) " +
      "ON CONFLICT(path) DO UPDATE SET count = count + 1, updated_at = datetime('now')"
    ).bind(path).run()
  );
  return json({ ok: true, counted: true }, 200, { 'cache-control': 'no-store' });
}

async function handlePopular(request, env, ctx, url) {
  if (request.method !== 'GET') return json({ error: 'method' }, 405, { allow: 'GET' });
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '5', 10) || 5, 1), 10);

  // 10分間はエッジでキャッシュ（D1 への問い合わせを減らす）
  const cache = caches.default;
  const cacheKey = new Request(new URL(`/api/popular?limit=${limit}`, url).toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const posts = await loadPosts(env, request);
  const byUrl = new Map(posts.map((p) => [p.url, p]));
  const { results } = await env.DB.prepare(
    'SELECT path FROM views ORDER BY count DESC, updated_at DESC LIMIT ?1'
  ).bind(limit + 5).all();

  const items = (results || [])
    .map((r) => byUrl.get(r.path))
    .filter(Boolean)
    .slice(0, limit)
    .map(({ url: u, title, thumb, alt, category, date }) => ({ url: u, title, thumb, alt, category, date }));

  const res = json({ items }, 200, { 'cache-control': 'public, max-age=600' });
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
