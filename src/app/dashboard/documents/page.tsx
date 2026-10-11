"use client";

import {
  FolderArchive,
  Search,
  Upload,
  FileText,
  Image,
  Download,
  Eye,
} from "lucide-react";

export default function DocumentsPage() {
  const documents = [
    {
      name: "GSTIN_Certificate_Aevan_Cleaning.pdf",
      category: "Corporate Registration",
      size: "1.4 MB",
      uploadedBy: "Superadmin",
      date: "01 Oct 2026",
    },
    {
      name: "Challan_Delivery_Patna_INV1001.pdf",
      category: "Delivery Proof / Challan",
      size: "620 KB",
      uploadedBy: "Rahul Kumar",
      date: "10 Oct 2026",
    },
    {
      name: "Water_Tank_Before_After_Nalanda.jpg",
      category: "Service Work Proof",
      size: "3.2 MB",
      uploadedBy: "Manoj (Tech)",
      date: "11 Oct 2026",
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-brand-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Document & Proof Repository
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Delivery challans, customer signatures, service photos, and agreements.
          </p>
        </div>

        <button
          onClick={() => alert("Upload document modal...")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      <div className="space-y-3">
        {documents.map((doc, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl shrink-0">
                <FileText className="w-5 h-5 text-brand-700" />
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                  {doc.name}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {doc.category} • {doc.size} • Uploaded by {doc.uploadedBy}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button
                onClick={() => alert(`Downloading ${doc.name}...`)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
