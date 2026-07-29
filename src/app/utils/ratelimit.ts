/*
 * 単一プロセス内で完結する、固定ウィンドウ方式のインメモリレート制限。
 * 複数インスタンスにまたがるレート制限には対応しない。
 *
 * プレイヤーID連携の実在確認はBFFから外部サイトへ問い合わせるため、他人の player_id を
 * 総当たりで探索されるのを、外部へリクエストを出す前にここで止める。
 */

export class Limiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly hits = new Map<string, number[]>();

  // 指定した期間(windowMs)内に、キーごとに limit 回まで allow を許可する。
  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  // allow は key に対する1回の試行を消費し、ウィンドウ内の試行回数が制限を
  // 超えていなければ true を返す。
  allow(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    const filtered = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

    if (filtered.length >= this.limit) {
      this.hits.set(key, filtered);
      return false;
    }

    filtered.push(now);
    this.hits.set(key, filtered);

    // 期限切れのキーが際限なく溜まらないよう、消費のたびに少しずつ掃除する
    this.sweep(cutoff);

    return true;
  }

  // release は直近に消費した1回分を取り消す。外部サイトの障害など、利用者に
  // 責任がない理由で処理を続行できなかった場合に枠を返すために使う。
  release(key: string): void {
    const times = this.hits.get(key);

    if (times == null || times.length === 0) {
      return;
    }

    times.pop();

    if (times.length === 0) {
      this.hits.delete(key);
      return;
    }

    this.hits.set(key, times);
  }

  private sweep(cutoff: number): void {
    for (const [key, times] of this.hits) {
      if (times.length > 0 && times[times.length - 1] <= cutoff) {
        this.hits.delete(key);
      }
    }
  }
}
