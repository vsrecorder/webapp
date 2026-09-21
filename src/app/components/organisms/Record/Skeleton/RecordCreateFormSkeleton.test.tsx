// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it } from "vitest";

import RecordCreateFormSkeleton from "@app/components/organisms/Record/Skeleton/RecordCreateFormSkeleton";
import OfficialEventSelect from "@app/components/organisms/Record/OfficialEventSelect";

// jsdom は ResizeObserver を持たない。プレビューの文言を流す ScrollingText が使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

afterEach(cleanup);

// プレビューカード(HeroUI の Card は shadow-small を持つ)を包む要素を取る
function cardWrapper(container: HTMLElement): HTMLElement {
  const card = container.querySelector(".shadow-small");
  if (!card?.parentElement) throw new Error("プレビューカードが見つからない");
  return card.parentElement;
}

/*
 * 骨格(このファイル)と実体(OfficialEventSelect)で、選択欄とプレビューカードの
 * 間隔が食い違うと、読み込みが終わった瞬間にカードから下が縦に跳ねる。
 * どちらも「選択欄の親の gap-2」＋「カード側の pt-1」で 12px に揃えてある。
 */
describe("公式イベントの骨格と実体", () => {
  it("骨格は、選択欄のブロックを閉じてから pt-1 のカードを親(gap-2)の直下に置く", () => {
    const { container } = render(<RecordCreateFormSkeleton tab="official" />);

    const wrapper = cardWrapper(container);

    expect(wrapper.className).toContain("pt-1");
    // カードの親は、手順ラベルのブロックではなくフォーム全体(gap-2)
    expect(wrapper.parentElement?.className).toContain("gap-2");
  });

  it("実体も、選択欄とカードを gap-2 で並べ、カード側に pt-1 を置く", () => {
    const { container } = render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <OfficialEventSelect
          date="2026-09-21"
          selectedId={null}
          onChange={() => {}}
          enabled={false}
        />
      </SWRConfig>,
    );

    const wrapper = cardWrapper(container);

    expect(wrapper.className).toContain("pt-1");
    expect(wrapper.parentElement?.className).toContain("gap-2");
  });
});
