"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  maps_url: string | null;
  created_at: string;
};

export default function AdminCustomersPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    async function loadCustomers() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role !== "admin") {
        window.location.href = "/";
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name,phone,address,maps_url,created_at")
        .eq("role", "customer")
        .order("created_at", { ascending: false });

      if (error) {
        setMessage("Data customer belum bisa dimuat.");
      }

      setCustomers((data ?? []) as Customer[]);
      setLoading(false);
    }

    loadCustomers();
  }, [supabase]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
        <p className="text-sm font-medium">Memuat data customer...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Admin Panel
            </p>
            <h1 className="text-2xl font-semibold">Data Customer</h1>
          </div>
          <a href="/admin" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Kembali ke Dashboard
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6">
        {message && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {message}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold">Customer Terdaftar</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Alamat</th>
                  <th className="px-4 py-3">Maps</th>
                  <th className="px-4 py-3">Tanggal Daftar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={5}>
                      Belum ada customer.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{customer.full_name || "Tanpa nama"}</p>
                        <p className="text-xs text-slate-500">{customer.email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {customer.phone || "-"}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-600">
                        {customer.address || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {customer.maps_url ? (
                          <a href={customer.maps_url} target="_blank" rel="noreferrer" className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            Buka Maps
                          </a>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(customer.created_at).toLocaleDateString("id-ID")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
