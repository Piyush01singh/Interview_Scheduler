"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { useLivePlatform } from "@/lib/demo/store";
import { AdminRole, AdminUser } from "@/types/domain";
import { formatTimeInTimezone } from "@/lib/utils/format";

export default function AdminStaffManagementPage() {
  const {
    event,
    currentAdmin,
    allAdmins,
    createAdminUser,
    updateAdminUser,
    deactivateAdminUser,
    loginAdmin,
  } = useLivePlatform();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("admin");
  const [assignedPanelId, setAssignedPanelId] = useState<string>("");

  const isOwner = currentAdmin?.role === "owner";

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    createAdminUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      assigned_panel_id: role === "panel_manager" ? assignedPanelId : null,
      is_active: true,
      last_login_at: null,
    });

    setName("");
    setEmail("");
    setRole("admin");
    setAssignedPanelId("");
    setShowInviteModal(false);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header and Add Staff Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Administrator Staff & Role-Based Access Control (RBAC)
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Every staff member must have an individual named account. Generic &ldquo;admin&rdquo; credentials are strictly prohibited.
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          <UserPlus className="h-4 w-4" />
          Provision New Administrator
        </button>
      </div>

      {/* Role Matrix Explanation Card */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RoleCard
          title="Owner"
          badge="Full Authority"
          badgeColor="bg-purple-100 text-purple-800"
          desc="Complete system control, manage staff, configure events, access reports, bootstrap settings."
        />
        <RoleCard
          title="Placement Admin"
          badge="Operations"
          badgeColor="bg-blue-100 text-blue-800"
          desc="Manage candidates, queues, start & complete interviews, import spreadsheets, generate reports."
        />
        <RoleCard
          title="Panel Manager"
          badge="Panel Room"
          badgeColor="bg-emerald-100 text-emerald-800"
          desc="Control interview timers, call candidates, record interview notes on assigned panels."
        />
        <RoleCard
          title="Attendance Operator"
          badge="Venue Gate"
          badgeColor="bg-amber-100 text-amber-800"
          desc="Verify QR codes, check-in arrivals, mark absent/late with audit reasons; cannot alter schedules."
        />
      </div>

      {/* Staff Roster Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            Registered Administrative Accounts ({allAdmins.length})
          </span>
          <span className="text-[11px] text-slate-500">
            Logged in as: <strong className="text-slate-900">{currentAdmin?.name} ({currentAdmin?.role})</strong>
          </span>
        </div>

        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 pl-4 pr-3">Administrator</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Assigned Panel</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Last Active</th>
              <th className="py-3 pl-3 pr-4 text-right">Account Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allAdmins.map((adm) => {
              const isCurrent = currentAdmin?.id === adm.id;

              return (
                <tr key={adm.id} className="hover:bg-slate-50/60">
                  <td className="py-3 pl-4 pr-3">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      {adm.name}
                      {isCurrent && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 font-mono text-[11px]">{adm.email}</div>
                  </td>

                  <td className="px-3 py-3">
                    <RoleBadge role={adm.role} />
                  </td>

                  <td className="px-3 py-3 text-slate-600">
                    {adm.assigned_panel_id ? (
                      <span className="font-medium text-slate-800">{adm.assigned_panel_id}</span>
                    ) : (
                      <span className="text-slate-400">All Panels</span>
                    )}
                  </td>

                  <td className="px-3 py-3">
                    {adm.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        Deactivated
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3 font-mono text-slate-500">
                    {adm.last_login_at
                      ? formatTimeInTimezone(adm.last_login_at, event.timezone)
                      : "Never"}
                  </td>

                  <td className="py-3 pl-3 pr-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      {!isCurrent && (
                        <button
                          onClick={() => loginAdmin(adm.id)}
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Switch Identity
                        </button>
                      )}

                      {isOwner && !isCurrent && adm.role !== "owner" && (
                        <button
                          onClick={() => deactivateAdminUser(adm.id)}
                          className={`rounded px-2 py-1 text-[11px] font-medium ${
                            adm.is_active
                              ? "border border-rose-200 text-rose-700 hover:bg-rose-50"
                              : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {adm.is_active ? "Deactivate" : "Reactivate"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Provision Staff Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <UserPlus className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Provision Administrator Account
              </h3>
            </div>
            <form onSubmit={handleCreateStaff} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Nair"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Official University Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. v.nair@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Security Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as AdminRole)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                >
                  <option value="admin">Placement Admin (Full Operations)</option>
                  <option value="panel_manager">Panel Manager (Panel Control Only)</option>
                  <option value="attendance_operator">Attendance Operator (Gate / QR Only)</option>
                  <option value="owner">Owner (Complete Administrative Control)</option>
                </select>
              </div>

              {role === "panel_manager" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Assign Panel</label>
                  <select
                    value={assignedPanelId}
                    onChange={(e) => setAssignedPanelId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                  >
                    <option value="panel-1">Panel 1 — Full-Stack & Frontend</option>
                    <option value="panel-2">Panel 2 — Backend & Cloud</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Provision Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleCard({
  title,
  badge,
  badgeColor,
  desc,
}: {
  title: string;
  badge: string;
  badgeColor: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-900">{title}</span>
        <span className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${badgeColor}`}>
          {badge}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{desc}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: AdminRole }) {
  const styles: Record<AdminRole, string> = {
    owner: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20",
    admin: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
    panel_manager: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    attendance_operator: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  };
  const labels: Record<AdminRole, string> = {
    owner: "Owner",
    admin: "Placement Admin",
    panel_manager: "Panel Manager",
    attendance_operator: "Attendance Operator",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[role]}`}
    >
      {labels[role]}
    </span>
  );
}
