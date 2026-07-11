import { LuTriangleAlert } from "react-icons/lu";

/*
 * 集計対象外(ignore_stats_flg)の記録で、詳細ページ・記録情報モーダルの
 * 最上部に表示するステータスバナー。
 * 従来はイベント情報カードのチップに紛れていた「集計対象外」を、
 * 記録全体の状態として一目で分かる位置へ昇格させる。
 * 表示条件(ignore_stats_flg)の判定は呼び出し側で行う。
 */
export default function IgnoreStatsBanner() {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-warning-200 bg-warning-100 px-3.5 py-2.5 shadow-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-warning/20 text-warning-600">
        <LuTriangleAlert className="h-4 w-4" />
      </span>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-xs font-bold text-warning-700">
          この記録は戦績集計に含まれていません
        </span>
        <span className="mt-0.5 text-[10px] text-warning-600/80">
          勝率・デッキ別成績などの集計対象外です
        </span>
      </div>
    </div>
  );
}
