import { Fragment } from "react";
import { Card, CardBody } from "@heroui/react";

/*
 * 称号とランクのパネルの骨格。パネル自身の読み込み中表示と、
 * ホームの Suspense 骨格(DashboardSkeleton)の両方から使う。
 *
 * 行あたりの表示数(DESIGNATION_LADDER_ROW_SIZE)は実体の DesignationPanel でも使う。
 * ラダーの行数はこれで決まるので、片方だけ変わって寸法がずれないよう定義をここに置いて共有する。
 */

// 称号ロードマップの1行あたりの表示数。この数を境に折り返し、蛇行(スネーク)状に並べる。
export const DESIGNATION_LADDER_ROW_SIZE = 5;

// 称号ラダー1行ぶんのプレースホルダー。区切りの"▶"も含めて実カードと同じ組み方にして、
// タイルの幅と行の高さ(50px)を合わせる。
function DesignationLadderRowSkeleton() {
  return (
    <div className="flex items-stretch gap-1">
      {Array.from({ length: DESIGNATION_LADDER_ROW_SIZE }).map((_, i) => (
        <Fragment key={i}>
          <div className="flex-1 min-w-0">
            <div className="h-12.5 rounded-xl bg-default-100 animate-pulse" />
          </div>
          {i < DESIGNATION_LADDER_ROW_SIZE - 1 && (
            <span className="self-center shrink-0 text-warning/70 font-black text-xs">
              ▶
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}

type Props = {
  /*
   * プレイヤーズクラブ連携済みか。連携済みだと「入賞したシティリーグ」の節が増える。
   *
   * パネル自身の読み込み中表示では前回の連携状態(usePlayerLinkedHint)を渡す。
   * ホームの Suspense 骨格はサーバで描くのでその値を持てず、未連携(多数派)として扱う。
   * 骨格が実物より高いと差し替わりで下がせり上がるため、分からないときは出さない側に倒す。
   */
  linkedHint?: boolean;
  // 「入賞したシティリーグ」の節の高さ。PlayerCityleagueResults が前回描画できた高さを
  // 覚えているので、骨格でも同じ値で場所を取る(両者がズレると入れ替わりで跳ねる)
  cityleagueHeight?: number | string;
};

export default function DesignationPanelSkeleton({
  linkedHint = false,
  cityleagueHeight,
}: Props) {
  return (
    <Card className="shadow-md">
      <CardBody className="p-4 flex flex-col gap-6">
        {/* シーズン選択(border + py-1.5 + text-xs = 30px) */}
        <div className="flex items-center justify-end">
          <div className="w-52 h-7.5 rounded-xl bg-default-100 animate-pulse" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-2xl bg-default-100 animate-pulse" />
          {/* 「ランク」(text-[0.625rem] = 15px) / ランク名(text-lg = 28px) /
              「称号: …」(text-xs = 16px, mt-0.5)。実カードは gap 無しで積む。
              px はいずれもルート16px時の値 */}
          <div className="flex flex-col items-center">
            <div className="h-[0.9375rem] flex items-center">
              <div className="w-14 h-2.5 rounded-full bg-default-100 animate-pulse" />
            </div>
            <div className="h-7 flex items-center">
              <div className="w-32 h-5 rounded-md bg-default-100 animate-pulse" />
            </div>
            <div className="h-4 mt-0.5 flex items-center">
              <div className="w-28 h-3 rounded-full bg-default-100 animate-pulse" />
            </div>
          </div>
        </div>

        {/* 称号ラダー。実カードは「5枚の行 → 折り返しの▼ → 5枚の行」で、
            タイルは p-2 + 絵文字(20px) + gap-1 + 名前(text-[0.5rem] = 10px) の 50px(px はルート16px時)。
            グリッドで並べると▼の行が抜けて高さがズレるので、同じ行構成で組む */}
        <div className="flex flex-col gap-1">
          <DesignationLadderRowSkeleton />
          {/* 折り返しの▼(実カードでは1行目の右端の直下に入る。text-xs leading-none = 12px) */}
          <div className="flex items-center gap-5">
            {Array.from({ length: DESIGNATION_LADDER_ROW_SIZE }).map((_, i) => (
              <div key={i} className="flex-1 flex items-center justify-center">
                {i === DESIGNATION_LADDER_ROW_SIZE - 1 && (
                  <span className="text-warning/70 font-black text-xs leading-none">▼</span>
                )}
              </div>
            ))}
          </div>
          <DesignationLadderRowSkeleton />
        </div>

        {/* 連携済みのときだけ出る「入賞したシティリーグ」。実カードに入れ替わった直後は
            PlayerCityleagueResults 自身の読み込み中なので、その状態に高さを合わせる
            (見出し15px + シーズン名16px + gap-2 + 本体) */}
        {linkedHint && (
          <div className="border-t border-default-100 pt-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col">
                <div className="h-[0.9375rem] flex items-center">
                  <div className="w-28 h-2.5 rounded-full bg-default-100 animate-pulse" />
                </div>
                <div className="h-4 flex items-center">
                  <div className="w-40 h-3 rounded-full bg-default-100 animate-pulse" />
                </div>
              </div>
              <div
                style={{ height: cityleagueHeight }}
                className="-mx-4 rounded-xl bg-default-100 animate-pulse"
              />
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
