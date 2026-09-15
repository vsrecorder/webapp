import { notFound } from "next/navigation";

import BannerCatalog from "@app/components/templates/BannerCatalog";
import { isDevEnv } from "@app/utils/appIcon";

/*
 * 画面下に出る4枚の帯(バナー)の見本。開発環境でだけ開ける。
 *
 * それぞれ出る条件が違ううえ(新規登録の直後・インストール可能・記録作成の直後・記録中)、
 * 同時には1枚しか出さない交通整理も入っているため、実際の利用中に見比べるのが難しい。
 * 手元で形を確かめるための場所。
 */
export const metadata = {
  title: "バナー見本",
  robots: { index: false, follow: false },
};

export default function Page() {
  // 本番では存在しないページとして扱う
  if (!isDevEnv()) notFound();

  return <BannerCatalog />;
}
