"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  nama_produk: string;
  kategori: string | null;
  harga: number;
  stok: number;
  gambar_url: string | null;
  deskripsi: string | null;
};

const formatRupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function getGreeting(date: Date) {
  const hour = date.getHours();

  if (hour >= 4 && hour < 11) return "Selamat Pagi";
  if (hour >= 11 && hour < 15) return "Selamat Siang";
  if (hour >= 15 && hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    async function loadPage() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setCustomerEmail(session?.user.email ?? "");

      const { data } = await supabase
        .from("products")
        .select("id,nama_produk,kategori,harga,stok,gambar_url,deskripsi")
        .order("created_at", { ascending: false });

      setProducts((data ?? []) as Product[]);
      setLoading(false);
    }

    loadPage();
  }, [supabase]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setCustomerEmail("");
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tokoku
            </p>
            <h1 className="text-2xl font-semibold">Dashboard Customer</h1>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {customerEmail ? (
              <>
                <a
                  href="/orders"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Daftar Pesanan Saya
                </a>
                <span className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600">
                  {customerEmail}
                </span>
                <button
                  onClick={handleLogout}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <a
                  href="/login"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Login
                </a>
                <a
                  href="/signup"
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Daftar
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {now.toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {getGreeting(now)}, {customerEmail || "Customer"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Silakan pilih produk yang ingin dibeli dari katalog toko.
              </p>
            </div>

            <div className="rounded-lg bg-slate-900 px-5 py-4 text-white">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-300">
                Jam Sekarang
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {now.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold">Produk Tersedia</h2>
          <p className="mt-1 text-sm text-slate-600">
            Pilih produk yang ingin dibeli, lalu lanjut checkout dan konfirmasi WhatsApp.
          </p>
        </div>

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Memuat produk...
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Belum ada produk.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex aspect-[4/3] items-center justify-center bg-slate-200">
                  {product.gambar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.gambar_url}
                      alt={product.nama_produk}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-slate-500">
                      Tidak ada gambar
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{product.nama_produk}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {product.kategori ?? "Tanpa kategori"}
                      </p>
                    </div>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      Stok {product.stok}
                    </span>
                  </div>

                  {product.deskripsi && (
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                      {product.deskripsi}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      {formatRupiah.format(Number(product.harga))}
                    </p>
                    <a
                      href={`/checkout?product=${product.id}`}
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                    >
                      Beli
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
