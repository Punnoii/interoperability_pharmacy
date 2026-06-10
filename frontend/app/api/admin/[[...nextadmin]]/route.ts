import { createHandler } from "@premieroctet/next-admin/appHandler";
import { options } from "@/lib/nextadmin";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

const { run } = createHandler({
  apiBasePath: "/api/admin",
  options,
  prisma,
  paramKey: "nextadmin",
  onRequest: async (req) => {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
    const token = match?.[1];
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || payload.role !== "ADMIN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  },
});

// next-admin's RequestContext uses required string[] but Next.js optional catch-all uses string[] | undefined
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler = (req: Request, ctx: any) => run(req, ctx);
export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
