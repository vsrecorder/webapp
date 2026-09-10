// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSyncOnChange } from "@app/hooks/useSyncOnChange";

afterEach(cleanup);

// isOpen と value を受け取り、開いている間だけ value を入力欄へ入れ直す。
// 実際のモーダル(UpdateDeckModal など)と同じ形にしてある。
function Form({
  isOpen,
  value,
  onSync,
}: {
  isOpen: boolean;
  value: string | null;
  onSync?: () => void;
}) {
  const [text, setText] = useState("");

  useSyncOnChange({ isOpen, value }, () => {
    onSync?.();
    if (isOpen && value !== null) setText(value);
  });

  return <output data-testid="text">{text}</output>;
}

const text = () => screen.getByTestId("text").textContent;

describe("useSyncOnChange", () => {
  // 「開いた状態でマウント」は createLazyModal 経由のモーダルで実際に起きる。
  // マウント時の source を初期値にする実装だと、ここで同期が走らない
  it("開いた状態でマウントされても初回に同期する", () => {
    render(<Form isOpen value="あいう" />);

    expect(text()).toBe("あいう");
  });

  it("閉じた状態でマウントしてから開いても同期する", () => {
    const { rerender } = render(<Form isOpen={false} value="あいう" />);
    expect(text()).toBe("");

    rerender(<Form isOpen value="あいう" />);

    expect(text()).toBe("あいう");
  });

  it("値が差し替わったら同期し直す", () => {
    const { rerender } = render(<Form isOpen value="あいう" />);

    rerender(<Form isOpen value="かきく" />);

    expect(text()).toBe("かきく");
  });

  it("source が変わらない再描画では同期しない", () => {
    const onSync = vi.fn();
    const { rerender } = render(<Form isOpen value="あいう" onSync={onSync} />);
    expect(onSync).toHaveBeenCalledTimes(1);

    rerender(<Form isOpen value="あいう" onSync={onSync} />);

    expect(onSync).toHaveBeenCalledTimes(1);
  });

  // 描画中に同期するので、同期前の値が画面に出ることは一度も無い
  it("同期前の値では描画されない", () => {
    const seen: string[] = [];

    function Observer({ value }: { value: string }) {
      const [inner, setInner] = useState("");
      useSyncOnChange({ value }, () => setInner(value));
      seen.push(inner);
      return null;
    }

    const { rerender } = render(<Observer value="あいう" />);
    rerender(<Observer value="かきく" />);

    // 描画そのものは同期の前後で2回走るが、コミットされる(画面に出る)のは同期後だけ。
    // 直前の値("" や "あいう")のまま描画が確定していないことを、最後の値で確かめる
    expect(seen[seen.length - 1]).toBe("かきく");
  });
});
