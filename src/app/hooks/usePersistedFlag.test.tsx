// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { usePersistedFlag } from "@app/hooks/usePersistedFlag";

const storage = {
  storageKey: "test_flag",
  cookieName: "testFlag",
  cookieMaxAge: 60,
  defaultValue: true,
};

function Probe({ initial }: { initial?: boolean }) {
  const [value, toggle] = usePersistedFlag(storage, initial);

  return (
    <button onClick={toggle} data-testid="flag">
      {value ? "on" : "off"}
    </button>
  );
}

describe("usePersistedFlag", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = `${storage.cookieName}=; Max-Age=0; Path=/`;
  });
  afterEach(cleanup);

  it("未保存かつサーバからの値も無ければ既定になる", () => {
    render(<Probe />);
    expect(screen.getByTestId("flag").textContent).toBe("on");
  });

  /*
   * localStorage を読めない最初の描画で既定に倒すと、設定を変えている端末では
   * 「一瞬だけ既定の見た目が出てから切り替わる」点滅になる。
   * サーバが cookie から読んだ値を受け取り、その一瞬から正しい側で描く。
   */
  it("保存済みの値を読めない間はサーバから渡された値を使う", () => {
    render(<Probe initial={false} />);
    expect(screen.getByTestId("flag").textContent).toBe("off");
  });

  it("保存済みの値が読めればそちらが優先される", () => {
    localStorage.setItem(storage.storageKey, "true");

    render(<Probe initial={false} />);
    expect(screen.getByTestId("flag").textContent).toBe("on");
  });

  it("cookie が壊れていても既定に倒れる", () => {
    localStorage.setItem(storage.storageKey, "1");

    render(<Probe initial={false} />);
    expect(screen.getByTestId("flag").textContent).toBe("on");
  });

  /*
   * この仕組みより前から設定している端末は localStorage だけを持ち cookie が無い。
   * 補わないと「既に設定を変えている人」= 点滅が見える人だけ直らないままになる。
   */
  it("保存済みなのに cookie が無ければ、読み込んだ時点で補う", () => {
    localStorage.setItem(storage.storageKey, "false");

    render(<Probe />);

    expect(document.cookie).toContain(`${storage.cookieName}=false`);
  });

  // cookie を書き忘れると次の読み込みでまた点滅が戻るので、両方に書けているかを見る
  it("切り替えると localStorage と cookie の両方を更新する", () => {
    render(<Probe />);

    act(() => {
      fireEvent.click(screen.getByTestId("flag"));
    });

    expect(screen.getByTestId("flag").textContent).toBe("off");
    expect(localStorage.getItem(storage.storageKey)).toBe("false");
    expect(document.cookie).toContain(`${storage.cookieName}=false`);
  });
});
