"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  FiCalendar, FiClock, FiUser, FiHome, FiCheckCircle,
  FiXCircle, FiAlertCircle, FiLoader, FiX, FiPhone,
  FiMapPin, FiTag, FiDollarSign, FiSearch, FiFilter,
  FiRefreshCw, FiChevronRight, FiStar
} from "react-icons/fi";
import { socketService } from "@/lib/socket";

const API = process.env.NEXT_PUBLIC_API_URL || "https://bazarchowk-complete.vercel.app";
const tok = () => typeof window !== "undefined" ? localStorage.getItem("admin_token") || "" : "";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode; dot: string }> = {
  PENDING:   { label: "Pending",   bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200", icon: <FiAlertCircle />, dot: "bg-amber-400" },
  CONFIRMED: { label: "Confirmed", bg: "bg-green-50",   text: "text-green-700",  border: "border-green-200", icon: <FiCheckCircle />, dot: "bg-green-500" },
  COMPLETED: { label: "Completed", bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200",  icon: <FiCheckCircle />, dot: "bg-blue-500"  },
  CANCELLED: { label: "Cancelled", bg: "bg-red-50",     text: "text-red-700",    border: "border-red-200",   icon: <FiXCircle />,     dot: "bg-red-500"  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-14 h-14 text-lg" : size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  const colors = ["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-rose-500", "bg-amber-500", "bg-cyan-500"];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const initials = name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-sm text-slate-800 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function AppointmentSidebar({ appointment, onClose }: { appointment: any; onClose: () => void }) {
  if (!appointment) return null;

  const startTime = new Date(appointment.timeSlot?.startTime);
  const endTime = new Date(appointment.timeSlot?.endTime);
  const cfg = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.PENDING;
  const customerName = `${appointment.customer?.firstName || ""} ${appointment.customer?.lastName || ""}`.trim();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div
        className="fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col"
        style={{ animation: "slideInRight 0.25s cubic-bezier(0.32, 0.72, 0, 1)" }}
      >
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #22c55e 0%, transparent 60%)" }}
          />
          <div className="relative p-6 pb-5">
            <div className="flex items-center justify-between mb-5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
                {cfg.label}
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <Avatar name={customerName} size="lg" />
              <div>
                <h2 className="text-xl font-bold text-white">{customerName}</h2>
                <p className="text-sm text-slate-300 mt-0.5 flex items-center gap-1.5">
                  <FiPhone size={12} />
                  {appointment.customer?.phone || "No phone"}
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-white/10 border border-white/10">
              <p className="text-white font-semibold text-base">{appointment.serviceOffering?.name}</p>
              <p className="text-slate-300 text-sm mt-0.5 flex items-center gap-1.5">
                <FiHome size={12} />
                {appointment.provider?.shop?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Appointment ID */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-xs text-slate-400 font-medium">Appointment ID</p>
          <p className="text-xs font-mono text-slate-600 mt-0.5">{appointment.id}</p>
        </div>

        {/* Details */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Schedule Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FiCalendar size={12} /> Scheduled Time
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/70 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">Date</p>
                <p className="text-sm font-bold text-slate-800">
                  {startTime.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="bg-white/70 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">Time</p>
                <p className="text-sm font-bold text-slate-800">
                  {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            {appointment.timeSlot?.endTime && (
              <p className="text-xs text-green-700 mt-2 text-center">
                Until {endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>

          {/* Provider Info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Service Provider</p>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Avatar name={appointment.provider?.name || "P"} size="sm" />
              <div>
                <p className="text-sm font-semibold text-slate-800">{appointment.provider?.name}</p>
                <p className="text-xs text-slate-400">{appointment.provider?.role || "Service Expert"}</p>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Details</p>
            <div className="space-y-3">
              <DetailRow
                icon={<FiTag size={14} />}
                label="Service Category"
                value={appointment.serviceOffering?.category || appointment.serviceOffering?.categoryName}
              />
              <DetailRow
                icon={<FiDollarSign size={14} />}
                label="Price"
                value={appointment.serviceOffering?.price ? `₹${Number(appointment.serviceOffering.price).toLocaleString("en-IN")}` : undefined}
              />
              <DetailRow
                icon={<FiClock size={14} />}
                label="Duration"
                value={appointment.serviceOffering?.duration ? `${appointment.serviceOffering.duration} min` : undefined}
              />
              <DetailRow
                icon={<FiMapPin size={14} />}
                label="Location"
                value={appointment.provider?.shop?.address || appointment.provider?.shop?.area}
              />
              <DetailRow
                icon={<FiStar size={14} />}
                label="Notes"
                value={appointment.notes || appointment.customerNotes}
              />
            </div>
          </div>

          {/* Timestamps */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Timeline</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Booked</span>
                <span className="text-slate-700 font-medium">
                  {new Date(appointment.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {appointment.updatedAt && appointment.updatedAt !== appointment.createdAt && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Last Updated</span>
                  <span className="text-slate-700 font-medium">
                    {new Date(appointment.updatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-white flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <a
            href={`tel:${appointment.customer?.phone}`}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 text-sm font-medium text-white flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
          >
            <FiPhone size={14} />
            Call Customer
          </a>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const fetchAppointments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`${API}/appointments/admin/all`, {
        headers: { Authorization: `Bearer ${tok()}` },
      });
      const data = await res.json();
      if (!data.error) setAppointments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    socketService.connect();
    socketService.on("new_appointment", () => fetchAppointments(true));
    socketService.on("appointment_cancelled", () => fetchAppointments(true));
    return () => {
      socketService.off("new_appointment");
      socketService.off("appointment_cancelled");
    };
  }, [fetchAppointments]);

  const filtered = appointments.filter((app) => {
    const matchStatus = statusFilter === "ALL" || app.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      app.serviceOffering?.name?.toLowerCase().includes(q) ||
      app.customer?.firstName?.toLowerCase().includes(q) ||
      app.customer?.lastName?.toLowerCase().includes(q) ||
      app.customer?.phone?.includes(q) ||
      app.provider?.shop?.name?.toLowerCase().includes(q) ||
      app.provider?.name?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = {
    ALL: appointments.length,
    PENDING: appointments.filter(a => a.status === "PENDING").length,
    CONFIRMED: appointments.filter(a => a.status === "CONFIRMED").length,
    COMPLETED: appointments.filter(a => a.status === "COMPLETED").length,
    CANCELLED: appointments.filter(a => a.status === "CANCELLED").length,
  };

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by service, customer, shop, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Live dot + refresh */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-xs font-semibold border border-green-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Live
          </div>
          <button
            onClick={() => fetchAppointments(true)}
            disabled={refreshing}
            className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all disabled:opacity-50"
          >
            <FiRefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const).map(s => {
          const cfg = s === "ALL" ? null : STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                statusFilter === s
                  ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {cfg && <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />}
              {s === "ALL" ? "All Appointments" : cfg!.label}
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${statusFilter === s ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {counts[s]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <FiLoader className="animate-spin mx-auto text-green-500 mb-3" size={28} />
          <p className="text-slate-500 text-sm">Loading appointments…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <FiCalendar size={24} className="text-slate-300" />
          </div>
          <h3 className="text-slate-700 font-semibold">No appointments found</h3>
          <p className="text-slate-400 text-sm mt-1">
            {search || statusFilter !== "ALL" ? "Try adjusting your filters." : "No appointments have been scheduled yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Service &amp; Shop</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Schedule</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Provider</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((app) => {
                const startTime = new Date(app.timeSlot?.startTime);
                const cName = `${app.customer?.firstName || ""} ${app.customer?.lastName || ""}`.trim();
                return (
                  <tr
                    key={app.id}
                    onClick={() => setSelected(app)}
                    className={`hover:bg-slate-50/80 cursor-pointer transition-all group ${selected?.id === app.id ? "bg-green-50/50" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800 text-sm">{app.serviceOffering?.name}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <FiHome size={10} />
                        {app.provider?.shop?.name}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={cName} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{cName}</p>
                          <p className="text-xs text-slate-400">{app.customer?.phone || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                        <FiCalendar size={13} className="text-slate-400" />
                        {startTime.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <FiClock size={11} />
                        {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={app.provider?.name || "P"} size="sm" />
                        <span className="text-sm text-slate-700">{app.provider?.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-green-500 text-slate-400 group-hover:text-white flex items-center justify-center transition-all">
                          <FiChevronRight size={14} />
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <p className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-600">{filtered.length}</span> of{" "}
              <span className="font-semibold text-slate-600">{appointments.length}</span> appointments
            </p>
            <p className="text-xs text-slate-400">Click any row to view details</p>
          </div>
        </div>
      )}

      {/* Detail Sidebar */}
      {selected && (
        <AppointmentSidebar appointment={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
