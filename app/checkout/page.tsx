"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  nama_produk: string;
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

export default function CheckoutPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [email, setEmail] = useState("");
  const [nama, setNama] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [qty, setQty] = useState(1);

  const total = product ? Number(product.harga) * qty : 0;

  useEffect(() => {
    async function loadCheckout() {
      const productId = new URLSearchParams(window.location.search).get("product");

      if (!productId) {
        setMessage("Produk tidak ditemukan.");
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
        return;
      }

      setCustomerId(session.user.id);
      setEmail(session.user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name,phone,address,maps_url")
        .eq("id", session.user.id)
        .single();

      setNama(profile?.full_name ?? "");
      setWhatsapp(profile?.phone ?? "");
      setAlamat(profile?.address ?? "");
      setMapsUrl(profile?.maps_url ?? "");

      const { data, error } = await supabase
        .from("products")
        .select("id,nama_produk,harga,stok,gambar_url,deskripsi")
        .eq("id", productId)
        .single();

      if (error || !data) {
        setMessage("Produk tidak ditemukan.");
        setLoading(false);
        return;
      }

      setProduct(data as Product);
      setLoading(false);
    }

    loadCheckout();
  }, [supabase]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("Browser tidak mendukung GPS lokasi.");
      return;
    }

    setMessage("Mengambil titik GPS...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapsUrl(`https://www.google.com/maps?q=${latitude},${longitude}`);
        setMessage("Titik GPS berhasil diambil.");
      },
      () => {
        setMessage("Izin lokasi ditolak atau GPS tidak tersedia.");
      }
    );
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();

    if (saving) return;
    if (!product || !customerId) return;

    if (qty < 1 || qty > product.stok) {
      setMessage("Jumlah beli tidak sesuai stok.");
      return;
    }

    const confirmed = window.confirm(
      `Lanjut checkout ${qty} ${product.nama_produk} dengan total ${formatRupiah.format(total)}?`
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    await supabase
      .from("profiles")
      .update({ full_name: nama, phone: whatsapp, address: alamat, maps_url: mapsUrl })
      .eq("id", customerId);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        nama_customer: nama,
        email_customer: email,
        no_whatsapp: whatsapp,
        alamat,
        maps_url: mapsUrl || null,
        total_harga: total,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      setMessage(orderError?.message ?? "Pesanan gagal dibuat.");
      setSaving(false);
      return;
    }

    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: product.id,
      nama_produk: product.nama_produk,
      harga: product.harga,
      qty,
      subtotal: total,
    });

    if (itemError) {
      setMessage(itemError.message);
      setSaving(false);
      return;
    }

    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
        <p className="text-sm font-medium">Memuat checkout...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Checkout</p>
            <h1 className="text-2xl font-semibold">Buat Pesanan</h1>
          </div>
          <Link className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium" href="/">
            Kembali
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <form onSubmit={handleCheckout} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Data Customer</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Nama Lengkap
              <input required value={nama} onChange={(e) => setNama(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" placeholder="Nama Anda" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Email
              <input readOnly value={email} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Nomor WhatsApp
              <input required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" placeholder="08xxxxxxxxxx" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Alamat Manual
              <textarea required value={alamat} onChange={(e) => setAlamat(e.target.value)} className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" placeholder="Alamat pengiriman" />
            </label>
            <div className="grid gap-2">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Link Google Maps
                <input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" placeholder="https://www.google.com/maps?q=..." />
              </label>
              <button type="button" onClick={useCurrentLocation} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Gunakan Titik GPS Saya
              </button>
              {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-950 underline">Buka titik di Google Maps</a>}
            </div>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Jumlah
              <input required min="1" max={product?.stok ?? 1} type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" />
            </label>
          </div>

          {message && <p className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button disabled={saving || !product} type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60">
              {saving ? "Menyimpan..." : "Checkout"}
            </button>
          </div>
        </form>

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Ringkasan</h2>
          {product ? (
            <div className="mt-4">
              <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-slate-200">
                {product.gambar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.gambar_url} alt={product.nama_produk} className="h-full w-full rounded-lg object-cover" />
                ) : (
                  <span className="text-sm text-slate-500">Tidak ada gambar</span>
                )}
              </div>
              <h3 className="mt-4 font-semibold">{product.nama_produk}</h3>
              {product.deskripsi && <p className="mt-2 text-sm text-slate-600">{product.deskripsi}</p>}
              <div className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between"><span>Harga</span><span>{formatRupiah.format(Number(product.harga))}</span></div>
                <div className="flex justify-between"><span>Jumlah</span><span>{qty}</span></div>
                <div className="flex justify-between"><span>Stok</span><span>{product.stok}</span></div>
                <div className="border-t border-slate-200 pt-2 font-semibold flex justify-between"><span>Total</span><span>{formatRupiah.format(total)}</span></div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">Produk tidak tersedia.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
