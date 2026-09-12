"use client";

import { useTheme } from "next-themes";
import { Button } from "@heroui/react";
import type { Selection } from "@heroui/react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { LuSun, LuMoon, LuMonitor } from "react-icons/lu";

import { useHydrated } from "@app/hooks/useHydrated";

// メニューに並べる選択肢。キーは next-themes の theme 値、並びはそのままメニューの表示順
const THEME_OPTIONS = {
  light: {
    label: "ライトモード",
    description: "常に明るい配色で表示",
    Icon: LuSun,
  },
  dark: {
    label: "ダークモード",
    description: "常に暗い配色で表示",
    Icon: LuMoon,
  },
  system: {
    label: "システム設定に合わせる",
    description: "端末（OS）の設定に自動で追従",
    Icon: LuMonitor,
  },
} as const;

type ThemeKey = keyof typeof THEME_OPTIONS;

function isThemeKey(value: string | undefined): value is ThemeKey {
  return value != null && value in THEME_OPTIONS;
}

// ライト/ダーク/システム設定を選ぶドロップダウン
export default function ThemeSwitcher() {
  // SSRとクライアントの不一致を避けるため、ハイドレーションが済んでから描画する
  const mounted = useHydrated();
  // theme: ユーザが選んだ値そのもの("light" | "dark" | "system")
  const { theme, setTheme } = useTheme();

  // マウント前はレイアウトを崩さないようプレースホルダを表示
  if (!mounted) {
    return (
      <Button
        isIconOnly
        variant="light"
        radius="full"
        aria-label="テーマ設定"
        className="text-white/70"
      />
    );
  }

  // 保存値が無い/壊れている場合も含め、未知の値は既定の "system" として扱う
  const selected: ThemeKey = isThemeKey(theme) ? theme : "system";
  // トリガーのアイコンは「今どのモードを選んでいるか」を表す。system のときは
  // 実際の明暗ではなく端末アイコンを出し、OSに追従中だと分かるようにする。
  const TriggerIcon = THEME_OPTIONS[selected].Icon;

  return (
    <Dropdown
      classNames={{
        content:
          "min-w-64 p-1.5 rounded-2xl shadow-xl border border-default-100 dark:border-default-50",
      }}
    >
      <DropdownTrigger>
        <Button
          isIconOnly
          variant="light"
          radius="full"
          aria-label="テーマ設定"
          className="text-white/70 hover:text-white"
        >
          <TriggerIcon className="text-xl" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="テーマ設定"
        variant="flat"
        // disallowEmptySelection: 選択中の項目を押しても選択が外れないようにする
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={new Set([selected])}
        onSelectionChange={(keys: Selection) => {
          // single かつ disallowEmptySelection なので "all" や空集合にはならないが、
          // 型の都合で Set として取り出し、先頭だけを使う
          const next = Array.from(keys as Set<string>)[0];
          if (isThemeKey(next)) setTheme(next);
        }}
      >
        {Object.entries(THEME_OPTIONS).map(([key, { label, description, Icon }]) => (
          <DropdownItem
            key={key}
            color="default"
            description={description}
            startContent={<Icon className="w-4 h-4" />}
          >
            {label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
