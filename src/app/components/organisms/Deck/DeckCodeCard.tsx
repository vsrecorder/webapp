"use client";

import { useEffect, useState } from "react";

import { Chip } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Image } from "@heroui/react";
import { Snippet } from "@heroui/react";

import { LuLayers } from "react-icons/lu";

import { DeckCodeType } from "@app/types/deck_code";
//import { AcespecType } from "@app/types/acespec";
import { EnvironmentType } from "@app/types/environment";

/*
async function fetchAcespec(code: string) {
  try {
    const res = await fetch(`/api/deckcards/${code}/acespec`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (res.status === 204) {
      return null;
    }

    const ret: AcespecType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}
  */

async function fetchEnvironment(date: Date) {
  try {
    const res = await fetch(`/api/environments?date=${date.toString().split("T")[0]}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const ret: EnvironmentType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  deckcode: DeckCodeType | null;
  // 表示中のdeckcode自体の通し番号（登録が古い順で1, 2, 3...。取得中はnull）
  // 総バージョン数ではなく、あくまで「このdeckcodeが何番目か」を渡すこと
  versionNumber: number | null;
  // deckcodeが紐づくデッキに登録済みの総バージョン数（取得中はnull）
  // deckcodeがnullのとき、「デッキに既存バージョンがあるか」の判定に使う
  totalVersionCount?: number | null;
  // デッキにバージョンが1件も無いとき、「デッキのバージョンを作成」CTAから呼ばれる
  onCreateVersion?: () => void;
  // デッキに既存バージョンはあるが、このdeckcodeが未選択のとき、
  // 「既存バージョンを使用したバージョンとして登録」CTAから呼ばれる
  onSelectExistingVersion?: () => void;
  // ボード(記録詳細/モーダル)向けの案1レイアウト。
  // デッキ画像を主役に上へ置き、その下にコード・バージョン/環境チップを並べる。
  board?: boolean;
  // デッキ画像を別所（ギャラリー表示のヒーロー画像）で表示する場合に true。
  // このときデフォルトレイアウトは画像を省き、バージョン/環境/コードのみ描画する。
  hideImage?: boolean;
  // バージョン情報の見出し横に表示する「バージョンの数」バッジ。
  // 値が1以上のとき、onOpenHistory と併せてタップでバージョン履歴を開くボタンになる。
  versionCountBadge?: number | null;
  onOpenHistory?: () => void;
  // アーカイブしたデッキでは新しいバージョンを作成できないため、
  // バージョン作成CTAはグレーアウトした非活性表示に差し替える
  isArchived?: boolean;
};

export default function DeckCodeCard({
  deckcode,
  versionNumber,
  totalVersionCount = null,
  onCreateVersion,
  onSelectExistingVersion,
  board = false,
  hideImage = false,
  versionCountBadge = null,
  onOpenHistory,
  isArchived = false,
}: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  //const [acespec, setAcespec] = useState<AcespecType | null>(null);
  //const [loadingAcespec, setLoadingAcespec] = useState(true);
  //const [errorAcespec, setErrorAcespec] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentType | null>(null);
  const [loadingEnvrionment, setLoadingEnvironment] = useState(true);
  const [errorEnvironment, setErrorEnvironment] = useState<string | null>(null);

  const versionLabel =
    deckcode && deckcode.id
      ? versionNumber
        ? `バージョン${versionNumber}`
        : "バージョン：取得中..."
      : "バージョン：なし";

  useEffect(() => {
    if (!deckcode?.code) return;
    const img = new window.Image();
    img.src = `https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`;
  }, [deckcode?.code]);

  useEffect(() => {
    if (!deckcode || !deckcode.id) {
      //setLoadingAcespec(false);
      setLoadingEnvironment(false);
      return;
    }

    //setLoadingAcespec(true);
    setLoadingEnvironment(true);

    /*
    const fetchAcespecData = async () => {
      try {
        setLoadingAcespec(true);
        const data = await fetchAcespec(deckcode.code);
        //setAcespec(data);
      } catch (err) {
        console.log(err);
        setErrorAcespec(
          `Acespecカードのデータ取得に失敗しました(デッキコード: ${deckcode.code})`,
        );
      } finally {
        setLoadingAcespec(false);
      }
    };
    */

    const fetchEnvironmentData = async () => {
      try {
        setLoadingEnvironment(true);
        const data = await fetchEnvironment(deckcode.created_at);
        setEnvironment(data);
      } catch (err) {
        console.log(err);
        setErrorEnvironment("対戦環境のデータ取得に失敗しました");
      } finally {
        setLoadingEnvironment(false);
      }
    };

    //fetchAcespecData();
    fetchEnvironmentData();
  }, [deckcode]);

  /*
  if (errorAcespec || errorEnvironment) {
  }
  */

  if (errorEnvironment) {
  }

  if (!deckcode || !deckcode.code) {
    // デッキ自体には既にバージョンが存在する（＝このdeckcode欄が未選択なだけ）場合は、
    // 新規作成ではなく既存バージョンの登録を促す
    if (totalVersionCount !== null && totalVersionCount > 0) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectExistingVersion?.();
          }}
          className="group w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-success/40 bg-success/5 px-4 py-6 transition-colors hover:border-success/70 hover:bg-success/10 active:opacity-80"
        >
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center transition-colors group-hover:bg-success/20">
            <LuLayers className="text-xl text-success" />
          </div>
          <div className="font-bold text-tiny text-success">
            バージョンがあります。
            <br />
            使用したバージョンとして登録しよう。
          </div>
          <div className="text-tiny text-default-400 text-center">
            登録済みのバージョンをこの記録に紐づけると
            <br />
            使用したカード構成まで記録できます
          </div>
        </button>
      );
    }

    // アーカイブしたデッキは新しいバージョンを作成できないため、
    // CTAではなくグレーアウトした非活性の案内を出す
    if (isArchived) {
      return (
        <div className="w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-default-200 bg-default-50 px-4 py-6 text-default-300">
          <div className="w-10 h-10 rounded-full bg-default-100 flex items-center justify-center">
            <LuLayers className="text-xl" />
          </div>
          <div className="font-bold text-tiny">バージョンがありません</div>
          <div className="text-tiny text-center">
            アーカイブしたデッキでは
            <br />
            新しいバージョンを作成できません
          </div>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCreateVersion?.();
        }}
        className="group w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-6 transition-colors hover:border-primary/60 hover:bg-primary/10 active:opacity-80"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
          <LuLayers className="text-xl text-primary" />
        </div>
        <div className="font-bold text-tiny text-primary">
          デッキのバージョンを作成しよう
        </div>
        <div className="text-tiny text-default-400 text-center">
          デッキコードを登録すると
          <br />
          対戦記録やカード構成を記録できます
        </div>
      </button>
    );
  }

  const deckImage = (
    <div className="relative w-full aspect-2/1">
      {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
      <Image
        radius="sm"
        shadow="none"
        alt={deckcode.code}
        src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
        className=""
        onLoad={() => setImageLoaded(true)}
      />
    </div>
  );

  // ボード(記録詳細/モーダル/デッキ一覧)は案1レイアウト：
  // デッキ画像を主役に上へ置き、その下にコード、バージョン・環境チップを並べる。
  // 画像を別所（ギャラリー表示のヒーロー画像）で見せている場合は hideImage で省く。
  if (board) {
    return (
      <div className="flex w-full flex-col gap-2.5">
        {!hideImage && deckImage}

        <div className="flex min-w-0 items-center justify-center gap-2 rounded-lg bg-default-100 px-3 py-2">
          <span className="shrink-0 text-tiny text-default-500">デッキコード</span>
          <Snippet
            size="sm"
            radius="none"
            timeout={3000}
            disableTooltip={true}
            hideSymbol={true}
            classNames={{ base: "min-w-0 bg-transparent p-0", pre: "truncate" }}
          >
            {deckcode.code}
          </Snippet>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {deckcode.id && (
            <Chip
              size="sm"
              variant="flat"
              color="primary"
              className="h-5 text-[10px] font-bold"
            >
              {versionLabel}
            </Chip>
          )}
          {environment?.title && (
            <Chip
              size="sm"
              variant="flat"
              color="default"
              className="h-5"
              classNames={{ content: "text-[10px]" }}
            >
              {`『${environment.title}』`}
            </Chip>
          )}
          {/* バージョン数バッジはチップ群の右端に寄せ、タップでバージョン履歴を開く */}
          {versionCountBadge !== null &&
            versionCountBadge > 0 &&
            (onOpenHistory ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenHistory();
                }}
                className="ml-auto flex h-5 shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 text-[10px] font-bold text-primary active:opacity-70"
              >
                <LuLayers className="text-xs" />
                バージョンの数： {versionCountBadge}
              </button>
            ) : (
              <span className="ml-auto flex h-5 shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 text-[10px] font-bold text-primary">
                <LuLayers className="text-xs" />
                バージョンの数： {versionCountBadge}
              </span>
            ))}
        </div>
      </div>
    );
  }

  const versionInfo = (
    <div className="rounded-xl bg-default-100 px-3 py-2.5 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold text-small">{versionLabel}</div>
        {versionCountBadge !== null &&
          versionCountBadge > 0 &&
          (onOpenHistory ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenHistory();
              }}
              className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-tiny font-bold text-primary active:opacity-70"
            >
              <LuLayers className="text-sm" />
              バージョンの数： {versionCountBadge}
            </button>
          ) : (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-tiny font-bold text-primary">
              <LuLayers className="text-sm" />
              バージョンの数： {versionCountBadge}
            </span>
          ))}
      </div>
      <div className="text-tiny text-default-500">
        {loadingEnvrionment ? (
          <div className="flex items-center">
            対戦環境：
            <Skeleton className="h-4 w-32" />
          </div>
        ) : environment && environment.title ? (
          <>対戦環境：『{environment.title}』</>
        ) : (
          <></>
        )}
      </div>
      <div className="text-tiny text-default-500 flex items-center gap-1">
        <>デッキコード：</>
        <Snippet
          size="sm"
          radius="none"
          timeout={3000}
          disableTooltip={true}
          hideSymbol={true}
          classNames={{ base: "bg-transparent p-0" }}
        >
          {deckcode.code}
        </Snippet>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-2 w-full">
      {versionInfo}
      {!hideImage && deckImage}
    </div>
  );
}
