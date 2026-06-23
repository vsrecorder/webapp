import { auth } from "@app/auth";

import TemplateHome from "@app/components/templates/Home";
import TemplateDashboard from "@app/components/templates/Dashboard";

export default async function Home() {
  const session = await auth();

  if (session) {
    return <TemplateDashboard />;
  }

  return <TemplateHome />;
}
