"use client";

import { Input } from "@heroui/react";

type Props = {
  id: string;
};

export default function TemplateUser({ id }: Props) {
  return (
    <>
      <div className="text-center">ユーザID: {id}</div>

      <Input
        type="file"
        //variant="unstyled"
        accept="image/png, image/jpeg, image/gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();

            reader.onload = (e) => {
              if (!e.target || !e.target.result) {
                //setCropImage("");
                return;
              }

              //setCropImage(e.target.result.toString());
            };

            reader.readAsDataURL(e.target.files[0]);
            e.target.value = "";

            //onOpenCropper();
          }
        }}
      />
    </>
  );
}
