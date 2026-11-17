"use client";

import React, { useMemo, useState } from "react";
import {
  Clock,
  Filter,
  History,
  Search,
  Shield,
  UserCheck,
} from "lucide-react";
import { useLivePlatform } from "@/lib/demo/store";
import { formatTimeInTimezone } from "@/lib/utils/format";

export default function AdminActivityPage() {
  const { event, auditLogs } = useLivePlatform();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("all");

  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((log) => set.add(log.action));
    return Array.from(set);
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (selectedAction !== "all" && log.action !== selectedAction) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesActor = log.actor_label.toLowerCase().includes(q);
        const matchesAction = log.action.toLowerCase().includes(q);
        const matchesTarget = (log.target_id ?? "").toLowerCase().includes(q);
        const matchesMeta = JSON.stringify(log.metadata).toLowerCase().includes(q);
        if (!matchesActor && !matchesAction && !matchesTarget && !matchesMeta) return false;
      }
      return true;
    });
  }, [auditLogs, selectedAction, searchQuery]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-indigo-600" />
          <h1 className="text-base font-bold text-slate-900 tracking-tight">
            Immutable Administrative Audit Trail
          </h1>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Every state-changing event, attendance mutation, queue reorder, and schedule adjustment is permanently recorded against an authenticated individual administrator identity.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search admin, candidate, or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-900 focus:outline-none"
          >
            <option value="all">All Action Types</option>
            {actionTypes.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          Showing {filteredLogs.length} Entries
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 pl-4 pr-3">Timestamp</th>
              <th className="px-3 py-3">Administrator</th>
              <th className="px-3 py-3">Action</th>
              <th className="px-3 py-3">Target</th>
              <th className="px-3 py-3">Change Summary / Reason</th>
              <th className="py-3 pl-3 pr-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              return (
                <tr key={log.id} className="hover:bg-slate-50/60">
                  <td className="py-3 pl-4 pr-3 font-mono text-slate-500 whitespace-nowrap">
                    {formatTimeInTimezone(log.created_at, event.timezone)}
                  </td>

                  <td className="px-3 py-3 font-medium text-slate-900">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      {log.actor_label}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                      {log.action}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-slate-600">
                    <span className="capitalize">{log.target_type}</span>{" "}
                    {log.target_id && (
                      <span className="font-mono text-[10px] text-slate-400">
                        ({log.target_id.slice(-6)})
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-slate-700">
                    {log.previous_value && log.new_value ? (
                      <span className="text-[11px]">
                        <span className="text-slate-400 line-through">{log.previous_value}</span>{" "}
                        → <strong className="text-slate-900">{log.new_value}</strong>
                      </span>
                    ) : log.new_value ? (
                      <strong className="text-slate-900">{log.new_value}</strong>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                    {log.reason && (
                      <div className="text-[10px] text-amber-700 italic mt-0.5">
                        &ldquo;{log.reason}&rdquo;
                      </div>
                    )}
                  </td>

                  <td className="py-3 pl-3 pr-4 text-right font-mono text-[10px] text-slate-400">
                    {Object.keys(log.metadata).length > 0
                      ? JSON.stringify(log.metadata)
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
