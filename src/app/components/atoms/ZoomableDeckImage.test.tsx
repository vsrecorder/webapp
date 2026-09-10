// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ZoomableDeckImage from "@app/components/atoms/ZoomableDeckImage";

const CODE = "aaaaaa-bbbbbb-cccccc";

/*
 * デッキ画像の「四隅に白い弧が出る」不具合の再発防止。
 *
 * ブラウザは読み込みが決着した瞬間に画像を描くが、それを受けた React が骨格を外すのは
 * 次のコミット(実機で数百ms遅れることがある)なので、その間は骨格の下に画像が描かれている。
 * このとき骨格と画像がそれぞれ角丸を持つと、半径の差ぶん(と縁の二重アンチエイリアス)だけ
 * 骨格が覆いきれず、下の画像の白い角が四隅から覗く。
 *
 * 防ぎ方は2つで、どちらも崩さないようにここで縛る:
 *   ・角丸は枠だけが持つ(骨格・画像には付けない)
 *   ・読み終わるまで画像自体を伏せる(opacity-0)
 */
describe("ZoomableDeckImage", () => {
  function setup() {
    // 拡大表示(DeckImageZoomOverlay)も同じ alt の <img> を持つので、
    // 枠の中の1枚に絞って取る
    const { container } = render(<ZoomableDeckImage code={CODE} />);
    const image = container.querySelector("img") as HTMLImageElement;
    const frame = image.parentElement as HTMLElement;

    return { container, image, frame };
  }

  it("読み込み中は画像を伏せ、読み終わったら出す", () => {
    const { image } = setup();

    expect(image.className).toContain("opacity-0");

    fireEvent.load(image);

    expect(image.className).not.toContain("opacity-0");
  });

  it("角丸は枠だけが持ち、骨格・画像には付けない", () => {
    const { image, frame } = setup();

    // 枠でクリップする
    expect(frame.className).toContain("rounded-md");
    expect(frame.className).toContain("overflow-hidden");

    // 骨格(枠の中で画像の手前に重なる要素)と画像は角丸を持たない
    const skeleton = frame.firstElementChild as HTMLElement;
    expect(skeleton).not.toBe(image);
    expect(skeleton.className).not.toMatch(/(^|[\s:])rounded-/);
    expect(image.className).not.toMatch(/(^|[\s:])rounded-/);
  });

  it("読み終わると骨格が外れる", () => {
    const { image, frame } = setup();

    expect(frame.children.length).toBe(2);

    fireEvent.load(image);

    expect(frame.children.length).toBe(1);
    expect(frame.firstElementChild).toBe(image);
  });
});
