"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Image,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
} from "@heroui/react";
import { LuLock, LuChevronDown, LuChevronUp } from "react-icons/lu";

import { Modal } from "@app/components/atoms/AppModal";
import FetchError from "@app/components/molecules/FetchError";

import { UserEnvironmentBadgeType } from "@app/types/environment_badge";
import { environmentBadgeImageUrl } from "@app/utils/badgeImage";
import { formatAchievedAt } from "@app/components/organisms/Badge/badgeUi";

type Props = {
  userId: string;
};

// 対戦環境(environments)ごとに、初めて対戦結果を追加したことを表すバッジパネル。
// badge_definitions/user_badges とは別の独立した仕組み(user_environment_badges)で、
// 閾値ではなく画像で実績を表現するため、BadgeGallery/OnboardingBadgePanelとは別コンポーネントとして
// 独立させている。

// 1行3列で表示し、多い場合は初期表示を3行分に折りたたむ。
const COLUMN_COUNT = 3;
const INITIAL_VISIBLE_ROWS = 3;
const INITIAL_VISIBLE_COUNT = COLUMN_COUNT * INITIAL_VISIBLE_ROWS;

// "/"区切りやスペース区切りのタイトル(例:「スタン/ローテ」「シティリーグ 2024」)は
// タイル幅が狭く不格好に折り返されるため、区切り文字の直後で明示的に改行する。
function renderEnvironmentBadgeTitle(title: string) {
  const segments = title.split(/(?<=[/ ])/);
  return segments.map((segment, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {segment}
    </Fragment>
  ));
}

function EnvironmentBadgeTile({
  badge,
  onSelect,
}: {
  badge: UserEnvironmentBadgeType;
  onSelect: (badge: UserEnvironmentBadgeType) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(badge)}
      className={`flex w-full flex-col items-center gap-1.5 px-1 py-3 rounded-xl text-center transition-transform active:scale-95 ${
        badge.achieved ? "bg-warning/10" : "bg-default-100"
      }`}
      aria-label={`${badge.title}の詳細を見る`}
    >
      <div
        className={`flex items-center justify-center w-11 h-11 ${
          badge.achieved ? "" : "rounded-lg bg-default-200 text-default-400"
        }`}
      >
        {badge.achieved ? (
          <Image
            alt={badge.title}
            src={environmentBadgeImageUrl(badge.environment_id)}
            radius="none"
            className="w-11 h-11 object-contain"
          />
        ) : (
          <LuLock className="w-5 h-5" />
        )}
      </div>
      <span
        className={`text-[0.6875rem] font-bold leading-tight ${
          badge.achieved ? "text-default-700" : "text-default-400"
        }`}
      >
        {renderEnvironmentBadgeTitle(badge.title)}
      </span>
    </button>
  );
}

// EnvironmentBadgeTile と同じ構造(画像枠+テキスト)のプレースホルダー。
// アイコンバッジ用の BadgeTileSkeleton は円形前提のため、画像の形に合わせたこちら専用のものを使う。
//
// タイトルの行数はタイル幅で変わるため、高さを px で固定すると特定の画面幅でしか合わない。
// 代表的な環境名を実タイルと同じ文字サイズ・行間で invisible に置き、折り返しの計算を
// ブラウザに任せて高さを決める(renderEnvironmentBadgeTitle が "/" と空白の直後で改行する)。
//
// グリッドの行の高さは、その行で一番背の高いタイルに揃う。環境名の長さはまちまちで、
// 初期表示の9件には「短い2段」「長い2段」「中くらいの2段」が混ざるため、
// 全部を同じ長さで測ると狭い画面で必ずズレる(実データで測ると 320px では行ごとに
// 2行・4行・3行と全部違う)。行ごとに違う長さの実在タイトルを代表値として置く。
// どの長さがどの行に来るかは新しい環境が増えるたびに入れ替わるので、位置ではなく
// 「9件のうちに3種類の長さが混ざる」ことを再現するのが目的。
const ENVIRONMENT_TITLE_SAMPLES = [
  "古代の咆哮/未来の一閃",
  "スタートデッキ100 バトルコレクション",
  "メガブレイブ/メガシンフォニア",
];

function EnvironmentBadgeTileSkeleton({ titleSample }: { titleSample: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-1 py-3 rounded-xl bg-default-100">
      <div className="w-11 h-11 rounded-lg bg-default-200 animate-pulse" />
      <div className="relative w-full">
        <span
          aria-hidden="true"
          className="invisible block text-center text-[0.6875rem] font-bold leading-tight"
        >
          {renderEnvironmentBadgeTitle(titleSample)}
        </span>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <div className="w-4/5 h-2.5 rounded-full bg-default-200 animate-pulse" />
          <div className="w-3/5 h-2.5 rounded-full bg-default-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function EnvironmentBadgeGallery({ userId }: Props) {
  const [badges, setBadges] = useState<UserEnvironmentBadgeType[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<UserEnvironmentBadgeType | null>(
    null,
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  function handleSelect(badge: UserEnvironmentBadgeType) {
    setSelectedBadge(badge);
    onOpen();
  }

  // 取得に失敗したことを「獲得数 0 / 0」の空表示で覆い隠さないよう、
  // 失敗はエラーとして扱い、この場だけで取り直せるようにする。
  const loadBadges = useCallback(async () => {
    setError(false);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/users/${userId}/environment_badges`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch");
      }

      const data = await res.json();

      setBadges(data?.badges ?? []);
    } catch (err) {
      console.log(err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  if (isLoading) {
    return (
      <Card className="shadow-md">
        {/* 余白・グリッド・行数は実カードと同じにする(p-3 / -mx-3 なし) */}
        <CardBody className="p-3 flex flex-col gap-2">
          {/* 獲得数(text-xs = 16px の行) */}
          <div className="h-4 flex items-center">
            <div className="w-24 h-2.5 rounded-full bg-default-100 animate-pulse" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: INITIAL_VISIBLE_COUNT }).map((_, i) => (
              <EnvironmentBadgeTileSkeleton
                key={i}
                titleSample={
                  ENVIRONMENT_TITLE_SAMPLES[
                    Math.floor(i / COLUMN_COUNT) % ENVIRONMENT_TITLE_SAMPLES.length
                  ]
                }
              />
            ))}
          </div>
          {/* 「すべて表示 (N)」ボタン(Button size="sm" = 32px)。対戦環境は
              INITIAL_VISIBLE_COUNT(9) を常に超えている(2026-08 時点で32件)ので、
              折りたたみボタンは必ず出るものとして場所を確保する */}
          <div className="w-full h-8 rounded-xl bg-default-100 animate-pulse" />
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return <FetchError message="環境バッジの取得に失敗しました" onRetry={loadBadges} />;
  }

  const achievedCount = badges?.filter((b) => b.achieved).length ?? 0;
  const hasMore = (badges?.length ?? 0) > INITIAL_VISIBLE_COUNT;
  const visibleBadges = isExpanded
    ? (badges ?? [])
    : (badges ?? []).slice(0, INITIAL_VISIBLE_COUNT);

  return (
    <Card className="shadow-md">
      <CardBody className="p-3 flex flex-col gap-2">
        <span className="text-xs font-bold text-default-500 shrink-0">
          獲得数 {achievedCount} / {badges?.length ?? 0}
        </span>
        <div className="grid grid-cols-3 gap-2">
          {visibleBadges.map((badge) => (
            <EnvironmentBadgeTile
              key={badge.environment_id}
              badge={badge}
              onSelect={handleSelect}
            />
          ))}
        </div>
        {hasMore && (
          <Button
            size="sm"
            variant="light"
            className="text-default-500"
            onPress={() => setIsExpanded((prev) => !prev)}
            endContent={isExpanded ? <LuChevronUp /> : <LuChevronDown />}
          >
            {isExpanded ? "閉じる" : `すべて表示 (${badges?.length ?? 0})`}
          </Button>
        )}
      </CardBody>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center" size="sm">
        <ModalContent>
          {selectedBadge && (
            <>
              <ModalHeader className="flex flex-col items-center gap-2 pt-6 pb-2">
                <div
                  className={`flex items-center justify-center w-28 h-28 ${
                    selectedBadge.achieved
                      ? ""
                      : "rounded-lg bg-default-200 text-default-400"
                  }`}
                >
                  {selectedBadge.achieved ? (
                    <Image
                      alt={selectedBadge.title}
                      src={environmentBadgeImageUrl(selectedBadge.environment_id)}
                      radius="none"
                      className="w-28 h-28 object-contain"
                    />
                  ) : (
                    <LuLock className="w-12 h-12" />
                  )}
                </div>
                <span className="text-base font-black text-center">
                  {renderEnvironmentBadgeTitle(selectedBadge.title)}
                </span>
              </ModalHeader>
              <ModalBody className="pb-6 pt-0 text-center gap-1">
                <p className="text-sm text-default-600">
                  『{selectedBadge.title}』環境で対戦をした
                </p>
                {selectedBadge.achieved && selectedBadge.achieved_at && (
                  <p className="text-xs text-default-400 mt-1">
                    {formatAchievedAt(selectedBadge.achieved_at)}
                  </p>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </Card>
  );
}
