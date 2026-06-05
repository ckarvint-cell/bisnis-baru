"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  nama_customer: string;
  email_customer: string;
  total_harga: number;
  status: string;
  created_at: string;
};

type Product = {
  id: string;
  nama_produk: string;
  kategori: string | null;
  harga: number;
  stok: number;
  created_at: string;
};

type AdminStats = {
  products: number;
  customers: number;
  orders: number;
  stock: number;
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

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [stats, setStats] = useState<AdminStats>({
    products: 0,
    customers: 0,
    orders: 0,
    stock: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function loadAdminDashboard() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      setAdminEmail(session.user.email ?? "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        window.location.href = "/";
        return;
      }

      const [
        productsCount,
        customersCount,
        ordersCount,
        stockRows,
        latestOrders,
        latestProducts,
      ] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("products").select("stok"),
        supabase
          .from("orders")
          .select("id,nama_customer,email_customer,total_harga,status,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("products")
          .select("id,nama_produk,kategori,harga,stok,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (
        productsCount.error ||
        customersCount.error ||
        ordersCount.error ||
        stockRows.error ||
        latestOrders.error ||
        latestProducts.error
      ) {
        setMessage("Dashboard belum bisa mengambil data dari Supabase.");
      }

      setStats({
        products: productsCount.count ?? 0,
        customers: customersCount.count ?? 0,
        orders: ordersCount.count ?? 0,
        stock:
          stockRows.data?.reduce(
            (total, product) => total + Number(product.stok ?? 0),
            0
          ) ?? 0,
      });
      setOrders((latestOrders.data ?? []) as Order[]);
      setProducts((latestProducts.data ?? []) as Product[]);
      setLoading(false);
    }

    loadAdminDashboard();
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
        <p className="text-sm font-medium">Memuat dashboard admin...</p>
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
            <h1 className="text-2xl font-semibold">Dashboard Toko</h1>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600">
              {adminEmail}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-3">
          <nav className="grid gap-1">
            <a className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" href="/admin">
              Dashboard
            </a>
            <a className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href="/admin/products">
              Produk
            </a>
            <a className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href="/admin/customers">
              Customer
            </a>
            <a className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href="/admin/orders">
              Pesanan
            </a>
          </nav>
        </aside>

        <section className="grid gap-6">
          {message && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {message}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Produk" value={stats.products} />
            <StatCard label="Total Stok" value={stats.stock} />
            <StatCard label="Customer" value={stats.customers} />
            <StatCard label="Pesanan" value={stats.orders} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="font-semibold">Pesanan Terbaru</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-500" colSpan={4}>
                          Belum ada pesanan.
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-4 py-3">
                            <p className="font-medium">{order.nama_customer}</p>
                            <p className="text-xs text-slate-500">
                              {order.email_customer}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {formatRupiah.format(Number(order.total_harga))}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                              {statusLabels[order.status] ?? order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(order.created_at).toLocaleDateString(
                              "id-ID"
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="font-semibold">Produk Terbaru</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Harga</th>
                      <th className="px-4 py-3">Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-500" colSpan={4}>
                          Belum ada produk.
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => (
                        <tr key={product.id}>
                          <td className="px-4 py-3 font-medium">
                            {product.nama_produk}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {product.kategori ?? "-"}
                          </td>
                          <td className="px-4 py-3">
                            {formatRupiah.format(Number(product.harga))}
                          </td>
                          <td className="px-4 py-3">{product.stok}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">
        {value.toLocaleString("id-ID")}
      </p>
    </div>
  );
}
