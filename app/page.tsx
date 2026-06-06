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
  image_urls: string[] | null;
  deskripsi: string | null;
};

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

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour >= 4 && hour < 11) return "Selamat Pagi";
  if (hour >= 11 && hour < 15) return "Selamat Siang";
  if (hour >= 15 && hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

function getImages(product: Product) {
  const urls = product.image_urls?.filter(Boolean) ?? [];
  if (urls.length > 0) return urls;
  return product.gambar_url ? [product.gambar_url] : [];
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [now, setNow] = useState(new Date());
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    const storedCart = window.localStorage.getItem(CART_KEY);
    return storedCart ? (JSON.parse(storedCart) as CartItem[]) : [];
  });
  const [slideIndexes, setSlideIndexes] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadPage() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setCustomerEmail(session?.user.email ?? "");

      const { data } = await supabase
        .from("products")
        .select("id,nama_produk,kategori,harga,stok,gambar_url,image_urls,deskripsi")
        .order("created_at", { ascending: false });

      setProducts((data ?? []) as Product[]);
      setLoading(false);
    }

    loadPage();
  }, [supabase]);

  useEffect(() => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setCustomerEmail("");
    window.location.href = "/";
  }

  function addToCart(product: Product) {
    const images = getImages(product);
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);
      if (found) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, qty: Math.min(item.qty + 1, product.stok) }
            : item
        );
      }

      return [
        ...current,
        {
          id: product.id,
          nama_produk: product.nama_produk,
          harga: Number(product.harga),
          stok: product.stok,
          image_url: images[0] ?? null,
          qty: 1,
        },
      ];
    });
    setCartOpen(true);
  }

  function changeQty(productId: string, qty: number) {
    setCart((current) =>
      current.map((item) =>
        item.id === productId
          ? { ...item, qty: Math.max(1, Math.min(qty, item.stok)) }
          : item
      )
    );
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((item) => item.id !== productId));
  }

  function changeSlide(productId: string, direction: number, total: number) {
    setSlideIndexes((current) => {
      const currentIndex = current[productId] ?? 0;
      const nextIndex = (currentIndex + direction + total) % total;
      return { ...current, [productId]: nextIndex };
    });
  }

  const cartCount = cart.reduce((total, item) => total + item.qty, 0);
  const cartTotal = cart.reduce((total, item) => total + item.qty * item.harga, 0);

  return (
    <main className="min-h-screen bg-[#f7f3f5] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-rose-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Tokoku</p>
            <h1 className="text-2xl font-semibold">Boutique Customer</h1>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {customerEmail ? (
              <>
                <a href="/orders" className="rounded-md border border-rose-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-rose-50">Daftar Pesanan Saya</a>
                <span className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600">{customerEmail}</span>
                <button onClick={handleLogout} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Logout</button>
              </>
            ) : (
              <>
                <a href="/login" className="rounded-md border border-rose-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-rose-50">Login</a>
                <a href="/signup" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Daftar</a>
              </>
            )}
            <button onClick={() => setCartOpen(true)} className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700">
              Keranjang ({cartCount})
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 overflow-hidden rounded-lg border border-rose-100 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-6 sm:p-8">
              <p className="text-sm font-medium text-rose-500">
                {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
                {getGreeting(now)}, {customerEmail || "Customer"}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                Pilih koleksi favorit, masukkan ke keranjang, lalu upload bukti transfer saat checkout.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <a href="#produk" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Lihat Produk</a>
                {customerEmail && <a href="/orders" className="rounded-md border border-rose-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-rose-50">Riwayat Pesanan</a>}
              </div>
            </div>
            <div className="flex min-h-64 items-center justify-center bg-gradient-to-br from-rose-100 via-white to-emerald-50 p-8">
              <div className="rounded-lg border border-white/80 bg-white/70 p-6 text-center shadow-sm backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Jam Sekarang</p>
                <p className="mt-2 text-4xl font-semibold tabular-nums text-slate-950">
                  {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div id="produk" className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Koleksi</p>
            <h2 className="text-2xl font-semibold">Produk Tersedia</h2>
          </div>
          <p className="text-sm text-slate-600">Tekan Keranjang untuk menyimpan pilihan sebelum checkout.</p>
        </div>

        {loading ? (
          <div className="rounded-lg border border-rose-100 bg-white p-6 text-sm text-slate-600">Memuat produk...</div>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-rose-100 bg-white p-6 text-sm text-slate-600">Belum ada produk.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const images = getImages(product);
              const slideIndex = slideIndexes[product.id] ?? 0;
              const currentImage = images[slideIndex];

              return (
                <article key={product.id} className="overflow-hidden rounded-lg border border-rose-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative flex aspect-[4/5] items-center justify-center bg-rose-50">
                    {currentImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={currentImage} alt={product.nama_produk} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-medium text-slate-500">Tidak ada gambar</span>
                    )}
                    {images.length > 1 && (
                      <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
                        <button onClick={() => changeSlide(product.id, -1, images.length)} className="h-9 w-9 rounded-full bg-white/90 text-lg font-semibold shadow">‹</button>
                        <button onClick={() => changeSlide(product.id, 1, images.length)} className="h-9 w-9 rounded-full bg-white/90 text-lg font-semibold shadow">›</button>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{product.nama_produk}</h3>
                        <p className="mt-1 text-xs text-rose-500">{product.kategori ?? "Tanpa kategori"}</p>
                      </div>
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Stok {product.stok}</span>
                    </div>
                    {product.deskripsi && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{product.deskripsi}</p>}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="font-semibold">{formatRupiah.format(Number(product.harga))}</p>
                      <button onClick={() => addToCart(product)} className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700">Keranjang</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {cartOpen && (
        <div onClick={() => setCartOpen(false)} className="fixed inset-0 z-50 bg-slate-950/40">
          <aside onClick={(e) => e.stopPropagation()} className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Keranjang</p>
                <h2 className="text-xl font-semibold">Pilihan Produk</h2>
              </div>
              <button onClick={() => setCartOpen(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Tutup</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {cart.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Keranjang masih kosong.</p>
              ) : (
                <div className="grid gap-3">
                  {cart.map((item) => (
                    <div key={item.id} className="grid grid-cols-[72px_1fr] gap-3 rounded-lg border border-slate-200 p-3">
                      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-rose-50">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.nama_produk} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs text-slate-500">No img</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{item.nama_produk}</p>
                            <p className="text-sm text-slate-500">{formatRupiah.format(item.harga)}</p>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-xs font-medium text-red-600">Hapus</button>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <button onClick={() => changeQty(item.id, item.qty - 1)} className="h-8 w-8 rounded-md border border-slate-300">-</button>
                          <input value={item.qty} onChange={(e) => changeQty(item.id, Number(e.target.value))} className="h-8 w-14 rounded-md border border-slate-300 text-center text-sm" />
                          <button onClick={() => changeQty(item.id, item.qty + 1)} className="h-8 w-8 rounded-md border border-slate-300">+</button>
                          <span className="ml-auto text-sm font-medium">{formatRupiah.format(item.qty * item.harga)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-5">
              <div className="mb-4 flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>{formatRupiah.format(cartTotal)}</span>
              </div>
              <a href="/cart" className={`block rounded-md px-4 py-3 text-center text-sm font-semibold text-white ${cart.length === 0 ? "pointer-events-none bg-slate-300" : "bg-slate-950 hover:bg-slate-700"}`}>Checkout Keranjang</a>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}




