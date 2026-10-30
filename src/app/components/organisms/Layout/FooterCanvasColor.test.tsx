// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FooterCanvasColor, {
  FOOTER_IN_VIEW_ATTR,
} from "@app/components/organisms/Layout/FooterCanvasColor";

// jsdom には IntersectionObserver が無いので、呼び出しを手で流せる偽物を置く
let notify: ((isIntersecting: boolean) => void) | null = null;
let observed: Element | null = null;

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        notify = (isIntersecting) =>
          callback(
            [{ isIntersecting } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
      }
      observe(el: Element) {
        observed = el;
      }
      disconnect() {
        notify = null;
      }
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute(FOOTER_IN_VIEW_ATTR);
  notify = null;
  observed = null;
});

describe("FooterCanvasColor", () => {
  it("包んでいるフッターを見張り、見えているあいだだけ html に目印を付ける", () => {
    const { container } = render(
      <footer>
        <FooterCanvasColor />
      </footer>,
    );

    expect(observed).toBe(container.querySelector("footer"));
    expect(document.documentElement.hasAttribute(FOOTER_IN_VIEW_ATTR)).toBe(false);

    act(() => notify?.(true));
    expect(document.documentElement.getAttribute(FOOTER_IN_VIEW_ATTR)).toBe("true");

    act(() => notify?.(false));
    expect(document.documentElement.hasAttribute(FOOTER_IN_VIEW_ATTR)).toBe(false);
  });

  it("フッターが外れたら(別のページへ移ったら)目印を外す", () => {
    const { unmount } = render(
      <footer>
        <FooterCanvasColor />
      </footer>,
    );

    act(() => notify?.(true));
    unmount();

    expect(document.documentElement.hasAttribute(FOOTER_IN_VIEW_ATTR)).toBe(false);
  });

  it("フッターの外に置かれたら何もしない", () => {
    render(<FooterCanvasColor />);

    expect(observed).toBeNull();
  });
});
