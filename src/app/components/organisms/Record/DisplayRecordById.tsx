import { useState, useRef, useEffect } from "react";

import { Card, CardBody } from "@heroui/react";
import { LuLayers, LuChartNoAxesColumn, LuScrollText, LuTag } from "react-icons/lu";

import RecordHero from "@app/components/organisms/Record/Hero/RecordHero";
import BoardPanel from "@app/components/organisms/Record/BoardPanel";
import IgnoreStatsFlgSetting from "@app/components/organisms/Record/IgnoreStatsFlgSetting";
import RegulationSetting from "@app/components/organisms/Record/RegulationSetting";
import RecordTagSetting from "@app/components/organisms/Record/RecordTagSetting";
import Matches from "@app/components/organisms/Match/Matches";
import UsedDeckById from "@app/components/organisms/Deck/UsedDeckById";
import RecordActionsFloating from "@app/components/molecules/Floating/RecordActionsFloating";
import FloatingButtonClearance from "@app/components/atoms/Floating/FloatingButtonClearance";

import {
  RECORD_SETTING_DESCRIPTIONS,
  ignoreStatsSummary,
  regulationSummary,
  tagSummary,
} from "@app/components/organisms/Record/recordSettings";

import { fetchMatchesByRecordId, summarizeMatches } from "@app/utils/matchStats";

import { RecordGetByIdResponseType } from "@app/types/record";
import { MatchGetResponseType } from "@app/types/match";

type Props = {
  recordData: RecordGetByIdResponseType;
};

export default function DisplayRecordById({ recordData }: Props) {
  const [record, setRecord] = useState<RecordGetByIdResponseType | null>(recordData);

  // 対戦一覧を親で一元管理し、ヒーローの戦績と対戦結果表示で共有する
  const [matches, setMatches] = useState<MatchGetResponseType[] | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(true);

  // 戦績パネルの裏面(貢献度)の表示状態。シェア画像は画面外に別の RecordHero を
  // 描画して撮るため、画面と同じ面を撮れるよう状態はここで持ちシェア側にも渡す。
  const [showSynergy, setShowSynergy] = useState(false);

  // イベント情報を変更したときにヒーローへ取り直しを促すためのキー。
  // 自由形式イベントの編集は参照先IDが変わらないため、record の変化では追従できない。
  const [eventRefreshKey, setEventRefreshKey] = useState(0);

  const deckCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ignore = false;
    setLoadingMatches(true);
    fetchMatchesByRecordId(recordData.id)
      .then((data) => {
        if (!ignore) setMatches(data);
      })
      .catch((err) => {
        console.log(err);
        if (!ignore) setMatches([]);
      })
      .finally(() => {
        if (!ignore) setLoadingMatches(false);
      });
    return () => {
      ignore = true;
    };
  }, [recordData.id]);

  const stats = summarizeMatches(matches ?? []);

  return (
    <>
      <div className="px-0.5 pt-6 pb-6 flex flex-col gap-4 lg:max-w-2xl lg:mx-auto overflow-y-auto">
        {/* ヒーロー：イベント情報＋戦績(勝率リング・勝敗)＋使用デッキ＋対戦結果＋集計対象外バナー */}
        {record && (
          <RecordHero
            record={record}
            setRecord={setRecord}
            stats={stats}
            loadingStats={loadingMatches}
            showSynergy={showSynergy}
            onToggleSynergy={() => setShowSynergy((prev) => !prev)}
            enableEditTCGMeisterURL={true}
            enableEditUsedDeck={true}
            enableEditMatches={true}
            eventRefreshKey={eventRefreshKey}
            matchesSlot={
              <Matches
                record={record}
                matches={matches}
                setMatches={setMatches}
                loading={loadingMatches}
                enableCreateMatchModalButton={true}
                enableUpdateMatchModalButton={true}
                flat={true}
              />
            }
          />
        )}

        {/* デッキリスト：この記録について「見るもの」。下の設定カードとは役割が違うので分ける。
          ヒーロー内の「使用デッキ」がデッキ名とスプライトを示すのに対し、
          こちらは中身(デッキコード・カード一覧)を見るための区画なので名前で区別する。 */}
        <Card shadow="sm" className="w-full overflow-hidden">
          <CardBody className="p-0">
            <BoardPanel icon={<LuLayers />} label="デッキリスト">
              <div ref={deckCardRef}>
                <UsedDeckById
                  record={record}
                  setRecord={setRecord}
                  enableShowDeckModal={false}
                  enableUpdateUsedDeckModal={true}
                  compact={true}
                  enableCardList={true}
                />
              </div>
            </BoardPanel>
          </CardBody>
        </Card>

        {/* この記録の設定：「変えるもの」をまとめる。
          各パネルは見出しの右に現在値を出し、説明文は「?」の吹き出しへ畳んである
          (説明を3つ常時出すと、それだけで画面を占めてしまうため)。 */}
        {record && (
          <Card shadow="sm" className="w-full overflow-hidden">
            <CardBody className="p-0">
              <div className="px-4 pt-3.5 pb-2.5">
                <span className="text-xs font-bold tracking-wide text-default-500">
                  この記録の設定
                </span>
              </div>

              <BoardPanel
                icon={<LuScrollText />}
                label="レギュレーション"
                value={regulationSummary(record)}
                help={RECORD_SETTING_DESCRIPTIONS.regulation}
              >
                <RegulationSetting
                  record={record}
                  setRecord={setRecord}
                  flat={true}
                  showDescription={false}
                />
              </BoardPanel>

              <BoardPanel
                icon={<LuTag />}
                label="タグ"
                value={tagSummary(record)}
                help={RECORD_SETTING_DESCRIPTIONS.tag}
              >
                <RecordTagSetting
                  record={record}
                  setRecord={setRecord}
                  flat={true}
                  showDescription={false}
                />
              </BoardPanel>

              <BoardPanel
                icon={<LuChartNoAxesColumn />}
                label="戦績集計"
                value={ignoreStatsSummary(record)}
                help={RECORD_SETTING_DESCRIPTIONS.ignoreStats}
              >
                <IgnoreStatsFlgSetting
                  record={record}
                  setRecord={setRecord}
                  flat={true}
                  showDescription={false}
                />
              </BoardPanel>
            </CardBody>
          </Card>
        )}

        {record && (
          <RecordActionsFloating
            record={record}
            setRecord={setRecord}
            matches={matches}
            stats={stats}
            showSynergy={showSynergy}
            deckCardRef={deckCardRef}
            onEventInfoUpdated={() => setEventRefreshKey((prev) => prev + 1)}
          />
        )}
      </div>

      {/* 最下部のカードが右下のフローティング操作群(シェア / 3点メニュー)に隠れないよう
          余白を確保する。末尾がボタンに掛からないときは余白を出さないので、
          空白へスクロールできてしまうことはない。
          gap-4 が効かないよう、上のカラムの外に置いている。 */}
      <FloatingButtonClearance />
    </>
  );
}
