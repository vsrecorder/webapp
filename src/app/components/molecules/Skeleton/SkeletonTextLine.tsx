import { ReactNode } from "react";

/*
 * 文字の行に置く骨格の1行。
 *
 * 行の高さを px や rem で決め打ちすると、実体の文字サイズ・行間から算出した端数
 * (例: text-[0.6875rem] leading-snug なら 15.125px)を書くことになり、読みづらく、
 * 実体の指定を変えたときに追従し忘れる。ここでは実体と同じ文字クラスを当てた
 * 幅0の見えない文字で行の高さを作り、その中にバーを流し込む。
 *
 * textClassName には必ず実体の行と同じ文字サイズ・行間を渡すこと。
 */
export default function SkeletonTextLine({
  textClassName,
  align = "start",
  children,
}: {
  textClassName: string;
  align?: "start" | "center" | "end";
  // 行の中に置くバー(幅・高さは呼び出し側で決める)
  children: ReactNode;
}) {
  const justify =
    align === "center" ? "justify-center" : align === "end" ? "justify-end" : "justify-start";

  return (
    <span className={`flex items-center ${justify} ${textClassName}`}>
      <span aria-hidden className="invisible w-0 overflow-hidden">
        &nbsp;
      </span>
      {children}
    </span>
  );
}
