"use client";

import {
  Children,
  cloneElement,
  CSSProperties,
  isValidElement,
  ReactElement,
  ReactNode,
  Ref,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Select, { GroupBase, MenuListProps, OptionsOrGroups, Props as SelectProps } from "react-select";
import { List, ListImperativeAPI, RowComponentProps } from "react-window";

/*
 * 候補が多いときだけメニューを仮想化する react-select(react-windowed-select の置き換え)。
 *
 * react-windowed-select 5.2.0 の MenuList は、描画のたびに react-window へ渡す
 * innerElementType と行の描画関数を新しく作る。React はこれを別のコンポーネントと
 * みなすので、候補の上でカーソルや指が動いてフォーカスが移るたびに、見えている行が
 * 全部作り直される。行の <img> も作り直されるため、イベントのアイコンなどがちらついていた。
 *
 * ここでは行の部品を固定し、行の key も候補に結びつけて、同じ候補の DOM を使い回す。
 * react-windowed-select は「毎回作り直されること」を当てにして行の高さを測り直していたので、
 * 高さは描画のたびに測り、候補の key ごとに覚える形に変えてある。
 */

// 測る前の行の高さの見積もり(react-windowed-select の既定値と同じ)
const ESTIMATED_ROW_HEIGHT = 35;

type MenuItem = ReactElement<{
  isFocused?: boolean;
  headingProps?: unknown;
  children?: ReactNode;
}>;

/*
 * グループ分けされた候補は、見出しと中の候補を1行ずつに並べ直す
 * (見出しは中身を空にした Group として1行に置く)。
 * Group かどうかは headingProps で見る。options は react-select が Option にも
 * 全候補を渡しているので目印にならない。
 */
function flattenMenuItems(children: ReactNode): MenuItem[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];

    const item = child as MenuItem;

    if (item.props.headingProps === undefined) return [item];

    return [
      cloneElement(item, { children: [] }),
      ...(Children.toArray(item.props.children) as MenuItem[]),
    ];
  });
}

function countOptions<Option, Group extends GroupBase<Option>>(
  options: OptionsOrGroups<Option, Group> | undefined,
): number {
  return (options ?? []).reduce(
    (count, option) =>
      count +
      (typeof option === "object" && option !== null && "options" in option
        ? (option as Group).options.length
        : 1),
    0,
  );
}

type RowData = {
  items: MenuItem[];
  // 各行の高さ。測った値か見積もりに、先頭・末尾の行は menuList の余白を足したもの。
  // 配列ごと差し替えると react-window が行の位置を測り直す
  heights: number[];
  paddingTop: number;
  paddingBottom: number;
  onMeasure: (key: string, height: number) => void;
};

/*
 * 1行。描画のたびに高さを測って親へ知らせる(変わっていなければ親は何もしない)。
 * 作り直されないので、マウント時だけ測るとフォーカスの縁取りなどで高さが変わっても追えない。
 */
function MenuRow({
  items,
  paddingTop,
  paddingBottom,
  onMeasure,
  index,
  style,
}: RowComponentProps<RowData>) {
  const ref = useRef<HTMLDivElement>(null);
  const item = items[index];

  useLayoutEffect(() => {
    if (ref.current) onMeasure(String(item.key), ref.current.getBoundingClientRect().height);
  });

  /*
   * menuList の上下の余白は、先頭と末尾の行の中に持たせる。
   * リスト自体に padding を付けると、react-window は余白を知らないまま送り先を決め、
   * スクロール量も「行の高さの合計」で頭打ちにするので、末尾の候補が余白の分だけ切れる。
   */
  return (
    <div
      style={{
        ...style,
        boxSizing: "border-box",
        paddingTop: index === 0 ? paddingTop : 0,
        paddingBottom: index === items.length - 1 ? paddingBottom : 0,
      }}
    >
      <div ref={ref}>{item}</div>
    </div>
  );
}

function rowKey(index: number, data: RowData) {
  return String(data.items[index].key);
}

function rowHeight(index: number, data: RowData) {
  return data.heights[index];
}

// 関数の ref にもオブジェクトの ref にも値を渡す
function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

export function WindowedMenuList<
  Option,
  IsMulti extends boolean,
  Group extends GroupBase<Option>,
>(props: MenuListProps<Option, IsMulti, Group>) {
  const { children, getStyles, innerProps, innerRef, selectProps } = props;

  const items = useMemo(() => flattenMenuItems(children), [children]);
  // react-select は候補を描画のたびに作り直すので、並びが変わったかは key で見る
  // (key は元の候補の位置から作られ、絞り込んでも同じ候補なら変わらない)
  const keys = useMemo(() => items.map((item) => String(item.key)), [items]);
  const keySignature = keys.join("\n");

  // 測った行の高さ。候補の key ごとに持つので、絞り込みで並びが変わっても測り直さずに済む
  const [measured, setMeasured] = useState<Record<string, number>>({});

  // 0 は測れていない(表示されていない・jsdom)ので見積もりのままにする
  const onMeasure = useCallback((key: string, height: number) => {
    if (height <= 0) return;
    setMeasured((prev) => (prev[key] === height ? prev : { ...prev, [key]: height }));
  }, []);

  const {
    maxHeight,
    paddingTop = 0,
    paddingBottom = 0,
    ...menuListStyle
  } = getStyles("menuList", props) as CSSProperties;
  const top = Number(paddingTop) || 0;
  const bottom = Number(paddingBottom) || 0;

  const heights = useMemo(
    () =>
      keys.map(
        (key, index) =>
          (measured[key] ?? ESTIMATED_ROW_HEIGHT) +
          (index === 0 ? top : 0) +
          (index === keys.length - 1 ? bottom : 0),
      ),
    [keys, measured, top, bottom],
  );
  const totalHeight = useMemo(() => heights.reduce((sum, height) => sum + height, 0), [heights]);
  const menuHeight = Math.min(Number(maxHeight) || Infinity, totalHeight);

  const listRef = useRef<ListImperativeAPI | null>(null);

  // react-select はメニューの DOM を innerRef で受け取り、キー操作の送りに使う。
  // react-window v2 は外側の DOM を ref で渡さないので、命令 API の element から渡す
  const setListRef = useCallback(
    (api: ListImperativeAPI | null) => {
      listRef.current = api;
      assignRef(innerRef, api?.element ?? null);
    },
    [innerRef],
  );

  // キー操作や絞り込みでフォーカスが移ったら、その候補が見える位置まで送る
  const focusedIndex = Math.max(
    items.findIndex((item) => item.props.isFocused === true),
    0,
  );

  const rowCount = items.length;

  /*
   * 送り先は見積もりの高さで決まるので、送った先の行を測ると位置がずれて、
   * フォーカスした候補が見えないまま止まる(↑で末尾へ回ったときなど)。
   * 送った候補を覚えておき、行の高さが変わるたびに送り直す(見えていれば何もしない)。
   * react-window が描く中身の高さは見積もりなので、送り先が中身より先だとブラウザに
   * 手前で止められる。スクロールのあと中身が描き直されてから、次のフレームでも送り直す。
   * 利用者が自分でスクロールし始めたら、引き戻さないよう送り直しをやめる。
   */
  const scrollTargetRef = useRef<number | null>(null);
  const rowCountRef = useRef(rowCount);

  const followFocus = useCallback(() => {
    const target = scrollTargetRef.current;
    if (target !== null && target < rowCountRef.current) {
      listRef.current?.scrollToRow({ index: target });
    }
  }, []);

  // items は描画のたびに作り直されるので、並びの変化は keySignature で見る
  useEffect(() => {
    if (focusedIndex >= rowCount) return;
    scrollTargetRef.current = focusedIndex;
    listRef.current?.scrollToRow({ index: focusedIndex });
  }, [focusedIndex, keySignature, rowCount]);

  useLayoutEffect(() => {
    rowCountRef.current = rowCount;
    followFocus();
  }, [heights, rowCount, followFocus]);

  const onListScroll = useCallback(() => {
    if (scrollTargetRef.current !== null) requestAnimationFrame(followFocus);
  }, [followFocus]);

  const stopFollowingFocus = useCallback(() => {
    scrollTargetRef.current = null;
  }, []);

  const rowProps = useMemo<RowData>(
    () => ({ items, heights, paddingTop: top, paddingBottom: bottom, onMeasure }),
    [items, heights, top, bottom, onMeasure],
  );

  const { classNamePrefix, isMulti } = selectProps;

  // innerProps は react-select が渡す role="listbox" と id。
  // react-window v2 は既定で role="list" を付けるので、後から渡して上書きする
  return (
    <List<RowData>
      {...innerProps}
      className={
        classNamePrefix
          ? `${classNamePrefix}__menu-list${isMulti ? ` ${classNamePrefix}__menu-list--is-multi` : ""}`
          : ""
      }
      style={{
        ...menuListStyle,
        boxSizing: "border-box",
        height: menuHeight,
        width: "100%",
      }}
      listRef={setListRef}
      onScroll={onListScroll}
      onWheel={stopFollowingFocus}
      onTouchStart={stopFollowingFocus}
      onPointerDown={stopFollowingFocus}
      rowComponent={MenuRow}
      rowCount={items.length}
      rowProps={rowProps}
      rowKey={rowKey}
      rowHeight={rowHeight}
    />
  );
}

type Props<
  Option,
  IsMulti extends boolean,
  Group extends GroupBase<Option>,
> = SelectProps<Option, IsMulti, Group> & {
  // 候補がこの件数以上のときだけ仮想化する
  windowThreshold?: number;
};

export default function WindowedSelect<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>({ windowThreshold = 100, components, options, ...rest }: Props<Option, IsMulti, Group>) {
  const windowed = useMemo(() => countOptions(options), [options]) >= windowThreshold;

  // 毎描画で新しいオブジェクトを渡さない
  const mergedComponents = useMemo(
    () => (windowed ? { ...components, MenuList: WindowedMenuList } : components),
    [components, windowed],
  );

  return <Select {...rest} options={options} components={mergedComponents} />;
}
