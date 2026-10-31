/*
 * 閉じ始めた吹き出し・メニューの暗幕(backdrop)を、触れない(pointer-events:none)ようにする。
 *
 * HeroUI の Dropdown/Popover に backdrop="opaque" を付けると、全面の暗幕(fixed inset-0)が
 * 開いている間トリガーも覆う。閉じるとき、暗幕はフェードアウト(0.3 秒)のあいだ DOM に残り、
 * その間に同じトリガーをもう一度タップしても暗幕に吸われてトリガーへ届かない
 * (= 閉じた直後の約 0.3 秒は開き直せない「死に窓」)。
 *
 * 閉じ始めた時点(onOpenChange(false))で暗幕を pointer-events:none にすれば、フェードは
 * そのままに、下のトリガーへタップが届く。暗幕のタップで閉じる役目は、閉じ始めた後には要らない。
 * 開き直すと新しい暗幕の要素が作られるので、戻す処理は要らない。
 *
 * 暗幕の要素は、閉じ始めた側が classNames.backdrop で付けた目印のクラスで探す。
 * 他の吹き出しの暗幕(同時に開いていることは無いが)を巻き込まないため。
 */
export function releaseClosingBackdrop(markerClass: string, root: ParentNode = document): number {
  const backdrops = root.querySelectorAll<HTMLElement>(`.${markerClass}`);
  for (const el of backdrops) {
    el.style.pointerEvents = "none";
  }
  return backdrops.length;
}

// アプリ内のメニュー・吹き出し(AppDropdown / AppPopover)の暗幕に付ける目印
export const OVERLAY_BACKDROP_MARK = "app-overlay-backdrop";

type OverlayBackdrop = "transparent" | "opaque" | "blur";

/*
 * メニュー・吹き出しの暗幕の決め方(AppDropdown / AppPopover が使う)。
 *
 * HeroUI の既定(transparent)は全面の層を出さない。すると外側のタップは「閉じる」と同時に
 * 下の要素にも届く(デッキ詳細で「その他」を開いたまま隣の「編集」を押すと、メニューが閉じると
 * 同時に編集モーダルが開いた。実測)。モバイルの標準(iOS の UIMenu、Android の PopupMenu)は
 * 外側のタップで閉じるだけなので、指定が無ければ透明な層を出してタップを吸う
 * (opaque の層を出し、地色だけ透明にする。見た目は変わらない)。
 *
 * 暗幕を見せたいもの(ユーザーメニュー・通知のような大きなメニュー)は opaque / blur を明示する。
 * transparent を明示したときだけ層を出さない(外側のタップが下に届く)。
 *
 * 返すクラスには目印(OVERLAY_BACKDROP_MARK)を含める。閉じ始めた層を触れなくする
 * (releaseClosingBackdrop)ために使う。
 */
export function resolveOverlayBackdrop(
  backdrop: OverlayBackdrop | undefined,
  backdropClassName?: string,
): { backdrop: OverlayBackdrop; backdropClassName: string } {
  const classes = [OVERLAY_BACKDROP_MARK];
  if (backdrop === undefined) classes.push("bg-transparent");
  if (backdropClassName) classes.push(backdropClassName);
  return { backdrop: backdrop ?? "opaque", backdropClassName: classes.join(" ") };
}
