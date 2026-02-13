"use client";

import DeckById from "@app/components/organisms/DeckById";

type Props = {
  id: string;
};

export default function TemplateDeckById({ id }: Props) {
  return (
    <>
      <DeckById id={id} />
    </>
  );
}
