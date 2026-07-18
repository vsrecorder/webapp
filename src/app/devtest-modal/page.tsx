"use client";

/*
 * 一時検証用ページ(コミットしない): 認証なしで CreateDeckModal を開き、
 * モーダル背面スクロール抑止の挙動を Playwright から実測する。
 */

import { useState } from "react";
import CreateDeckModal from "@app/components/organisms/Deck/Modal/CreateDeckModal";

export default function DevTestModalPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        data-testid="open-modal"
        className="fixed bottom-2 right-2 z-40 rounded bg-blue-500 px-3 py-2 text-white"
        onClick={() => setIsOpen(true)}
      >
        モーダルを開く
      </button>
      {/* 背面を縦に長くして、ページ自体がスクロール可能な状態を作る */}
      {Array.from({ length: 60 }).map((_, i) => (
        <div key={i} className="p-4 border-b border-default-200">
          背面コンテンツ {i + 1}
        </div>
      ))}
      <CreateDeckModal
        deck_code=""
        isOpen={isOpen}
        onOpenChange={() => setIsOpen((v) => !v)}
        onCreated={() => {}}
      />
    </div>
  );
}
