import { describe, expect, it } from "vitest";

import { resolveSheetHideCloseButton } from "@app/utils/sheetCloseButton";

describe("resolveSheetHideCloseButton", () => {
  it("マウス主体の端末ではボトムシートの × を隠さない", () => {
    expect(
      resolveSheetHideCloseButton({
        placement: "bottom",
        hideCloseButton: true,
        isKeyboardDismissDisabled: undefined,
        isFinePointer: true,
      }),
    ).toBe(false);
  });

  it("タッチ主体の端末では呼び出し側の指定をそのまま使う", () => {
    expect(
      resolveSheetHideCloseButton({
        placement: "bottom",
        hideCloseButton: true,
        isKeyboardDismissDisabled: undefined,
        isFinePointer: false,
      }),
    ).toBe(true);
  });

  it("Esc で閉じさせない間(処理中)は × も出さない", () => {
    expect(
      resolveSheetHideCloseButton({
        placement: "bottom",
        hideCloseButton: true,
        isKeyboardDismissDisabled: true,
        isFinePointer: true,
      }),
    ).toBe(true);
  });

  it("中央のダイアログは端末に関わらず呼び出し側の指定をそのまま使う", () => {
    expect(
      resolveSheetHideCloseButton({
        placement: "center",
        hideCloseButton: true,
        isKeyboardDismissDisabled: undefined,
        isFinePointer: true,
      }),
    ).toBe(true);
    expect(
      resolveSheetHideCloseButton({
        placement: undefined,
        hideCloseButton: undefined,
        isKeyboardDismissDisabled: undefined,
        isFinePointer: true,
      }),
    ).toBeUndefined();
  });

  it("もともと × を出しているシートはそのまま出す", () => {
    expect(
      resolveSheetHideCloseButton({
        placement: "bottom",
        hideCloseButton: undefined,
        isKeyboardDismissDisabled: undefined,
        isFinePointer: false,
      }),
    ).toBeUndefined();
  });
});
