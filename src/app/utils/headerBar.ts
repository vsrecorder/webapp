/*
 * ヘッダー直下に貼り付く固定バー(記録一覧・記録作成のタブ、デッキの切り替えなど)の位置クラス。
 * 各画面で数値を書き写すと、ヘッダーの高さやサイドバーの有無が変わったときに画面ごとにずれるため、
 * ここに一本化する。
 *
 * 縦位置: ヘッダーは h-14(56px)、lg 以上は非対応バナーが乗って h-28(112px)になる
 * (organisms/Layout/Header.tsx)。バーは 4px の隙間を空けて貼り付く。
 *   〜lg: top-15(60px) / lg〜: top-29(116px)
 * 以前は top-15 だけだったため、デスクトップではバーがヘッダーの内側(60px)に重なり、
 * ロゴやユーザーメニューを隠していた。
 *
 * 横位置: ログイン時の lg 以上はサイドバー(w-56)が左に出るので、そのぶん右へ寄せて残りの幅いっぱいに
 * 広げる。サイドバーの幅は Layout が --sidebar-width に入れる(未ログイン・lg 未満は 0px)ため、
 * この変数を使えば画面ごとの条件分岐なしで揃う。
 * 「left ＋ right-0」では揃わない。HeroUI Tabs の fullWidth は base に w-full を付け、幅が明示されると
 * right は無視される(over-constrained)ので、1280px 幅ではバーがサイドバーぶん(224px)右へはみ出していた。
 * 幅を calc で明示して置き換える(w-full より後に並ぶので tailwind-merge でこちらが勝つ)。
 */
export const HEADER_BAR_TOP = "top-15 lg:top-29";
// 幅の var には 0px の既定値を付ける。万一この変数が無い文脈で使われても、幅が無効値(→ auto で
// 中身ぶんに縮む)にならず全幅に倒れるようにするため(left は既存のとおり変数のまま)
export const HEADER_BAR_X = "left-(--sidebar-width) w-[calc(100%-var(--sidebar-width,0px))]";
// ヘッダー直下に貼り付くバー(fixed)の位置ひとそろい。z-50 はヘッダーと同じ
export const HEADER_BAR = `fixed z-50 ${HEADER_BAR_TOP} ${HEADER_BAR_X}`;
