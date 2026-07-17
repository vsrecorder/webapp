/*
 * 閉じるアニメーション(0.3秒)の間、全画面を覆う wrapper と backdrop が DOM に残り続けるため、
 * その間のタップが背後のカードやボタンに届かず「閉じた直後に開けない」状態になる。
 * 閉じ始めた時点でクリックを透過させることで、アニメーションを保ったまま
 * 即座に開き直せるようにする。
 *
 * HeroUI の Modal の classNames に展開して使う。
 *
 *   classNames={{ base: "...", ...closingPassthroughClassNames(isOpen) }}
 */
export function closingPassthroughClassNames(isOpen: boolean) {
  return {
    wrapper: isOpen ? "" : "pointer-events-none",
    backdrop: isOpen ? "" : "pointer-events-none",
  };
}
