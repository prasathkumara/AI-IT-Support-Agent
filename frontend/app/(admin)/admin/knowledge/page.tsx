"use client";

// /admin/knowledge - the IT admin's knowledge-base manager.
//
// Admins upload .docx documents that become the AI's searchable knowledge (RAG).
// Each document is stored separately; re-uploading a file with the SAME title
// replaces that document's content (replace-by-title, handled by the backend).
//
// This page talks to the backend directly via lib/api.ts:
//   - listKnowledgeDocuments()  -> GET    /knowledge
//   - uploadKnowledgeDocx(file) -> POST   /knowledge/upload
//   - deleteKnowledgeDocument() -> DELETE /knowledge/{id}
import { AlertCircle, CheckCircle2, FileText, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeading } from "@/components/ui/PageHeading";
import { Spinner } from "@/components/ui/Spinner";
import { useSupport } from "@/context/SupportContext";
import {
  ApiError,
  deleteKnowledgeDocument,
  listKnowledgeDocuments,
  uploadKnowledgeDocx,
  type KnowledgeDocument,
} from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";

const statusStyles: Record<KnowledgeDocument["status"], string> = {
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  failed: "bg-rose-50 text-rose-700 ring-rose-200",
};

export default function AdminKnowledgePage() {
  const { user } = useSupport();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setDocuments(await listKnowledgeDocuments());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleUpload() {
    const input = fileRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setError("Please choose a .docx file first.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("Only .docx files are supported right now.");
      return;
    }
    setError(null);
    setNotice(null);
    setUploading(true);
    try {
      const result = await uploadKnowledgeDocx(file);
      if (result.status === "failed") {
        setError(`Ingestion failed: ${result.error ?? "unknown error"}`);
      } else {
        setNotice(`"${result.title}" ingested successfully (${result.chunk_count} chunks).`);
      }
      if (input) input.value = ""; // clear the picker
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc: KnowledgeDocument) {
    setError(null);
    setNotice(null);
    setDeletingId(doc.id);
    try {
      await deleteKnowledgeDocument(doc.id);
      setNotice(`"${doc.title}" was deleted.`);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  if (!user) return null; // AppShell redirects to /login

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeading
        title="Knowledge Base"
        subtitle="Upload the documents the AI uses to answer employees. Each .docx is stored separately; re-uploading one with the same title replaces it."
      />

      {/* Upload card */}
      <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="upload-heading">
        <h2 id="upload-heading" className="text-base font-semibold text-ink">
          Upload a document
        </h2>
        <p className="text-sm text-ink-muted">Only Word (.docx) files are supported for now.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileRef}
            type="file"
            accept=".docx"
            disabled={uploading}
            className="block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
          />
          <Button onClick={handleUpload} disabled={uploading} className="shrink-0">
            {uploading ? (
              <>
                <Spinner label="Uploading" className="[&_svg]:text-white" />
                Ingesting...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" aria-hidden="true" />
                Upload &amp; ingest
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-ink-subtle">
          The first upload may take a little longer while the embedding model loads.
        </p>
      </section>

      {/* Feedback messages */}
      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Document list */}
      <section aria-labelledby="docs-heading" className="space-y-3">
        <h2 id="docs-heading" className="text-lg font-semibold text-ink">
          Current documents
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner label="Loading documents" />
          </div>
        ) : documents.length === 0 ? (
          <div className="card">
            <EmptyState
              className="py-12"
              title="No documents yet"
              description="Upload a .docx above to give the AI knowledge to answer from."
            />
          </div>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="card flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{doc.title}</p>
                    <p className="text-xs text-ink-subtle">
                      Added {formatDate(doc.created_at)}, {formatTime(doc.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[doc.status]}`}
                  >
                    {doc.status}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id}
                    aria-label={`Delete ${doc.title}`}
                  >
                    {deletingId === doc.id ? (
                      <Spinner label="Deleting" />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
