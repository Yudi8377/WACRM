"use client";

import { useState } from "react";
import type { PieSlice } from "@/lib/intelligence-types";

interface DonutPieChartProps {
  title: string;
  subtitle?: string;
  slices: PieSlice[];
  centerValue: string;
  centerLabel: string;
}

export function DonutPieChart({
  title,
  subtitle,
  slices,
  centerValue,
  centerLabel,
}: DonutPieChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const total = slices.reduce((s, item) => s + item.value, 0) || 1;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;

  const segments = slices.reduce<
    Array<PieSlice & { dashLength: number; dashOffset: number }>
  >((acc, slice) => {
    const prevSum = acc.reduce((s, item) => s + item.dashLength, 0);
    const ratio = slice.value / total;
    const dashLength = Math.max(0.5, ratio * circumference);
    acc.push({
      ...slice,
      dashLength,
      dashOffset: -prevSum,
    });
    return acc;
  }, []);

  const activeSlice = hoveredKey
    ? slices.find((s) => s.key === hoveredKey) ?? null
    : null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
      <div>
        <h3 className="text-sm font-extrabold text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
      </div>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
          <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#1e293b"
              strokeWidth="22"
            />
            {segments.map((seg) => (
              <circle
                key={seg.key}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={hoveredKey === seg.key ? "26" : "22"}
                strokeDasharray={`${seg.dashLength} ${circumference}`}
                strokeDashoffset={seg.dashOffset}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredKey(seg.key)}
                onMouseLeave={() => setHoveredKey(null)}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
            <span className="text-lg font-extrabold text-white">
              {activeSlice ? `${activeSlice.percent}%` : centerValue}
            </span>
            <span className="max-w-[92px] truncate text-[10px] font-semibold text-slate-400">
              {activeSlice ? activeSlice.label : centerLabel}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2 text-xs">
          {slices.map((s) => (
            <div
              key={s.key}
              onMouseEnter={() => setHoveredKey(s.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1 transition ${
                hoveredKey === s.key ? "bg-slate-800/90" : "hover:bg-slate-800/40"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="truncate text-slate-200">{s.label}</span>
              </div>
              <div className="shrink-0 font-mono text-[11px] font-bold text-white">
                {s.percent}%{" "}
                <span className="font-normal text-slate-400">({s.value})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface HourlyActivityBarChartProps {
  title: string;
  subtitle?: string;
  peakHourLabel: string;
  data: Array<{ hour: number; label: string; sessions: number; minutes: number }>;
}

export function HourlyActivityBarChart({
  title,
  subtitle,
  peakHourLabel,
  data,
}: HourlyActivityBarChartProps) {
  const maxSessions = Math.max(1, ...data.map((d) => d.sessions));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-extrabold text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
        </div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-extrabold text-emerald-300">
          Jam Puncak: {peakHourLabel}
        </span>
      </div>

      <div className="mt-5 grid h-44 grid-cols-24 items-end gap-1 pt-4">
        {data.map((d) => {
          const heightPct = Math.max(6, Math.round((d.sessions / maxSessions) * 100));
          const isPeak = d.sessions >= maxSessions * 0.8;
          return (
            <div key={d.hour} className="group flex h-full flex-col items-center justify-end gap-1">
              <div className="relative flex w-full flex-1 items-end">
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-md transition-all ${
                    isPeak
                      ? "bg-gradient-to-t from-emerald-600 to-cyan-400 shadow-md shadow-emerald-500/30"
                      : "bg-slate-700 group-hover:bg-emerald-500/70"
                  }`}
                  title={`${d.label} WIB · ${d.sessions} sesi · ${d.minutes} menit`}
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500">
                {d.hour % 3 === 0 ? String(d.hour).padStart(2, "0") : ""}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
        <span>00:00 WIB (Dini Hari)</span>
        <span>12:00 WIB (Siang)</span>
        <span>23:00 WIB (Malam)</span>
      </div>
    </div>
  );
}
