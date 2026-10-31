// @vitest-environment jsdom
import { ModalBody, ModalContent } from "@heroui/react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Modal } from "@app/components/atoms/AppModal";

/*
 * 閉じるボタン(×)の大きさをモーダル間で揃える。
 * 以前はモーダルごとに既定(32px)・text-xl(36px)・text-2xl(40px)とばらばらだったので、
 * AppModal が一律に text-xl を付け、呼び出し側は大きさを指定しない。
 */
describe("Modal の閉じるボタン", () => {
  function renderModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
    render(
      <Modal isOpen {...props}>
        <ModalContent>
          <ModalBody>本文</ModalBody>
        </ModalContent>
      </Modal>,
    );
    return screen.getByRole("button", { name: "Close" });
  }

  it("中央のダイアログには既定の大きさが付く", () => {
    expect(renderModal({ placement: "center" }).className).toContain("text-xl");
  });

  it("下寄せシートでも同じ大きさになる", () => {
    expect(renderModal({ placement: "bottom" }).className).toContain("text-xl");
  });

  it("位置や色を上書きしても大きさは残る", () => {
    const button = renderModal({
      placement: "center",
      classNames: { closeButton: "-top-12 text-white" },
    });

    expect(button.className).toContain("text-xl");
    expect(button.className).toContain("text-white");
  });
});

/*
 * 中央ダイアログの wrapper の高さ。HeroUI 既定は visualViewport.height の実測値(h-(--visual-viewport-height))で、
 * モバイルのツールバーの出し入れに追従して中央位置が動き、ログインのポップアップから戻った瞬間にちらつく。
 * キーボードには追従しつつツールバーには追従しない min(100svh, …) に置き換える。
 * 下寄せのシートは下端に貼り付くため、実測値のまま。
 */
describe("Modal の wrapper の高さ", () => {
  // モーダルは body 直下のポータルに出るので、前のテストのものが残らないよう毎回片付ける
  afterEach(cleanup);

  function renderWrapper(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
    render(
      <Modal isOpen {...props}>
        <ModalContent>
          <ModalBody>本文</ModalBody>
        </ModalContent>
      </Modal>,
    );
    const wrappers = document.querySelectorAll('[data-slot="wrapper"]');
    const wrapper = wrappers[wrappers.length - 1];
    if (!wrapper) throw new Error("wrapper が見つからない");
    return wrapper.className;
  }

  const CENTER_HEIGHT =
    "supports-[height:100svh]:h-[min(100svh,var(--visual-viewport-height,100dvh))]";
  const HEROUI_HEIGHT = "h-(--visual-viewport-height)";

  it("中央のダイアログはキーボードにだけ追従する高さ(ツールバーの出し入れで動かない)", () => {
    const className = renderWrapper({ placement: "center" });
    expect(className).toContain(CENTER_HEIGHT);
    // svh 非対応のブラウザ向けに HeroUI の既定(実測値)も残す(対応ブラウザでは後勝ちでこちらが効く)
    expect(className).toContain(HEROUI_HEIGHT);
  });

  it("下寄せシートは visualViewport の実測値のまま(下端に貼り付く)", () => {
    const className = renderWrapper({ placement: "bottom" });
    expect(className).toContain(HEROUI_HEIGHT);
    expect(className).not.toContain(CENTER_HEIGHT);
  });

  it("未指定(auto: モバイルでは下端)も実測値のまま", () => {
    expect(renderWrapper()).toContain(HEROUI_HEIGHT);
  });

  it("呼び出し側の wrapper のクラスは残る", () => {
    const className = renderWrapper({
      placement: "center",
      classNames: { wrapper: "items-start" },
    });
    expect(className).toContain(CENTER_HEIGHT);
    expect(className).toContain("items-start");
  });
});
