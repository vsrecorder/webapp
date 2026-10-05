"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { LuRefreshCw } from "react-icons/lu";

import { useClientValue } from "@app/hooks/useClientValue";
import { isIOSPWA as detectIOSPWA } from "@app/utils/platform";
import {
  isReloadRestoring,
  saveScrollForReload,
  subscribeReloadRestoreEnd,
} from "@app/utils/reloadScrollRestore";

// 現在のページを再読み込みするボタン
export default function ReloadButton() {
  const [isSpinning, setIsSpinning] = useState(false);
  // iOS の PWA（ホーム画面から起動した standalone 表示）には pull-to-refresh が無いため、
  // 画面幅に関わらずリロード手段を常設する。ブラウザ表示（Safari タブ）では対象外。
  // サーバ描画では判定できないので、ハイドレーション後に実際の値へ差し替わる
  const isIOSPWA = useClientValue(detectIOSPWA, false);
  /*
   * 再読み込み直後、直前の位置へ戻している最中か。その間は押せなくする
   * (途中で再読み込みすると、戻している途中の位置が保存されてそこへ戻ってしまう)。
   * 詳細は reloadScrollRestore.ts を参照。
   *
   * 3段構えにしている:
   * - 見た目(薄く・アイコンを回す)は <html> の目印に連動する in-data-[…] で付ける。
   *   ハイドレーション前から出せる。
   * - isDisabled はハイドレーション後に効く(サーバ描画では復元中か分からないため、
   *   ハイドレーション直後の描画は押せる状態のまま)。
   * - 押した時点でも目印を直接確かめる。上の隙間と、ハイドレーション前のタップを React が
   *   後から送り直してくるものの両方を、ここで止める。
   */
  const isRestoring = useClientValue(isReloadRestoring, false, subscribeReloadRestoreEnd);

  return (
    <Button
      isIconOnly
      variant="light"
      radius="full"
      aria-label="ページを再読み込み"
      isDisabled={isRestoring || isSpinning}
      /*
        pointer-events-auto: 無効の間も HeroUI 既定の pointer-events-none にしない。
        すり抜けたタップが下のヘッダーで click になると、位置を戻す処理が
        「ユーザーが操作した」とみなして途中で止まってしまう。無効なボタン自身には
        click が発生しないので、ボタンで受け止めれば何も起きない
      */
      className={`${isIOSPWA ? "inline-flex" : "hidden sm:inline-flex"} pointer-events-auto text-white/70 hover:text-white in-data-[reload-scroll-restoring]:opacity-disabled`}
      // reloadScrollRestore.ts の RELOAD_BUTTON_ATTR。ここへの click では復元を打ち切らない
      data-reload-button=""
      onPress={() => {
        if (isReloadRestoring()) return;
        setIsSpinning(true);
        // 見ている位置にとどまって再読み込みする(復元は reloadScrollRestore.ts)。
        // pagehide でも保存されるが、確実にこの時点の位置を残すためここでも書く
        saveScrollForReload();
        window.location.reload();
      }}
    >
      <LuRefreshCw
        className={`text-xl in-data-[reload-scroll-restoring]:animate-spin ${isSpinning ? "animate-spin" : ""}`}
      />
    </Button>
  );
}
