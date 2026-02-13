"use client";

import RecordById from "@app/components/organisms/RecordById";

type Props = {
  id: string;
};

export default function TemplateRecordById({ id }: Props) {
  return (
    <>
      <RecordById id={id} />
    </>
  );
}
