"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          address,
          maps_url: mapsUrl,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Akun berhasil dibuat. Kalau diminta konfirmasi, cek email lalu login.");
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 text-slate-900">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Daftar Customer</h1>
        <p className="mt-2 text-sm text-slate-600">
          Data ini akan menjadi default saat checkout dan tetap bisa diubah manual.
        </p>

        <form onSubmit={handleSignup} className="mt-6 space-y-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Nama Lengkap
            <input required className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama Anda" />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Nomor WhatsApp
            <input required className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Alamat Default
            <textarea required className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat pengiriman utama" />
          </label>

          <div className="grid gap-2">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Link Google Maps
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://www.google.com/maps?q=..." />
            </label>
            <button type="button" onClick={useCurrentLocation} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Gunakan Titik GPS Saya
            </button>
            {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-950 underline">Buka titik di Google Maps</a>}
          </div>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Email
            <input type="email" required className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Password
            <input type="password" required minLength={6} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" />
          </label>

          {message && <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}

          <button type="submit" disabled={loading} className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60">
            {loading ? "Membuat akun..." : "Daftar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          Sudah punya akun? <a className="font-medium text-slate-950" href="/login">Login</a>
        </p>
      </div>
    </main>
  );
}
