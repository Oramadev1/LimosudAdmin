export const CONTRACT_PAYMENT_METHODS = [
  { slug: "cash", label: "Espèce" },
  { slug: "bank_transfer", label: "Virement" },
  { slug: "credit_card", label: "Carte crédit" },
] as const;

export type ContractPaymentMethodSlug = (typeof CONTRACT_PAYMENT_METHODS)[number]["slug"];

export function isContractPaymentMethodSlug(value: string): value is ContractPaymentMethodSlug {
  return CONTRACT_PAYMENT_METHODS.some((method) => method.slug === value);
}

export function normalizeContractPaymentMethodSlug(slug: string | null | undefined): ContractPaymentMethodSlug {
  if (slug === "bank_transfer") {
    return "bank_transfer";
  }

  if (slug === "credit_card" || slug === "debit_card" || slug === "online") {
    return "credit_card";
  }

  return "cash";
}
