### 🧠 KNOWLEDGE & RULES EKSTRAKSI TRANSAKSI:

1. **"Catatan_Transaksi"** (String)
   - Wajib: ringkasan singkat apa yang dibeli/diterima user.
   - Untuk struk belanja: gabungkan nama-nama barang yang dibeli, dipisah koma.
   - Untuk transaksi non-struk (transfer, gaji, dll): jelaskan singkat transaksinya.

2. **"tipe"** (String)
   - Wajib: "pengeluaran" atau "pemasukan".
   - Struk belanja/pembelian/nota/tagihan = "pengeluaran".
   - Slip gaji/transfer masuk/pendapatan = "pemasukan".

3. **"kategori"** (String)
   - Wajib salah satu dari:
     ["Hiburan", "Makanan", "Transportasi", "Belanja", "Tagihan", "Kesehatan", "Gaji", "Freelance", "Part-time", "Investasi", "Lainnya"]
   - Cafe/restoran/minimarket/bahan makanan = "Makanan".
   - Ojek online/bensin/parkir/tiket transportasi = "Transportasi".
   - Listrik/air/internet/pulsa/cicilan = "Tagihan".
   - Obat/rumah sakit/dokter = "Kesehatan".
   - Gaji bulanan dari kantor = "Gaji".
   - Jika tidak yakin/tidak cocok kategori manapun = "Lainnya".

4. **"Sumber_Dana"** (String) [SANGAT PENTING]
   - Ini adalah METODE PEMBAYARAN yang dipakai user, BUKAN nama toko/merchant/brand penjual.
   - WAJIB salah satu dari nilai berikut (harus persis sama, case-sensitive):
     ["Tunai", "Gopay", "DANA", "ShopeePay", "Bank Mandiri", "BSI", "BRI", "BTN", "BSA", "OVO", "Lainnya"]
   - Cara menentukan dari teks OCR:
     - Struk fisik dari kasir minimarket/warung/restoran tanpa keterangan metode digital → "Tunai".
     - Ada kata "GoPay" / "Gopay Payment" → "Gopay".
     - Ada kata "OVO" → "OVO".
     - Ada kata "DANA" → "DANA".
     - Ada kata "ShopeePay" / "SPay" → "ShopeePay".
     - Ada nama bank (Mandiri, BSI, BRI, BTN) dalam konteks transfer/debit → nama bank tersebut.
     - Tidak ada petunjuk metode pembayaran sama sekali → "Lainnya".
   - DILARANG KERAS mengisi dengan nama toko, merchant, atau brand penjual (Contoh SALAH: "Indomaret", "Gojek", "Loemplia Bom", "BESI JANGKANG").

5. **"nominal"** (Number)
   - Angka murni total bayar, tanpa titik/koma pemisah ribuan (Contoh benar: 18000, Contoh SALAH: "18.000" atau "18,000").
   - Ambil dari total akhir setelah dikurangi diskon/voucher jika ada, bukan subtotal sebelum diskon.

6. **"tanggal"** (String) [BACA ATURAN KETAT INI]
   - Format WAJIB: "YYYY-MM-DD"
   - CARI tanggal pada teks OCR (contoh: "24 Jul 2026" -> "2026-07-24").
   - ATURAN WAKTU HARI INI: Tanggal hari ini adalah **{{TODAY_DATE}}**.
   - JIKA tanggal TIDAK DITEMUKAN secara jelas/teks OCR terpotong, KAMU WAJIB MENGGUNAKAN TANGGAL HARI INI yaitu: "{{TODAY_DATE}}".
   - DILARANG KERAS mengarang, menebak, atau menggunakan tahun/bulan/tanggal lain jika tidak tertulis eksplisit di teks OCR!

   ### 🗓️ PEDOMAN BACA TANGGAL STRUK:

   **Pola Tanggal Minimarket / Struk**:
   - Jika ketemu angka seperti `16.06.18` atau `16-06-2018`, artinya tanggal **16 Juni 2018** (`2018-06-16`).
   - Jika ketemu `05.09.17`, artinya **5 September 2017** (`2017-09-05`).

   **Prioritas Utama**:
   - WAJIB gunakan tanggal dari teks OCR terlebih dahulu!
   - Hanya gunakan tanggal fallback (`{{TODAY_DATE}}`) JIKA DAN HANYA JIKA tidak ada deretan angka tanggal sama sekali.

   