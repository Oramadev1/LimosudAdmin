"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, Trash2 } from "lucide-react";

import {
  deleteContactMessage,
  getContactMessage,
  getContactMessages,
  markContactMessageRead,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { useLockedMutation } from "@/lib/use-locked-mutation";
import { usePaginatedQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import type { ContactMessage } from "@/types/api";
import {
  EmptyState,
  ErrorMessage,
  PageHeader,
  Pagination,
} from "@/components/ui/AdminUi";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function ContactMessagesPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const messageFromQuery = Number(searchParams.get("message") || 0);

  const { data, isPending, isFetching, error } = usePaginatedQuery(
    queryKeys.contactMessages(page),
    () => getContactMessages(page),
  );

  const messages = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;
  const unreadCount = useMemo(
    () => messages.filter((message) => !message.is_read).length,
    [messages],
  );

  const readMutation = useLockedMutation({
    mutationFn: markContactMessageRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const deleteMutation = useLockedMutation({
    mutationFn: deleteContactMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      setSelectedId(null);
      setSelectedMessage(null);
    },
  });

  useEffect(() => {
    if (messageFromQuery > 0) {
      setSelectedId(messageFromQuery);
    }
  }, [messageFromQuery]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedMessage(null);
      return;
    }

    const messageId = selectedId;
    let cancelled = false;

    async function loadMessage() {
      setDetailError(null);
      try {
        const response = await getContactMessage(messageId);
        if (!cancelled) {
          setSelectedMessage(response.data);
          queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
        }
      } catch (err) {
        if (!cancelled) {
          setDetailError(
            err instanceof ApiError ? err.message : "Failed to load contact message.",
          );
        }
      }
    }

    void loadMessage();

    return () => {
      cancelled = true;
    };
  }, [queryClient, selectedId]);

  const loadError =
    error instanceof ApiError ? error.message : error ? "Failed to load contact messages." : null;

  return (
    <div>
      <PageHeader
        title="Contact Messages"
        description={`Website contact form submissions${unreadCount > 0 ? ` · ${unreadCount} unread on this page` : ""}`}
      />

      {loadError ? <ErrorMessage message={loadError} /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div>
          {isPending ? (
            <div className="admin-card p-6 text-sm text-gray-500">Loading...</div>
          ) : messages.length === 0 ? (
            <EmptyState
              title="No contact messages"
              description="Messages sent from the website contact form will appear here."
            />
          ) : (
            <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
              <table className="admin-table w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-[#fafbfc]">
                    <th className="px-4 py-3">From</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((message) => (
                    <tr
                      key={message.id}
                      className={`cursor-pointer ${selectedId === message.id ? "bg-blue-50/70" : ""}`}
                      onClick={() => setSelectedId(message.id)}
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">{message.name}</div>
                        <div className="mt-1 text-xs text-gray-500">{message.email}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {message.message.length > 80
                          ? `${message.message.slice(0, 80)}...`
                          : message.message}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge
                          label={message.is_read ? "Read" : "New"}
                          className={
                            message.is_read
                              ? "admin-badge admin-badge-completed"
                              : "admin-badge admin-badge-pending"
                          }
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDateTime(message.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 pb-4">
                <Pagination page={page} lastPage={lastPage} onPageChange={setPage} />
              </div>
            </div>
          )}
        </div>

        <div className="admin-card p-6">
          {!selectedId ? (
            <p className="text-sm text-gray-500">Select a message to view details.</p>
          ) : detailError ? (
            <ErrorMessage message={detailError} />
          ) : !selectedMessage ? (
            <p className="text-sm text-gray-500">Loading message...</p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedMessage.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Received {formatDateTime(selectedMessage.created_at)}
                  </p>
                </div>
                <StatusBadge
                  label={selectedMessage.is_read ? "Read" : "New"}
                  className={
                    selectedMessage.is_read
                      ? "admin-badge admin-badge-completed"
                      : "admin-badge admin-badge-pending"
                  }
                />
              </div>

              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-gray-400" />
                  <a href={`mailto:${selectedMessage.email}`} className="text-[#3563E9] hover:underline">
                    {selectedMessage.email}
                  </a>
                </div>
                {selectedMessage.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-gray-400" />
                    <a href={`tel:${selectedMessage.phone}`} className="text-[#3563E9] hover:underline">
                      {selectedMessage.phone}
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl bg-[#fafbfc] p-4 text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                {selectedMessage.message}
              </div>

              <div className="flex flex-wrap gap-3">
                {!selectedMessage.is_read ? (
                  <button
                    type="button"
                    className="admin-btn-primary"
                    disabled={readMutation.isPending}
                    onClick={() => readMutation.mutate(selectedMessage.id)}
                  >
                    {readMutation.isPending ? "Saving..." : "Mark as read"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="admin-btn-secondary inline-flex items-center gap-2 text-red-600"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (window.confirm("Delete this contact message?")) {
                      deleteMutation.mutate(selectedMessage.id);
                    }
                  }}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
