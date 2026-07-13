import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";

// auth wall for the main app, runs on the server so unauthed users never see the page flash
export default async function HomepageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/");
  }

  // bad signature or expired, bounce to login
  const payload = verifyToken(token);
  if (!payload) {
    redirect("/");
  }

  return <>{children}</>;
}
