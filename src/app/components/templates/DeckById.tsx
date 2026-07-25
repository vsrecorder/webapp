"use client";

import DeckById from "@app/components/organisms/Deck/DeckById";

type Props = {
  id: string;
  // 施策E-3「価値メーター」の表示可否（サーバーから受け取り、そのまま流す）。
  valueMeterEnabled?: boolean;
};

export default function TemplateDeckById({ id, valueMeterEnabled }: Props) {
  return <DeckById id={id} valueMeterEnabled={valueMeterEnabled} />;
}
