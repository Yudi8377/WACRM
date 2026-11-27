"use client";

import { ChevronLeft, ChevronRight, Edit3, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

interface CrudToolbarProps {
  title?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
  hasSelection?: boolean;
  onEditSelected?: () => void;
  onDeleteSelected?: () => void;
  onRefresh?: () => void;
  extraActions?: React.ReactNode;
  dark?: boolean;
}

export function CrudToolbar({
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Cari data...",
  onAddNew,
  addNewLabel = "Tambah Baru",
  hasSelection = false,
  onEditSelected,
  onDeleteSelected,
  onRefresh,
  extraActions,
  dark = false,
}: CrudToolbarProps) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border p-3 ${
        dark
          ? "border-slate-800 bg-slate-900/90 text-white"
          : "border-slate-200 bg-white text-slate-900 shadow-xs"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {title && <span className="mr-1 text-sm font-bold">{title}</span>}
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            {addNewLabel}
          </button>
        )}
        {onEditSelected && (
          <button
            type="button"
            disabled={!hasSelection}
            onClick={onEditSelected}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              dark
                ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
                : "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            Ubah / Update
          </button>
        )}
        {onDeleteSelected && (
          <button
            type="button"
            disabled={!hasSelection}
            onClick={onDeleteSelected}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              dark
                ? "border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus
          </button>
        )}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-2 text-xs font-semibold transition ${
              dark
                ? "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
            title="Segarkan Data"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
        {extraActions}
      </div>

      {onSearchChange && (
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs sm:flex-initial">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className={`w-full rounded-xl border py-2 pr-3 pl-8 text-xs outline-none transition ${
              dark
                ? "border-slate-700 bg-slate-950 text-white focus:border-emerald-500"
                : "border-slate-200 bg-slate-50 text-slate-900 focus:border-emerald-500 focus:bg-white"
            }`}
          />
        </div>
      )}
    </div>
  );
}

interface PaginationBarProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (nextPage: number) => void;
  dark?: boolean;
}

export function PaginationBar({
  page,
  pageSize,
  totalItems,
  onPageChange,
  dark = false,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(totalItems, safePage * pageSize);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-xs ${
        dark
          ? "border-slate-800 bg-slate-900/80 text-slate-300"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      <div>
        Menampilkan <strong>{start}–{end}</strong> dari <strong>{totalItems}</strong> data · Halaman{" "}
        <strong>{safePage}</strong> / <strong>{totalPages}</strong>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
            dark
              ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          }`}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
            dark
              ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          }`}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
