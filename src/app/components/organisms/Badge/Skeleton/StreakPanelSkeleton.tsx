import { ReactNode } from "react";
import { Card, CardBody } from "@heroui/react";
import { LuFlame } from "react-icons/lu";

/*
 * ストリークパネルの骨格。
 *
 * パネル自身の読み込み中表示と、ホームの Suspense 骨格(DashboardSkeleton)の両方から使う。
 * 寸法合わせのための部品(TextColumn / InfoButtonPlaceholder)は実体の StreakPanel でも
 * 使うため、骨格と同じここに置いて一箇所で直せるようにしている。
 */

// テキスト列は「週数 / 最長記録・フリーズ枠 / フリーズ復活の案内」の3行構成だが、
// 3行目はフリーズを消費しているときしか出ない。出るときだけ高さが増えると、データ到着で
// カードが伸びて下のセクションごと押し下がる(スケルトンとの差もそのまま揺れになる)ため、
// 常に3行ぶんの高さを確保しておく。
//
// 確保の仕方は px の決め打ちではなく、同じ字送りの見えない3行(サイザー)を実内容と
// グリッドの同じセルへ重ねる方式にしている。週数の行は text-2xl(leading-none)の中に
// text-sm を含むぶん行の高さがフォントのメトリクス次第で、実測でも 25px / 26px と環境で
// 変わる(Noto Sans CJK JP は 26px、DejaVu Sans / Liberation Sans は 25px)。px で固定すると
// 端末によっては1px ぶんの揺れが戻ってしまう。
// 3行に満たないときは justify-center で上下中央に置き、余白が下だけに溜まらないようにする。
export function TextColumn({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-w-0 flex-1">
      <div
        aria-hidden
        className="invisible col-start-1 row-start-1 flex w-0 flex-col gap-1 overflow-hidden whitespace-nowrap"
      >
        <span className="text-2xl font-black leading-none">
          0<span className="ml-1 text-sm font-bold">週</span>
        </span>
        <span className="text-[0.6875rem] font-medium">0</span>
        <span className="text-[0.6875rem] font-medium">0</span>
      </div>
      <div className="col-start-1 row-start-1 flex min-w-0 flex-col justify-center gap-1">
        {children}
      </div>
    </div>
  );
}

// info ボタン(-m-1.5 + p-2.5 + w-4 = 36px 角)の場所取り。読み込み中とフリーズ非表示のとき、
// 右端を空けたままにして列幅を揺らさないために置く。読み込み中だけ骨格として見せる。
export function InfoButtonPlaceholder({ pulse = false }: { pulse?: boolean }) {
  return (
    <div
      aria-hidden
      className="-m-1.5 flex shrink-0 items-center justify-center self-start p-2.5"
    >
      <div
        className={`w-4 h-4 rounded-full ${pulse ? "bg-default-100 animate-pulse" : ""}`}
      />
    </div>
  );
}

// 骨格の1行。行の高さは実体と同じ字送りの見えないテキストから取り、その上にバーを重ねる。
// sampleClassName は必ず実体の行と同じ文字サイズにすること。見えないテキストを素の span で
// 包むと、行ボックスが親の strut(16px × 1.5 = 24px)まで膨らんで実体より高くなる。
function SkeletonLine({
  sampleClassName,
  sample,
  barClassName,
}: {
  sampleClassName: string;
  sample: ReactNode;
  barClassName: string;
}) {
  return (
    <span className="relative flex items-center">
      <span aria-hidden className={`invisible ${sampleClassName}`}>
        {sample}
      </span>
      <span
        className={`absolute left-0 rounded-full bg-default-100 animate-pulse ${barClassName}`}
      />
    </span>
  );
}

// 実体と同じ行の高さで置くスケルトン。3行目(フリーズ復活の案内)は出ない方が既定なので
// 骨格も2行にする。TextColumn が3行ぶんを確保するので、案内が出る場合も高さは動かない。
export default function StreakPanelSkeleton() {
  return (
    <Card className="shadow-md">
      <CardBody className="flex flex-row items-center gap-4 p-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl shrink-0 bg-default-100 text-default-200">
          <LuFlame className="w-7 h-7" />
        </div>

        <TextColumn>
          {/* バー幅は実データで実測した値(週数の行 102〜116px / 最長記録の行 141〜148px) */}
          <SkeletonLine
            sampleClassName="text-2xl font-black leading-none"
            sample={
              <>
                0<span className="ml-1 text-sm font-bold">週連続記録中</span>
              </>
            }
            barClassName="w-28 max-w-full h-4"
          />
          <SkeletonLine
            sampleClassName="text-[0.6875rem] font-medium"
            sample="最長記録 0週"
            barClassName="w-36 max-w-full h-2.5"
          />
        </TextColumn>

        <InfoButtonPlaceholder pulse />
      </CardBody>
    </Card>
  );
}
