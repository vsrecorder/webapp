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
 *   ・本日のシティリーグ … 開催日だけ出る
 *   ・対戦環境データ     … 記録件数(3件境界)で「組み合わせパネル」と従来パネルが入れ替わる
 *   ・最初の記録CTA/環境ウィンドウ … 記録0件・3件未満のときだけ pinned に出る
 * そこで「設定」ではなく「実際に描いた結果の並び」をそのまま覚える。
 * こうすると分岐の理由を骨格側が知らなくてよく、設定を変えればその描画で cookie も
 * 書き替わるので、次回の骨格が自動で追随する。
 *
 * ここはサーバ・クライアント両方から import するので、ブラウザ専用の処理は置かない
 * (document.cookie の読み書きは utils/clientCookie)。
 */

// 1年保つ。ホームの構成はそう頻繁には変わらないので、間隔が空いた再訪でも効かせたい
export const DASHBOARD_LAYOUT_COOKIE = "dashboardLayout";
export const DASHBOARD_LAYOUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/*
 * 骨格を持つブロックのID。
 *
 * DashboardSections の sections に積む id と同じ文字列を使う(cityleague・stats など)。
 * pinned と trailing のぶんはセクションではないが、縦に並ぶ順に同じ列へ入れる。
 * environment_meta だけは中身が2種類あるため、骨格を選べるようIDを分けている。
 */
export const DASHBOARD_BLOCK_IDS = [
  // pinned(プロフィールカードと、その直下に固定で並ぶカード)
  "profile",
  "first_record_cta",
  "env_window",
  // 並べ替え・非表示の対象になるセクション
  "onboarding_badges",
  "streak",
  "cityleague",
  "my_gyms",
  "designation",
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
 *   ・cityleague       … 開催日以外は出ない。常に出すと平日の骨格が1つ余る
 *   ・first_record_cta / env_window … 記録0件・3件未満のときだけ
 * 骨格が実物より多いと、差し替わった瞬間に下の内容が「せり上がる」形でずれる。
 * 逆に少ないぶんは下へ伸びるだけなので、迷ったら出さない側に倒す。
 */
export const DEFAULT_DASHBOARD_LAYOUT: readonly DashboardBlockId[] = [
  "profile",
  "onboarding_badges",
  "streak",
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
