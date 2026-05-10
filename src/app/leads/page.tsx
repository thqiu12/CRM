import LeadsClient from "./leads-client";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const seedQuery = typeof sp.query === "string" ? sp.query : "";
  return <LeadsClient key={seedQuery} seedQuery={seedQuery} />;
}
