"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CartItem = {
  id: string;
  nama_produk: string;
  harga: number;
  stok: number;
  image_url: string | null;
  qty: number;
};

const CART_KEY = "tokoku_cart";
const PROOF_BUCKET = "Bukti Transfer";

const formatRupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function CartPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [email, setEmail] = useState("");
  const [nama, setNama] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const total = cart.reduce((sum, item) => sum + item.harga * item.qty, 0);

  useEffect(() => {
    async function loadPage() {
      const stored = window.localStorage.getItem(CART_KEY);
      setCart(stored ? (JSON.parse(stored) as CartItem[]) : []);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login?redirect=/cart";
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
      setLoading(false);
    }

    loadPage();
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
      () => setMessage("Izin lokasi ditolak atau GPS tidak tersedia.")
    );
  }

  async function uploadProof(orderId: string) {
    if (!proofFile) return null;

    const extension = proofFile.name.split(".").pop() ?? "jpg";
    const safeName = proofFile.name.replace(/[^a-zA-Z0-9.-]/g, "-");
    const path = `${customerId}/${orderId}-${safeName}.${extension}`;
    const { error } = await supabase.storage.from(PROOF_BUCKET).upload(path, proofFile, {
      cacheControl: "3600",
      upsert: true,
    });

    if (error) throw error;

    const { data } = supabase.storage.from(PROOF_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  function requestCheckout(e: React.FormEvent) {
    e.preventDefault();

    if (cart.length === 0) {
      setMessage("Keranjang masih kosong.");
      return;
    }

    if (!proofFile) {
      setMessage("Upload bukti transfer terlebih dahulu.");
      return;
    }

    setConfirmOpen(true);
  }

  async function confirmCheckout() {
    if (saving) return;
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
        status: "menunggu_konfirmasi",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      setMessage(orderError?.message ?? "Pesanan gagal dibuat.");
      setSaving(false);
      setConfirmOpen(false);
      return;
    }

    try {
      const paymentProofUrl = await uploadProof(order.id);

      if (paymentProofUrl) {
        await supabase
          .from("orders")
          .update({ payment_proof_url: paymentProofUrl })
          .eq("id", order.id);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload bukti transfer gagal.");
      setSaving(false);
      setConfirmOpen(false);
      return;
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      cart.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        nama_produk: item.nama_produk,
        harga: item.harga,
        qty: item.qty,
        subtotal: item.harga * item.qty,
      }))
    );

    if (itemsError) {
      setMessage(itemsError.message);
      setSaving(false);
      setConfirmOpen(false);
      return;
    }

    window.localStorage.removeItem(CART_KEY);
    window.location.assign("/orders");
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f7f3f5] px-4 text-slate-900"><p className="text-sm font-medium">Memuat checkout keranjang...</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#f7f3f5] text-slate-950">
      <header className="border-b border-rose-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Checkout</p>
            <h1 className="text-2xl font-semibold">Checkout Keranjang</h1>
          </div>
          <Link href="/" className="rounded-md border border-rose-200 px-4 py-2 text-sm font-medium hover:bg-rose-50">Kembali</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_380px]">
        <form onSubmit={requestCheckout} className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Data Pembeli</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1 text-sm font-medium text-slate-700">Nama Lengkap<input required value={nama} onChange={(e) => setNama(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-500" /></label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Email<input readOnly value={email} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" /></label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Nomor WhatsApp<input required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-500" /></label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Alamat Manual<textarea required value={alamat} onChange={(e) => setAlamat(e.target.value)} className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-500" /></label>
            <div className="grid gap-2">
              <label className="grid gap-1 text-sm font-medium text-slate-700">Link Google Maps<input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-500" /></label>
              <button type="button" onClick={useCurrentLocation} className="rounded-md border border-rose-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-rose-50">Gunakan Titik GPS Saya</button>
              {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-rose-700 underline">Buka titik di Google Maps</a>}
            </div>
            <label className="grid gap-1 text-sm font-medium text-slate-700">Bukti Transfer<input required type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} className="rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-rose-100 file:px-3 file:py-1.5 file:text-rose-700" /></label>
          </div>

          {message && <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p>}
          <button disabled={saving || cart.length === 0} className="mt-5 rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">Buat Pesanan</button>
        </form>

        <aside className="h-fit rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Ringkasan Keranjang</h2>
          <div className="mt-4 grid gap-3">
            {cart.length === 0 ? <p className="text-sm text-slate-600">Keranjang kosong.</p> : cart.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 rounded-md bg-rose-50 px-3 py-2 text-sm">
                <div><p className="font-medium">{item.nama_produk}</p><p className="text-slate-500">{item.qty} x {formatRupiah.format(item.harga)}</p></div>
                <p className="font-medium">{formatRupiah.format(item.qty * item.harga)}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-between border-t border-slate-200 pt-4 text-lg font-semibold"><span>Total</span><span>{formatRupiah.format(total)}</span></div>
        </aside>
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Konfirmasi</p>
            <h2 className="mt-2 text-xl font-semibold">Lanjutkan pembelian?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Pesanan senilai {formatRupiah.format(total)} akan dikirim ke admin untuk dikonfirmasi setelah bukti transfer tersimpan.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfirmOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Tidak</button>
              <button onClick={confirmCheckout} disabled={saving} className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{saving ? "Menyimpan..." : "Ya, Beli"}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}



