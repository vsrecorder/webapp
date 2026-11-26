// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OutsideTapShield, {
  CLICK_GRACE_MS,
  HOLD_LIMIT_MS,
} from "@app/components/atoms/OutsideTapShield";

const shield = () => document.querySelector<HTMLElement>('[data-slot="outside-tap-shield"]');

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/*
 * 外側のタップを受け止める層。
 *
 * 肝は「閉じるきっかけになったタップが終わるまで層を残す」こと。閉じると同時に層を消すと、
 * 指を離すのが遅いタップの click が下の要素に当たる(2026-11-27 に実機で、カレンダーの外の
 * タブが切り替わった)。click の当たり先そのものは jsdom では再現できないので、
 * 層がいつまで残るかで固定する。
 */
describe("OutsideTapShield", () => {
  it("閉じている間は層を置かない", () => {
    render(<OutsideTapShield isOpen={false} onDismiss={() => {}} />);

    expect(shield()).toBeNull();
  });

  it("開いている間は、画面全体を覆う層を body の直下に置く", () => {
    render(<OutsideTapShield isOpen onDismiss={() => {}} />);

    const el = shield();
    expect(el).not.toBeNull();
    expect(el?.parentElement).toBe(document.body);
    expect(el?.className).toContain("fixed");
    expect(el?.className).toContain("inset-0");
    // 読み上げの対象にしない
    expect(el?.getAttribute("aria-hidden")).toBe("true");
    // react-aria の「モーダルの外側」判定から外す。付けないと、モーダルの中でカレンダーの外を
    // タップしたときにモーダルまで閉じる
    expect(el?.getAttribute("data-react-aria-top-layer")).toBe("true");
  });

  it("層に触れたら onDismiss を呼ぶ", () => {
    const onDismiss = vi.fn();
    render(<OutsideTapShield isOpen onDismiss={onDismiss} />);

    fireEvent.pointerDown(shield()!);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("閉じても、そのタップの click が来るまでは層を残す", () => {
    const { rerender } = render(<OutsideTapShield isOpen onDismiss={() => {}} />);

    fireEvent.pointerDown(shield()!);
    rerender(<OutsideTapShield isOpen={false} onDismiss={() => {}} />);

    // 指を離すのが遅くても(HeroUI が外側のタップを止めていられる約 170ms を過ぎても)残っている
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(shield()).not.toBeNull();

    fireEvent.pointerUp(shield()!);
    expect(shield()).not.toBeNull();

    fireEvent.click(shield()!);
    expect(shield()).toBeNull();
  });

  it("click が来ないときは、指が離れてしばらくしたら層を消す", () => {
    const { rerender } = render(<OutsideTapShield isOpen onDismiss={() => {}} />);

    fireEvent.pointerDown(shield()!);
    rerender(<OutsideTapShield isOpen={false} onDismiss={() => {}} />);
    fireEvent.pointerUp(shield()!);

    act(() => {
      vi.advanceTimersByTime(CLICK_GRACE_MS - 1);
    });
    expect(shield()).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(shield()).toBeNull();
  });

  it("スクロールなどに切り替わったら(pointercancel)、すぐに層を消す", () => {
    const { rerender } = render(<OutsideTapShield isOpen onDismiss={() => {}} />);

    fireEvent.pointerDown(shield()!);
    rerender(<OutsideTapShield isOpen={false} onDismiss={() => {}} />);
    fireEvent.pointerCancel(shield()!);

    expect(shield()).toBeNull();
  });

  it("触れたまま何も起きなくても、上限の時間で層を消す", () => {
    const { rerender } = render(<OutsideTapShield isOpen onDismiss={() => {}} />);

    fireEvent.pointerDown(shield()!);
    rerender(<OutsideTapShield isOpen={false} onDismiss={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(HOLD_LIMIT_MS - 1);
    });
    expect(shield()).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(shield()).toBeNull();
  });

  it("層に触れずに閉じたとき(日付を選んだ・Esc)は、すぐに層を消す", () => {
    const { rerender } = render(<OutsideTapShield isOpen onDismiss={() => {}} />);

    rerender(<OutsideTapShield isOpen={false} onDismiss={() => {}} />);

    expect(shield()).toBeNull();
  });

  it("層へのタップは、呼び出し元の親には伝わらない", () => {
    const onParentClick = vi.fn();
    const onParentPointerDown = vi.fn();
    render(
      <div onClick={onParentClick} onPointerDown={onParentPointerDown}>
        <OutsideTapShield isOpen onDismiss={() => {}} />
      </div>,
    );

    const el = shield()!;
    fireEvent.pointerDown(el);
    fireEvent.pointerUp(el);
    fireEvent.click(el);

    expect(onParentPointerDown).not.toHaveBeenCalled();
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
