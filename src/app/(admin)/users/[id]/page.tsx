import { UserAccessClient } from "@/components/users/UserAccessClient";

export default async function UserAccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <UserAccessClient id={Number(id)} />;
}
