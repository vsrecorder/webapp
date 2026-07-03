"use client";

import { useEffect, useState } from "react";
import { Input } from "@heroui/react";

import UserIdentityCard from "@app/components/organisms/User/UserIdentityCard";
import BadgeGallery from "@app/components/organisms/Badge/BadgeGallery";
import DesignationPanel from "@app/components/organisms/Designation/DesignationPanel";
import { UserType } from "@app/types/user";

type Props = {
  id: string;
};

export default function TemplateUser({ id }: Props) {
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    fetch(`/api/users/${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, [id]);

  const userCreatedAt = user?.created_at != null ? String(user.created_at) : undefined;

  return (
    <>
      <div className="pt-2 max-w-2xl mx-auto w-full flex flex-col gap-3">
        <UserIdentityCard userId={id} />
        <DesignationPanel userId={id} userCreatedAt={userCreatedAt} />
        <BadgeGallery userId={id} userCreatedAt={userCreatedAt} />
      </div>

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
