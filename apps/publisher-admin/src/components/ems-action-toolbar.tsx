"use client";

import { Download, Pencil, Plus, Printer, RefreshCw, Search, Trash2 } from "lucide-react";

export interface EmsSubModuleOption {
  id: string;
  label: string;
  count?: number;
}

interface EmsActionToolbarProps {
  moduleName: string;
  subModules?: EmsSubModuleOption[];
  activeSubModule?: string;
  onSelectSubModule?: (id: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  onInsert?: () => void;
  insertLabel?: string;
  onUpdate?: () => void;
  updateDisabled?: boolean;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  onPrint?: () => void;
  printLabel?: string;
  onExportCsv?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  selectedLabel?: string | null;
}

export function EmsActionToolbar({
  moduleName,
  subModules,
  activeSubModule,
  onSelectSubModule,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Cari kode, nama, status...",
  onInsert,
  insertLabel = "Insert / Tambah",
  onUpdate,
  updateDisabled = false,
  onDelete,
  deleteDisabled = false,
  onPrint,
  printLabel = "Cetak",
  onExportCsv,
  onRefresh,
  refreshing = false,
  selectedLabel,
}: EmsActionToolbarProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-3.5 shadow-lg">
      {/* Sub-module ribbon */}
      {subModules && subModules.length > 0 && onSelectSubModule && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-3">
          <span className="mr-1 rounded-md bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Sub-Modul {moduleName}
          </span>
          {subModules.map((sub) => {
            const active = activeSubModule === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSelectSubModule(sub.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  active
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "border border-slate-700/80 bg-slate-950 text-slate-300 hover:border-slate-600 hover:text-white"
                }`}
              >
                <span>{sub.label}</span>
                {typeof sub.count === "number" && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                      active ? "bg-slate-950/20 text-slate-950" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {sub.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Standard Enterprise CRUD + Print Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {onInsert && (
            <button
              type="button"
              onClick={onInsert}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              <Plus className="h-3.5 w-3.5" />
              {insertLabel}
            </button>
          )}
          {onUpdate && (
            <button
              type="button"
              disabled={updateDisabled}
              onClick={onUpdate}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Pencil className="h-3.5 w-3.5" />
              Update / Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              disabled={deleteDisabled}
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete / Hapus
            </button>
          )}
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-200 hover:bg-sky-500/25"
            >
              <Printer className="h-3.5 w-3.5" />
              {printLabel}
            </button>
          )}
          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          )}
          {onRefresh && (
            <button
              type="button"
              disabled={refreshing}
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Sync
            </button>
          )}
          {selectedLabel && (
            <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              Dipilih: {selectedLabel}
            </span>
          )}
        </div>

        {onSearchChange && (
          <div className="relative min-w-[210px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
