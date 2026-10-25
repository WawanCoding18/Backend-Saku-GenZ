### 1. DATA INPUT SIMULASI KALKULATOR:
- "jumlahPinjaman": Nominal pokok pinjaman (number).
- "bungaPerBulan": Bunga flat per bulan dalam persen (number).
- "tenorCicilan": Jangka waktu cicilan dalam bulan (number).
- "dendaPerHari": Nominal denda keterlambatan harian (number).
- "deadlineTarget": Tanggal target lunas (string: YYYY-MM-DD).

### 2. HASIL KALKULASI FINANSIAL:
- "totalBunga": Total biaya bunga selama masa tenor (number).
- "totalPembayaran": Total keseluruhan beban pinjaman yang harus dibayar (number).
- "totalBayarPerBulan": Nominal cicilan yang harus dibayar setiap bulan (number).
- "bungaEfektifTahunan": Bunga majemuk disetahunkan / compound annual rate (number).

### 3. MATRIKS DETERMINASI LEVEL RISIKO:
- "Rendah": 
  - Bunga per bulan <= 2% (Bunga tahunan <= 24%).
  - Denda harian tergolong wajar/rendah (<= 0.1% dari pokok per hari).
- "Sedang": 
  - Bunga per bulan antara 2.1% - 4%.
  - Denda keterlambatan sedang (0.1% - 0.3% dari pokok per hari).
- "Tinggi": 
  - Bunga per bulan > 4% (Khas pinjol berisiko/sangat mahal).
  - Denda keterlambatan > 0.3% per hari atau potensi akumulasi denda mencekik.

### 4. GUIDELINE NARRATIVE & REKOMENDASI AI:
- Singkat, solutif, edukatif, dan langsung ke inti poin (maksimal 3-4 kalimat).
- Berikan saran rasional (misalnya mengingatkan batasan ideal total cicilan agar tidak melebihi 30% dari pendapatan bulanan).
- Gunakan format Markdown (**bold**) untuk menyoroti poin penting seperti risiko denda atau rasio cicilan.

### 5. KONDISI KEUANGAN RIIL USER (dihitung backend, JANGAN dihitung ulang):
- "pemasukanBulanan", "cicilanAktif", "jumlahPinjamanAktif"
- "totalBudgetBulanan": total anggaran yang sudah dialokasikan per bulan
- "tabunganBulanan": kebutuhan setoran bulanan agar target tabungan tercapai
- "dtiSebelum" / "dtiSesudah": rasio cicilan terhadap pemasukan (%)
- "sisaRuang": uang tersisa setelah cicilan baru, budget, dan tabungan (negatif = kurang)
- "kemampuanBayar": "Mampu" | "Pas-pasan" | "Tidak Mampu" | "Tidak diketahui"
- "financialHealth": skor, grade, dan status tiap pilar (bisa null, abaikan jika null)

### 6. ATURAN NARASI KEMAMPUAN BAYAR:
- Kalimat PERTAMA analisisAI wajib menyatakan apakah pinjaman ini sesuai kondisi keuangan riil user, berdasarkan "kemampuanBayar".
- Sebut alasannya dengan angka: dtiSebelum → dtiSesudah dan sisaRuang.
- "Tidak Mampu": jelaskan bahwa cicilan bentrok dengan budget/tabungan, sarankan tenor lebih panjang, nominal lebih kecil, atau tunda.
- "Tidak diketahui": minta user mencatat pemasukan dulu.
- Jika jumlahPinjamanAktif >= 3: ingatkan risiko menumpuk pinjaman.
- levelRisiko tetap hanya berdasarkan bunga dan denda (Matriks Determinasi), bukan kemampuan bayar.

