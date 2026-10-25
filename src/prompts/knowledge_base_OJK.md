# KB: Deteksi Pinjol/Pindar Ilegal

## ATURAN KRITIS
`ojk_match_status` HANYA mengurangi skor akhir — TIDAK menghentikan
evaluasi parameter lain. Entitas legal yang melanggar parameter lain
TETAP wajib diflag.

## ATURAN KRITIS #2: risk_score DIHITUNG ULANG DI BACKEND
Angka `risk_score` yang kamu isi di output **TIDAK dipakai langsung** —
backend menghitung ulang secara deterministik dari field boolean yang
kamu isi (lihat "Pemetaan Indikator ke Field" di bawah). Karena itu:
- **Field boolean adalah sumber kebenaran, bukan angka `risk_score`.**
  Isi `risk_score` di output tetap wajib mengikuti rubrik di bawah
  secara akurat (untuk konsistensi dan sebagai cadangan), tapi
  kesalahan di sana tidak akan merusak hasil akhir SELAMA field
  boolean-nya benar.
- Fokus utamamu: pastikan SETIAP field boolean mencerminkan hasil
  evaluasi parameter yang benar — ini yang paling menentukan output
  akhir ke pengguna.

## 6 Parameter Evaluasi

**P1. Legalitas & Cloning**
Gunakan `ojk_match_status` dari backend apa adanya untuk `is_ojk_legal`.
Deteksi cloning: nama mirip entitas legal (typosquatting, tambahan kata
"Cepat/Plus/Express"). Cloning nama entitas yang BUKAN entitas
pinjol/keuangan (mis. mencatut nama operator seluler untuk menawarkan
pinjaman) tetap dihitung sebagai indikasi penyamaran/social engineering,
bukan "cloning nama pinjol" — tandai lewat `soceng_indicated`.

**P2. Saluran Komunikasi**
Penawaran via SMS/WA/Telegram pribadi tanpa persetujuan = ilegal.
Penagihan hanya boleh Senin–Sabtu 08.00–20.00.

**P3. Data Sensitif**
- OTP/PIN/password/CVV via pesan = flag merah mutlak (+50, override berbahaya)
- NIK via chat personal = kondisional bahaya (+20)

**P4. Batas Bunga OJK 2026**
- Konsumtif: maks 0,1%/hari
- Produktif/mikro: maks 0,067%/hari
- Lock Cap: total biaya ≤ 100% pokok (max pengembalian = 2x pokok)
- Jika bunga/biaya TIDAK disebutkan sama sekali di input, `interest_warning`
  WAJIB `false` — jangan mengasumsikan pelanggaran tanpa angka eksplisit.

**P5. Bahasa Manipulatif**
Urgensi palsu ("buruan", "5 menit"), iming-iming tidak rasional
("pasti cair", "tanpa BI Checking"), tekanan/ancaman implisit.

**P6. APK Non-Resmi**
Link pemendek (bit.ly, s.id, tinyurl) mengarah ke .apk di luar
Play Store/App Store. Link pemendek TANPA indikasi jelas mengarah ke
file .apk (mis. cuma landing page promosi) TIDAK otomatis diberi flag
ini — nilai berdasarkan bukti di teks, bukan asumsi.

## Pemetaan Indikator ke Field Boolean (WAJIB DIIKUTI PERSIS)

Setiap indikator di rubrik skoring HARUS direfleksikan lewat field
boolean berikut di output JSON — ini yang dipakai backend untuk
menghitung ulang `risk_score` secara pasti:

| Indikator Terdeteksi | Field Boolean yang Diisi `true` | Poin |
|---|---|---|
| Cloning/pencatutan nama entitas (pinjol atau non-pinjol) | `soceng_indicated` | +40 |
| Pelanggaran saluran komunikasi (channel tanpa izin / jam penagihan) | `channel_violation_detected` | +25 |
| Permintaan OTP/PIN/password/CVV | `sensitive_data_requested` | +50 (override "berbahaya") |
| Ancaman sebar data / doxxing / intimidasi | `sensitive_data_requested` | +50 (override "berbahaya") |
| NIK diminta via chat personal (bukan di aplikasi) | `sensitive_data_requested` | +20 |
| Bunga/biaya melebihi batas OJK atau Lock Cap | `interest_warning` | +30 |
| Bahasa manipulatif/urgensi palsu | `manipulative_language_detected` | +15 |
| Ajakan unduh APK non-resmi via short link | `apk_download_indicated` | +35 |

Catatan: `sensitive_data_requested` dipakai untuk 3 skenario berbeda
(OTP/PIN, ancaman doxxing, NIK personal) — beri `true` jika SALAH SATU
dari ketiganya terdeteksi, dan jelaskan skenario mana persis yang
terdeteksi di `ai_detail`.

`is_scam_indicated` diisi `true` jika ADA MINIMAL SATU dari field
boolean di atas bernilai `true` — ini penanda ringkasan, bukan
indikator terpisah dengan poin sendiri.

## Rubrik Skoring (Referensi — Perhitungan Final Dilakukan Backend)

| Indikator | Poin |
|---|---|
| Cloning nama entitas legal / penyamaran identitas | +40 |
| Pelanggaran channel/jam | +25 |
| OTP/PIN/password/CVV diminta | +50 (override berbahaya) |
| Ancaman sebar data / doxxing / intimidasi | +50 (override berbahaya) |
| NIK via chat personal | +20 |
| Bunga > batas OJK / Lock Cap | +30 |
| Bahasa manipulatif | +15 |
| APK non-resmi via short link | +35 |

**Efek ojk_match_status:**
- "Terdaftar Resmi" → skor × 0,6 (kurangi 40%), minimal tetap masuk
  kategori sesuai indikator jika ada minimal 1 indikator terdeteksi
- "Tidak Ditemukan" → skor × 1,2 (tambah 20%)

**Konversi ke risk_level:**
- 0–19 → "aman"
- 20–59 → "waspada"
- 60–100 atau ada flag `sensitive_data_requested` → "berbahaya"

## Prinsip Kehati-hatian
Data tidak cukup ≠ aman. Minimal "waspada" jika ada parameter
yang tidak dapat dipastikan — jangan set semua field boolean `false`
hanya karena informasinya tidak lengkap; jelaskan ketidakpastian di
`ai_detail`.

## Contoh Kasus

### Kasus: Entitas Legal, Channel Melanggar
Input: pesan mengaku dari platform terdaftar resmi, dikirim via WhatsApp
pribadi tanpa diminta sebelumnya.

Field yang benar:
```
"is_ojk_legal": "Terdaftar Resmi",
"channel_violation_detected": true,
"is_scam_indicated": true,
"soceng_indicated": false,
"interest_warning": false,
"manipulative_language_detected": false,
"sensitive_data_requested": false,
"apk_download_indicated": false
```
Poin dasar: 25 (channel) × 0,6 (legal) = 15 → `risk_level: "waspada"`.
Status legal TIDAK menghapus pelanggaran channel ini.

### Kasus: Input Tidak Relevan
Input: "Halo, apa kabar?" — semua field boolean `false`,
`is_ojk_legal` tetap diisi apa adanya dari `ojk_match_status` meski
tidak relevan, `risk_score` hasil hitung otomatis akan 0.

### Kasus: Flag Merah Mutlak
Input: "Kirimkan kode OTP yang baru masuk untuk verifikasi pencairan."
`sensitive_data_requested: true` → otomatis override ke "berbahaya" di
backend, apa pun kombinasi field lain.

