import { useState, useRef, useEffect } from "react";

import { Card, CardBody } from "@heroui/react";
import { LuSwords, LuLayers, LuChartNoAxesColumn } from "react-icons/lu";

import RecordHero from "@app/components/organisms/Record/Hero/RecordHero";
import BoardPanel from "@app/components/organisms/Record/BoardPanel";
import IgnoreStatsFlgSetting from "@app/components/organisms/Record/IgnoreStatsFlgSetting";
import Matches from "@app/components/organisms/Match/Matches";
import UsedDeckById from "@app/components/organisms/Deck/UsedDeckById";
import RecordActionsFloating from "@app/components/molecules/Floating/RecordActionsFloating";

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
    <div className="px-0.5 pt-6 pb-6 flex flex-col gap-4 lg:max-w-2xl lg:mx-auto overflow-y-auto">
      {/* ヒーロー：イベント情報＋戦績(勝率リング・勝敗・推移)＋集計対象外バナー */}
      {record && (
        <RecordHero
          record={record}
          setRecord={setRecord}
          stats={stats}
          enableEditTCGMeisterURL={true}
          enableEditUsedDeck={true}
        />
      )}

      {/* ボード：対戦結果・デッキコード・戦績集計を1枚のカードにまとめる */}
      <Card shadow="sm" className="w-full overflow-hidden">
        <CardBody className="p-0">
          <BoardPanel icon={<LuSwords />} label="対戦結果">
            <Matches
              record={record}
              matches={matches}
              setMatches={setMatches}
              loading={loadingMatches}
              enableCreateMatchModalButton={true}
              enableUpdateMatchModalButton={true}
              flat={true}
            />
          </BoardPanel>

          <BoardPanel icon={<LuLayers />} label="デッキコード">
            <div ref={deckCardRef}>
              <UsedDeckById
                record={record}
                setRecord={setRecord}
                enableShowDeckModal={false}
                enableUpdateUsedDeckModal={true}
                compact={true}
              />
            </div>
          </BoardPanel>

          <BoardPanel icon={<LuChartNoAxesColumn />} label="戦績集計">
            {record && (
              <IgnoreStatsFlgSetting record={record} setRecord={setRecord} flat={true} />
            )}
          </BoardPanel>
        </CardBody>
      </Card>

      {record && (
        <RecordActionsFloating
          record={record}
          setRecord={setRecord}
          matches={matches}
          stats={stats}
          deckCardRef={deckCardRef}
        />
      )}
    </div>
  );
}
