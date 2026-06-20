"use client";

import React, { useEffect, useState } from "react";
import AuthGuard from "../auth-guard";
import { FiCalendar, FiClock, FiUser, FiHome, FiCheckCircle } from "react-icons/fi";
import { socketService } from "@/lib/socket";

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowkapi.veritasco.tech'}/appointments/admin/all`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) setAppointments(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAppointments();

    socketService.connect();
    socketService.on("new_appointment", () => fetchAppointments());
    socketService.on("appointment_cancelled", () => fetchAppointments());

    return () => {
      socketService.off("new_appointment");
      socketService.off("appointment_cancelled");
    };
  }, []);

  return (
    <AuthGuard>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Appointments</h1>
            <p className="text-gray-500 mt-1">Live overview of all bookings</p>
          </div>
          <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium border border-green-200">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span>Live Sync Active</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading appointments...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                  <th className="p-4 font-medium">Service & Shop</th>
                  <th className="p-4 font-medium">Customer</th>
                  <th className="p-4 font-medium">Schedule</th>
                  <th className="p-4 font-medium">Provider</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-gray-900">{app.serviceOffering.name}</p>
                      <p className="text-xs text-gray-500 flex items-center mt-1">
                        <FiHome className="mr-1" /> {app.provider.shop.name}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{app.customer.firstName} {app.customer.lastName}</p>
                      <p className="text-xs text-gray-500">{app.customer.phone || 'No phone'}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center text-sm text-gray-900 font-medium">
                        <FiCalendar className="mr-2 text-gray-400" />
                        {new Date(app.timeSlot.startTime).toLocaleDateString()}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <FiClock className="mr-2 text-gray-400" />
                        {new Date(app.timeSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center text-sm text-gray-900">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-2">
                          <FiUser size={12} className="text-gray-500" />
                        </div>
                        {app.provider.name}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold
                        ${app.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${app.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : ''}
                        ${app.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : ''}
                        ${app.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {app.status === 'COMPLETED' && <FiCheckCircle className="mr-1" />}
                        {app.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {appointments.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <FiCalendar className="mx-auto text-4xl mb-4 text-gray-300" />
                <p>No appointments scheduled yet across the platform.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
