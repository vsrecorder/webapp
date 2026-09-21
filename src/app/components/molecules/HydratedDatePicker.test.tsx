// @vitest-environment jsdom
import { renderToString } from "react-dom/server";

import { cleanup, render, screen } from "@testing-library/react";
import { today } from "@internationalized/date";
import { afterEach, describe, expect, it } from "vitest";

import HydratedDatePicker from "@app/components/molecules/HydratedDatePicker";

afterEach(cleanup);

/*
 * react-aria の DateSegment は iOS でだけ role="textbox"、他では role="spinbutton" になる。
 * サーバがセグメントを描くと iOS では必ずハイドレーションが食い違うため、
 * サーバ側では実体を描かないことを固定する。
 */
describe("HydratedDatePicker", () => {
  const value = today("Asia/Tokyo");

  it("サーバ描画では日付セグメントを出さない", () => {
    const html = renderToString(
      <HydratedDatePicker aria-label="開催日" size="sm" value={value} />,
    );

    expect(html).not.toContain("spinbutton");
    expect(html).not.toContain("textbox");
  });

  it("サーバ描画でも実体と同じ高さの箱を置く(レイアウトを動かさない)", () => {
    const html = renderToString(
      <HydratedDatePicker aria-label="開催日" size="sm" value={value} />,
    );

    // 骨格(EventDateSkeleton)と同じ h-8
    expect(html).toContain("h-8");
  });

  it("ハイドレーション後は DatePicker の実体を描く", () => {
    render(<HydratedDatePicker aria-label="開催日" size="sm" value={value} />);

    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
  });
});
