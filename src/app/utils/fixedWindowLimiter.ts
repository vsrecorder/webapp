// 固定窓の回数制限(プロセス内のメモリで数える)。
//
// 鍵(利用者の ID など)ごとに「窓の始まり」と「その窓での回数」だけを持ち、窓の長さが過ぎたら
// 数え直す。webapp は pm2 の cluster(2 プロセス)で動くので、上限はプロセスごとに効く
// (全体では最大でプロセス数倍まで通る)。再起動・デプロイで数え直しになる。
// 送信元ごとの制限は nginx(proxy リポジトリの limit_req)が受け持ち、ここは送信元を変えても
// 効く「アカウントごと」の上限を足すためのもの。厳密さより、外から無制限に使われないことを優先している。
export class FixedWindowLimiter {
  private readonly hits = new Map<string, { windowStart: number; count: number }>();
  private lastPruned = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error("limit must be a positive integer");
    }
    if (!(windowMs > 0)) {
      throw new Error("windowMs must be positive");
    }
  }

  // key の回数を 1 つ数え、上限の内側なら allowed: true を返す。
  // 上限を超えた呼び出しは数えない(拒否され続けても窓が延びない)。
  // 拒否したときは、次に通るまでの残り時間を retryAfterMs で返す。
  consume(key: string): { allowed: true } | { allowed: false; retryAfterMs: number } {
    const now = this.now();
    this.prune(now);

    const entry = this.hits.get(key);
    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.hits.set(key, { windowStart: now, count: 1 });
      return { allowed: true };
    }

    if (entry.count >= this.limit) {
      return { allowed: false, retryAfterMs: entry.windowStart + this.windowMs - now };
    }

    entry.count += 1;
    return { allowed: true };
  }

  // 窓が過ぎた鍵を捨てる。鍵が増え続けてメモリを食わないようにするためで、
  // 毎回全件を見ると重くなりうるので、窓の長さに 1 回だけ行う。
  private prune(now: number) {
    if (now - this.lastPruned < this.windowMs) {
      return;
    }
    this.lastPruned = now;

    for (const [key, entry] of this.hits) {
      if (now - entry.windowStart >= this.windowMs) {
        this.hits.delete(key);
      }
    }
  }

  // テスト用: 今数えている鍵の数
  get size(): number {
    return this.hits.size;
  }
}
