"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import {
  cancelContract,
  checkReservationAvailability,
  createPayment,
  deleteReservation,
  downloadContract,
  getContractByReservation,
  getPaymentSummary,
  getReservation,
  markContractSigned,
  reservationAction,
  updateReservation,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { CONTRACT_PAYMENT_METHODS } from "@/lib/contract-payment-methods";
import { useAdminFormErrors } from "@/lib/use-admin-form-errors";
import { formatCurrency, formatDateTime, toApiDatetime, toInputDatetime } from "@/lib/format";
import {
  getPaymentStatusBadgeClass,
  getReservationStatusBadgeClass,
} from "@/lib/reservation-status";
import {
  canCancelContract,
  canDeleteReservation,
  canGenerateContract,
  canMarkContractSigned,
  canRecordPayment,
  filterAllowedReservationActions,
  getReservationActionButtonClass,
  getReservationActionLabel,
  getReservationStatusHint,
  hasRemainingPayment,
} from "@/lib/reservation-workflow";
import { useAdminQuery, useLookupsQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { AdminFormField, DetailRow, ErrorMessage, FormGlobalError, inputErrorClass, SectionCard } from "@/components/ui/AdminUi";
import { ContractGenerateModal } from "@/components/reservations/ContractGenerateModal";
import { RentalDatetimeFields, hasValidRentalDatetimeRange } from "@/components/reservations/RentalDatetimeFields";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import type { ReservationAvailabilityResult } from "@/types/api";

export function ReservationDetailClient({ id }: { id: number }) {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const { runOnce, busy: actionBusy } = useSubmitLock();
  const { data: lookups } = useLookupsQuery();
  const [error, setError] = useState<string | null>(null);
  const [contractMessage, setContractMessage] = useState<string | null>(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractAction, setContractAction] = useState<
    null | "generate" | "load" | "download" | "sign" | "cancel"
  >(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_method_slug: "cash",
    payment_type_slug: "rental_payment",
    payment_status_slug: "paid",
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    reference: "",
    notes: "",
  });
  const [editingDates, setEditingDates] = useState(false);
  const [dateForm, setDateForm] = useState({ start_datetime: "", end_datetime: "" });
  const [dateFormError, setDateFormError] = useState<string | null>(null);
  const [checkingDateAvailability, setCheckingDateAvailability] = useState(false);
  const [dateAvailability, setDateAvailability] = useState<ReservationAvailabilityResult | null>(null);
  const {
    globalError: paymentGlobalError,
    fieldErrors: paymentFieldErrors,
    resetErrors: resetPaymentErrors,
    applySubmissionError: applyPaymentError,
    clearFieldError: clearPaymentFieldError,
  } = useAdminFormErrors();

  const { data, isPending } = useAdminQuery({
    queryKey: queryKeys.reservation(id),
    queryFn: () => getReservation(id),
  });

  const { data: paymentSummary } = useAdminQuery({
    queryKey: queryKeys.paymentSummary(id),
    queryFn: () => getPaymentSummary(id),
    enabled: Boolean(data),
  });

  const { data: contractData, refetch: refetchContract } = useAdminQuery({
    queryKey: queryKeys.contract(id),
    queryFn: () => getContractByReservation(id),
    enabled: hasPermission("contracts.view"),
    retry: false,
  });

  const reservation = data?.data;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reservation(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.paymentSummary(id) });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["reservations"] });
  };

  const actionMutation = useLockedMutation({
    mutationFn: (action: "confirm" | "start" | "complete" | "cancel" | "reject" | "reopen") =>
      reservationAction(id, action),
    onSuccess: invalidate,
  });

  const paymentMutation = useLockedMutation({
    mutationFn: createPayment,
    onSuccess: invalidate,
  });

  const updateDatesMutation = useLockedMutation({
    mutationFn: (payload: { start_datetime: string; end_datetime: string }) => updateReservation(id, payload),
    onSuccess: () => {
      invalidate();
      setEditingDates(false);
      setDateFormError(null);
      setDateAvailability(null);
    },
  });

  const handleAction = async (action: "confirm" | "start" | "complete" | "cancel" | "reject" | "reopen") => {
    const destructive = action === "cancel" || action === "reject";
    if (destructive && !confirm(`${getReservationActionLabel(action)} this reservation?`)) {
      return;
    }

    setError(null);
    try {
      await actionMutation.mutateAsync(action);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    }
  };

  const handlePayment = async (event: FormEvent) => {
    event.preventDefault();
    resetPaymentErrors();
    try {
      await paymentMutation.mutateAsync({
        reservation_id: id,
        payment_method_slug: paymentForm.payment_method_slug,
        payment_type_slug: paymentForm.payment_type_slug,
        payment_status_slug: paymentForm.payment_status_slug,
        amount: Number(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        reference: paymentForm.reference || null,
        notes: paymentForm.notes || null,
      });
      setPaymentForm((c) => ({ ...c, amount: "", reference: "", notes: "" }));
    } catch (err) {
      applyPaymentError(err, "Payment failed.");
    }
  };

  const handleGenerateContract = () => {
    setError(null);
    setContractMessage(null);
    setShowContractModal(true);
  };

  const handleContractGenerated = async () => {
    await refetchContract();
    invalidate();
    setContractMessage("Contract generated successfully.");
  };

  const handleLoadContract = async () => {
    await runOnce(async () => {
      setError(null);
      setContractMessage(null);
      setContractAction("load");
      try {
        const result = await refetchContract();
        if (result.data?.data) {
          setContractMessage(`Loaded contract ${result.data.data.contract_number}.`);
        } else {
          setContractMessage("No contract found for this reservation yet.");
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load contract.");
      } finally {
        setContractAction(null);
      }
    });
  };

  const handleDownloadContract = async (contractId: number, contractNumber: string) => {
    await runOnce(async () => {
      setError(null);
      setContractMessage(null);
      setContractAction("download");
      try {
        const blob = await downloadContract(contractId);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${contractNumber}.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
        setContractMessage(`Downloaded ${contractNumber}.pdf`);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Download failed.");
      } finally {
        setContractAction(null);
      }
    });
  };

  const handleMarkContractSigned = async (contractId: number) => {
    await runOnce(async () => {
      setError(null);
      setContractMessage(null);
      setContractAction("sign");
      try {
        await markContractSigned(contractId);
        await refetchContract();
        queryClient.invalidateQueries({ queryKey: queryKeys.contract(id) });
        setContractMessage("Contract marked as signed.");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to mark contract as signed.");
      } finally {
        setContractAction(null);
      }
    });
  };

  const handleCancelContract = async (contractId: number) => {
    if (!confirm("Cancel this contract?")) return;

    await runOnce(async () => {
      setError(null);
      setContractMessage(null);
      setContractAction("cancel");
      try {
        await cancelContract(contractId);
        await refetchContract();
        setContractMessage("Contract cancelled.");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to cancel contract.");
      } finally {
        setContractAction(null);
      }
    });
  };

  const statusSlug = reservation?.status.slug;
  const terminalStatuses = ["completed", "cancelled", "rejected"];
  const canEditDates =
    Boolean(reservation) &&
    hasPermission("reservations.update") &&
    statusSlug != null &&
    !terminalStatuses.includes(statusSlug);

  const hasValidDateForm = hasValidRentalDatetimeRange(dateForm.start_datetime, dateForm.end_datetime);

  useEffect(() => {
    if (!editingDates || !reservation?.vehicle?.id || !hasValidDateForm) {
      setDateAvailability(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setCheckingDateAvailability(true);
      try {
        const result = await checkReservationAvailability({
          vehicle_id: reservation.vehicle.id,
          start_datetime: toApiDatetime(dateForm.start_datetime),
          end_datetime: toApiDatetime(dateForm.end_datetime),
          ignore_reservation_id: reservation.id,
        });
        setDateAvailability(result);
      } catch {
        setDateAvailability(null);
      } finally {
        setCheckingDateAvailability(false);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [dateForm.end_datetime, dateForm.start_datetime, editingDates, hasValidDateForm, reservation]);

  const startEditingDates = () => {
    if (!reservation) return;
    setDateForm({
      start_datetime: toInputDatetime(reservation.start_datetime),
      end_datetime: toInputDatetime(reservation.end_datetime),
    });
    setDateFormError(null);
    setDateAvailability(null);
    setEditingDates(true);
  };

  const handleSaveDates = async (event: FormEvent) => {
    event.preventDefault();
    setDateFormError(null);

    if (!hasValidDateForm) {
      setDateFormError("End must be after start.");
      return;
    }

    if (!dateAvailability?.available) {
      setDateFormError("The vehicle is not available for these dates.");
      return;
    }

    try {
      await updateDatesMutation.mutateAsync({
        start_datetime: toApiDatetime(dateForm.start_datetime),
        end_datetime: toApiDatetime(dateForm.end_datetime),
      });
    } catch (err) {
      setDateFormError(err instanceof ApiError ? err.message : "Failed to update rental dates.");
    }
  };

  if (isPending) {
    return <div className="admin-card p-6 text-sm text-gray-500">Loading reservation...</div>;
  }

  if (!reservation) {
    return <ErrorMessage message="Reservation not found." />;
  }

  const contract = contractData?.data;
  const allowedActions = filterAllowedReservationActions(statusSlug, hasPermission);
  const statusHint = getReservationStatusHint(statusSlug);
  const canManageContracts = hasPermission("contracts.generate");
  const canViewContracts = hasPermission("contracts.view");
  const canUpdateContracts = hasPermission("contracts.update");
  const contractStatusSlug = contract?.status.slug;
  const canMarkSigned =
    canUpdateContracts && contract != null && canMarkContractSigned(contractStatusSlug);
  const canCancelContractAction =
    canUpdateContracts && contract != null && canCancelContract(contractStatusSlug);
  const paymentAllowed =
    canRecordPayment(statusSlug) &&
    hasPermission("payments.manage") &&
    paymentSummary != null &&
    hasRemainingPayment(paymentSummary.remaining_amount);
  const contractAllowed = canGenerateContract(statusSlug);
  const showDeleteReservation =
    hasPermission("reservations.delete") && canDeleteReservation(statusSlug);
  const pendingAction = actionMutation.isPending ? actionMutation.variables : null;

  return (
    <div>
      <Link href="/reservations" className="admin-btn-secondary admin-btn-sm mb-4">
        ← Back to reservations
      </Link>

      <div className="admin-card mb-4 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="admin-section-title">Reservation</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">{reservation.reservation_number}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge
                label={reservation.status.name}
                className={getReservationStatusBadgeClass(statusSlug)}
              />
              <StatusBadge
                label={reservation.payment_status.name}
                className={getPaymentStatusBadgeClass(reservation.payment_status.slug)}
              />
              <span className="admin-badge admin-badge-unpaid">{reservation.source.name}</span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <p>Created {formatDateTime(reservation.created_at)}</p>
            <p className="mt-1">{reservation.total_days} day rental</p>
          </div>
        </div>
      </div>

      {error ? <div className="mb-4"><ErrorMessage message={error} /></div> : null}

      <div className="admin-card mb-4 p-5">
        <p className="admin-section-title">Actions</p>
        {statusHint ? <p className="mt-3 text-sm text-gray-600">{statusHint}</p> : null}
        <div className="mt-4 flex flex-wrap gap-3">
          {allowedActions.map((action) => (
            <button
              key={action}
              type="button"
              disabled={actionMutation.isPending}
              onClick={() => handleAction(action)}
              className={getReservationActionButtonClass(action)}
            >
              {pendingAction === action ? "Working..." : getReservationActionLabel(action)}
            </button>
          ))}
          {showDeleteReservation ? (
            <button
              type="button"
              className="admin-btn-danger"
              disabled={actionBusy || actionMutation.isPending}
              onClick={() => {
                void runOnce(async () => {
                  if (!confirm("Delete reservation permanently?")) return;
                  await deleteReservation(id);
                  window.location.href = "/reservations";
                });
              }}
            >
              Delete
            </button>
          ) : null}
        </div>
        {allowedActions.length === 0 && !showDeleteReservation ? (
          <p className="mt-3 text-sm text-gray-500">No actions available for this status or your role.</p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Booking details">
          <DetailRow
            label="Customer"
            value={
              reservation.customer ? (
                <Link
                  href={`/customers/${reservation.customer.id}`}
                  className="font-semibold text-[#3563E9] hover:underline"
                >
                  {reservation.customer.full_name}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <DetailRow label="Phone" value={reservation.customer?.phone ?? "—"} />
          <DetailRow label="Email" value={reservation.customer?.email ?? "—"} />
          <DetailRow label="Nationality" value={reservation.customer?.nationality ?? "—"} />
          <DetailRow label="Passport / CIN" value={reservation.customer?.passport_or_cin ?? "—"} />
          <DetailRow
            label="Driving license"
            value={reservation.customer?.driving_license_number ?? "—"}
          />
          {!reservation.customer?.passport_or_cin ? (
            <p className="mt-2 text-xs text-amber-700">
              Missing ID details.{" "}
              {reservation.customer ? (
                <Link
                  href={`/customers/${reservation.customer.id}/edit?returnTo=/reservations/${id}`}
                  className="font-semibold underline"
                >
                  Edit customer profile
                </Link>
              ) : (
                "Update the customer record"
              )}{" "}
              before generating the contract.
            </p>
          ) : null}
          <DetailRow label="Vehicle" value={reservation.vehicle?.name ?? "—"} />
          <DetailRow label="Pickup" value={reservation.pickup_location?.name ?? "—"} />
          <DetailRow label="Drop-off" value={reservation.dropoff_location?.name ?? "—"} />
          {editingDates ? (
            <form onSubmit={handleSaveDates} className="mt-4 space-y-4 border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-900">Extend or change rental dates</p>
              <p className="text-xs text-gray-500">
                Total price and payment status will be recalculated when you save.
              </p>
              {dateFormError ? <FormGlobalError message={dateFormError} /> : null}
              <RentalDatetimeFields
                startValue={dateForm.start_datetime}
                endValue={dateForm.end_datetime}
                checking={checkingDateAvailability}
                availability={dateAvailability}
                onStartChange={(start_datetime) =>
                  setDateForm((current) => ({ ...current, start_datetime }))
                }
                onEndChange={(end_datetime) =>
                  setDateForm((current) => ({ ...current, end_datetime }))
                }
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={
                    updateDatesMutation.isPending ||
                    checkingDateAvailability ||
                    !dateAvailability?.available
                  }
                >
                  {updateDatesMutation.isPending ? "Saving…" : "Save dates"}
                </button>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => {
                    setEditingDates(false);
                    setDateFormError(null);
                    setDateAvailability(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <DetailRow label="Start" value={formatDateTime(reservation.start_datetime)} />
              <DetailRow label="End" value={formatDateTime(reservation.end_datetime)} />
              {canEditDates ? (
                <button
                  type="button"
                  className="mt-2 text-sm text-[#3563E9] hover:underline"
                  onClick={startEditingDates}
                >
                  Extend or change dates
                </button>
              ) : null}
            </>
          )}
          <DetailRow label="Total price" value={formatCurrency(reservation.total_price)} />
          {reservation.customer_notes ? (
            <DetailRow label="Customer notes" value={reservation.customer_notes} />
          ) : null}
          {reservation.admin_notes ? (
            <DetailRow label="Admin notes" value={reservation.admin_notes} />
          ) : null}
        </SectionCard>

        <SectionCard title="Payment summary">
          {paymentSummary ? (
            <>
              <DetailRow label="Paid" value={formatCurrency(paymentSummary.paid_amount)} />
              <DetailRow label="Remaining" value={formatCurrency(paymentSummary.remaining_amount)} />
              <DetailRow
                label="Status"
                value={
                  <StatusBadge
                    label={paymentSummary.payment_status.name}
                    className={getPaymentStatusBadgeClass(paymentSummary.payment_status.slug)}
                  />
                }
              />
              <DetailRow label="Deposit" value={formatCurrency(reservation.deposit_amount)} />
              <DetailRow label="Delivery fee" value={formatCurrency(reservation.delivery_fee)} />
            </>
          ) : (
            <p className="text-sm text-gray-500">Payment summary unavailable.</p>
          )}
        </SectionCard>
      </div>

      {paymentAllowed ? (
        <form onSubmit={handlePayment} className="admin-card mt-4 space-y-4 p-6">
          <h2 className="admin-section-title">Record payment</h2>
          <FormGlobalError message={paymentGlobalError} />
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Amount" error={paymentFieldErrors.amount}>
              <input
                type="number"
                placeholder="0.00"
                value={paymentForm.amount}
                onChange={(e) => {
                  setPaymentForm((c) => ({ ...c, amount: e.target.value }));
                  clearPaymentFieldError("amount");
                }}
                className={`admin-input ${inputErrorClass(paymentFieldErrors.amount)}`}
                required
              />
            </AdminFormField>
            <AdminFormField label="Payment date" error={paymentFieldErrors.payment_date}>
              <input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => {
                  setPaymentForm((c) => ({ ...c, payment_date: e.target.value }));
                  clearPaymentFieldError("payment_date");
                }}
                className={`admin-input ${inputErrorClass(paymentFieldErrors.payment_date)}`}
                required
              />
            </AdminFormField>
            <AdminFormField label="Method" error={paymentFieldErrors.payment_method_slug}>
              <select
                value={paymentForm.payment_method_slug}
                onChange={(e) => {
                  setPaymentForm((c) => ({ ...c, payment_method_slug: e.target.value }));
                  clearPaymentFieldError("payment_method_slug");
                }}
                className={`admin-input ${inputErrorClass(paymentFieldErrors.payment_method_slug)}`}
              >
                {CONTRACT_PAYMENT_METHODS.map((method) => {
                  const lookup = lookups?.payment_methods.find((item) => item.slug === method.slug);

                  return (
                    <option key={method.slug} value={method.slug}>
                      {lookup?.name ?? method.label}
                    </option>
                  );
                })}
              </select>
            </AdminFormField>
            <AdminFormField label="Type" error={paymentFieldErrors.payment_type_slug}>
              <select
                value={paymentForm.payment_type_slug}
                onChange={(e) => {
                  setPaymentForm((c) => ({ ...c, payment_type_slug: e.target.value }));
                  clearPaymentFieldError("payment_type_slug");
                }}
                className={`admin-input ${inputErrorClass(paymentFieldErrors.payment_type_slug)}`}
              >
                {lookups?.payment_types.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.name}</option>
                ))}
              </select>
            </AdminFormField>
            <AdminFormField label="Reference" error={paymentFieldErrors.reference}>
              <input
                placeholder="Receipt or transfer reference"
                value={paymentForm.reference}
                onChange={(e) => {
                  setPaymentForm((c) => ({ ...c, reference: e.target.value }));
                  clearPaymentFieldError("reference");
                }}
                className={`admin-input ${inputErrorClass(paymentFieldErrors.reference)}`}
              />
            </AdminFormField>
          </div>
          <button type="submit" disabled={paymentMutation.isPending} className="admin-btn-primary">
            {paymentMutation.isPending ? "Saving..." : "Add payment"}
          </button>
        </form>
      ) : canRecordPayment(statusSlug) && hasPermission("payments.manage") && paymentSummary && !hasRemainingPayment(paymentSummary.remaining_amount) ? (
        <div className="admin-card mt-4 p-6 text-sm text-gray-500">
          This reservation is fully paid. No further payment is needed.
        </div>
      ) : canRecordPayment(statusSlug) && !hasPermission("payments.manage") ? (
        <div className="admin-card mt-4 p-6 text-sm text-gray-500">
          You do not have permission to record payments.
        </div>
      ) : (
        <div className="admin-card mt-4 p-6 text-sm text-gray-500">
          Payments cannot be recorded for cancelled or rejected reservations. Use <strong>Reopen as pending</strong> first if this was a mistake.
        </div>
      )}

      {(canManageContracts || canViewContracts) ? (
      <SectionCard title="Contract" className="mt-4">
        {contractAction ? (
          <p className="mb-3 text-sm font-medium text-[#3563E9]">
            {contractAction === "generate" && "Generating contract..."}
            {contractAction === "load" && "Loading contract..."}
            {contractAction === "download" && "Preparing PDF download..."}
            {contractAction === "sign" && "Marking contract as signed..."}
            {contractAction === "cancel" && "Cancelling contract..."}
          </p>
        ) : null}
        {contractMessage ? (
          <p className="mb-3 text-sm text-green-700">{contractMessage}</p>
        ) : null}
        {!contractAllowed ? (
          <p className="mb-3 text-sm text-gray-500">
            Contracts can be generated after the reservation is confirmed.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {canManageContracts && contractAllowed ? (
            <button
              type="button"
              onClick={handleGenerateContract}
              disabled={contractAction !== null}
              className="admin-btn-primary"
            >
              Generate contract
            </button>
          ) : null}
          {canViewContracts ? (
            <button
              type="button"
              onClick={handleLoadContract}
              disabled={contractAction !== null}
              className="admin-btn-secondary"
            >
              {contractAction === "load" ? "Loading..." : "Load contract"}
            </button>
          ) : null}
          {contract ? (
            <>
              {canViewContracts ? (
                <button
                  type="button"
                  onClick={() => handleDownloadContract(contract.id, contract.contract_number)}
                  disabled={contractAction !== null}
                  className="admin-btn-secondary"
                >
                  {contractAction === "download" ? "Downloading..." : "Download PDF"}
                </button>
              ) : null}
              {canMarkSigned ? (
                <button
                  type="button"
                  onClick={() => handleMarkContractSigned(contract.id)}
                  disabled={contractAction !== null}
                  className="admin-btn-success"
                >
                  {contractAction === "sign" ? "Saving..." : "Mark signed"}
                </button>
              ) : null}
              {canCancelContractAction ? (
                <button
                  type="button"
                  onClick={() => handleCancelContract(contract.id)}
                  disabled={contractAction !== null}
                  className="admin-btn-danger"
                >
                  {contractAction === "cancel" ? "Cancelling..." : "Cancel contract"}
                </button>
              ) : null}
              <p className="w-full text-sm text-gray-600">
                {contract.contract_number} · {contract.status.name}
                {contract.signed_at ? ` · Signed ${formatDateTime(contract.signed_at)}` : ""}
              </p>
            </>
          ) : null}
        </div>
      </SectionCard>
      ) : null}

      <ContractGenerateModal
        reservationId={id}
        open={showContractModal}
        onClose={() => setShowContractModal(false)}
        onGenerated={() => void handleContractGenerated()}
      />
    </div>
  );
}
