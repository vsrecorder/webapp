/*
 * 円グラフの外周に並べるスプライトバッジのレイアウト計算。
 *
 * 画面の円グラフ(pieSlicesSpritePlugin / canvas)とシェア画像(SharePieChart / SVG+DOM)は
 * 同じ見た目にする必要があるため、寸法の基準値と「外周に何件並ぶか」の判定をここに集約する。
 * 片方だけ値をずらすと、画面とシェア画像でバッジの大きさ・位置が食い違ってしまう。
 */

// スプライト1体の表示サイズ（外周に余裕があるときの標準サイズ）
export const BADGE_SPRITE_SIZE = 44;
// バッジが外周に並びきらない件数のときに縮められる下限。
// これ以上小さくするとスプライトからデッキを判別できなくなるため、下限に達してもなお
// 並びきらない場合は多少の重なりを許容する（衝突解消側で押し出す）。
export const BADGE_SPRITE_SIZE_MIN = 28;
// バッジ内側の余白
export const BADGE_PAD = 5;
// バッジ内、スプライトの下に表示する割合文字のサイズとスプライトとの間隔
// (バッジ高さの増加分がそのまま外周への張り出しに直結し、余白からの見切れにつながるため
// 視認性を保てる範囲でできるだけ小さくしている)
export const BADGE_PERCENT_FONT_SIZE = 9;
export const BADGE_PERCENT_GAP = 1;
// 円の外周とバッジの間隔
export const BADGE_GAP = 4;
// バッジ同士の最低間隔（隣り合うバッジが接触しすぎないための余白）
export const BADGE_OUTSIDE_MARGIN = 6;
// 衝突解消のために動かせる最大距離（自身のバッジ高さの何倍まで元の位置から離れてよいか）。
// これを超えてまで引き離すと、そのスライスから遠い場所に表示されてしまうため、
// 上限を超える場合は多少重なることを許容する。
export const BADGE_MAX_DRIFT_FACTOR = 1.2;

// バッジ1個の横幅。スプライトは重なりなく横に並べる（DOM 側の PokemonSprite と同じ並べ方）
export function badgeWidth(spriteSize: number, spriteCount: number): number {
  return spriteSize * spriteCount + BADGE_PAD * 2;
}

// バッジ1個の高さ。割合文字を出す場合はその分だけ縦に伸びる
export function badgeHeight(spriteSize: number, hasPercent: boolean): number {
  return (
    spriteSize +
    BADGE_PAD * 2 +
    (hasPercent ? BADGE_PERCENT_GAP + BADGE_PERCENT_FONT_SIZE : 0)
  );
}

/*
 * バッジ count 個が「外周に重ならず並びきり」「描画領域からはみ出さない」最大の
 * スプライトサイズを返す。
 *
 * 円の外周に並べられるバッジの数は「バッジ中心が乗る円の周長 ÷ バッジ幅」で頭打ちになる。
 * 表示するデッキ数が増えて標準サイズのままでは並びきらない場合、スプライトを1pxずつ縮めて
 * 収まる最大サイズを探す（従来の表示件数=7件程度では標準サイズのまま変わらない）。
 *
 * reachX/reachY を渡すと、バッジが描画領域からはみ出さないことも条件に加える。
 * 画面の円グラフは左右の余白が固定値で円を小さくできないため、狭い端末では真横を向いた
 * バッジがキャンバスの縁で切れてしまう。そこでスプライトを縮めて収める。
 * （シェア画像は円の半径自体をバッジ込みで決めていて元から切れないため、指定しない）
 */
export function fitBadgeSpriteSize(options: {
  // 実際に描画するバッジの数（スプライトを持たない「その他」などは数えない）
  count: number;
  // 円グラフ本体の半径
  outerRadius: number;
  // 1バッジに並ぶスプライトの最大数（1 or 2）
  maxSpriteCount: number;
  // バッジ内に割合文字を出すか
  hasPercent: boolean;
  // 円の中心から描画領域の左右端・上下端までの距離
  reachX?: number;
  reachY?: number;
}): number {
  const { count, outerRadius, maxSpriteCount, hasPercent, reachX, reachY } = options;
  if (maxSpriteCount <= 0 || outerRadius <= 0) return BADGE_SPRITE_SIZE;

  for (let size = BADGE_SPRITE_SIZE; size > BADGE_SPRITE_SIZE_MIN; size--) {
    const width = badgeWidth(size, maxSpriteCount);
    const height = badgeHeight(size, hasPercent);
    // バッジ中心が乗る円の半径
    const radius = outerRadius + BADGE_GAP + height / 2;

    // 外周に重ならず並びきるか（1件だけなら並びの制約はない）
    if (
      count > 1 &&
      count * (width + BADGE_OUTSIDE_MARGIN) > 2 * Math.PI * radius
    ) {
      continue;
    }
    // 描画領域に収まるか。真横を向いたバッジは横幅の半分、真上・真下を向いたバッジは
    // 高さの半分だけ、バッジ中心の円からさらに外へ張り出す。
    if (reachX != null && radius + width / 2 > reachX) continue;
    if (reachY != null && radius + height / 2 > reachY) continue;

    return size;
  }

  return BADGE_SPRITE_SIZE_MIN;
}

// 衝突解消に必要な、バッジ1個分の配置情報。
// angle(現在の角度)だけを書き換え、他は読み取り専用に扱う。
export type BadgeAngleItem = {
  // 円の中心から見た配置角度(ラジアン)
  angle: number;
  // 自分のスライスの中心角。ここからどれだけ離れてよいかの基準にする
  originalAngle: number;
  // バッジ中心が乗る円の半径
  radius: number;
  // 衝突判定に使う、このバッジのおおよその半径（横幅ベース）
  boundRadius: number;
  // バッジの高さ。元の位置から離してよい距離の基準に使う
  height: number;
};

// 隣り合う2つのバッジが重ならないために必要な角度の間隔（弧長 = 角度 × 半径 の換算）
function requiredGap(prev: BadgeAngleItem, cur: BadgeAngleItem): number {
  const avgRadius = (prev.radius + cur.radius) / 2;
  return (prev.boundRadius + cur.boundRadius + BADGE_OUTSIDE_MARGIN) / avgRadius;
}

/*
 * バッジ同士が重ならないよう、角度が近いものを引き離す。
 *
 * 1周目は、自分のスライスから離れすぎないよう上限(BADGE_MAX_DRIFT_FACTOR)を設けて押し出す。
 * それで解消しきれた場合は従来どおりここで終わる。
 *
 * 上限に阻まれて重なりが残る場合だけ、2周目で上限を外して押し出す。
 * 「その他」が大きいときのように、狭い角度範囲にスライスが集中していると、上限内では
 * どうしてもバッジ同士が潰れ合ってしまう。円周全体に並べる余地があるなら、空いている
 * 外周（大きなスライスの外側など）まで離した方が、重なって潰れるより読みやすい。
 * 時計回りの並び順はスライスの順序と一致したままで、どのスライスのバッジかは縁の色で辿れる。
 */
export function resolveBadgeCollisions(items: BadgeAngleItem[]): void {
  if (items.length < 2) return;

  items.sort((a, b) => a.angle - b.angle);

  let overlapped = false;
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const cur = items[i];
    const minGap = requiredGap(prev, cur);
    if (cur.angle - prev.angle >= minGap) continue;

    const maxAngle =
      cur.originalAngle + (cur.height * BADGE_MAX_DRIFT_FACTOR) / cur.radius;
    cur.angle = Math.min(prev.angle + minGap, maxAngle);
    if (cur.angle - prev.angle < minGap) overlapped = true;
  }
  if (!overlapped) return;

  // 全バッジを重ならず並べるのに必要な角度の合計（末尾と先頭の間隔も含む）。
  // 1周分に収まらないなら、どう並べても重なるので押し出さずに諦める。
  const needed = items.reduce(
    (sum, item, i) =>
      sum + requiredGap(items[(i + items.length - 1) % items.length], item),
    0,
  );
  if (needed > Math.PI * 2) return;

  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const cur = items[i];
    cur.angle = Math.max(cur.angle, prev.angle + requiredGap(prev, cur));
  }
}
