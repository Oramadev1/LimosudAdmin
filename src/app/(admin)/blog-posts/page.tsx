"use client";

import { FormEvent, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import {
  createBlogPost,
  deleteBlogPost,
  getBlogPost,
  getBlogPosts,
  updateBlogPost,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { slugify } from "@/lib/format";
import { useAdminFormErrors } from "@/lib/use-admin-form-errors";
import { usePaginatedQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import type { BlogPost } from "@/types/api";
import {
  AdminCollapsibleFormCard,
  AdminFormField,
  EmptyState,
  ErrorMessage,
  FormGlobalError,
  inputErrorClass,
  PageHeader,
  Pagination,
  scrollToAdminForm,
} from "@/components/ui/AdminUi";

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image: "",
  is_published: false,
};

export default function BlogPostsPage() {
  const formRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const { globalError, fieldErrors, resetErrors, applySubmissionError, clearFieldError, setGlobalError } =
    useAdminFormErrors();

  const { data, isPending, isFetching, error } = usePaginatedQuery(
    queryKeys.blogPosts(page),
    () => getBlogPosts(page),
  );

  const saveMutation = useLockedMutation({
    mutationFn: async (payload: typeof form & { id?: number }) => {
      const body = {
        title: payload.title,
        slug: payload.slug || slugify(payload.title),
        excerpt: payload.excerpt,
        content: payload.content,
        cover_image: payload.cover_image || null,
        is_published: payload.is_published,
      };

      if (payload.id) {
        return updateBlogPost(payload.id, body);
      }

      return createBlogPost(body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      resetForm();
    },
  });

  const deleteMutation = useLockedMutation({
    mutationFn: deleteBlogPost,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
    },
  });

  const posts = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
    resetErrors();
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    resetErrors();
    setShowForm(true);
    scrollToAdminForm(formRef);
  };

  const startEdit = async (post: BlogPost) => {
    setLoadingEdit(true);
    resetErrors();

    try {
      const response = await getBlogPost(post.id);
      const full = response.data;

      setEditingId(full.id);
      setForm({
        title: full.title,
        slug: full.slug,
        excerpt: full.excerpt,
        content: full.content ?? "",
        cover_image: full.cover_image ?? "",
        is_published: full.is_published,
      });
      setShowForm(true);
      scrollToAdminForm(formRef);
    } catch (err) {
      setGlobalError(err instanceof ApiError ? err.message : "Failed to load article.");
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    resetErrors();

    try {
      await saveMutation.mutateAsync({
        ...form,
        ...(editingId ? { id: editingId } : {}),
      });
    } catch (err) {
      applySubmissionError(err, "Save failed.");
    }
  };

  const loadError =
    error instanceof ApiError ? error.message : error ? "Failed to load blog posts." : null;

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Publish articles on the public website."
        actionLabel="Add article"
        onActionClick={openCreateForm}
      />

      {loadError ? <ErrorMessage message={loadError} /> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading...</div>
      ) : posts.length === 0 ? (
        <EmptyState
          title="No articles"
          description="Create your first blog post for the public site."
          actionLabel="Add article"
          onAction={openCreateForm}
        />
      ) : (
        <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
          <table className="admin-table w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post: BlogPost) => (
                <tr key={post.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{post.title}</div>
                    <div className="text-xs text-gray-400">{post.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        post.is_published
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {post.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-[#3563E9] hover:underline disabled:opacity-50"
                        disabled={loadingEdit}
                        onClick={() => void startEdit(post)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-500 hover:underline"
                        onClick={async () => {
                          if (!confirm("Delete article?")) return;
                          await deleteMutation.mutateAsync(post.id);
                          if (editingId === post.id) resetForm();
                        }}
                      >
                        Delete
                      </button>
                    </div>
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

      <AdminCollapsibleFormCard
        open={showForm}
        title={editingId ? "Edit article" : "Add article"}
        formRef={formRef}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormGlobalError message={globalError} />
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Title" error={fieldErrors.title}>
              <input
                placeholder="Article title"
                value={form.title}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                    slug: editingId ? current.slug : slugify(event.target.value),
                  }));
                  clearFieldError("title");
                }}
                className={`admin-input ${inputErrorClass(fieldErrors.title)}`}
                required
              />
            </AdminFormField>
            <AdminFormField label="Slug" hint="Used in public URLs." error={fieldErrors.slug}>
              <input
                placeholder="mon-article"
                value={form.slug}
                onChange={(event) => {
                  setForm((current) => ({ ...current, slug: event.target.value }));
                  clearFieldError("slug");
                }}
                className={`admin-input ${inputErrorClass(fieldErrors.slug)}`}
                required
              />
            </AdminFormField>
            <div className="md:col-span-2">
              <AdminFormField label="Cover image URL" error={fieldErrors.cover_image}>
              <input
                placeholder="/cars/rush.png or https://..."
                value={form.cover_image}
                onChange={(event) => {
                  setForm((current) => ({ ...current, cover_image: event.target.value }));
                  clearFieldError("cover_image");
                }}
                className={`admin-input ${inputErrorClass(fieldErrors.cover_image)}`}
              />
            </AdminFormField>
            </div>
            <div className="md:col-span-2">
              <AdminFormField label="Excerpt" error={fieldErrors.excerpt}>
              <textarea
                placeholder="Short summary shown on cards"
                value={form.excerpt}
                onChange={(event) => {
                  setForm((current) => ({ ...current, excerpt: event.target.value }));
                  clearFieldError("excerpt");
                }}
                className={`admin-input min-h-[90px] ${inputErrorClass(fieldErrors.excerpt)}`}
                required
              />
            </AdminFormField>
            </div>
            <div className="md:col-span-2">
              <AdminFormField label="Content" error={fieldErrors.content}>
              <textarea
                placeholder="Full article text. Separate paragraphs with a blank line."
                value={form.content}
                onChange={(event) => {
                  setForm((current) => ({ ...current, content: event.target.value }));
                  clearFieldError("content");
                }}
                className={`admin-input min-h-[220px] ${inputErrorClass(fieldErrors.content)}`}
                required
              />
            </AdminFormField>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(event) =>
                setForm((current) => ({ ...current, is_published: event.target.checked }))
              }
            />
            Publish on the public website
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={saveMutation.isPending} className="admin-btn-primary">
              {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
            <button type="button" className="admin-btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      </AdminCollapsibleFormCard>
    </div>
  );
}
