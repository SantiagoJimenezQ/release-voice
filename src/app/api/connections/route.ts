import { localRoute } from "@/lib/http.server";
import { connections } from "@/lib/zernio.server";

export function GET(request: Request) {
  return localRoute(request, connections);
}
