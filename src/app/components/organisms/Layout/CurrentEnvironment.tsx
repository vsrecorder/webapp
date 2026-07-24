"use client";

import { useState } from "react";
import { Image, Popover, PopoverContent, PopoverTrigger, Skeleton } from "@heroui/react";

import ScrollingText from "@app/components/molecules/ScrollingText";
import { EnvironmentType } from "@app/types/environment";
import { environmentBadgeImageUrl } from "@app/utils/badgeImage";
import { getEnvDotColor } from "@app/utils/environment";

type Props = {
  environment: EnvironmentType;
};

// 対象期間を「2026年5月22日」形式に整形する。
// バックエンドは JST 0:00 を返すため、閲覧端末のタイムゾーンで前日にずれないよう
// Asia/Tokyo を明示する。
function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ヘッダーの「現在の対戦環境」表示。タップすると対戦環境のロゴ（拡張パック画像）と
// 対象期間を吹き出しで表示する。
// ロゴには対戦環境バッジと同じ画像を使い、アプリ内で環境を表す絵柄を統一している。
export default function CurrentEnvironment({ environment }: Props) {
  const [logoLoaded, setLogoLoaded] = useState(false);

  // トリガー（ヘッダー内の文字列）は header 自体より背が低いため、既定のオフセットだと
  // 吹き出しがヘッダーに潜り込んで矢印が隠れる。ヘッダー下端を抜ける量まで広げる。
  return (
    // 表示中は背面を操作させない。3つとも役割が違うので揃って必要:
    //   backdrop         … 全面を覆う層でタップ/クリックを受け止める（層タップで閉じる）
    //   shouldBlockScroll… スクロール抑止（iOS は react-aria が touchmove も抑止する）
    //   isNonModal={false}… 背面を aria-hidden にしてフォーカス移動も封じる
    // なお HeroUI の Popover は aria-modal を付けないため、モーダル用のグローバルな
    // 背面固定フック(useModalBackgroundScrollLock)は作動しない。よって「スクロール後に
    // 開くと即座に閉じる」既知の不具合の経路には乗らない（実測で確認済み）。
    //
    // disableAnimation を付けている理由（「タップしても吹き出しが出ないことがある」の修正）:
    // アニメーション有りだと HeroUI は AnimatePresence で overlay(=backdrop)を閉じた後も
    // exit アニメの間(約300ms)マウントし続ける。backdrop は全面 fixed でトリガーも覆うため、
    // 閉じてから約300ms以内にトリガーを再タップすると、タップが消えゆく backdrop に吸われて
    // トリガーに届かず開かない（＝閉→即再オープンが不発になる死に窓。Playwright webkit で
    // 再オープン遅延 50〜350ms は 0/6、500ms で 6/6 と実測）。disableAnimation にすると
    // overlay は isOpen=false で即アンマウントされ backdrop が残らないため、死に窓が消える。
    <Popover
      placement="bottom"
      offset={30}
      showArrow
      backdrop="opaque"
      shouldBlockScroll
      isNonModal={false}
      disableAnimation
    >
      <PopoverTrigger>
        <button
          type="button"
          aria-label={`現在の対戦環境『${environment.title}』の詳細を表示`}
          className="flex flex-1 items-center gap-1.5 min-w-0 mx-3 rounded-md transition-opacity active:opacity-60"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${getEnvDotColor(environment.to_date)} animate-pulse shrink-0`}
          />
          <ScrollingText
            text={`現在の対戦環境：『${environment.title}』`}
            className="flex-1 text-left text-white/80 text-xs font-medium min-w-0"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent className="px-3 py-3">
        <div className="flex items-center gap-3">
          {/*
            ロゴ画像の縦横比は環境ごとに違う（1パックは縦長、同時発売の2パックは
            ほぼ正方形）ため、枠を固定して object-contain でどの形でも収める。
            枠が固定なので、スケルトンから画像に切り替わっても吹き出しの寸法は変わらない。
          */}
          <div className="relative flex w-20 h-28 shrink-0 items-center justify-center">
            {!logoLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
            <Image
              alt={environment.title}
              src={environmentBadgeImageUrl(environment.id)}
              radius="sm"
              className="max-h-28 max-w-20 object-contain"
              // 読み込みに失敗した場合もスケルトンが残り続けないよう解除する
              onLoad={() => setLogoLoaded(true)}
              onError={() => setLogoLoaded(true)}
            />
          </div>

          {/* 環境名が長い場合（例:「スタートデッキ100 バトルコレクション」）に
              吹き出しが画面幅いっぱいまで広がらないよう、折り返し幅を決めておく */}
          <div className="flex flex-col gap-2 min-w-0 max-w-48">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-default-400">
                現在の対戦環境
              </span>
              <span className="text-sm font-bold text-default-700 leading-tight">
                『{environment.title}』
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-default-400">対象期間</span>
              <span className="text-xs text-default-600 leading-tight">
                {formatDate(environment.from_date)}
                <br />〜 {formatDate(environment.to_date)}
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
