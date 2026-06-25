import { CustomerDetailClient } from "@/components/customers/CustomerDetailClient";

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  return <CustomerDetailClient id={Number(id)} />;
}
