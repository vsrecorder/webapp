// @vitest-environment jsdom
import { useEffect } from "react";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PwaBanners from "@app/components/molecules/PWA/PwaBanners";

// 子バナーは HeroUI や GA に依存するので、出た/出ないだけ分かる印に置き換える
vi.mock("@app/components/molecules/PWA/AcquisitionSurveyPrompt", () => ({
  default: () => <div data-testid="survey" />,
}));
vi.mock("@app/components/molecules/PWA/AddToHomeScreenBanner", () => ({
  // 実体と同じく、出ていることを親へ知らせる(フック名の規約に合わせて関数名を付ける)
  default: function MockAddToHomeScreenBanner({
    onOpenChange,
  }: {
    onOpenChange?: (open: boolean) => void;
  }) {
    useEffect(() => onOpenChange?.(true), [onOpenChange]);
    return <div data-testid="install" />;
  },
}));
vi.mock("@app/components/molecules/PWA/PushPermissionPrompt", () => ({
  default: () => <div data-testid="push" />,
}));
vi.mock("@app/components/organisms/Layout/RecordingNowBar", () => ({
  default: () => <div data-testid="recording" />,
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated" }),
}));

// ホーム画面追加バナーが出る状態(installState !== "idle")に固定する
vi.mock("@app/hooks/useInstallPrompt", () => ({
  useInstallPrompt: () => ({
    installState: "android",
    install: () => {},
    dismiss: () => {},
    awaitingInstallEvent: false,
  }),
}));

const { discardRecordCreatedTrigger } = vi.hoisted(() => ({
  discardRecordCreatedTrigger: vi.fn(),
}));
vi.mock("@app/utils/pushPrompt", () => ({ discardRecordCreatedTrigger }));

// jsdom には matchMedia が無い。lg 以上かどうかだけ答えるものを置く
function stubViewport(isLgUp: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: isLgUp,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

describe("PwaBanners", () => {
  beforeEach(() => {
    discardRecordCreatedTrigger.mockClear();
  });

  // vitest の globals を使っていないので、testing-library の自動 cleanup は入らない。
  // 明示的に片付けないと前のテストの DOM が残る
  afterEach(cleanup);

  it("モバイル幅(lg 未満)ではバナーを出す", () => {
    stubViewport(false);
    render(<PwaBanners iconUrl="/icon-192x192.png" userId="user-1" />);

    expect(screen.getByTestId("survey")).toBeTruthy();
    expect(screen.getByTestId("install")).toBeTruthy();
    expect(screen.getByTestId("push")).toBeTruthy();
  });

  it("デスクトップ幅(lg 以上)では PWA / 通知の2枚を出さず、記録作成のトリガーを捨てる", () => {
    stubViewport(true);
    render(<PwaBanners iconUrl="/icon-192x192.png" userId="user-1" />);

    expect(screen.queryByTestId("install")).toBeNull();
    expect(screen.queryByTestId("push")).toBeNull();
    // 捨てないと、ウィンドウを縮めた瞬間に古い記録作成を根拠に soft ask が出てしまう
    expect(discardRecordCreatedTrigger).toHaveBeenCalled();
  });

  it("登録時アンケートはデスクトップ幅でも出す(PC 登録者の回答を落とさない)", () => {
    stubViewport(true);
    render(<PwaBanners iconUrl="/icon-192x192.png" userId="user-1" />);

    expect(screen.getByTestId("survey")).toBeTruthy();
  });

  /*
   * 画面下の帯は同時に1枚だけ。勧誘の3枚は条件が揃ったその時にしか出せないのに対し、
   * 記録中バーは記録が続くかぎり何度でも出せるので、最後に回す。
   */
  it("勧誘のバナーが出ているあいだは記録中バーを出さない", () => {
    stubViewport(false);

    render(<PwaBanners iconUrl="/icon.png" userId="u1" />);

    expect(screen.getByTestId("install")).toBeTruthy();
    expect(screen.queryByTestId("recording")).toBeNull();
  });
});
