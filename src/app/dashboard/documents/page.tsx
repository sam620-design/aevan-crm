"use client";

import { useState, useEffect } from "react";
import {
  FolderArchive,
  Search,
  Upload,
  FileText,
  Download,
  Eye,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Tag,
  Building,
} from "lucide-react";

interface DocumentItem {
  id: string;
  fileName: string;
  documentType: string;
  entityType: string;
  entityId: string;
  fileSize: number;
  fileUrl: string;
  notes?: string | null;
  createdAt: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upload / Register Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    fileName: "",
    documentType: "GST_CERTIFICATE",
    entityType: "GENERAL",
    fileSizeKB: 500,
    fileUrl: "",
    notes: "",
  });

  // Detail Modal
  const [detailDoc, setDetailDoc] = useState<DocumentItem | null>(null);

  // Delete Confirm
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [typeFilter]);

  async function fetchDocuments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/documents?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents || []);
      } else {
        setErrorMsg(data.error || "Failed to load documents");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error loading documents");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: uploadForm.fileName,
          documentType: uploadForm.documentType,
          entityType: uploadForm.entityType,
          fileSize: Number(uploadForm.fileSizeKB) * 1024,
          fileUrl: uploadForm.fileUrl || "#",
          notes: uploadForm.notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register document");

      setSuccessMsg(`Document "${uploadForm.fileName}" registered successfully!`);
      setShowUploadModal(false);
      setUploadForm({
        fileName: "",
        documentType: "GST_CERTIFICATE",
        entityType: "GENERAL",
        fileSizeKB: 500,
        fileUrl: "",
        notes: "",
      });
      fetchDocuments();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirmDoc) return;
    setDeleting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/documents/${deleteConfirmDoc.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete document");

      setSuccessMsg("Document deleted successfully!");
      setDeleteConfirmDoc(null);
      if (detailDoc?.id === deleteConfirmDoc.id) {
        setDetailDoc(null);
      }
      fetchDocuments();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }
    return Math.round(bytes / 1024) + " KB";
  };

  const filtered = documents.filter((d) => {
    const term = search.toLowerCase();
    return (
      d.fileName.toLowerCase().includes(term) ||
      d.documentType.toLowerCase().includes(term) ||
      (d.notes && d.notes.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-50 text-brand-800 rounded-xl">
              <FolderArchive className="w-6 h-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Document & Proof Repository</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Delivery challans, customer GST certificates, agreements, and proof-of-work documents.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-800 hover:bg-brand-900 active:bg-brand-950 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-colors shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by name, category, or notes..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
          />
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-600 shadow-sm"
          >
            <option value="ALL">All Document Types</option>
            <option value="GST_CERTIFICATE">GST Certificates</option>
            <option value="DELIVERY_CHALLAN">Delivery Challans</option>
            <option value="PROOF_OF_WORK">Proof of Work (Photos)</option>
            <option value="AGREEMENT">Contracts & Agreements</option>
            <option value="GENERAL">General Files</option>
          </select>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-2xl">
            Loading document repository from database...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl space-y-2">
            <FolderArchive className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No documents found.</p>
            <p className="text-slate-400">Click &quot;Upload Document&quot; above to archive your first file.</p>
          </div>
        ) : (
          filtered.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-brand-50 text-brand-800 rounded-2xl shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">{doc.fileName}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {doc.documentType.replace(/_/g, " ")}
                    </span>
                    <span>•</span>
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>•</span>
                    <span>
                      {new Date(doc.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => setDetailDoc(doc)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors"
                  title="View details"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Details</span>
                </button>
                <button
                  onClick={() => alert(`Downloading ${doc.fileName}...`)}
                  className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors"
                  title="Download file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setDeleteConfirmDoc(doc)}
                  className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* UPLOAD / REGISTER MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-brand-50 text-brand-800 rounded-xl">
                  <Upload className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Archive New Document</h3>
                  <p className="text-xs text-slate-500">Record proof of work, challan, or corporate license</p>
                </div>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document File Name *</label>
                <input
                  type="text"
                  required
                  value={uploadForm.fileName}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileName: e.target.value })}
                  placeholder="e.g. GST_Certificate_2026.pdf"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-600 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Document Type *</label>
                  <select
                    value={uploadForm.documentType}
                    onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-600 font-semibold"
                  >
                    <option value="GST_CERTIFICATE">GST Certificate</option>
                    <option value="DELIVERY_CHALLAN">Delivery Challan</option>
                    <option value="PROOF_OF_WORK">Proof of Work Photo</option>
                    <option value="AGREEMENT">Agreement / Contract</option>
                    <option value="GENERAL">General Document</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Size (KB)</label>
                  <input
                    type="number"
                    min="1"
                    value={uploadForm.fileSizeKB}
                    onChange={(e) => setUploadForm({ ...uploadForm, fileSizeKB: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Related Entity Domain</label>
                <select
                  value={uploadForm.entityType}
                  onChange={(e) => setUploadForm({ ...uploadForm, entityType: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-600 font-semibold"
                >
                  <option value="GENERAL">General Company Repository</option>
                  <option value="CUSTOMER">Customer Account Proof</option>
                  <option value="SERVICE">Cleaning Service Job</option>
                  <option value="ORDER">Sales Order Delivery</option>
                  <option value="SUPPLIER">Supplier Invoice / Receipt</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  placeholder="Verification details, signing authority, remarks..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {uploading ? "Archiving..." : "Archive Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-brand-50 text-brand-800 rounded-xl">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base truncate max-w-xs">{detailDoc.fileName}</h3>
                  <p className="text-xs text-slate-500">{detailDoc.documentType.replace(/_/g, " ")}</p>
                </div>
              </div>
              <button onClick={() => setDetailDoc(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-semibold">Entity Domain</span>
                  <span className="font-bold text-slate-800">{detailDoc.entityType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">File Size</span>
                  <span className="font-bold text-slate-800">{formatFileSize(detailDoc.fileSize)}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Uploaded On</span>
                <span className="font-semibold text-slate-800">
                  {new Date(detailDoc.createdAt).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
                </span>
              </div>

              {detailDoc.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-semibold block mb-0.5">Notes:</span>
                  <p className="text-slate-800">{detailDoc.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <button
                onClick={() => {
                  const d = detailDoc;
                  setDetailDoc(null);
                  setDeleteConfirmDoc(d);
                }}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold flex items-center gap-1.5 text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert(`Downloading ${detailDoc.fileName}...`)}
                  className="px-3.5 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  onClick={() => setDetailDoc(null)}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-xl font-semibold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Document?</h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{deleteConfirmDoc.fileName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-rose-50/50 border border-rose-100 p-3 rounded-xl">
              Are you sure you want to delete this document from the repository? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setDeleteConfirmDoc(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
