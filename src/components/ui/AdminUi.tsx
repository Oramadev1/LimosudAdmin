import Link from "next/link";
import type { ReactNode, RefObject } from "react";

export function PageHeader({
  title,
  description,
  actionHref,
  actionLabel,
  onActionClick,
  actions,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  onActionClick?: () => void;
  actions?: ReactNode;
}) {
  const hasPrimaryAction = Boolean((onActionClick && actionLabel) || (actionHref && actionLabel));

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        ) : null}
      </div>
      {actions || hasPrimaryAction ? (
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {actions}
          {onActionClick && actionLabel ? (
            <button type="button" onClick={onActionClick} className="admin-btn-primary">
              {actionLabel}
            </button>
          ) : actionHref && actionLabel ? (
            <Link href={actionHref} className="admin-btn-primary">
              {actionLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function scrollToAdminForm(formRef: RefObject<HTMLElement | null>) {
  requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

export function AdminCollapsibleFormCard({
  open,
  title,
  formRef,
  children,
}: {
  open: boolean;
  title: string;
  formRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div ref={formRef} className="admin-card mt-6 p-6">
      <h2 className="mb-4 text-lg font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="admin-card p-5">
      <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="admin-card flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-lg font-semibold text-gray-800">{title}</p>
      <p className="mt-2 max-w-md text-sm text-gray-500">{description}</p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="admin-btn-primary mt-6">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function AdminFormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="admin-detail-row">
      <span className="admin-detail-label">{label}</span>
      <span className="admin-detail-value">{value}</span>
    </div>
  );
}

export function SectionCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`admin-card p-6 ${className}`}>
      <h2 className="admin-section-title">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function Pagination({
  page,
  lastPage,
  onPageChange,
}: {
  page: number;
  lastPage: number;
  onPageChange: (page: number) => void;
}) {
  if (lastPage <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-gray-500">
        Page {page} of {lastPage}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="admin-btn-secondary disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
          className="admin-btn-secondary disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
