import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";

// keeps /profile behind auth, same server-side token check as the other protected routes
export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/");
  }

  // reject tampered/stale tokens
  const payload = verifyToken(token);
  if (!payload) {
    redirect("/");
  }

  return <>{children}</>;
}
