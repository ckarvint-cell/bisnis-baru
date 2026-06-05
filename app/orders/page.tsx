"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  total_harga: number;
  status: string;
  created_at: string;
  alamat: string | null;
  maps_url: string | null;
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

export default function CustomerOrdersPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadOrders() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login?redirect=/orders";
        return;
      }

      setEmail(session.user.email ?? "");

      const { data: orderRows, error: ordersError } = await supabase
        .from("orders")
        .select("id,total_harga,status,created_at,alamat,maps_url")
        .eq("customer_id", session.user.id)
        .order("created_at", { ascending: false });

      const { data: itemRows, error: itemsError } = await supabase
        .from("order_items")
        .select("id,order_id,nama_produk,harga,qty,subtotal")
        .order("id", { ascending: false });

      if (ordersError || itemsError) {
        setMessage("Daftar pesanan belum bisa dimuat.");
      }

      setOrders((orderRows ?? []) as Order[]);
      setItems((itemRows ?? []) as OrderItem[]);
      setLoading(false);
    }

    loadOrders();
  }, [supabase]);

  function getItems(orderId: string) {
    return items.filter((item) => item.order_id === orderId);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
        <p className="text-sm font-medium">Memuat daftar pesanan...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Customer
            </p>
            <h1 className="text-2xl font-semibold">Daftar Pesanan Saya</h1>
            <p className="mt-1 text-sm text-slate-600">{email}</p>
          </div>
          <Link href="/" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Kembali ke Toko
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8">
        {message && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {message}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Belum ada pesanan untuk akun ini.
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Order #{order.id.slice(0, 8)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {new Date(order.created_at).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {statusLabels[order.status] ?? order.status}
                    </span>
                    <p className="mt-2 text-lg font-semibold">
                      {formatRupiah.format(Number(order.total_harga))}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {getItems(order.id).map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 rounded-md bg-slate-50 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{item.nama_produk}</p>
                        <p className="text-slate-500">
                          {item.qty} x {formatRupiah.format(Number(item.harga))}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatRupiah.format(Number(item.subtotal))}
                      </p>
                    </div>
                  ))}
                </div>

                {order.alamat && (
                  <p className="mt-4 text-sm text-slate-600">
                    Alamat: {order.alamat}
                  </p>
                )}

                {order.maps_url && (
                  <a href={order.maps_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Buka Titik Google Maps
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
