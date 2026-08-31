"use client";

import { useEffect, useState } from "react";

import { Button, addToast } from "@heroui/react";

import { LuTriangleAlert, LuExternalLink, LuCopy } from "react-icons/lu";

import { sendGAEvent } from "@next/third-parties/google";

import { attributionUtmParams } from "@app/utils/attribution";
import { canOpenInExternalBrowser, openInExternalBrowser } from "@app/utils/platform";

// 外部ブラウザへ渡すURL。アプリ内ブラウザの Cookie は外部ブラウザへ引き継がれないため、
// 保存済みの流入元(vsr_attr)をURLの utm_* に復元して渡し、外部ブラウザ側の proxy に
// Cookie を発行し直させる(施策0-4 §3.7 の「Cookie断絶」対策)。
// 着地直後ならURLに utm_* が残っているのでそのまま使う。
function handoffUrl(): string {
  const url = new URL(window.location.href);
  if (url.searchParams.has("utm_source")) {
    return url.toString();
  }

  const params = attributionUtmParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

type Props = {
  // "ログイン" または "登録"
  actionLabel: string;
  // URLのコピーに成功した際に呼ばれる。モーダル内で表示している場合に閉じるために使う。
  onCopied?: () => void;
};

// LINEやX等のアプリ内ブラウザ(WebView)を検知した際に、ソーシャルログインの代わりに表示する案内。
// Googleは埋め込みWebView内でのOAuthを許可しておらず、そのまま実行しても必ず失敗するため、
// 理由を説明した上で外部ブラウザへ誘導する。
export default function InAppBrowserNotice({ actionLabel, onCopied }: Props) {
  // 外部ブラウザを直接起動できる環境(LINE / Android)かどうか。
  // マウント後にのみ描画されるため、初期化時にUserAgentを参照して問題ない。
  const [canOpen] = useState(canOpenInExternalBrowser);

  // アプリ内ブラウザで登録・ログインが止められた回数 = 施策0-4 §3.7 の
  // 「取りこぼし規模」の実測値。sign_up との比率でどれだけ失っているかを読む。
  useEffect(() => {
    sendGAEvent("event", "inapp_notice_impression", { action: actionLabel });
  }, [actionLabel]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(handoffUrl());
      sendGAEvent("event", "inapp_notice_copy_url", { action: actionLabel });
      addToast({
        title: "URLをコピーしました",
        description: "Safariなどのブラウザに貼り付けて開いてください",
        color: "success",
        timeout: 4000,
      });

      // ここから先はブラウザを開き直してもらう流れになり、案内を読み続ける必要がない。
      // モーダルに覆われたままだとトーストも見えづらいため閉じる。
      onCopied?.();
    } catch {
      // 失敗した場合は同じ画面から押し直せるよう、閉じずに残す
      addToast({ title: "コピーに失敗しました", color: "danger", timeout: 3000 });
    }
  }

  function openExternally() {
    sendGAEvent("event", "inapp_notice_open_browser", { action: actionLabel });
    // 起動手段がない環境にフォールバックした場合はURLコピーに切り替える
    if (!openInExternalBrowser(handoffUrl())) {
      void copyUrl();
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 flex gap-2.5">
        <LuTriangleAlert className="text-warning-600 text-base shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-bold text-warning-700">
            アプリ内ブラウザでは{actionLabel}できません
          </p>
          <p className="text-xs text-warning-700/90 leading-relaxed">
            LINEやXなどのアプリ内ブラウザは、Googleのセキュリティポリシーにより
            ログイン画面の表示が拒否されます。お手数ですが、Safariや Chromeなどの
            ブラウザで開き直してから{actionLabel}してください。
          </p>
        </div>
      </div>

      {canOpen ? (
        <Button
          size="md"
          color="primary"
          fullWidth
          className="gap-1.5 font-medium"
          onPress={openExternally}
        >
          <LuExternalLink className="text-lg shrink-0" />
          ブラウザで開く
        </Button>
      ) : (
        <>
          <Button
            size="md"
            color="primary"
            fullWidth
            className="gap-1.5 font-medium"
            onPress={copyUrl}
          >
            <LuCopy className="text-lg shrink-0" />
            URLをコピー
          </Button>
          <p className="text-center text-xs text-default-500 leading-relaxed">
            コピーしたURLをSafariのアドレスバーに貼り付けて開いてください。
            アプリのメニューに「Safariで開く」がある場合は、そちらでも構いません。
          </p>
        </>
      )}
    </div>
  );
}
