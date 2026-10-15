// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useScrollResetOnNavigation } from "@app/hooks/useScrollResetOnNavigation";
import { hasReturnedHereSince } from "@app/utils/returnNavigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/shared_decks/p1" }));

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

/*
 * ページ内の戻るリンク(BackLink)で戻ったことを控える。ホーム画面に追加したアプリには
 * ブラウザの戻るボタンが無いので、公開デッキの一覧はこれも「戻ってきた」として扱う。
 */
describe("useScrollResetOnNavigation の戻るリンク", () => {
  function clickLink(attrs: Record<string, string>, init: MouseEventInit = {}) {
    const a = document.createElement("a");
    for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
    a.addEventListener("click", (e) => e.preventDefault());
    document.body.appendChild(a);
    a.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, ...init }));
  }

  it("戻るリンクの行き先へ戻ったことを控え、普通のリンクや新しいタブでは控えない", () => {
    window.history.replaceState(null, "", "/shared_decks");
    const before = Date.now() - 1;
    renderHook(() => useScrollResetOnNavigation());

    clickLink({ href: "/shared_decks" });
    clickLink({ href: "/shared_decks", "data-back-link": "" }, { metaKey: true });
    expect(hasReturnedHereSince(before)).toBe(false);

    clickLink({ href: "/shared_decks", "data-back-link": "" });
    expect(hasReturnedHereSince(before)).toBe(true);
  });
});
