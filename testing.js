
const fs = require("fs");

const BASE = process.env.FZ_BASE || "http://localhost:4000/api";
const IDENT = process.env.FZ_ID || "wancoffeefood@gmail.com";
const PASS = process.env.FZ_PASS;
const BERSIHKAN = process.env.FZ_CLEAN !== "0";

if (!PASS) {
  console.error("Isi password lewat variabel dulu:\n  FZ_PASS='passwordmu' node tes-alur.js");
  process.exit(1);
}
if (typeof fetch !== "function") {
  console.error("Butuh Node 18 ke atas (cek: node -v).");
  process.exit(1);
}

let token = null;
let tahap = "";
const hasil = [];
const S = { exp: 0 }; // exp = total pengeluaran yang diharapkan di akhir

// ---------- helper ----------
const log = (s) => console.log(s);
const rp = (n) => "Rp" + Number(n).toLocaleString("id-ID");
const iso = (d) => d.toISOString().slice(0, 10);
const hariLagi = (n) => new Date(Date.now() + n * 86400000);
const jamLagi = (n) => new Date(Date.now() + n * 3600000).toISOString();

async function api(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    return { status: 0, json: null, text: String(e.message || e) };
  }
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

function parseSse(text) {
  const out = [];
  for (const line of (text || "").split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try { out.push(JSON.parse(line.slice(6))); } catch {}
  }
  return out;
}

async function sse(path, body) {
  const r = await api("POST", path, body);
  const ev = parseSse(r.text);
  return {
    status: r.status,
    json: r.json,
    text: r.text,
    done: ev.find((e) => e.type === "done") || null,
    err: ev.find((e) => e.type === "error") || null,
  };
}

const ringkasErr = (r) =>
  r.err
    ? String(r.err.error || r.err.message)
    : `status ${r.status}: ${(r.json && (r.json.message || r.json.error)) || (r.text || "").slice(0, 140)}`;

function check(nama, ok, detail = "") {
  hasil.push({ tahap, tipe: ok ? "ok" : "gagal", nama, detail });
  log(`  ${ok ? "[OK]     " : "[GAGAL]  "}${nama}${!ok && detail ? "  -> " + detail : ""}`);
  return ok;
}
function catat(nama, detail = "") {
  hasil.push({ tahap, tipe: "catatan", nama, detail });
  log(`  [CATATAN] ${nama}${detail ? " -> " + detail : ""}`);
}
async function jalankan(n, judul, fn) {
  tahap = `${n}. ${judul}`;
  log(`\n=== TAHAP ${tahap} ===`);
  try { await fn(); } catch (e) { check("Tahap berhenti karena error tak terduga", false, e.message); }
}

const ringkasanTransaksi = async () => ((await api("GET", "/catatan-keuangan")).json || {}).summary || {};
const trx = (tipe, kategori, nominal, catatan) =>
  api("POST", "/catatan-keuangan/transaksi", { Catatan_Transaksi: catatan, tipe, kategori, Sumber_Dana: "Tunai", nominal });

const now = new Date();
const awalBulan = iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)));
const awalBulanDepan = iso(new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)));

// ---------- TAHAP 1 ----------
async function tahap1() {
  let r = await api("POST", "/auth/login", { identifier: IDENT, password: PASS });
  token = r.json && r.json.data;
  if (!check("Login berhasil dan token keluar", r.status === 200 && typeof token === "string", ringkasErr(r))) {
    token = null;
    return;
  }

  r = await api("GET", "/auth/me");
  check("/auth/me mengembalikan akun yang login", r.status === 200 && !!(r.json && r.json.data && r.json.data.email), ringkasErr(r));
  if (r.json && r.json.data && (r.json.data.password || r.json.data.otpCode)) {
    catat("/auth/me membocorkan field password (hash) / otpCode", "sembunyikan dengan .select('-password -otpCode')");
  }

  if (BERSIHKAN) {
    let hapus = 0, gagal = 0;
    for (const p of ["/catatan-keuangan", "/catatan-keuangan/budgeting", "/catatan-keuangan/target-tabung", "/catatan-keuangan/pinjaman"]) {
      const g = await api("GET", p);
      for (const it of (g.json && g.json.data) || []) {
        const d = await api("DELETE", `${p}/${it._id}`);
        d.status === 200 ? hapus++ : gagal++;
      }
    }
    check(`Data uji lama dibersihkan (${hapus} dihapus)`, gagal === 0, `${gagal} gagal dihapus`);
  }

  const body = (sumber) => ({
    fotoProfilUrl: "https://example.com/foto-awal.png",
    saldoSekarang: 100000,
    sumberPemasukan: sumber,
    onboardingCompleted: true,
  });
  r = await api("POST", "/profile/onboarding", body("Uang Saku"));
  if (r.status !== 200) {
    const r2 = await api("POST", "/profile/onboarding", body(["Uang Saku"]));
    if (r2.status === 200) { r = r2; catat("sumberPemasukan ternyata bertipe array"); }
  }
  check("Onboarding tersimpan", r.status === 200, ringkasErr(r));

  r = await api("GET", "/profile");
  const asli = r.json && r.json.fullName;
  check("Lihat profil: data onboarding terbaca", r.status === 200 && r.json.saldoSekarang === 100000 && !!r.json.sumberPemasukan, ringkasErr(r));

  r = await api("PUT", "/profile", { fullName: "Tes Edit Profil", fotoProfilUrl: "https://example.com/foto-baru.png" });
  check("Edit profil berhasil", r.status === 200, ringkasErr(r));
  r = await api("GET", "/profile");
  check("Hasil edit profil terbaca", r.json && r.json.fullName === "Tes Edit Profil" && r.json.fotoProfilUrl === "https://example.com/foto-baru.png", JSON.stringify(r.json));
  if (asli) {
    r = await api("PUT", "/profile", { fullName: asli });
    check("Nama asli dikembalikan setelah tes", r.status === 200, ringkasErr(r));
  }
}

// ---------- TAHAP 2 ----------
async function tahap2() {
  const r = await api("GET", "/dashboard");
  const d = r.json && r.json.data;
  check("Dashboard terbuka (200)", r.status === 200 && !!d, ringkasErr(r));
  if (!d) return;
  const wajib = ["nama", "notifikasi", "ringkasan", "financialHealth", "transaksiTerakhir", "cicilanMendatang", "pinjamanAktif", "targetNabung"];
  const hilang = wajib.filter((k) => !(k in d));
  check("Bentuk respons baru lengkap", hilang.length === 0, "hilang: " + hilang.join(", "));
  check("Tidak ada field lama (summary / sisaSlot)", !("summary" in d) && !JSON.stringify(r.json).includes("sisaSlot"));
  if (BERSIHKAN) {
    check(
      "Dashboard awal kosong (tanpa transaksi, pinjaman, target)",
      d.ringkasan.totalPemasukan === 0 && d.ringkasan.totalPengeluaran === 0 && d.transaksiTerakhir.length === 0 && d.pinjamanAktif.jumlahAktif === 0 && d.targetNabung.length === 0,
      JSON.stringify(d.ringkasan),
    );
    check("Saldo awal = saldo onboarding (Rp100.000)", d.ringkasan.saldo === 100000, `dapat ${d.ringkasan.saldo}`);
  }
}

// ---------- TAHAP 3 ----------
async function tahap3() {
  const r1 = await trx("pemasukan", "Uang Saku", 3000000, "Uang saku bulanan");
  const r2 = await trx("pengeluaran", "Transportasi", 30000, "Isi bensin");
  const r3 = await trx("pengeluaran", "Transportasi", 50000, "Ojek");
  check("3 transaksi dibuat (1 pemasukan, 2 pengeluaran)", [r1, r2, r3].every((x) => x.status === 201), [r1, r2, r3].map(ringkasErr).join(" | "));
  const idBensin = r2.json && r2.json.data && r2.json.data._id;
  const idOjek = r3.json && r3.json.data && r3.json.data._id;

  let s = await api("GET", "/catatan-keuangan");
  const sm = (s.json && s.json.summary) || {};
  check("Total pemasukan Rp3.000.000", sm.totalPemasukan === 3000000, `dapat ${sm.totalPemasukan}`);
  check("Total pengeluaran Rp80.000", sm.totalPengeluaran === 80000, `dapat ${sm.totalPengeluaran}`);
  check("Saldo = saldo awal + pemasukan - pengeluaran (Rp3.020.000)", sm.saldo === 3020000, `dapat ${sm.saldo}`);
  check("Daftar berisi 3 transaksi", s.json && s.json.data.length === 3);

  const fm = await api("GET", "/catatan-keuangan?type=pemasukan");
  check("Filter pemasukan: 1 data, semuanya pemasukan", fm.json && fm.json.data.length === 1 && fm.json.data.every((t) => t.tipe === "pemasukan"));
  const fk = await api("GET", "/catatan-keuangan?type=pengeluaran");
  check("Filter pengeluaran: 2 data, semuanya pengeluaran", fk.json && fk.json.data.length === 2 && fk.json.data.every((t) => t.tipe === "pengeluaran"));
  check("Ringkasan total tidak ikut berubah saat difilter", fm.json && fm.json.summary.totalPengeluaran === 80000);

  let r = await api("GET", `/catatan-keuangan/${idOjek}`);
  check("Lihat satu transaksi (by id)", r.status === 200 && r.json.data.Catatan_Transaksi === "Ojek", ringkasErr(r));

  r = await api("PUT", `/catatan-keuangan/${idOjek}`, { nominal: 60000 });
  check("Edit nominal Ojek jadi 60.000", r.status === 200, ringkasErr(r));
  let sum = await ringkasanTransaksi();
  check("Total pengeluaran jadi Rp90.000 setelah edit", sum.totalPengeluaran === 90000, `dapat ${sum.totalPengeluaran}`);

  r = await api("DELETE", `/catatan-keuangan/${idBensin}`);
  check("Hapus transaksi Isi bensin", r.status === 200, ringkasErr(r));
  sum = await ringkasanTransaksi();
  check("Total pengeluaran jadi Rp60.000 setelah hapus", sum.totalPengeluaran === 60000, `dapat ${sum.totalPengeluaran}`);
  s = await api("GET", "/catatan-keuangan");
  check("Daftar tinggal 2 transaksi", s.json && s.json.data.length === 2);
  S.exp = 60000;
}

// ---------- TAHAP 4 ----------
async function tahap4() {
  const B = "/catatan-keuangan/budgeting";
  const bud = (kat, batas) =>
    api("POST", `${B}/tambah-budget`, { Kategori_Budget: kat, Batas_PerBulan: batas, Tanggal_Mulai: awalBulan, Tanggal_Selesai: awalBulanDepan });

  let r = await bud("Makanan", 600000);
  check("Tambah budget Makanan Rp600.000", r.status === 201, ringkasErr(r));
  const idBudget = r.json && r.json.data && r.json.data._id;

  r = await bud("Makanan", 600000);
  check("Budget kembar di periode yang sama ditolak (400)", r.status === 400, `status ${r.status}`);

  const sum = await ringkasanTransaksi();
  check("Membuat budget tidak mengubah pemasukan/pengeluaran", sum.totalPemasukan === 3000000 && sum.totalPengeluaran === S.exp, JSON.stringify(sum));

  const a = await trx("pengeluaran", "Makanan", 25000, "Ayam geprek");
  const b = await trx("pengeluaran", "Makanan", 35000, "Nasi padang");
  check("2 pengeluaran Makanan dicatat", a.status === 201 && b.status === 201, ringkasErr(a));
  S.exp += 60000;

  let g = await api("GET", B);
  let item = ((g.json && g.json.data) || []).find((x) => x._id === idBudget);
  check("Budget Makanan: terpakai Rp60.000, tersisa Rp540.000, 10%, Batas Aman",
    item && item.terpakai === 60000 && item.tersisa === 540000 && item.persentase === 10 && item.statusLabel === "Batas Aman", JSON.stringify(item));

  r = await api("PUT", `${B}/${idBudget}`, { Batas_PerBulan: 700000 });
  check("Edit batas budget jadi Rp700.000", r.status === 200, ringkasErr(r));
  g = await api("GET", B);
  item = ((g.json && g.json.data) || []).find((x) => x._id === idBudget);
  check("Hasil edit: tersisa Rp640.000", item && item.tersisa === 640000, JSON.stringify(item));

  r = await bud("Transportasi", 100000);
  const idTemp = r.json && r.json.data && r.json.data._id;
  check("Tambah budget sementara Transportasi", r.status === 201, ringkasErr(r));
  g = await api("GET", B);
  const t = ((g.json && g.json.data) || []).find((x) => x._id === idTemp);
  check("Budget Transportasi menghitung pengeluaran Transportasi (Rp60.000)", t && t.terpakai === 60000, JSON.stringify(t));
  r = await api("DELETE", `${B}/${idTemp}`);
  check("Hapus budget sementara", r.status === 200, ringkasErr(r));
  g = await api("GET", B);
  check("Tinggal 1 budget (Makanan)", g.json && g.json.data.length === 1 && g.json.summary.totalBudget === 700000, JSON.stringify(g.json && g.json.summary));
}

// ---------- TAHAP 5 ----------
async function tahap5() {
  const T = "/catatan-keuangan/target-tabung";
  const dasar = await ringkasanTransaksi();
  let r = await api("POST", `${T}/tambah-target`, { icon: "🎮", namaTarget: "Beli Game", targetNominal: 500000, deadlineTarget: iso(hariLagi(60)) });
  check("Tambah target Beli Game Rp500.000", r.status === 201, ringkasErr(r));
  const id = r.json && r.json.data && r.json.data._id;

  let sum = await ringkasanTransaksi();
  check("Membuat target tidak mengubah pemasukan/pengeluaran", sum.totalPemasukan === dasar.totalPemasukan && sum.totalPengeluaran === dasar.totalPengeluaran, JSON.stringify(sum));

  r = await api("POST", `${T}/tambah-target`, { icon: "🎮", namaTarget: "Target Lampau", targetNominal: 100000, deadlineTarget: iso(hariLagi(-5)) });
  check("Deadline di masa lalu ditolak (400)", r.status === 400, `status ${r.status}`);

  r = await api("PUT", `${T}/${id}/setor`, { nominalSetor: 0 });
  check("Setor Rp0 ditolak (400)", r.status === 400, `status ${r.status}`);

  r = await api("PUT", `${T}/${id}/setor`, { nominalSetor: 100000 });
  check("Setor Rp100.000", r.status === 200 && r.json.data.terkumpulNominal === 100000, ringkasErr(r));
  sum = await ringkasanTransaksi();
  check("Setor tabungan TIDAK menambah pengeluaran", sum.totalPengeluaran === dasar.totalPengeluaran && sum.totalPemasukan === dasar.totalPemasukan, `pengeluaran ${sum.totalPengeluaran}, harusnya ${dasar.totalPengeluaran}`);

  let g = await api("GET", T);
  let item = ((g.json && g.json.data) || []).find((x) => x._id === id);
  check("Hasil target: 20% dan total menabung Rp100.000", item && item.persentase === 20 && g.json.summary.totalMenabung === 100000, JSON.stringify(item));

  r = await api("PUT", `${T}/${id}`, { namaTarget: "Beli Game Baru", targetNominal: 400000 });
  check("Edit target (nama dan nominal)", r.status === 200, ringkasErr(r));
  g = await api("GET", T);
  item = ((g.json && g.json.data) || []).find((x) => x._id === id);
  check("Hasil edit: nama baru dan progres 25%", item && item.namaTarget === "Beli Game Baru" && item.persentase === 25, JSON.stringify(item));

  r = await api("POST", `${T}/tambah-target`, { icon: "🎁", namaTarget: "Target Hapus", targetNominal: 100000, deadlineTarget: iso(hariLagi(30)) });
  const idHapus = r.json && r.json.data && r.json.data._id;
  r = await api("DELETE", `${T}/${idHapus}`);
  check("Hapus target sementara", r.status === 200, ringkasErr(r));
  g = await api("GET", T);
  check("Tinggal 1 target", g.json && g.json.data.length === 1);
}

// ---------- TAHAP 6 ----------
async function tahap6() {
  const P = "/catatan-keuangan/pinjaman";
  const buat = (i, ekstra = {}) =>
    api("POST", `${P}/tambah-pinjaman`, {
      namaPlatform: `Platform ${i}`, jenisPinjaman: "Paylater", totalPinjaman: 1000000,
      tenorCicilan: 5, jatuhTempo: iso(hariLagi(30)), ...ekstra,
    });
  const ids = [];
  for (let i = 1; i <= 4; i++) {
    const r = await buat(i, i === 1 ? { totalPinjaman: "1.000.000" } : {});
    if (!check(`Tambah pinjaman ke-${i}`, r.status === 201, ringkasErr(r))) continue;
    ids.push(r.json.data._id);
    if (i === 1) {
      check("Format titik terbaca; cicilan dan total bayar terisi otomatis",
        r.json.data.totalPinjaman === 1000000 && r.json.data.cicilanBulanan === 200000 && r.json.data.totalYangHarusDibayar === 1000000,
        JSON.stringify(r.json.data));
    }
    check(`Pinjaman ke-${i}: jumlah aktif ${i}, peringatan ${i > 3 ? "muncul" : "kosong"}`,
      r.json.jumlahAktif === i && (i > 3 ? !!r.json.peringatan : r.json.peringatan === null),
      `jumlahAktif ${r.json.jumlahAktif}, peringatan ${r.json.peringatan}`);
  }
  if (ids.length < 4) throw new Error("Pinjaman tidak lengkap, sisa tahap dihentikan");

  let r = await buat(9, { jatuhTempo: "20/11/2026" });
  check("Tanggal format salah ditolak (400)", r.status === 400, `status ${r.status}`);

  let g = await api("GET", P);
  const d = (g.json && g.json.data) || [];
  check("Daftar: 4 aktif, cicilan minimum Rp200.000, mode cicilan",
    g.json && g.json.jumlahAktif === 4 && d.length === 4 && d.every((x) => x.cicilanMinimum === 200000 && x.mode === "cicilan"),
    JSON.stringify(d[0]));
  check("Field lama sisaSlot sudah tidak ada", g.json && !("sisaSlot" in g.json));

  r = await api("PUT", `${P}/${ids[0]}/bayar`, { nominalBayar: 50000 });
  check("Bayar di bawah minimum ditolak (400)", r.status === 400, `status ${r.status}: ${r.json && r.json.message}`);

  const sebelum = (await ringkasanTransaksi()).totalPengeluaran;
  r = await api("PUT", `${P}/${ids[0]}/bayar`, { nominalBayar: 200000 });
  check("Bayar cicilan Rp200.000: sisa tagihan jadi Rp800.000", r.status === 200 && r.json.data.totalYangHarusDibayar === 800000, ringkasErr(r));
  const sesudah = (await ringkasanTransaksi()).totalPengeluaran;
  check("Bayar cicilan tercatat sebagai pengeluaran Rp200.000", sesudah - sebelum === 200000, `selisih ${sesudah - sebelum}`);
  S.exp += 200000;

  r = await api("PUT", `${P}/${ids[1]}`, { namaPlatform: "Platform 2 (edit)" });
  check("Edit nama platform", r.status === 200 && r.json.data.namaPlatform === "Platform 2 (edit)", ringkasErr(r));

  // H-1 jatuh tempo: hanya Pelunasan atau Perpanjang
  r = await api("PUT", `${P}/${ids[3]}`, { jatuhTempo: jamLagi(12) });
  check("Set jatuh tempo Platform 4 jadi besok", r.status === 200, ringkasErr(r));
  g = await api("GET", P);
  let p4 = ((g.json && g.json.data) || []).find((x) => x._id === ids[3]);
  check("Mode berubah jadi pelunasan saat H-1", p4 && p4.mode === "pelunasan", JSON.stringify(p4 && { mode: p4.mode, sisaHari: p4.sisaHari }));
  r = await api("PUT", `${P}/${ids[3]}/bayar`, { nominalBayar: 200000 });
  check("Bayar cicilan saat H-1 ditolak (400)", r.status === 400, `status ${r.status}`);
  r = await api("PUT", `${P}/${ids[3]}/perpanjang`, { jatuhTempoBaru: iso(hariLagi(-1)) });
  check("Perpanjang ke tanggal lebih awal ditolak (400)", r.status === 400, `status ${r.status}`);
  r = await api("PUT", `${P}/${ids[3]}/perpanjang`, { jatuhTempoBaru: iso(hariLagi(30)) });
  check("Perpanjang tempo 30 hari berhasil", r.status === 200, ringkasErr(r));
  g = await api("GET", P);
  p4 = ((g.json && g.json.data) || []).find((x) => x._id === ids[3]);
  check("Setelah diperpanjang, mode kembali ke cicilan", p4 && p4.mode === "cicilan", JSON.stringify(p4 && p4.mode));

  await api("PUT", `${P}/${ids[3]}`, { jatuhTempo: jamLagi(12) });
  const s2 = (await ringkasanTransaksi()).totalPengeluaran;
  r = await api("PUT", `${P}/${ids[3]}/lunasi`, {});
  check("Lunasi Platform 4: status Lunas", r.status === 200 && r.json.data.statusPinjaman === "Lunas", ringkasErr(r));
  const s3 = (await ringkasanTransaksi()).totalPengeluaran;
  check("Pelunasan tercatat sebagai pengeluaran Rp1.000.000", s3 - s2 === 1000000, `selisih ${s3 - s2}`);
  S.exp += 1000000;
  r = await api("PUT", `${P}/${ids[3]}/lunasi`, {});
  check("Lunasi pinjaman yang sudah lunas ditolak (400)", r.status === 400, `status ${r.status}`);
  g = await api("GET", P);
  check("Setelah lunas: aktif 3 dan peringatan hilang", g.json && g.json.jumlahAktif === 3 && g.json.peringatan === null, `jumlahAktif ${g.json && g.json.jumlahAktif}`);

  r = await buat(5);
  check("Tambah Platform 5: aktif 4 lagi, peringatan muncul", r.status === 201 && r.json.jumlahAktif === 4 && !!r.json.peringatan, ringkasErr(r));

  r = await buat(6);
  const idTemp = r.json && r.json.data && r.json.data._id;
  r = await api("DELETE", `${P}/${idTemp}`);
  check("Hapus pinjaman sementara", r.status === 200, ringkasErr(r));
  g = await api("GET", P);
  check("Setelah hapus: 5 data (1 lunas), aktif 4", g.json && g.json.data.length === 5 && g.json.jumlahAktif === 4, `data ${g.json && g.json.data.length}, aktif ${g.json && g.json.jumlahAktif}`);
}

// ---------- TAHAP 7 ----------
async function kalk(label, body, h) {
  const r = await sse("/kalkulator-bunga", body);
  const d = r.done;
  if (!check(`${label}: simulasi selesai dan tersimpan`, !!d, ringkasErr(r))) return null;
  check(`${label}: kemampuan bayar = ${h.kemampuan}`, d.kemampuanBayar === h.kemampuan,
    `dapat "${d.kemampuanBayar}" (rasio ${d.dtiSebelum}% -> ${d.dtiSesudah}%, sisa ${d.sisaRuang})`);
  check(`${label}: total bunga ${rp(h.bunga)}`, d.data.totalBunga === h.bunga, `dapat ${d.data.totalBunga}`);
  const hitung = Math.round(d.pemasukanBulanan - d.cicilanAktif - d.totalBudgetBulanan - d.tabunganBulanan - d.data.totalBayarPerBulan);
  check(`${label}: sisa uang cocok dengan komponennya`, Math.abs(d.sisaRuang - hitung) <= 1, `sisa ${d.sisaRuang}, hitung ulang ${hitung}`);
  const a = String(d.data.analisisAI || "");
  check(`${label}: ada analisis AI`, a.length > 30);
  const m = [];
  if (d.data.levelRisiko !== h.level) m.push(`levelRisiko ${d.data.levelRisiko} (harapan ${h.level})`);
  if (/\bAnda\b/i.test(a)) m.push('masih memakai "Anda"');
  if (/kemampuanBayar|sisaRuang|dtiSesudah|dtiSebelum/.test(a)) m.push("menyebut nama field teknis");
  if (/\b35\s?%/.test(a)) m.push("memakai angka 35% (karangan)");
  if (h.kemampuan === "Mampu" && /tunda|menunda|jangan (ambil|menambah)|tidak menambah/i.test(a)) m.push("status Mampu tapi menyarankan menunda");
  if (m.length) catat(`${label}: masalah narasi AI`, m.join("; "));
  catat(`${label}: isi narasi`, a.replace(/\s+/g, " ").slice(0, 260));
  return d;
}

async function tahap7() {
  const A = await kalk("A (kecil, 2%)", { jumlahPinjaman: 250000, bungaPerBulan: 2, tenorCicilan: 3, dendaPerHari: 250 }, { kemampuan: "Mampu", bunga: 15000, level: "Rendah" });
  if (A) {
    check("Kondisi keuangan: pemasukan Rp3.000.000, cicilan aktif Rp800.000, 4 pinjaman, budget Rp700.000",
      A.pemasukanBulanan === 3000000 && A.cicilanAktif === 800000 && A.jumlahPinjamanAktif === 4 && A.totalBudgetBulanan === 700000,
      JSON.stringify({ p: A.pemasukanBulanan, c: A.cicilanAktif, j: A.jumlahPinjamanAktif, b: A.totalBudgetBulanan }));
    check("Rasio cicilan sebelum = 27%", A.dtiSebelum === 27, `dapat ${A.dtiSebelum}`);
    check("Kebutuhan tabungan per bulan terhitung (> 0)", A.tabunganBulanan > 0, `dapat ${A.tabunganBulanan}`);
  }
  await kalk("B (sedang, 2% tenor 6)", { jumlahPinjaman: 1000000, bungaPerBulan: 2, tenorCicilan: 6, dendaPerHari: 1000 }, { kemampuan: "Pas-pasan", bunga: 120000, level: "Rendah" });
  await kalk("C (besar, 5%)", { jumlahPinjaman: 6000000, bungaPerBulan: 5, tenorCicilan: 3, dendaPerHari: 30000 }, { kemampuan: "Tidak Mampu", bunga: 900000, level: "Tinggi" });
  await kalk('D (bunga "2.5", titik ribuan, tanpa deadline)', { jumlahPinjaman: "1.000.000", bungaPerBulan: "2.5", tenorCicilan: 4, dendaPerHari: "2.000" }, { kemampuan: "Pas-pasan", bunga: 100000, level: "Sedang" });

  let r = await sse("/kalkulator-bunga", { jumlahPinjaman: 0, bungaPerBulan: 2, tenorCicilan: 3 });
  check("Pinjaman Rp0 ditolak (400)", r.status === 400, `status ${r.status}`);
  r = await sse("/kalkulator-bunga", { jumlahPinjaman: 100000, bungaPerBulan: "abc", tenorCicilan: 3 });
  check("Bunga bukan angka ditolak (400)", r.status === 400, `status ${r.status}`);

  const g = await api("GET", "/kalkulator-bunga/output");
  check("Hasil simulasi terakhir bisa dibuka", g.status === 200 && g.json.data && g.json.data.jumlahPinjaman === 1000000 && !!g.json.data.levelRisiko, ringkasErr(g));
  catat('Status "Tidak diketahui" tidak dites', "butuh akun tanpa pemasukan");
}

// ---------- TAHAP 8 ----------
const gradeDari = (s) => (s >= 85 ? "A" : s >= 70 ? "B" : s >= 55 ? "C" : s >= 40 ? "D" : "E");

async function tahap8() {
  const r = await sse("/financial-health/output");
  const fh = r.done && r.done.data;
  if (!check("Financial Health selesai dihitung", !!fh, ringkasErr(r))) return;
  S.fh = fh;
  const p = [fh.disiplinAnggaran, fh.pengelolaanPinjaman, fh.targetNabung];
  check("Skor total = jumlah 3 pilar", fh.skorTotal === p.reduce((a, x) => a + x.skor, 0), `total ${fh.skorTotal}, pilar ${p.map((x) => x.skor).join("+")}`);
  check("Grade sesuai skor total", fh.grade === gradeDari(fh.skorTotal), `skor ${fh.skorTotal}, grade ${fh.grade}`);
  check("Skor maksimal pilar 34 / 33 / 33", p[0].maksimal === 34 && p[1].maksimal === 33 && p[2].maksimal === 33);
  check("Setiap pilar punya ringkasan dan tepat 3 saran", p.every((x) => x.ringkasan && Array.isArray(x.saranPerkembangan) && x.saranPerkembangan.length === 3));
  check("Disiplin Anggaran penuh (34): pengeluaran masih dalam budget", p[0].skor === 34, `dapat ${p[0].skor}`);
  check("Pengelolaan Pinjaman penuh (33): rasio cicilan 27%", p[1].skor === 33, `dapat ${p[1].skor}`);
  catat("Skor Target Nabung", `${p[2].skor}/33, status ${p[2].status}`);

  if (p[1].persentase !== Math.round((p[1].skor / p[1].maksimal) * 100)) {
    catat("Bug lama: persentase pilar Pinjaman berisi rasio cicilan, bukan persentase skor", `persentase ${p[1].persentase}, skor ${p[1].skor}/${p[1].maksimal}`);
  }
  if ((p[2].saranPerkembangan[0] || "").startsWith("Buat target tabungan dengan nominal")) {
    catat("Saran Target Nabung tampak teks default", "cek key targetNabung vs targetTabungan antara prompt dan kode");
  }

  const g = await api("GET", "/dashboard/financial-health");
  check("Hasil Financial Health bisa dibuka lagi", g.status === 200 && g.json.data && g.json.data.skorTotal === fh.skorTotal, ringkasErr(g));
}

// ---------- TAHAP 9 ----------
async function tahap9() {
  const kasus = [
    { nama: "AMAN", harap: "aman", pesan: "Pengingat: tagihan cicilan kamu jatuh tempo besok. Silakan bayar lewat aplikasi resmi atau virtual account. Layanan kami berizin dan diawasi OJK. Kami tidak pernah meminta OTP, PIN, atau data pribadi lewat chat." },
    { nama: "SEDANG", harap: "waspada", pesan: "Pinjaman cepat cair 5 juta dalam 10 menit, tanpa jaminan, bunga 0,8% per hari, tenor 14 hari. Daftar sekarang, promo terbatas hari ini saja!" },
    { nama: "BAHAYA", harap: "berbahaya", pesan: "Selamat kamu terpilih dapat pinjaman Rp50 juta tanpa BI checking! Download aplikasinya di http://pinjam-kilat.apk lalu izinkan akses kontak dan galeri. Transfer biaya admin Rp500 ribu dulu agar dana cair. Kalau telat, datamu kami sebar ke semua kontak." },
  ];
  const skor = {};
  let terakhir = null;
  for (const k of kasus) {
    const r = await sse("/cariAman", { message: k.pesan });
    const res = r.done && r.done.result;
    if (!check(`Cari Aman ${k.nama}: analisis selesai`, !!res, ringkasErr(r))) continue;
    const level = String(res.riskLevel || res.risk_level || "").toLowerCase();
    skor[k.nama] = Number(res.riskScore ?? res.risk_score ?? NaN);
    terakhir = level;
    if (k.nama === "SEDANG") {
      if (level !== k.harap) catat("Cari Aman SEDANG tidak dinilai waspada", `dapat "${level}"`);
    } else {
      check(`Cari Aman ${k.nama}: tingkat risiko = ${k.harap}`, level === k.harap, `dapat "${level}", skor ${skor[k.nama]}`);
    }
    catat(`Cari Aman ${k.nama}`, `level ${level}, skor ${skor[k.nama]}`);
  }
  if (!Number.isNaN(skor.AMAN) && !Number.isNaN(skor.BAHAYA) && skor.AMAN !== undefined && skor.BAHAYA !== undefined) {
    check("Skor risiko AMAN lebih kecil dari BAHAYA", skor.AMAN < skor.BAHAYA, `${skor.AMAN} vs ${skor.BAHAYA}`);
  }
  const g = await api("GET", "/cariAman/output");
  check("Hasil analisis terakhir bisa dibuka", g.status === 200 && g.json.data && String(g.json.data.riskLevel).toLowerCase() === terakhir, ringkasErr(g));
}

// ---------- TAHAP 10 ----------
async function tahap10() {
  const r = await api("GET", "/dashboard");
  const d = r.json && r.json.data;
  if (!check("Dashboard akhir terbuka", r.status === 200 && !!d, ringkasErr(r))) return;
  const sm = await ringkasanTransaksi();
  check(`Pemasukan Rp3.000.000 dan pengeluaran ${rp(S.exp)} (setoran tabungan tidak ikut)`,
    d.ringkasan.totalPemasukan === 3000000 && d.ringkasan.totalPengeluaran === S.exp,
    `dashboard ${d.ringkasan.totalPengeluaran}, harapan ${S.exp}`);
  check("Angka dashboard sama dengan halaman Transaksi", d.ringkasan.totalPengeluaran === sm.totalPengeluaran && d.ringkasan.totalPemasukan === sm.totalPemasukan);
  catat("Saldo di dashboard (masih dipakai sementara)", `${d.ringkasan.saldo} (harapan ${100000 + 3000000 - S.exp})`);
  check("Transaksi terakhir: 1 sampai 5 data", d.transaksiTerakhir.length >= 1 && d.transaksiTerakhir.length <= 5, `${d.transaksiTerakhir.length} data`);
  const cm = d.cicilanMendatang;
  const urut = cm.every((x, i) => i === 0 || new Date(cm[i - 1].jatuhTempo) <= new Date(x.jatuhTempo));
  check("Cicilan mendatang: maksimal 2, terurut, tanpa pinjaman lunas", cm.length <= 2 && urut && !cm.some((x) => x.namaPlatform === "Platform 4"), JSON.stringify(cm.map((x) => x.namaPlatform)));
  check("Pinjaman aktif 4 dengan peringatan", d.pinjamanAktif.jumlahAktif === 4 && !!d.pinjamanAktif.peringatan, JSON.stringify(d.pinjamanAktif));
  const t = d.targetNabung[0];
  check("Target tabung: Beli Game Baru 25%", d.targetNabung.length === 1 && t.namaTarget === "Beli Game Baru" && t.persentase === 25, JSON.stringify(t));
  check("Notifikasi budget kosong (Makanan baru terpakai kecil)", Array.isArray(d.notifikasi) && d.notifikasi.length === 0, JSON.stringify(d.notifikasi));

  if (S.fh) {
    const g = await api("GET", "/dashboard/financial-health");
    const fh = g.json && g.json.data;
    check("Dashboard tidak menghitung ulang Financial Health (skor dan waktu sama)",
      d.financialHealth.skorTotal === S.fh.skorTotal && fh && new Date(d.financialHealth.updatedAt).getTime() === new Date(fh.updatedAt).getTime(),
      `dashboard ${d.financialHealth.updatedAt}, health ${fh && fh.updatedAt}`);
    check("Saran Financial Health tidak hilang setelah dashboard dibuka", fh && fh.disiplinAnggaran.saranPerkembangan.length === 3);
  }
}

// ---------- TAHAP 11 ----------
async function tahap11() {
  let r = await api("POST", "/auth/logout");
  check("Logout berhasil", r.status === 200, ringkasErr(r));
  r = await api("GET", "/dashboard");
  check("Token setelah logout ditolak", r.status === 401 || r.status === 403, `status ${r.status}`);
}

// ---------- ringkasan ----------
function selesai() {
  const urutan = [...new Set(hasil.map((h) => h.tahap))];
  const baris = ["================ RINGKASAN ================"];
  for (const t of urutan) {
    const x = hasil.filter((h) => h.tahap === t);
    const ok = x.filter((h) => h.tipe === "ok").length;
    const gagal = x.filter((h) => h.tipe === "gagal").length;
    baris.push(`${gagal ? "[GAGAL]" : "[OK]   "} Tahap ${t}: ${ok} lulus, ${gagal} gagal`);
  }
  const gagal = hasil.filter((h) => h.tipe === "gagal");
  const catatan = hasil.filter((h) => h.tipe === "catatan");
  if (gagal.length) {
    baris.push("", "--- YANG GAGAL ---");
    gagal.forEach((h) => baris.push(`- [${h.tahap}] ${h.nama}${h.detail ? " -> " + h.detail : ""}`));
  }
  if (catatan.length) {
    baris.push("", "--- CATATAN ---");
    catatan.forEach((h) => baris.push(`- [${h.tahap}] ${h.nama}${h.detail ? " -> " + h.detail : ""}`));
  }
  const total = hasil.filter((h) => h.tipe !== "catatan").length;
  baris.push("", `Total: ${total - gagal.length} lulus, ${gagal.length} gagal dari ${total} pengecekan.`);
  const teks = baris.join("\n");
  log("\n" + teks);
  try { fs.writeFileSync("hasil-tes-ringkasan.txt", teks); log("\n(Ringkasan disimpan di hasil-tes-ringkasan.txt)"); } catch {}
  process.exit(gagal.length ? 1 : 0);
}

(async () => {
  log(`Tes FinZen -> ${BASE} sebagai ${IDENT}`);
  await jalankan("1", "Auth dan profil", tahap1);
  if (!token) return selesai();
  await jalankan("2", "Dashboard awal", tahap2);
  await jalankan("3", "Transaksi", tahap3);
  await jalankan("4", "Budgeting", tahap4);
  await jalankan("5", "Target tabung", tahap5);
  await jalankan("6", "Kelola pinjaman", tahap6);
  await jalankan("7", "Kalkulator bunga", tahap7);
  await jalankan("8", "Financial Health", tahap8);
  await jalankan("9", "Cari Aman", tahap9);
  await jalankan("10", "Dashboard akhir", tahap10);
  await jalankan("11", "Logout", tahap11);
  selesai();
})();