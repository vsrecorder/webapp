// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CityleagueDateShareButtons from "@app/components/molecules/CityleagueDateShareButtons";

const addToast = vi.fn();
vi.mock("@heroui/react", () => ({ addToast: (...args: unknown[]) => addToast(...args) }));

beforeEach(() => {
  vi.spyOn(window, "open").mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  addToast.mockClear();
});

const props = { dateParam: "2026-09-26", dateLabel: "2026年9月26日(土)" };

describe("CityleagueDateShareButtons", () => {
  it("X ボタンは、開いているオリジンのこのページの URL で投稿画面を開く", () => {
    render(<CityleagueDateShareButtons {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /X にポストする/ }));

    const [href, target] = (window.open as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const intent = new URL(href as string);
    expect(intent.origin + intent.pathname).toBe("https://x.com/intent/post");
    expect(intent.searchParams.get("text")).toContain("2026年9月26日(土)のシティリーグ入賞デッキ一覧");
    const url = new URL(intent.searchParams.get("url")!);
    expect(url.origin).toBe(window.location.origin);
    expect(url.pathname).toBe("/cityleague_results/dates/2026-09-26");
    expect(target).toBe("_blank");
  });

  it("リンクのコピーは utm の無い URL を書き込み、トーストで知らせる", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(<CityleagueDateShareButtons {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /リンクをコピーする/ }));

    await waitFor(() => expect(addToast).toHaveBeenCalled());
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/cityleague_results/dates/2026-09-26`,
    );
    expect(addToast.mock.calls[0][0]).toMatchObject({ title: "リンクをコピーしました" });
  });
});
