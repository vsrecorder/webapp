import type { CSSObjectWithLabel } from "react-select";

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
