"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

export default function DashboardPage() {
  const [data, setData] = useState<{contacts: any[], user: any, googleConnected: boolean} | null>(null);

  useEffect(() => {
    fetch('/api/contacts')
      .then(res => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-xl font-semibold text-gray-500 animate-pulse">Loading dashboard...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Welcome back, {data.user?.name || "User"}</h1>
            <p className="text-gray-500 mt-1">Manage your scanned business contacts and integrations.</p>
          </div>
          <div className="flex gap-4">
            <Link href="/dashboard/integrations" className="bg-black text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-800 transition-colors shadow-md">
              Integrations
            </Link>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="bg-gray-200 text-gray-800 px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
              Sign out
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <h3 className="text-gray-500 font-semibold mb-2">Total AI Scans Used</h3>
            <p className="text-4xl font-extrabold text-indigo-600">{data.user?.scansUsed} <span className="text-2xl text-gray-400 font-medium">/ {data.user?.scansLimit}</span></p>
          </div>
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <h3 className="text-gray-500 font-semibold mb-2">Auto-Synced Contacts</h3>
            <p className="text-4xl font-extrabold text-green-500">{data.contacts.filter((c: any) => c.syncedTo?.length > 0).length}</p>
          </div>
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <h3 className="text-gray-500 font-semibold mb-2">Current Plan</h3>
            <p className="text-4xl font-extrabold text-gray-800 capitalize">{data.user?.plan || "Free"}</p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">Recent Scanned Contacts</h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="p-5 border-b text-gray-500 font-semibold text-sm uppercase tracking-wider">Name</th>
                <th className="p-5 border-b text-gray-500 font-semibold text-sm uppercase tracking-wider">Company & Role</th>
                <th className="p-5 border-b text-gray-500 font-semibold text-sm uppercase tracking-wider">Contact Details</th>
                <th className="p-5 border-b text-gray-500 font-semibold text-sm uppercase tracking-wider">Synced Services</th>
                <th className="p-5 border-b text-gray-500 font-semibold text-sm uppercase tracking-wider">Scanned On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.contacts.map((c: any) => (
                <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-5 font-medium text-gray-900">{c.name || 'Unknown'}</td>
                  <td className="p-5">
                    <div className="font-semibold text-gray-800">{c.company || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{c.jobTitle || ''}</div>
                  </td>
                  <td className="p-5">
                    <div className="text-gray-800">{c.email || 'No email'}</div>
                    <div className="text-sm text-gray-500">{c.phone || 'No phone'}</div>
                  </td>
                  <td className="p-5 flex gap-2 flex-wrap items-center">
                    {c.syncedTo?.length > 0 ? c.syncedTo.map((service: string) => (
                      <span key={service} className="bg-teal-50 border border-teal-200 text-teal-700 text-xs px-2.5 py-1 rounded-full font-medium capitalize shadow-sm">
                        {service}
                      </span>
                    )) : (
                      <span className="text-gray-400 text-sm font-medium bg-gray-100 px-2.5 py-1 rounded-full">Pending</span>
                    )}
                  </td>
                  <td className="p-5 text-sm text-gray-500 font-medium">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {data.contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                      📱
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No contacts found</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">Send an image of a business card to your connected 11za WhatsApp number to see it appear here automatically.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Integration Status Footer */}
         <div className="mt-8 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
           <span className="font-semibold text-gray-700">Background Sync Engine Status:</span>
           <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${data.googleConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
             {data.googleConnected ? '🟢 Active & Connected' : '🔴 Action Required: Not Connected'}
           </span>
         </div>
      </div>
    </div>
  );
}
