/*
 * 記録作成フォームの「1 開催日」「2 イベント」のような手順ラベル。
 *
 * 実体(templates/RecordCreate)と Suspense の骨格
 * (organisms/Record/Skeleton/RecordCreateFormSkeleton)の両方から使う。
 * 番号も文言もデータに依存しないので、骨格でもそのまま描ける。同じ部品を
 * 共有することで、骨格から実体へ切り替わるときに行の高さがずれない。
 */

// 必須項目であることを示すバッジ
export function RequiredBadge() {
  return (
    <span className="text-[0.625rem] font-bold text-danger border border-danger rounded px-1 leading-tight">
      必須
    </span>
  );
}

export default function StepLabel({
  num,
  required,
  children,
}: {
  num: number;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[0.625rem] font-bold shrink-0">
        {num}
      </span>
      <span className="text-sm font-semibold">{children}</span>
      {required && <RequiredBadge />}
    </div>
  );
}
