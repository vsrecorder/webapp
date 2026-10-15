"use client";

import {
  Children,
  cloneElement,
  createContext,
  CSSProperties,
  forwardRef,
  HTMLAttributes,
  isValidElement,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Select, { GroupBase, MenuListProps, OptionsOrGroups, Props as SelectProps } from "react-select";
import { ListChildComponentProps, VariableSizeList } from "react-window";

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
  paddingTop: number;
  onMeasure: (key: string, height: number) => void;
};

/*
 * 1行。描画のたびに高さを測って親へ知らせる(変わっていなければ親は何もしない)。
 * 作り直されないので、マウント時だけ測るとフォーカスの縁取りなどで高さが変わっても追えない。
 */
function MenuRow({ data, index, style }: ListChildComponentProps<RowData>) {
  const ref = useRef<HTMLDivElement>(null);
  const item = data.items[index];
  const { onMeasure } = data;

  useLayoutEffect(() => {
    if (ref.current) onMeasure(String(item.key), ref.current.getBoundingClientRect().height);
  });

  return (
    <div style={{ ...style, top: parseFloat(String(style.top)) + data.paddingTop }}>
      <div ref={ref}>{item}</div>
    </div>
  );
}

// react-select の menuList の上下の余白。行の位置と中身の高さに足す
const MenuPaddingContext = createContext({ top: 0, bottom: 0 });

const MenuInner = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function MenuInner({ style, ...rest }, ref) {
    const padding = useContext(MenuPaddingContext);

    return (
      <div
        ref={ref}
        style={{
          ...style,
          height: parseFloat(String(style?.height ?? 0)) + padding.top + padding.bottom,
        }}
        {...rest}
      />
    );
  },
);

function itemKey(index: number, data: RowData) {
  return String(data.items[index].key);
}

export function WindowedMenuList<
  Option,
  IsMulti extends boolean,
  Group extends GroupBase<Option>,
>(props: MenuListProps<Option, IsMulti, Group>) {
  const { children, getStyles, innerRef, selectProps } = props;

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
  const padding = useMemo(() => ({ top, bottom }), [top, bottom]);

  const totalHeight = useMemo(
    () => keys.reduce((sum, key) => sum + (measured[key] ?? ESTIMATED_ROW_HEIGHT), 0),
    [keys, measured],
  );
  const menuHeight = Math.min(Number(maxHeight) || Infinity, totalHeight + top + bottom);

  const listRef = useRef<VariableSizeList<RowData>>(null);

  // react-window は行の位置を覚えておくので、並びか高さが変わったら捨てさせる
  useLayoutEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [keySignature, measured]);

  // キー操作や絞り込みでフォーカスが移ったら、その候補が見える位置まで送る
  const focusedIndex = Math.max(
    items.findIndex((item) => item.props.isFocused === true),
    0,
  );

  useEffect(() => {
    listRef.current?.scrollToItem(focusedIndex);
  }, [focusedIndex, keySignature]);

  const itemData = useMemo<RowData>(
    () => ({ items, paddingTop: top, onMeasure }),
    [items, top, onMeasure],
  );

  const { classNamePrefix, isMulti } = selectProps;

  return (
    <MenuPaddingContext.Provider value={padding}>
      <VariableSizeList<RowData>
        className={
          classNamePrefix
            ? `${classNamePrefix}__menu-list${isMulti ? ` ${classNamePrefix}__menu-list--is-multi` : ""}`
            : ""
        }
        style={menuListStyle}
        ref={listRef}
        outerRef={innerRef}
        innerElementType={MenuInner}
        height={menuHeight}
        width="100%"
        itemCount={items.length}
        itemData={itemData}
        itemKey={itemKey}
        itemSize={(index) => measured[keys[index]] ?? ESTIMATED_ROW_HEIGHT}
        estimatedItemSize={items.length ? Math.floor(totalHeight / items.length) : undefined}
      >
        {MenuRow}
      </VariableSizeList>
    </MenuPaddingContext.Provider>
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
