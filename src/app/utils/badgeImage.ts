const BADGE_ACHIEVEMENT_BASE = "https://xx8nnpgt.user.webaccel.jp/images/badges";

// 画像を差し替えた際はこの値をインクリメントする。
// URLにクエリパラメータとして付与することで、ブラウザ側の古いキャッシュ画像が
// 参照され続けるのを防ぎ、更新後の画像を確実に取得させる(キャッシュバスティング)。
const BADGE_IMAGE_VERSION = 1;

// 対戦環境バッジの実績画像URLを返す。
export function environmentBadgeImageUrl(environmentId: string): string {
  return `${BADGE_ACHIEVEMENT_BASE}/achievement_${environmentId}.png?v=${BADGE_IMAGE_VERSION}`;
}
