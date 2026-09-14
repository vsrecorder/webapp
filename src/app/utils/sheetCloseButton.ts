/*
 * ボトムシート(placement="bottom" のモーダル)に閉じるボタン(×)を出すかの判定。
 *
 * シートはスマホ向けに「ヘッダーを下へスワイプして閉じる」を主な閉じ方にしており、
 * 多くは hideCloseButton で × を隠し、isDismissable={false} で外側タップでも閉じない。
 * これをマウスで操作すると閉じる手段が Esc とブラウザバックしか無く、記録情報や
 * 活動ログのシートが「閉じられない」状態になっていた。
 *
 * マウス主体の端末(pointer: fine)では、hideCloseButton の指定に関わらず × を出す。
 * ただし isKeyboardDismissDisabled(保存中などで閉じさせない)の間は、Esc と同様に閉じ手段を出さない。
 * 中央のダイアログ(placement が bottom 以外)は呼び出し側の指定をそのまま使う。
 */
export const FINE_POINTER_QUERY = "(pointer: fine)";

export function resolveSheetHideCloseButton({
  placement,
  hideCloseButton,
  isKeyboardDismissDisabled,
  isFinePointer,
}: {
  placement: string | undefined;
  hideCloseButton: boolean | undefined;
  isKeyboardDismissDisabled: boolean | undefined;
  isFinePointer: boolean;
}): boolean | undefined {
  if (placement !== "bottom") return hideCloseButton;
  if (!isFinePointer) return hideCloseButton;
  if (isKeyboardDismissDisabled) return hideCloseButton;
  return false;
}
