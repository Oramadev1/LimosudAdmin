import { Suspense } from "react";

import { CustomerEditClient } from "@/components/customers/CustomerEditClient";

type CustomerEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerEditPage({ params }: CustomerEditPageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<div className="admin-card p-6 text-sm text-gray-500">Loading...</div>}>
      <CustomerEditClient id={Number(id)} />
    </Suspense>
  );
}
