=================== KNOWLEDGE BASE FINANCIAL HEALTH ===================

1. KONTRAK TIPE DATA STRUKTUR RESPON AI
AI WAJIB mengembalikan tipe data yang presisi sesuai dengan ketentuan berikut:
- skorTotal: number (0 - 100)
- grade: string (Pilihan enum: "A" | "B" | "C" | "D" | "E")
- SubScore Object (digunakan pada pilar disiplinAnggaran, pengelolaanPinjaman,
  dan targetTabungan):
  * skor: number (skor yang diperoleh pilar tersebut)
  * maksimal: number (disiplinAnggaran: 34, pengelolaanPinjaman: 33, targetTabungan: 33)
  * persentase: number (persentase capaian 0 - 100)
  * status: string (Pilihan enum WAJIB PERSIS: "Excellent" | "Good" | "Perlu Perhatian" | "Buruk")
  * ringkasan: string (narasi penjelasan singkat 1-2 kalimat)
  * saranPerkembangan: Array of string (array berisi 3 poin saran tindakan)

2. EVALUASI PILAR FINANCIAL HEALTH
Skor kesehatan finansial dinilai berdasarkan akumulasi data numerik pengguna:

- Disiplin Anggaran (disiplinAnggaran) — maksimal 34:
  * Kepatuhan pengeluaran terhadap batas anggaran kategori.
  * skor = (Kategori Budget Terpenuhi ÷ Total Kategori) × 34
  * persentase = (Kategori Budget Terpenuhi ÷ Total Kategori) × 100
  * status enum: 100% = "Excellent" | 75-99% = "Good" | 50-74% = "Perlu Perhatian" | <50% = "Buruk"

- Pengelolaan Pinjaman (pengelolaanPinjaman) — maksimal 33:
  * Rasio Debt-to-Income (DTI) = (Total Cicilan Bulanan ÷ Total Pemasukan) × 100%
  * skor = DTI ≤30% (33 pts) | 31-40% (23-32 pts) | 41-50% (13-22 pts) | >50% (<13 pts)
  * status enum: DTI ≤30% = "Excellent" | 31-40% = "Good" | 41-50% = "Perlu Perhatian" | >50% = "Buruk"

- Target Tabungan (targetTabungan) — maksimal 33:
  * Mengevaluasi konsistensi pengguna mencapai target menabung yang telah dibuat,
    dengan membandingkan progres aktual (nominal terkumpul ÷ target) terhadap
    progres yang diharapkan berdasarkan waktu berjalan (elapsed time ÷ total durasi).
  * rasioPencapaian = progresAktual ÷ progresDiharapkan (dibatasi maks 1.0 untuk
    perhitungan skor, meski secara aktual bisa >100% jika user menabung lebih cepat)
  * skor = rasioPencapaian ≥90% target on-track (33 pts) | 70-89% (23-32 pts) |
    50-69% (13-22 pts) | <50% (<13 pts)
  * status enum: ≥90% = "Excellent" | 70-89% = "Good" | 50-69% = "Perlu Perhatian" | <50% = "Buruk"
  * Jika pengguna belum memiliki target tabungan aktif sama sekali, skor diberikan
    setengah dari maksimal (16-17 pts) dengan status "Perlu Perhatian" — bukan nilai
    penuh maupun nol, karena belum membuat target bukan berarti buruk, tapi bisa
    didorong untuk mulai.

3. KONVERSI GRADE FINANCIAL HEALTH (skorTotal = akumulasi 3 pilar, maks 100)
- skorTotal ≥85 : grade = "A" (Sangat Baik / Keuangan Sangat Sehat)
- skorTotal ≥70 : grade = "B" (Baik / Keuangan Hampir Sehat)
- skorTotal ≥55 : grade = "C" (Cukup / Keuangan Cukup Stabil)
- skorTotal ≥40 : grade = "D" (Kurang / Keuangan Perlu Perbaikan)
- skorTotal <40  : grade = "E" (Buruk / Keuangan Berisiko Tinggi)

4. GUIDELINE PENULISAN TEKS AI (ringkasan & saranPerkembangan)
- Evaluasi secara rasional kondisi tiap pilar (disiplin anggaran, DTI pinjaman,
  progres target tabungan) untuk menyusun narasi ringkasan per pilar.
- ringkasan: string berisi 1-2 kalimat deskripsi ringkas kondisi pilar. Gunakan
  **bold** pada angka/rasio/kata kunci penting.
- saranPerkembangan: Array of string (string[]) yang berisi TEPAT 3 poin saran
  taktis yang dapat dilakukan pengguna, spesifik untuk pilar tersebut.


=======================================================================