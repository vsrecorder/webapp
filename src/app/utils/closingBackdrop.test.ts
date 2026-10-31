// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  OVERLAY_BACKDROP_MARK,
  releaseClosingBackdrop,
  resolveOverlayBackdrop,
} from "@app/utils/closingBackdrop";

describe("releaseClosingBackdrop", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("目印のクラスを持つ暗幕だけを pointer-events:none にする", () => {
    const mine = document.createElement("div");
    mine.className = "fixed inset-0 user-menu-backdrop";
    const other = document.createElement("div");
    other.className = "fixed inset-0";
    document.body.append(mine, other);

    expect(releaseClosingBackdrop("user-menu-backdrop")).toBe(1);
    expect(mine.style.pointerEvents).toBe("none");
    expect(other.style.pointerEvents).toBe("");
  });

  it("暗幕が無ければ何もしない", () => {
    expect(releaseClosingBackdrop("user-menu-backdrop")).toBe(0);
  });
});

describe("resolveOverlayBackdrop", () => {
  it("指定が無ければ透明な層(opaque の地色を透明に)と目印を返す", () => {
    const r = resolveOverlayBackdrop(undefined);
    expect(r.backdrop).toBe("opaque");
    expect(r.backdropClassName.split(" ")).toEqual([OVERLAY_BACKDROP_MARK, "bg-transparent"]);
  });

  it("opaque / blur を明示したら暗幕はそのまま見せ、目印だけ足す", () => {
    expect(resolveOverlayBackdrop("opaque")).toEqual({
      backdrop: "opaque",
      backdropClassName: OVERLAY_BACKDROP_MARK,
    });
    expect(resolveOverlayBackdrop("blur").backdropClassName).toBe(OVERLAY_BACKDROP_MARK);
  });

  it("transparent を明示したら層を出さない", () => {
    const r = resolveOverlayBackdrop("transparent");
    expect(r.backdrop).toBe("transparent");
    expect(r.backdropClassName).not.toContain("bg-transparent");
  });

  it("呼び出し側のクラスは後ろに残す", () => {
    expect(resolveOverlayBackdrop(undefined, "z-60").backdropClassName).toBe(
      `${OVERLAY_BACKDROP_MARK} bg-transparent z-60`,
    );
  });
});
