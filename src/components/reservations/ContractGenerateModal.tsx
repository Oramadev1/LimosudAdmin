"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getContractForm, generateContract } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { ContractDetailsPayload, ContractFormData } from "@/types/api";
import { AdminFormField, ErrorMessage } from "@/components/ui/AdminUi";

type ContractGenerateModalProps = {
  reservationId: number;
  open: boolean;
  onClose: () => void;
  onGenerated: () => void;
};

const MISSING_FIELD_LABELS: Record<string, string> = {
  "customer.passport_or_cin": "Passport / CIN",
  "customer.address": "Address",
  "customer.driving_license_number": "Driving license number",
  "customer.license_issued_at": "License issued date",
};

function resolveMissingFields(
  auto: ContractFormData["auto"],
  details: ContractDetailsPayload,
): string[] {
  const missing: string[] = [];

  if (!details.customer.passport_or_cin?.trim() && !auto.customer.passport_or_cin?.trim()) {
    missing.push("customer.passport_or_cin");
  }

  if (!details.customer.address?.trim()) {
    missing.push("customer.address");
  }

  if (!details.customer.driving_license_number?.trim() && !auto.customer.driving_license_number?.trim()) {
    missing.push("customer.driving_license_number");
  }

  if (!details.customer.license_issued_at?.trim()) {
    missing.push("customer.license_issued_at");
  }

  return missing;
}

function missingInputClass(isMissing: boolean) {
  return isMissing ? "admin-input border-amber-400 ring-1 ring-amber-200" : "admin-input";
}

const EQUIPMENT_FIELDS: Array<{ key: keyof ContractDetailsPayload["equipment"]; label: string }> = [
  { key: "jack", label: "Jack (Cric)" },
  { key: "wheel_wrench", label: "Wheel wrench" },
  { key: "spare_key", label: "Spare key" },
  { key: "warning_triangle", label: "Warning triangle" },
  { key: "fire_extinguisher", label: "Fire extinguisher" },
  { key: "spare_wheel", label: "Spare wheel" },
  { key: "first_aid_kit", label: "First aid kit" },
  { key: "gps", label: "GPS" },
  { key: "phone_charger", label: "Phone charger" },
  { key: "child_seat", label: "Child seat" },
  { key: "other_accessories", label: "Other accessories" },
];

const DOCUMENT_FIELDS: Array<{ key: keyof ContractDetailsPayload["documents"]; label: string }> = [
  { key: "ww", label: "WW" },
  { key: "registration_card", label: "Registration card" },
  { key: "technical_inspection", label: "Technical inspection" },
  { key: "insurance", label: "Insurance" },
  { key: "green_card", label: "Green card" },
  { key: "authorization", label: "Authorization" },
  { key: "vignette", label: "Vignette" },
  { key: "rental_contract_copy", label: "Rental contract copy" },
  { key: "other_documents", label: "Other documents" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-gray-200 bg-gray-50/60 p-4">
      <h3 className="mb-3 text-sm font-bold text-gray-900">{title}</h3>
      {children}
    </section>
  );
}

export function ContractGenerateModal({
  reservationId,
  open,
  onClose,
  onGenerated,
}: ContractGenerateModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ContractFormData | null>(null);
  const [details, setDetails] = useState<ContractDetailsPayload | null>(null);
  const [contractSeries, setContractSeries] = useState("A");

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getContractForm(reservationId);
        if (cancelled) return;
        setForm(response.data);
        setDetails(response.data.details);
        setContractSeries(response.data.auto.contract_series);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load contract form.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, reservationId]);

  const missingFields =
    form && details ? resolveMissingFields(form.auto, details) : [];

  const updateDetails = (updater: (current: ContractDetailsPayload) => ContractDetailsPayload) => {
    setDetails((current) => (current ? updater(current) : current));
  };

  const handleSubmit = async () => {
    if (!details) return;

    setSubmitting(true);
    setError(null);
    try {
      await generateContract(reservationId, {
        contract_series: contractSeries,
        details,
      });
      onGenerated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Contract generation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[12px] bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Generate contract</h2>
          <p className="mt-1 text-sm text-gray-500">
            Review auto-filled data and complete missing fields before creating the PDF.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error ? <div className="mb-4"><ErrorMessage message={error} /></div> : null}

          {loading || !form || !details ? (
            <p className="text-sm text-gray-500">Loading contract form...</p>
          ) : (
            <div className="space-y-4">
              {missingFields.length > 0 ? (
                <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-medium">Complete these customer details for a full contract PDF:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {missingFields.map((field) => (
                      <li key={field}>{MISSING_FIELD_LABELS[field] ?? field}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-amber-800">
                    Fill the highlighted fields below. They will be saved to the customer profile when you generate.
                  </p>
                </div>
              ) : null}

              <Section title="Contract information">
                <div className="grid gap-4 md:grid-cols-3">
                  <AdminFormField label="Contract series">
                    <input
                      className="admin-input"
                      value={contractSeries}
                      onChange={(e) => setContractSeries(e.target.value)}
                    />
                  </AdminFormField>
                  <AdminFormField label="Reservation">
                    <input className="admin-input bg-gray-50" readOnly value={form.reservation_number} />
                  </AdminFormField>
                  <AdminFormField label="Generation date">
                    <input className="admin-input bg-gray-50" readOnly value={form.auto.generation_date} />
                  </AdminFormField>
                </div>
              </Section>

              <Section title="Customer details">
                <div className="mb-4 grid gap-3 md:grid-cols-2">
                  <input className="admin-input bg-gray-50" readOnly value={form.auto.customer.full_name} />
                  <input className="admin-input bg-gray-50" readOnly value={form.auto.customer.phone} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminFormField label="Passport / CIN">
                    <input
                      className={missingInputClass(missingFields.includes("customer.passport_or_cin"))}
                      value={details.customer.passport_or_cin ?? ""}
                      onChange={(e) =>
                        updateDetails((c) => ({
                          ...c,
                          customer: { ...c.customer, passport_or_cin: e.target.value },
                        }))
                      }
                    />
                  </AdminFormField>
                  <AdminFormField label="Driving license number">
                    <input
                      className={missingInputClass(missingFields.includes("customer.driving_license_number"))}
                      value={details.customer.driving_license_number ?? ""}
                      onChange={(e) =>
                        updateDetails((c) => ({
                          ...c,
                          customer: { ...c.customer, driving_license_number: e.target.value },
                        }))
                      }
                    />
                  </AdminFormField>
                  <AdminFormField label="Address">
                    <input
                      className={missingInputClass(missingFields.includes("customer.address"))}
                      value={details.customer.address ?? ""}
                      onChange={(e) =>
                        updateDetails((c) => ({
                          ...c,
                          customer: { ...c.customer, address: e.target.value },
                        }))
                      }
                    />
                  </AdminFormField>
                  <AdminFormField label="Foreign address">
                    <input
                      className="admin-input"
                      value={details.customer.foreign_address ?? ""}
                      onChange={(e) =>
                        updateDetails((c) => ({
                          ...c,
                          customer: { ...c.customer, foreign_address: e.target.value },
                        }))
                      }
                    />
                  </AdminFormField>
                  <AdminFormField label="License issued at">
                    <input
                      type="date"
                      className={missingInputClass(missingFields.includes("customer.license_issued_at"))}
                      value={details.customer.license_issued_at ?? ""}
                      onChange={(e) =>
                        updateDetails((c) => ({
                          ...c,
                          customer: { ...c.customer, license_issued_at: e.target.value },
                        }))
                      }
                    />
                  </AdminFormField>
                  <AdminFormField label="License expires at">
                    <input
                      type="date"
                      className="admin-input"
                      value={details.customer.license_expires_at ?? ""}
                      onChange={(e) =>
                        updateDetails((c) => ({
                          ...c,
                          customer: { ...c.customer, license_expires_at: e.target.value },
                        }))
                      }
                    />
                  </AdminFormField>
                  <AdminFormField label="License country">
                    <input
                      className="admin-input"
                      value={details.customer.license_country ?? ""}
                      onChange={(e) =>
                        updateDetails((c) => ({
                          ...c,
                          customer: { ...c.customer, license_country: e.target.value },
                        }))
                      }
                    />
                  </AdminFormField>
                  <AdminFormField label="Passport/CIN issued at">
                    <input
                      type="date"
                      className="admin-input"
                      value={details.customer.passport_or_cin_issued_at ?? ""}
                      onChange={(e) =>
                        updateDetails((c) => ({
                          ...c,
                          customer: { ...c.customer, passport_or_cin_issued_at: e.target.value },
                        }))
                      }
                    />
                  </AdminFormField>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Need more profile data?{" "}
                  <Link
                    href={`/customers/${form.auto.customer.id}/edit?returnTo=/reservations/${reservationId}`}
                    className="font-semibold text-[#3563E9] hover:underline"
                  >
                    Edit customer profile
                  </Link>
                </p>
              </Section>

              <Section title="Vehicle details">
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <input className="admin-input bg-gray-50" readOnly value={`${form.auto.vehicle.brand ?? ""} ${form.auto.vehicle.model ?? form.auto.vehicle.name}`} />
                  <input className="admin-input bg-gray-50" readOnly value={form.auto.vehicle.plate_number} />
                  <input className="admin-input bg-gray-50" readOnly value={form.auto.vehicle.category ?? ""} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminFormField label="VIN">
                    <input className="admin-input" value={details.vehicle.vin ?? ""} onChange={(e) => updateDetails((c) => ({ ...c, vehicle: { ...c.vehicle, vin: e.target.value } }))} />
                  </AdminFormField>
                  <AdminFormField label="Color">
                    <input className="admin-input" value={details.vehicle.color ?? ""} onChange={(e) => updateDetails((c) => ({ ...c, vehicle: { ...c.vehicle, color: e.target.value } }))} />
                  </AdminFormField>
                  <AdminFormField label="Mileage">
                    <input type="number" className="admin-input" value={details.vehicle.mileage ?? ""} onChange={(e) => updateDetails((c) => ({ ...c, vehicle: { ...c.vehicle, mileage: e.target.value ? Number(e.target.value) : null } }))} />
                  </AdminFormField>
                  <AdminFormField label="Fuel level">
                    <input className="admin-input" value={details.vehicle.fuel_level ?? ""} onChange={(e) => updateDetails((c) => ({ ...c, vehicle: { ...c.vehicle, fuel_level: e.target.value } }))} />
                  </AdminFormField>
                </div>
              </Section>

              <Section title="Additional driver (optional)">
                <label className="mb-3 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={details.additional_driver.enabled}
                    onChange={(e) =>
                      updateDetails((c) => ({
                        ...c,
                        additional_driver: { ...c.additional_driver, enabled: e.target.checked },
                      }))
                    }
                  />
                  Include additional driver on contract
                </label>
                {details.additional_driver.enabled ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {([
                      ["full_name", "Full name"],
                      ["address", "Address"],
                      ["passport_or_cin", "Passport / CIN"],
                      ["driving_license_number", "Driving license"],
                      ["license_issued_at", "License issued at"],
                      ["license_expires_at", "License expires at"],
                      ["nationality", "Nationality"],
                      ["phone", "Phone"],
                    ] as const).map(([key, label]) => (
                      <AdminFormField key={key} label={label}>
                        <input
                          className="admin-input"
                          value={details.additional_driver[key]}
                          onChange={(e) =>
                            updateDetails((c) => ({
                              ...c,
                              additional_driver: { ...c.additional_driver, [key]: e.target.value },
                            }))
                          }
                        />
                      </AdminFormField>
                    ))}
                  </div>
                ) : null}
              </Section>

              <Section title="Equipment checklist">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {EQUIPMENT_FIELDS.map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={Boolean(details.equipment[item.key])}
                        onChange={(e) =>
                          updateDetails((c) => ({
                            ...c,
                            equipment: { ...c.equipment, [item.key]: e.target.checked },
                          }))
                        }
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={details.special_authorization.leave_urban_area}
                    onChange={(e) =>
                      updateDetails((c) => ({
                        ...c,
                        special_authorization: { leave_urban_area: e.target.checked },
                      }))
                    }
                  />
                  Authorization to leave urban area
                </label>
              </Section>

              <Section title="Vehicle documents checklist">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {DOCUMENT_FIELDS.map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={Boolean(details.documents[item.key])}
                        onChange={(e) =>
                          updateDetails((c) => ({
                            ...c,
                            documents: { ...c.documents, [item.key]: e.target.checked },
                          }))
                        }
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </Section>

              <Section title="Payment & insurance">
                <div className="mb-4 grid gap-3 md:grid-cols-4">
                  <input className="admin-input bg-gray-50" readOnly value={`Total: ${form.auto.payment.total_price} MAD`} />
                  <input className="admin-input bg-gray-50" readOnly value={`Paid: ${form.auto.payment.amount_paid} MAD`} />
                  <input className="admin-input bg-gray-50" readOnly value={`Remaining: ${form.auto.payment.remaining_balance} MAD`} />
                  <input className="admin-input bg-gray-50" readOnly value={`Deposit: ${form.auto.payment.deposit_amount} MAD`} />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {([
                    ["discount", "Discount"],
                    ["additional_fees", "Additional fees"],
                    ["late_return_fees", "Late return fees"],
                    ["fuel_charges", "Fuel charges"],
                    ["cleaning_charges", "Cleaning charges"],
                    ["damage_charges", "Damage charges"],
                    ["tax", "Tax"],
                  ] as const).map(([key, label]) => (
                    <AdminFormField key={key} label={label}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="admin-input"
                        value={details.payment[key]}
                        onChange={(e) =>
                          updateDetails((c) => ({
                            ...c,
                            payment: { ...c.payment, [key]: Number(e.target.value) || 0 },
                          }))
                        }
                      />
                    </AdminFormField>
                  ))}
                  <AdminFormField label="Scheduled payment date">
                    <input
                      type="date"
                      className="admin-input"
                      value={details.payment.scheduled_payment_date}
                      onChange={(e) =>
                        updateDetails((c) => ({
                          ...c,
                          payment: { ...c.payment, scheduled_payment_date: e.target.value },
                        }))
                      }
                    />
                  </AdminFormField>
                  <AdminFormField label="Insurance type">
                    <select
                      className="admin-input"
                      value={details.insurance.type}
                      onChange={(e) =>
                        updateDetails((c) => ({
                          ...c,
                          insurance: {
                            ...c.insurance,
                            type: e.target.value as ContractDetailsPayload["insurance"]["type"],
                          },
                        }))
                      }
                    >
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                      <option value="full_coverage">Full coverage</option>
                    </select>
                  </AdminFormField>
                  <AdminFormField label="Deductible (MAD)">
                    <input
                      type="number"
                      min="0"
                      className="admin-input"
                      value={details.insurance.deductible}
                      onChange={(e) =>
                        updateDetails((c) => ({
                          ...c,
                          insurance: { ...c.insurance, deductible: Number(e.target.value) || 0 },
                        }))
                      }
                    />
                  </AdminFormField>
                </div>
              </Section>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button type="button" className="admin-btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="admin-btn-primary"
            onClick={() => void handleSubmit()}
            disabled={loading || submitting || !details}
          >
            {submitting ? "Generating..." : "Generate PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
