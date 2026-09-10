/*
 * ホーム(ダッシュボード)が前回どのパネルをどの順で描いたかを cookie に覚えておくための定義。
 *
 * 目的は Suspense の骨格(DashboardSkeleton)を実物と同じ構成で出すこと。
 * ホームのパネルは並べ替え・非表示をユーザーが設定でき、その設定は localStorage
 * (DashboardSections の dashboard_layout_v1)にあるためサーバからは読めない。
 * 骨格はサーバで描くので、設定を知らないまま「見出し＋カード」を3つ並べた
 * ニュートラルな形しか出せず、実物(十数個のパネル。人によって順も数も違う)と
 * 大きく食い違っていた。
 *
 * 設定そのものを cookie へ移す手もあるが、それだけでは足りない。
 * ホームの構成は設定以外にもサーバ側の取得結果で変わる:
 *   ・本日のシティリーグ結果 … 開催期間中と期間外で中身が入れ替わる
 *   ・対戦環境データ     … 記録件数(3件境界)で「組み合わせパネル」と従来パネルが入れ替わる
 *   ・最初の記録CTA/環境ウィンドウ … 記録0件・3件未満のときだけ pinned に出る
 * そこで「設定」ではなく「実際に描いた結果の並び」をそのまま覚える。
 * こうすると分岐の理由を骨格側が知らなくてよく、設定を変えればその描画で cookie も
 * 書き替わるので、次回の骨格が自動で追随する。
 *
 * ここはサーバ・クライアント両方から import するので、ブラウザ専用の処理は置かない
 * (document.cookie の読み書きは utils/clientCookie)。
 */

/*
 * ホーム末尾の「最近の記録」に出す件数。
 *
 * 実体(Records の limit)と骨格(RecordCardSkeletons の count)の両方から参照する。
 * ここが食い違うと、骨格が実物に差し替わった瞬間に高さが飛ぶ。
 */
export const DASHBOARD_RECENT_RECORDS_LIMIT = 5;

// 1年保つ。ホームの構成はそう頻繁には変わらないので、間隔が空いた再訪でも効かせたい
export const DASHBOARD_LAYOUT_COOKIE = "dashboardLayout";
export const DASHBOARD_LAYOUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/*
 * 骨格を持つブロックのID。
 *
 * DashboardSections の sections に積む id と同じ文字列を使う(cityleague・stats など)。
 * pinned と trailing のぶんはセクションではないが、縦に並ぶ順に同じ列へ入れる。
 * 中身が2種類ある節(cityleague・designation・environment_meta)だけは、
 * 骨格を選べるようIDを分けている。
 */
export const DASHBOARD_BLOCK_IDS = [
  // pinned(プロフィールカードと、その直下に固定で並ぶカード)
  "profile",
  "first_record_cta",
  "env_window",
  // 並べ替え・非表示の対象になるセクション
  "onboarding_badges",
  "streak",
  // 本日のシティリーグ結果。開催期間中(当日の会場一覧)と期間外(次回シーズンの案内)で
  // 中身の背丈が違うので、骨格を選べるようIDを分けている
  "cityleague",
  "cityleague_off_season",
  "my_gyms",
  // 称号とランク。プレイヤーズクラブ連携済みだと「入賞したシティリーグ」の節が増えるので、
  // 骨格も2種類ある(節の有無で 200px 以上変わる)
  "designation",
  "designation_linked",
  "badges",
  "environment_badges",
  "stats",
  "stats_history",
  "stats_recent",
  "deck_usage",
  "opponent_deck_usage",
  // 対戦環境データ。従来パネル(WeeklyDeckUsagePanel)と組み合わせパネル(EnvironmentWindowCard)
  "environment_meta",
  "environment_meta_window",
  "calendar",
  // trailing(最近の記録)
  "recent_records",
] as const;

export type DashboardBlockId = (typeof DASHBOARD_BLOCK_IDS)[number];

// pinned に置かれるブロック。骨格側は cookie の並びからこれらを拾って先頭のまとまりにする
const PINNED_BLOCK_IDS: readonly DashboardBlockId[] = [
  "profile",
  "first_record_cta",
  "env_window",
];

// trailing(セクションの多段組の外、最後に置くブロック)
const TRAILING_BLOCK_ID: DashboardBlockId = "recent_records";

const KNOWN_BLOCK_IDS = new Set<string>(DASHBOARD_BLOCK_IDS);

export function isDashboardBlockId(value: string): value is DashboardBlockId {
  return KNOWN_BLOCK_IDS.has(value);
}

/*
 * cookie が無い(初回訪問・設定を触っていない別ブラウザ)ときに使う並び。
 *
 * 既定の並びは Dashboard.tsx が sections を積む順と揃えること。
 * ただしサーバ取得の結果で出方が変わるものは「出ない側」に倒す:
 *   ・first_record_cta / env_window … 記録0件・3件未満のときだけ
 * 骨格が実物より多いと、差し替わった瞬間に下の内容が「せり上がる」形でずれる。
 * 逆に少ないぶんは下へ伸びるだけなので、迷ったら出さない側に倒す。
 * 中身が入れ替わる節も同じ理由で背の低い側を既定にする。
 * ただしシティリーグだけは開催期間中と期間外で高さを揃えてある(どちらも 232px)ので、
 * どちらを既定にしても骨格の高さは変わらない(期間外の側を置いている)。
 */
export const DEFAULT_DASHBOARD_LAYOUT: readonly DashboardBlockId[] = [
  "profile",
  "onboarding_badges",
  "streak",
  "cityleague_off_season",
  "my_gyms",
  "designation",
  "badges",
  "environment_badges",
  "stats",
  "stats_history",
  "stats_recent",
  "deck_usage",
  "opponent_deck_usage",
  "environment_meta",
  "calendar",
  "recent_records",
];

export function serializeDashboardLayout(ids: readonly DashboardBlockId[]): string {
  return ids.join(",");
}

/*
 * cookie の値を並びへ戻す。cookie は誰でも書き換えられるので、
 * 既知のID以外と重複は落とす。1つも残らなければ null(=既定の並びを使う)。
 */
export function parseDashboardLayout(
  value: string | null | undefined,
): DashboardBlockId[] | null {
  if (!value) return null;

  const seen = new Set<string>();
  const ids: DashboardBlockId[] = [];

  for (const raw of value.split(",")) {
    const id = raw.trim();
    if (!isDashboardBlockId(id) || seen.has(id)) continue;

    seen.add(id);
    ids.push(id);
  }

  return ids.length > 0 ? ids : null;
}

/*
 * 並びを、画面上の3つのまとまり(pinned / 多段組のセクション / trailing)へ振り分ける。
 * どのブロックがどこへ入るかはIDで決まるので、cookie には順序だけ持たせれば足りる。
 */
export function splitDashboardLayout(ids: readonly DashboardBlockId[]): {
  pinned: DashboardBlockId[];
  sections: DashboardBlockId[];
  trailing: DashboardBlockId[];
} {
  const pinned: DashboardBlockId[] = [];
  const sections: DashboardBlockId[] = [];
  const trailing: DashboardBlockId[] = [];

  for (const id of ids) {
    if (PINNED_BLOCK_IDS.includes(id)) pinned.push(id);
    else if (id === TRAILING_BLOCK_ID) trailing.push(id);
    else sections.push(id);
  }

  return { pinned, sections, trailing };
}

/*
 * 骨格用のブロックIDから、DashboardSections の節のID(並べ替え・非表示設定のキー)へ戻す。
 * 中身が2種類ある節だけIDを分けている(DashboardSection.skeletonId 参照)。
 */
export function sectionIdOfBlock(block: DashboardBlockId): string {
  if (block === "environment_meta_window") return "environment_meta";
  if (block === "designation_linked") return "designation";
  if (block === "cityleague_off_season") return "cityleague";
  return block;
}

/*
 * 保存済みの並びに、そこに無い節を「既定の位置」で差し込む。
 *
 * 保存済みの並び(localStorage の dashboard_layout_v1 / cookie)は、節が増える前に
 * 書かれたものでありうる。以前はそこに無い節を末尾へ足していたが、それだと
 * コード上はストリークの直後に積んでいる節(本日のシティリーグ結果)が、
 * 既存ユーザーにだけホームと表示設定の一番下に現れてしまう。
 *
 * 既定の並びで直前に来る節のうち、保存済みの並びにあるものを探して、その後ろへ入れる
 * (見つからなければ先頭)。こうすると、増えた節は書いたとおりの位置に出つつ、
 * ユーザーが自分で並べ替えた順序はそのまま保たれる。
 * 未知のID(古い節・cookie の書き換え)は落とす。
 */
export function mergeIntoStoredOrder(
  storedOrder: readonly string[],
  defaultOrder: readonly string[],
): string[] {
  const known = new Set(defaultOrder);
  const placed = new Set<string>();
  const merged: string[] = [];

  for (const id of storedOrder) {
    if (!known.has(id) || placed.has(id)) continue;

    placed.add(id);
    merged.push(id);
  }

  defaultOrder.forEach((id, index) => {
    if (placed.has(id)) return;

    // 既定の並びで手前にある節のうち、すでに置かれているものの直後へ入れる
    let at = 0;
    for (let prev = index - 1; prev >= 0; prev--) {
      const found = merged.indexOf(defaultOrder[prev]);
      if (found >= 0) {
        at = found + 1;
        break;
      }
    }

    merged.splice(at, 0, id);
    placed.add(id);
  });

  return merged;
}

/*
 * 保存済みの並び(localStorage の dashboard_layout_v1)に対する、一度きりの並び直しの版。
 *
 * mergeIntoStoredOrder は「保存済みに無い節」を既定の位置へ入れるが、すでに保存済みに
 * 入ってしまっている節は動かせない(ユーザーが自分で置いた位置かもしれないため)。
 * 節の位置をこちらの都合で直したいときは、この版を上げて applyOrderMigrations に足す。
 */
export const DASHBOARD_ORDER_VERSION = 1;

// order の中の id を anchor の直後へ移す。どちらか無ければ何もしない
function moveRightAfter(order: readonly string[], id: string, anchor: string): string[] {
  if (!order.includes(id) || !order.includes(anchor) || id === anchor) return [...order];

  const next = order.filter((value) => value !== id);
  next.splice(next.indexOf(anchor) + 1, 0, id);
  return next;
}

/*
 * 保存済みの並びを、その版に応じて一度だけ直す。
 *
 * v1: 「本日のシティリーグ結果」をストリークの直後へ。
 *     この節は以前は開催日にしか出ていなかったため、常時表示に変えるまでに一度でも
 *     表示設定を触ったことがあるユーザーは、末尾に足された位置のまま保存されている。
 *     差し込み(mergeIntoStoredOrder)では動かせないので、ここで一度だけ直す。
 *
 * 直したあとは呼び出し側が現在の版を付けて保存し直すので、以後は何もしない
 * (ユーザーが自分で動かした位置を毎回巻き戻さないため)。
 */
export function applyOrderMigrations(
  order: readonly string[],
  version: number | undefined,
): string[] {
  if ((version ?? 0) >= DASHBOARD_ORDER_VERSION) return [...order];

  return moveRightAfter(order, "cityleague", "streak");
}

/*
 * 前回描いた並び(cookie)から、DashboardSections の初期状態(order / hidden)を作る。
 *
 * 表示設定は localStorage にあってサーバでは読めないため、以前はハイドレーション後に
 * 読み終わるまで節の本体を描かず骨格で繋いでいた。本番ビルド・CPU 4x の実測(2026-09-08)では、
 * ホームの本体がハイドレーションを終えて骨格が実体に置き換わるのが 6.8 秒で、これが
 * 「ホームが開くまで」の大半だった。cookie に前回の並びがあれば、それを初期状態にして
 * サーバ描画の時点から実体を出す(localStorage と食い違うのは別端末で設定を変えた場合などに限られ、
 * その場合も読み終えた時点で並び直る)。
 *
 * cookie に無い節は非表示扱いで始める(前回描いていないので、非表示設定か自動非表示のどちらか)。
 * 位置は既定の並びに合わせて差し込む(mergeIntoStoredOrder)。
 * 今回サーバが描かない節(記録3件未満のときの対戦環境データなど)は sectionIds に無いので無視する。
 * cookie が無ければ null(従来どおり骨格で繋ぐ)。
 */
export function initialSectionStateFromLayout(
  blocks: readonly DashboardBlockId[] | undefined,
  sectionIds: readonly string[],
): { order: string[]; hidden: string[] } | null {
  if (!blocks || blocks.length === 0) return null;

  const known = new Set(sectionIds);
  const drawnLastTime: string[] = [];

  for (const block of blocks) {
    const id = sectionIdOfBlock(block);
    if (known.has(id) && !drawnLastTime.includes(id)) drawnLastTime.push(id);
  }

  // 前回描いていない節は非表示で始める。並びは既定の位置へ差し込む(末尾に寄せない)
  const missing = sectionIds.filter((id) => !drawnLastTime.includes(id));

  return { order: mergeIntoStoredOrder(drawnLastTime, sectionIds), hidden: missing };
}
