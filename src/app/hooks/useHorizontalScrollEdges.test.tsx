// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { useHorizontalScrollEdges } from "@app/hooks/useHorizontalScrollEdges";

afterEach(cleanup);

// jsdom は描画しないので、横幅とスクロール位置は要素に直接与える
function setBox(el: HTMLElement, box: { clientWidth: number; scrollWidth: number; scrollLeft: number }) {
  Object.defineProperty(el, "clientWidth", { configurable: true, value: box.clientWidth });
  Object.defineProperty(el, "scrollWidth", { configurable: true, value: box.scrollWidth });
  Object.defineProperty(el, "scrollLeft", { configurable: true, writable: true, value: box.scrollLeft });
}

let initialBox = { clientWidth: 300, scrollWidth: 300, scrollLeft: 0 };

function Harness() {
  const ref = useRef<HTMLDivElement>(null);
  const { left, right } = useHorizontalScrollEdges(ref);

  return (
    <div
      ref={(el) => {
        // 描画前(useLayoutEffect)の最初の計測より先に寸法を入れておく
        if (el) setBox(el, initialBox);
        ref.current = el;
      }}
      data-testid="scroller"
    >
      <span data-testid="edges">{`${left ? "L" : "-"}${right ? "R" : "-"}`}</span>
    </div>
  );
}

const edges = () => screen.getByTestId("edges").textContent;

const scrollTo = (scrollLeft: number) => {
  const el = screen.getByTestId("scroller");
  el.scrollLeft = scrollLeft;
  act(() => {
    el.dispatchEvent(new Event("scroll"));
  });
};

describe("useHorizontalScrollEdges", () => {
  it("溢れていなければ左右とも隠れていない", () => {
    initialBox = { clientWidth: 300, scrollWidth: 300, scrollLeft: 0 };
    render(<Harness />);

    expect(edges()).toBe("--");
  });

  it("溢れて左端にいるときは右だけ、スクロールすると左右、右端では左だけが隠れている", () => {
    initialBox = { clientWidth: 300, scrollWidth: 500, scrollLeft: 0 };
    render(<Harness />);

    // 開いた時点で右に続きがある(描画前に測っている)
    expect(edges()).toBe("-R");

    scrollTo(100);
    expect(edges()).toBe("LR");

    scrollTo(200);
    expect(edges()).toBe("L-");
  });

  // 拡大表示などで scrollLeft が小数になり、端に届き切らないことがある
  it("端の 1px 以内は届いたとみなす", () => {
    initialBox = { clientWidth: 300, scrollWidth: 500, scrollLeft: 0.6 };
    render(<Harness />);

    expect(edges()).toBe("-R");

    scrollTo(199.4);
    expect(edges()).toBe("L-");
  });
});
