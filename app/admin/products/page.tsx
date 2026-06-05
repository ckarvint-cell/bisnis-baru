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
  created_at: string;
};

type ProductForm = {
  nama_produk: string;
  kategori: string;
  harga: string;
  stok: string;
  gambar_url: string;
  deskripsi: string;
};

const emptyForm: ProductForm = {
  nama_produk: "",
  kategori: "",
  harga: "",
  stok: "",
  gambar_url: "",
  deskripsi: "",
};

const formatRupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function AdminProductsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

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

      await loadProducts();
      setLoading(false);
    }

    loadPage();
  }, [supabase]);

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("id,nama_produk,kategori,harga,stok,gambar_url,deskripsi,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Produk belum bisa dimuat dari Supabase.");
      return;
    }

    setProducts((data ?? []) as Product[]);
  }

  function updateForm(field: keyof ProductForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      nama_produk: product.nama_produk,
      kategori: product.kategori ?? "",
      harga: String(product.harga),
      stok: String(product.stok),
      gambar_url: product.gambar_url ?? "",
      deskripsi: product.deskripsi ?? "",
    });
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      nama_produk: form.nama_produk.trim(),
      kategori: form.kategori.trim() || null,
      harga: Number(form.harga),
      stok: Number(form.stok),
      gambar_url: form.gambar_url.trim() || null,
      deskripsi: form.deskripsi.trim() || null,
    };

    if (!payload.nama_produk || payload.harga < 0 || payload.stok < 0) {
      setMessage("Isi nama produk, harga, dan stok dengan benar.");
      setSaving(false);
      return;
    }

    const result = editingId
      ? await supabase.from("products").update(payload).eq("id", editingId)
      : await supabase.from("products").insert(payload);

    if (result.error) {
      setMessage(result.error.message);
      setSaving(false);
      return;
    }

    await loadProducts();
    resetForm();
    setSaving(false);
    setMessage(editingId ? "Produk berhasil diubah." : "Produk berhasil ditambah.");
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Hapus produk "${product.nama_produk}" dari database?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadProducts();
    setMessage("Produk berhasil dihapus.");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
        <p className="text-sm font-medium">Memuat halaman produk...</p>
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
            <h1 className="text-2xl font-semibold">Kelola Produk</h1>
          </div>

          <a
            href="/admin"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Kembali ke Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[360px_1fr]">
        <section className="h-fit rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">
            {editingId ? "Edit Produk" : "Tambah Produk"}
          </h2>

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Nama Produk
              <input
                required
                value={form.nama_produk}
                onChange={(e) => updateForm("nama_produk", e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                placeholder="Kaos Oversize Hitam"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Kategori
              <input
                value={form.kategori}
                onChange={(e) => updateForm("kategori", e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                placeholder="Kaos"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Harga
                <input
                  required
                  min="0"
                  type="number"
                  value={form.harga}
                  onChange={(e) => updateForm("harga", e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  placeholder="150000"
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Stok
                <input
                  required
                  min="0"
                  type="number"
                  value={form.stok}
                  onChange={(e) => updateForm("stok", e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  placeholder="25"
                />
              </label>
            </div>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              URL Gambar
              <input
                value={form.gambar_url}
                onChange={(e) => updateForm("gambar_url", e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                placeholder="https://..."
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Deskripsi
              <textarea
                value={form.deskripsi}
                onChange={(e) => updateForm("deskripsi", e.target.value)}
                className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                placeholder="Deskripsi singkat produk"
              />
            </label>

            {message && (
              <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                {message}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : editingId ? "Simpan Edit" : "Tambah Produk"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold">Daftar Produk</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Harga</th>
                  <th className="px-4 py-3">Stok</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>
                      Belum ada produk. Tambahkan produk pertama dari form.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{product.nama_produk}</p>
                        {product.deskripsi && (
                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                            {product.deskripsi}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {product.kategori ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {formatRupiah.format(Number(product.harga))}
                      </td>
                      <td className="px-4 py-3">{product.stok}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(product.created_at).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(product)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
                            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
