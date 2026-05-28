import { NextAdmin } from "@premieroctet/next-admin/adapters/next";
import { getNextAdminProps } from "@premieroctet/next-admin/appRouter";
import { options } from "@/lib/nextadmin";
import { prisma } from "@/lib/prisma";
import "@premieroctet/next-admin/theme";

type Params = { nextadmin?: string[] };
type SearchParams = { [key: string]: string | string[] | undefined };

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const props = await getNextAdminProps({
    params: resolvedParams.nextadmin,
    searchParams: resolvedSearchParams,
    basePath: "/admin",
    apiBasePath: "/api/admin",
    options,
    prisma,
  });

  return <NextAdmin {...props} />;
}
