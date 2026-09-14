// @vitest-environment jsdom
import { StrictMode, Suspense } from "react";
import { cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  createRenderIdTracker,
  useIsFreshServerRender,
} from "@app/utils/serverRenderFreshness";

describe("createRenderIdTracker", () => {
  it("まだ使われていない id は新しい、使ったあとは使い回しとみなす", () => {
    const tracker = createRenderIdTracker();

    expect(tracker.isUnused("r1")).toBe(true);

    tracker.markUsed("r1");
    expect(tracker.isUnused("r1")).toBe(false);
  });

  it("判定は記録を変えないので、何度聞かれても答えが変わらない", () => {
    // 描画が捨てられて作り直されると初期化子が再実行される。
    // 判定の側で数えていると、そのたびに答えが反転してしまう
    const tracker = createRenderIdTracker();

    expect(tracker.isUnused("r1")).toBe(true);
    expect(tracker.isUnused("r1")).toBe(true);
    expect(tracker.isUnused("r1")).toBe(true);
  });

  it("id ごとに独立して判定する", () => {
    const tracker = createRenderIdTracker();

    tracker.markUsed("r1");

    expect(tracker.isUnused("r1")).toBe(false);
    expect(tracker.isUnused("r2")).toBe(true);
  });

  it("使ったと記録するのは一度でよく、繰り返しても結果は変わらない", () => {
    const tracker = createRenderIdTracker();

    tracker.markUsed("r1");
    tracker.markUsed("r1");

    expect(tracker.isUnused("r1")).toBe(false);
  });

  it("id が無いときは新しいと言い切らない(取り直す側へ倒す)", () => {
    const tracker = createRenderIdTracker();

    expect(tracker.isUnused(undefined)).toBe(false);
    expect(tracker.isUnused("")).toBe(false);
    // 記録側も id 無しは受け付けない
    tracker.markUsed(undefined);
    tracker.markUsed("");
  });

  it("覚える数に上限があり、超えたら古いものから落とす", () => {
    const tracker = createRenderIdTracker(2);

    tracker.markUsed("r1");
    tracker.markUsed("r2");
    tracker.markUsed("r3");

    // r1 は落ちているので「まだ使われていない」に戻る。直近の r2・r3 は覚えている
    expect(tracker.isUnused("r1")).toBe(true);
    expect(tracker.isUnused("r2")).toBe(false);
    expect(tracker.isUnused("r3")).toBe(false);
  });
});

/*
 * 一度サスペンドして作り直される部品。React は中断した描画を捨てるので、
 * 作り直しのときに useState の初期化子がもう一度走る(今度の結果が採用される)。
 */
function createSuspender() {
  let resolve: (() => void) | null = null;
  let done = false;
  const promise = new Promise<void>((r) => {
    resolve = () => {
      done = true;
      r();
    };
  });

  function Suspender() {
    if (!done) throw promise;
    return null;
  }

  return { Suspender, resume: () => resolve?.() };
}

describe("useIsFreshServerRender", () => {
  // vitest の globals を使っていないので、testing-library の自動 cleanup は入らない。
  // 明示的に片付けないと前のテストの DOM と effect が残る
  afterEach(cleanup);

  it("この文書で初めて使う id なら新しいと判定する", () => {
    const { result } = renderHook(() => useIsFreshServerRender("hook-first"));

    expect(result.current).toBe(true);
  });

  it("確定した画面と同じ id で作り直されたら使い回しと判定する", () => {
    const first = renderHook(() => useIsFreshServerRender("hook-remount"));
    expect(first.result.current).toBe(true);
    first.unmount();

    const second = renderHook(() => useIsFreshServerRender("hook-remount"));
    expect(second.result.current).toBe(false);
  });

  it("id が無いときは取り直す側へ倒す", () => {
    const { result } = renderHook(() => useIsFreshServerRender(undefined));

    expect(result.current).toBe(false);
  });

  it("StrictMode で初期化子が二度呼ばれても判定は変わらない", () => {
    // StrictMode の二重呼び出しでは React が一度目の結果を採るため、
    // これだけでは描画の作り直し(下のテスト)は再現できない。両方を残しておく
    const { result } = renderHook(() => useIsFreshServerRender("hook-strict"), {
      wrapper: StrictMode,
    });

    expect(result.current).toBe(true);
  });

  it("中断して作り直されても、同じマウントなら判定は変わらない", async () => {
    const { Suspender, resume } = createSuspender();

    function Probe() {
      const isFresh = useIsFreshServerRender("hook-suspense");
      return (
        <>
          <span data-testid="fresh">{String(isFresh)}</span>
          <Suspender />
        </>
      );
    }

    render(
      <Suspense fallback={null}>
        <Probe />
      </Suspense>,
    );
    resume();

    /*
     * 作り直しで「二度目だから使い回し」と判定してしまうと false になる。
     * サーバ描画は常に true を返すので、それはハイドレーションの不一致になる
     * (デッキ一覧の「更に読み込む」で実際に出ていた)。
     */
    await waitFor(() => expect(screen.getByTestId("fresh").textContent).toBe("true"));
  });

  it("同じ描画に別の id の判定が並んでも互いに影響しない", async () => {
    const { Suspender, resume } = createSuspender();

    function Probe({ id }: { id: string }) {
      const isFresh = useIsFreshServerRender(id);
      return <span data-testid={id}>{String(isFresh)}</span>;
    }

    render(
      <Suspense fallback={null}>
        <>
          <Probe id="hook-pair-a" />
          <Probe id="hook-pair-b" />
          <Suspender />
        </>
      </Suspense>,
    );
    resume();

    await waitFor(() => {
      expect(screen.getByTestId("hook-pair-a").textContent).toBe("true");
      expect(screen.getByTestId("hook-pair-b").textContent).toBe("true");
    });
  });

  it("確定しなかった画面は記録を進めない(次に開いたときは初めて扱い)", () => {
    const tracker = createRenderIdTracker();

    // 描画中の判定だけが走り、コミットに至らなかった状態
    expect(tracker.isUnused("r1")).toBe(true);

    // 次に開いたときも「初めて」。確定していない画面は見えていないので取り直す必要がない
    expect(tracker.isUnused("r1")).toBe(true);
  });
});
