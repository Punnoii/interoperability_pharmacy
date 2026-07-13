import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";

// server-side gate for /history, checks the cookie before any client JS runs
export default async function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/");
  }

  // token present but forged/expired, back to login
  const payload = verifyToken(token);
  if (!payload) {
    redirect("/");
  }

  return <>{children}</>;
}
