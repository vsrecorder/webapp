// @vitest-environment jsdom
import { ModalBody, ModalContent } from "@heroui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
