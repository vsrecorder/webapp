/*
 * ページ内のなめらかなスクロール。
 *
 * OS側で「視差効果を減らす」が有効なときはアニメーションさせない。
 * 移動先の要素には scroll-mt-* を付けておくこと（固定ヘッダーの下に潜らないよう、
 * scrollIntoView は scroll-margin-top を尊重する）。
 */
export function smoothScrollTo(target: Element | null) {
  if (!target) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  target.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start",
  });
}
