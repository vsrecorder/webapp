// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { useExcludeDefaultMatches } from "@app/hooks/useExcludeDefaultMatches";
import {
  EXCLUDE_DEFAULT_MATCHES_COOKIE,
  EXCLUDE_DEFAULT_MATCHES_KEY,
} from "@app/utils/excludeDefaultMatches";

function Probe({ initial }: { initial?: boolean }) {
  const [excluded, toggle] = useExcludeDefaultMatches(initial);

  return (
    <button onClick={toggle} data-testid="toggle">
      {excluded ? "除外" : "含める"}
    </button>
  );
}

describe("useExcludeDefaultMatches", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = `${EXCLUDE_DEFAULT_MATCHES_COOKIE}=; Max-Age=0; Path=/`;
  });
  afterEach(cleanup);

  it("未保存かつサーバからの値も無ければ既定(除外)になる", () => {
    render(<Probe />);
    expect(screen.getByTestId("toggle").textContent).toBe("除外");
  });

  /*
   * localStorage を読めない最初の描画で既定に倒すと、外している端末では
   * 「一瞬だけ有効に見えてから外れる」点滅になる。サーバが cookie から読んだ値を
   * 初期値として受け取り、その一瞬から正しい側で描く。
   */
  it("保存済みの値が読めない間はサーバから渡された値を使う", () => {
    render(<Probe initial={false} />);
    expect(screen.getByTestId("toggle").textContent).toBe("含める");
  });

  it("保存済みの値が読めればそちらが優先される", () => {
    localStorage.setItem(EXCLUDE_DEFAULT_MATCHES_KEY, "true");

    render(<Probe initial={false} />);
    expect(screen.getByTestId("toggle").textContent).toBe("除外");
  });

  // cookie を書き忘れると次の読み込みでまた点滅が戻るので、両方に書けているかを見る
  it("切り替えると localStorage と cookie の両方を更新する", () => {
    render(<Probe />);

    act(() => {
      fireEvent.click(screen.getByTestId("toggle"));
    });

    expect(screen.getByTestId("toggle").textContent).toBe("含める");
    expect(localStorage.getItem(EXCLUDE_DEFAULT_MATCHES_KEY)).toBe("false");
    expect(document.cookie).toContain(`${EXCLUDE_DEFAULT_MATCHES_COOKIE}=false`);
  });
});
