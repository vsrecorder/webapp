type Props = {
  children: React.ReactNode;
};

/*
 * 記録詳細ページ・記録情報モーダルで共有するセクション見出し。
 * 従来の「中央寄せ・下線付き太字」から、アクセントドット＋区切り線の
 * 左寄せラベルへ刷新し、情報の区切りを軽やかに示す。
 */
export default function RecordSectionLabel({ children }: Props) {
  return (
    <div className="flex items-center gap-2 px-0.5">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <span className="text-xs font-bold tracking-wide text-default-500 shrink-0">
        {children}
      </span>
      <span className="h-px flex-1 bg-divider" />
    </div>
  );
}
