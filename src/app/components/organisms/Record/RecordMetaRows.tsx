/*
 * 記録の「事実」を並べる補足行。会場・開催時刻・対戦環境など、イベント側から取れる
 * 情報をアイコン付きの行として上から積む。
 *
 * チップで並べないのは、チップは数が増えるほど同じ重さの札に見えて、どれが何かを
 * 読み解く手間が増えるため。行にすると上から順に読める。
 *
 * 記録詳細のヒーロー(RecordHero)と記録一覧のカード(RecordCardBase)で同じ部品を使い、
 * 2つの画面で書式がずれないようにしている。幅を超える店舗名などは1行に畳む。
 */

export type RecordMetaRow = {
  // 行頭のアイコン(react-icons を h-3 w-3 で渡す)
  icon: React.ReactNode;
  text: string;
};

type Props = {
  rows: RecordMetaRow[];
  // 行の塊に付ける余白など(呼び出し側のレイアウトに合わせる)
  className?: string;
};

export default function RecordMetaRows({ rows, className }: Props) {
  if (rows.length === 0) return null;

  return (
    <div className={`flex flex-col gap-0.5 ${className ?? ""}`}>
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex min-w-0 items-center gap-1.5 text-[0.6875rem] leading-snug text-default-600"
        >
          <span aria-hidden className="shrink-0 text-default-400">
            {row.icon}
          </span>
          <span className="min-w-0 truncate">{row.text}</span>
        </div>
      ))}
    </div>
  );
}
