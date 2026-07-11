type Props = {
  // パネル見出しのアイコン(react-icons等)
  icon: React.ReactNode;
  // パネル見出しのラベル
  label: string;
  // 見出し右側の補助表示(件数など)。任意
  right?: React.ReactNode;
  children: React.ReactNode;
};

/*
 * 記録詳細ページ・記録情報モーダルのボード内で使うパネル。
 * 対戦結果・デッキコード・戦績集計を1枚のボードカードにまとめ、
 * 左アクセントレール＋アイコン付き見出し＋パネル間の区切り線で仕切る。
 */
export default function BoardPanel({ icon, label, right, children }: Props) {
  return (
    <div className="relative px-4 py-3.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-divider">
      {/* 左アクセントレール */}
      <span className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-r bg-primary/30" />
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex text-sm text-primary">{icon}</span>
        <span className="text-xs font-bold tracking-wide text-default-500">{label}</span>
        {right && (
          <span className="ml-auto text-[10px] font-bold text-default-400">{right}</span>
        )}
      </div>
      {children}
    </div>
  );
}
