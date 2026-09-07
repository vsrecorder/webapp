import { Fragment } from "react";
import { Card, CardBody } from "@heroui/react";

/*
 * 対戦環境バッジパネルの骨格。パネル自身の読み込み中表示と、
 * ホームの Suspense 骨格(DashboardSkeleton)の両方から使う。
 *
 * 列数・初期表示件数とタイトルの改行規則は実体の EnvironmentBadgeGallery でも使う。
 * 骨格の高さはこれらで決まるので、片方だけ変わって寸法がずれないよう定義をここに置いて共有する。
 */

// 1行3列で表示し、多い場合は初期表示を3行分に折りたたむ。
export const ENVIRONMENT_BADGE_COLUMN_COUNT = 3;
const INITIAL_VISIBLE_ROWS = 3;
export const ENVIRONMENT_BADGE_INITIAL_VISIBLE_COUNT =
  ENVIRONMENT_BADGE_COLUMN_COUNT * INITIAL_VISIBLE_ROWS;

// "/"区切りやスペース区切りのタイトル(例:「スタン/ローテ」「シティリーグ 2024」)は
// タイル幅が狭く不格好に折り返されるため、区切り文字の直後で明示的に改行する。
export function renderEnvironmentBadgeTitle(title: string) {
  const segments = title.split(/(?<=[/ ])/);
  return segments.map((segment, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {segment}
    </Fragment>
  ));
}

// EnvironmentBadgeTile と同じ構造(画像枠+テキスト)のプレースホルダー。
// アイコンバッジ用の BadgeTileSkeleton は円形前提のため、画像の形に合わせたこちら専用のものを使う。
//
// タイトルの行数はタイル幅で変わるため、高さを px で固定すると特定の画面幅でしか合わない。
// 代表的な環境名を実タイルと同じ文字サイズ・行間で invisible に置き、折り返しの計算を
// ブラウザに任せて高さを決める(renderEnvironmentBadgeTitle が "/" と空白の直後で改行する)。
//
// グリッドの行の高さは、その行で一番背の高いタイルに揃う。環境名の長さはまちまちで、
// 初期表示の9件には「短い2段」「長い2段」「中くらいの2段」が混ざるため、
// 全部を同じ長さで測ると狭い画面で必ずズレる(実データで測ると 320px では行ごとに
// 2行・4行・3行と全部違う)。行ごとに違う長さの実在タイトルを代表値として置く。
// どの長さがどの行に来るかは新しい環境が増えるたびに入れ替わるので、位置ではなく
// 「9件のうちに3種類の長さが混ざる」ことを再現するのが目的。
const ENVIRONMENT_TITLE_SAMPLES = [
  "古代の咆哮/未来の一閃",
  "スタートデッキ100 バトルコレクション",
  "メガブレイブ/メガシンフォニア",
];

function EnvironmentBadgeTileSkeleton({ titleSample }: { titleSample: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-1 py-3 rounded-xl bg-default-100">
      <div className="w-11 h-11 rounded-lg bg-default-200 animate-pulse" />
      <div className="relative w-full">
        <span
          aria-hidden="true"
          className="invisible block text-center text-[0.6875rem] font-bold leading-tight"
        >
          {renderEnvironmentBadgeTitle(titleSample)}
        </span>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <div className="w-4/5 h-2.5 rounded-full bg-default-200 animate-pulse" />
          <div className="w-3/5 h-2.5 rounded-full bg-default-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function EnvironmentBadgeGallerySkeleton() {
  return (
    <Card className="shadow-md">
      {/* 余白・グリッド・行数は実カードと同じにする(p-3 / -mx-3 なし) */}
      <CardBody className="p-3 flex flex-col gap-2">
        {/* 獲得数(text-xs = 16px の行) */}
        <div className="h-4 flex items-center">
          <div className="w-24 h-2.5 rounded-full bg-default-100 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: ENVIRONMENT_BADGE_INITIAL_VISIBLE_COUNT }).map((_, i) => (
            <EnvironmentBadgeTileSkeleton
              key={i}
              titleSample={
                ENVIRONMENT_TITLE_SAMPLES[
                  Math.floor(i / ENVIRONMENT_BADGE_COLUMN_COUNT) %
                    ENVIRONMENT_TITLE_SAMPLES.length
                ]
              }
            />
          ))}
        </div>
        {/* 「すべて表示 (N)」ボタン(Button size="sm" = 32px)。対戦環境は
            ENVIRONMENT_BADGE_INITIAL_VISIBLE_COUNT(9) を常に超えている(2026-08 時点で32件)ので、
            折りたたみボタンは必ず出るものとして場所を確保する */}
        <div className="w-full h-8 rounded-xl bg-default-100 animate-pulse" />
      </CardBody>
    </Card>
  );
}
