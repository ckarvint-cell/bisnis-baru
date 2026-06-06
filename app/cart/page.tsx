"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CartItem = {
  id: string;
  nama_produk: string;
  harga: number;
  stok: number;
  image_url: string | null;
  qty: number;
};

const CART_KEY = "tokoku_cart";

const formatRupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function CartReviewPage() {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = window.localStorage.getItem(CART_KEY);
    return stored ? (JSON.parse(stored) as CartItem[]) : [];
  });

  useEffect(() => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  function changeQty(productId: string, qty: number) {
    setCart((current) =>
      current.map((item) =>
        item.id === productId
          ? { ...item, qty: Math.max(1, Math.min(qty, item.stok)) }
          : item
      )
    );
  }

  function removeItem(productId: string) {
    setCart((current) => current.filter((item) => item.id !== productId));
  }

  function clearCart() {
    setCart([]);
  }

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.harga * item.qty, 0);

  return (
    <main className="min-h-screen bg-[#f7f3f5] text-slate-950">
      <header className="border-b border-rose-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
              Keranjang
            </p>
            <h1 className="text-2xl font-semibold">Gabungkan Produk Belanja</h1>
            <p className="mt-1 text-sm text-slate-600">
              Cek semua produk berbeda sebelum lanjut checkout.
            </p>
          </div>
          <Link href="/" className="rounded-md border border-rose-200 px-4 py-2 text-sm font-medium hover:bg-rose-50">
            Tambah Produk Lagi
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-rose-100 bg-white shadow-sm">
          <div className="border-b border-rose-100 px-5 py-4">
            <h2 className="font-semibold">Produk di Keranjang</h2>
          </div>

          <div className="grid gap-3 p-5">
            {cart.length === 0 ? (
              <div className="rounded-lg bg-rose-50 p-6 text-sm text-slate-600">
                Keranjang masih kosong. Silakan tambah produk dari katalog.
              </div>
            ) : (
              cart.map((item) => (
                <article key={item.id} className="grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-[96px_1fr_auto] sm:items-center">
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-rose-50">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.nama_produk} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-500">No img</span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold">{item.nama_produk}</h3>
                    <p className="mt-1 text-sm text-slate-500">{formatRupiah.format(item.harga)}</p>
                    <p className="mt-1 text-xs text-slate-500">Stok tersedia {item.stok}</p>
                    <button onClick={() => removeItem(item.id)} className="mt-3 text-sm font-medium text-red-600">
                      Hapus
                    </button>
                  </div>

                  <div className="grid gap-2 sm:justify-items-end">
                    <div className="flex items-center gap-2">
                      <button onClick={() => changeQty(item.id, item.qty - 1)} className="h-9 w-9 rounded-md border border-slate-300">-</button>
                      <input value={item.qty} onChange={(e) => changeQty(item.id, Number(e.target.value))} className="h-9 w-16 rounded-md border border-slate-300 text-center text-sm" />
                      <button onClick={() => changeQty(item.id, item.qty + 1)} className="h-9 w-9 rounded-md border border-slate-300">+</button>
                    </div>
                    <p className="font-semibold">{formatRupiah.format(item.qty * item.harga)}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <aside className="h-fit rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Ringkasan Belanja</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between"><span>Total produk</span><span>{cart.length}</span></div>
            <div className="flex justify-between"><span>Total item</span><span>{totalItems}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-semibold"><span>Total</span><span>{formatRupiah.format(totalPrice)}</span></div>
          </div>

          <div className="mt-5 grid gap-2">
            <Link href="/checkout" className={`rounded-md px-4 py-3 text-center text-sm font-semibold text-white ${cart.length === 0 ? "pointer-events-none bg-slate-300" : "bg-rose-600 hover:bg-rose-700"}`}>
              Lanjut Checkout
            </Link>
            {cart.length > 0 && (
              <button onClick={clearCart} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
                Kosongkan Keranjang
              </button>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
