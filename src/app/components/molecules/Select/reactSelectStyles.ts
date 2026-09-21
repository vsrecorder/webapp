import type { CSSObjectWithLabel, Theme } from "react-select";

/*
 * react-select のコントロール(選択バー)の高さ。
 *
 * 既定では emotion が px(38px)で入れる。ところが globals.css には
 * 「小型タブレット(幅 640〜767px)ではルートの文字サイズを 112.5% にして UI ごと拡大する」
 * 帯があり、rem で書かれた HeroUI の入力欄(h-10 = 2.5rem)は拡大されるのに、
 * ここだけ px のまま取り残されてタブ間・骨格との縦位置がずれる。
 * さらに検索アイコン付きのプレースホルダを持つ選択バーは、拡大時だけ中身に押されて
 * 38px を超える(実測 41px)ため、骨格が高さを決め打ちできない。
 *
 * 同じ 38px を rem で指定して、拡大帯でもフォーム全体が同じ比率で伸びるようにする。
 * 骨格側の SELECT_HEIGHT(RecordCreateFormSkeleton)と必ず同じ値にすること。
 */
export const REACT_SELECT_CONTROL_HEIGHT = "2.375rem"; // ルート16px時に 38px

// react-select の styles.control に渡す。記録の作成・編集で使う選択バーはすべてこれを通す。
export const reactSelectControlStyle = (base: CSSObjectWithLabel): CSSObjectWithLabel => ({
  ...base,
  minHeight: REACT_SELECT_CONTROL_HEIGHT,
});

/*
 * react-select / react-windowed-select の配色。各 <Select> / <WindowedSelect> の
 * theme プロップに渡して使う(これらは HeroUI のテーマに自動追従しない)。
 *
 * 色の実体は CSS 変数(globals.css の --rs-*)に置く。ここで JS からダーク/ライトを
 * 見て出し分けると、サーバ描画では <html> の .dark を読めず必ずライトになり、
 * クライアントの最初の描画もそれに合わせるほかない(ハイドレーションの不一致を
 * 避けるため)。ダークで開いたときに選択バーが一瞬白く光るのはそのためだった。
 * CSS 変数なら HTML に .dark が付いた時点で正しい色が当たる。
 *
 * danger / dangerLight は上書きせず react-select の既定のままにしてある。
 */
const REACT_SELECT_COLORS = {
  primary: "var(--rs-primary)",
  primary75: "var(--rs-primary75)",
  primary50: "var(--rs-primary50)",
  primary25: "var(--rs-primary25)",
  neutral0: "var(--rs-neutral0)",
  neutral5: "var(--rs-neutral5)",
  neutral10: "var(--rs-neutral10)",
  neutral20: "var(--rs-neutral20)",
  neutral30: "var(--rs-neutral30)",
  neutral40: "var(--rs-neutral40)",
  neutral50: "var(--rs-neutral50)",
  neutral60: "var(--rs-neutral60)",
  neutral70: "var(--rs-neutral70)",
  neutral80: "var(--rs-neutral80)",
  neutral90: "var(--rs-neutral90)",
} as const;

export function reactSelectTheme(base: Theme): Theme {
  return {
    ...base,
    colors: { ...base.colors, ...REACT_SELECT_COLORS },
  };
}
