import BoardPanelHelp from "@app/components/organisms/Record/BoardPanelHelp";

type Props = {
  // パネル見出しのアイコン(react-icons等)
  icon: React.ReactNode;
  // パネル見出しのラベル
  label: string;
  // 見出しの右に出す現在値。パネルの中を読まなくても、いまどうなっているかが分かるようにする。
  value?: React.ReactNode;
  // 説明文。渡すと現在値の隣に「?」が出て、押すと吹き出しで表示する。
  // 常時表示すると設定パネルが並んだときに説明文だけで縦を占めるため、開かせる形にした。
  help?: string;
  children: React.ReactNode;
};

/*
 * 記録詳細ページ・記録情報モーダルのボード内で使うパネル。
 * デッキ情報・レギュレーション・タグ・戦績集計を1枚のボードカードにまとめ、
 * アイコン付き見出し＋パネル間の区切り線で仕切る。
 */
export default function BoardPanel({ icon, label, value, help, children }: Props) {
  return (
    <div className="px-4 py-3.5 not-first:border-t not-first:border-divider">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex shrink-0 text-sm text-primary">{icon}</span>
        {/* 現在値が長くてもラベルは潰さない。溢れるのは値の側だけにする */}
        <span className="shrink-0 text-xs font-bold tracking-wide text-default-500">
          {label}
        </span>

        {(value || help) && (
          <span className="ml-auto flex min-w-0 items-center gap-1.5">
            {value && (
              <span className="truncate text-tiny font-bold text-default-500">{value}</span>
            )}
            {help && <BoardPanelHelp label={label} text={help} />}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
