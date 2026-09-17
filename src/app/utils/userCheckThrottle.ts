/*
 * 退会チェック(core-apiserver への「このユーザはまだ存在するか」の問い合わせ)の間引き。
 *
 * auth.ts の jwt コールバックは `token.userCheckedAt` に確認時刻を書いて 30 分に 1 回へ
 * 抑える作りだが、その更新が効くのは**セッション Cookie を再発行する経路だけ**である。
 * サーバコンポーネントやルートハンドラから呼ぶ `auth()` は Cookie を書き戻さないため、
 * userCheckedAt はサインイン時の値のまま進まず、30 分を過ぎると**毎リクエスト**
 * 退会チェックの HTTP 往復が挟まっていた(本番ログの実測で、ページ 826 件に対し
 * 退会チェック 2217 件。1 ページ表示あたり複数回)。
 *
 * ここではプロセス内に最終確認時刻と結果を持ち、
 *   - 直近 ttlMs 以内に確認済みなら問い合わせず、そのときの結果を返す
 *     (＝本来意図した 30 分に 1 回へ戻す)
 *   - 同じユーザの確認が実行中なら、その結果を共有する(並行する複数リクエストで 1 回にまとめる)
 * の 2 段で間引く。プロセス内なので、コンテナを入れ替えれば次のリクエストで再び確認する。
 *
 * 結果まで覚えるのは、退会済みと分かった直後に「有効」へ戻さないため。時刻だけを覚えると、
 * 退会を検知したリクエストは未ログイン扱いになるのに、ttlMs の間は次のリクエストが
 * 無条件に「退会していない」扱いになり、退会済みのセッションが生き返っていた。
 * jwt コールバックが null を返しても Cookie が消えるのは /api/auth/session 経由のときだけ
 * なので、検知した状態を保ち続けて、その経路(5 分ごとのポーリング)に Cookie を消させる。
 */

type Options = {
  // 同じユーザを再確認しない期間
  ttlMs: number;
  // 覚えておくユーザ数の上限。超えたら期限切れ→古い順に落とす
  maxEntries?: number;
  // テスト用。既定は Date.now
  now?: () => number;
};

export type UserCheckThrottle = {
  /*
   * 退会チェックを間引きつつ実行する。
   *   uid             … 対象ユーザ
   *   tokenCheckedAt  … セッションが持つ最終確認時刻(サインイン直後はこれが効く)
   *   run             … 実際の問い合わせ。「退会済みなら true」を返す
   * 直近に確認済みで問い合わせを省いた場合は、そのときの結果を返す。
   * run が投げた例外はそのまま呼び出し元へ伝える(呼び出し元がフェイルオープンで扱う)。
   */
  check: (
    uid: string,
    tokenCheckedAt: number | undefined,
    run: () => Promise<boolean>,
  ) => Promise<boolean>;
  /*
   * 退会が確定したことをこのプロセスに覚えさせる(退会 API が呼ぶ)。
   * 以降 ttlMs の間は問い合わせずに退会済みとして扱う。
   */
  markDeleted: (uid: string) => void;
};

const DEFAULT_MAX_ENTRIES = 10_000;

type Entry = {
  // 最後に確認した時刻
  at: number;
  // その確認で退会済みと分かったか。失敗(例外)のときは false(フェイルオープン)
  deleted: boolean;
};

export function createUserCheckThrottle({
  ttlMs,
  maxEntries = DEFAULT_MAX_ENTRIES,
  now = Date.now,
}: Options): UserCheckThrottle {
  // uid → 最後の確認。再確認するたびに入れ直して、Map の順序を「古い順」に保つ
  const entries = new Map<string, Entry>();
  // uid → 実行中の確認。並行するリクエストはこれを共有する
  const inFlight = new Map<string, Promise<boolean>>();

  const remember = (uid: string, entry: Entry) => {
    entries.delete(uid);
    entries.set(uid, entry);

    if (entries.size <= maxEntries) return;

    // まず期限切れを捨てる。それでも収まらなければ、確認が古い順に落とす
    for (const [key, { at }] of entries) {
      if (entry.at - at > ttlMs) entries.delete(key);
    }
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next();
      if (oldest.done) break;
      entries.delete(oldest.value);
    }
  };

  return {
    check(uid, tokenCheckedAt, run) {
      const shared = inFlight.get(uid);
      if (shared) return shared;

      const current = now();
      const entry = entries.get(uid);
      // セッションが持つ時刻とプロセス内の記録の、新しいほうを最終確認時刻とする
      const checkedAt = Math.max(tokenCheckedAt ?? 0, entry?.at ?? 0);
      if (current - checkedAt <= ttlMs) {
        // プロセス内の記録が退会済みで、セッションの時刻よりも新しければ、その結果を返す。
        // セッションの時刻のほうが新しいのは、記録の後にサインインし直した場合で、
        // そのときは登録が通っている(退会済みなら authorize が弾く)ので有効として扱う。
        return Promise.resolve(
          entry !== undefined && entry.deleted && entry.at >= (tokenCheckedAt ?? 0),
        );
      }

      // 成功・失敗にかかわらず時刻を進める。失敗時に進めないと、バックエンド障害中は
      // リクエストのたびにタイムアウトする問い合わせが挟まって全体が重くなる
      const pending = run().then(
        (deleted) => {
          remember(uid, { at: now(), deleted });
          return deleted;
        },
        (error: unknown) => {
          remember(uid, { at: now(), deleted: false });
          throw error;
        },
      );
      pending.finally(() => inFlight.delete(uid)).catch(() => {});

      inFlight.set(uid, pending);

      return pending;
    },

    markDeleted(uid) {
      remember(uid, { at: now(), deleted: true });
    },
  };
}
