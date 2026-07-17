import { LuCalendarDays } from "react-icons/lu";

import DashboardCalendar from "@app/components/organisms/Calendar/DashboardCalendar";

type Props = {
  userId: string;
};

export default function TemplateCalendar({ userId }: Props) {
  return (
    <div className="pt-6 pb-6 w-full">
      {/* 幅はホームのカレンダー(Dashboard)と揃える。px を付けるとカレンダーが
          その分だけ狭くなるため、余白はヘッダーにだけ持たせる */}
      <div className="mx-auto w-full max-w-2xl lg:max-w-6xl xl:max-w-7xl flex flex-col gap-5">
        {/* ページヘッダー */}
        <div className="flex items-start gap-3 px-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 text-primary shrink-0">
            <LuCalendarDays className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1 min-w-0 pt-0.5">
            <h1 className="text-lg font-black text-default-700 leading-tight">
              活動ログのカレンダー
            </h1>
            <p className="text-xs text-default-400 leading-relaxed">
              記録の作成や対戦結果の追加、デッキの登録といった日々の活動を振り返れます。
              <br />
              日付をタップすると、その日の活動ログが表示されます。
            </p>
          </div>
        </div>

        <DashboardCalendar userId={userId} />
      </div>
    </div>
  );
}
