"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AdminOrder = {
  id: string;
  nama_customer: string;
  email_customer: string;
  no_whatsapp: string;
  alamat: string | null;
  maps_url: string | null;
  total_harga: number;
  status: string;
  created_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  nama_produk: string;
  harga: number;
  qty: number;
  subtotal: number;
};

const formatRupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const statusLabels: Record<string, string> = {
  menunggu_konfirmasi: "Menunggu Konfirmasi",
  diproses: "Diproses",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export default function AdminOrdersPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AdminOrder | null>(null);

  useEffect(() => {
    async function loadPage() {
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

      await loadOrders();
      setLoading(false);
    }

    loadPage();
  }, [supabase]);

  async function loadOrders() {
    const [ordersResult, itemsResult] = await Promise.all([
      supabase
        .from("orders")
        .select("id,nama_customer,email_customer,no_whatsapp,alamat,maps_url,total_harga,status,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("order_items")
        .select("id,order_id,nama_produk,harga,qty,subtotal")
        .order("id", { ascending: false }),
    ]);

    if (ordersResult.error || itemsResult.error) {
      setMessage("Data pesanan belum bisa dimuat.");
    }

    setOrders((ordersResult.data ?? []) as AdminOrder[]);
    setItems((itemsResult.data ?? []) as OrderItem[]);
  }

  function getItems(orderId: string) {
    return items.filter((item) => item.order_id === orderId);
  }

  async function approveOrder(orderId: string) {
    setSavingId(orderId);
    setMessage("");

    const { error } = await supabase
      .from("orders")
      .update({ status: "diproses" })
      .eq("id", orderId);

    if (error) {
      setMessage(error.message);
      setSavingId(null);
      return;
    }

    await loadOrders();
    setSavingId(null);
    setMessage("Pesanan berhasil di-approve.");
  }

  async function deleteOrder() {
    if (!deleteTarget) return;

    setSavingId(deleteTarget.id);
    setMessage("");

    const { data, error } = await supabase
      .from("orders")
      .delete()
      .eq("id", deleteTarget.id)
      .select("id");

    if (error) {
      setMessage(error.message);
      setSavingId(null);
      setDeleteTarget(null);
      return;
    }

    if (!data || data.length === 0) {
      setMessage("Pesanan belum terhapus. Pastikan policy delete admin di Supabase sudah aktif.");
      setSavingId(null);
      setDeleteTarget(null);
      return;
    }

    await loadOrders();
    setSavingId(null);
    setDeleteTarget(null);
    setMessage("Pesanan berhasil dihapus.");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
        <p className="text-sm font-medium">Memuat pesanan...</p>
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
            <h1 className="text-2xl font-semibold">Kelola Pesanan</h1>
          </div>
          <a href="/admin" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Kembali ke Dashboard
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6">
        {message && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <div className="grid gap-4">
          {orders.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Belum ada pesanan.
            </div>
          ) : (
            orders.map((order) => (
              <article key={order.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Order #{order.id.slice(0, 8)}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">{order.nama_customer}</h2>
                    <p className="text-sm text-slate-600">{order.email_customer}</p>
                    <p className="text-sm text-slate-600">WhatsApp: {order.no_whatsapp}</p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3 lg:text-right">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Total</p>
                      <p className="font-semibold">{formatRupiah.format(Number(order.total_harga))}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Status</p>
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Tanggal</p>
                      <p className="text-sm text-slate-600">{new Date(order.created_at).toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {getItems(order.id).map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 rounded-md bg-slate-50 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{item.nama_produk}</p>
                        <p className="text-slate-500">{item.qty} x {formatRupiah.format(Number(item.harga))}</p>
                      </div>
                      <p className="font-medium">{formatRupiah.format(Number(item.subtotal))}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-600">
                  {order.alamat && <p>Alamat: {order.alamat}</p>}
                  {order.maps_url && (
                    <a href={order.maps_url} target="_blank" rel="noreferrer" className="w-fit rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Buka Titik Google Maps
                    </a>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => approveOrder(order.id)}
                    disabled={savingId === order.id || order.status === "diproses" || order.status === "selesai"}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {savingId === order.id ? "Memproses..." : "Approve Pesanan"}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(order)}
                    disabled={savingId === order.id}
                    className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Hapus Pesanan
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <p className="text-sm font-medium text-red-600">Konfirmasi Hapus</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Hapus pesanan ini?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Pesanan dari <span className="font-medium">{deleteTarget.nama_customer}</span> dengan total {formatRupiah.format(Number(deleteTarget.total_harga))} akan dihapus permanen.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Tidak
              </button>
              <button
                onClick={deleteOrder}
                disabled={savingId === deleteTarget.id}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {savingId === deleteTarget.id ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

