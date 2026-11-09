import { connection } from "next/server";
import { Workspace } from "@/components/workspace";
import { isPublicDemo } from "@/lib/http.server";
import { publicGenerationConfigured } from "@/lib/public-generation.server";

export default async function Page() {
  await connection();
  const publicDemo = isPublicDemo();
  return <Workspace publicDemo={publicDemo} publicLiveDrafting={publicDemo && publicGenerationConfigured()} />;
}
