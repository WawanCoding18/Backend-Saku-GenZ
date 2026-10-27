# Backend Saku Gen Z

Backend API untuk Saku Gen Z, aplikasi pengelolaan keuangan pribadi. API ini menangani autentikasi pengguna dan data keuangan, serta menyediakan fitur analisis berbantuan AI.

## Deskripsi

Saku Gen Z membantu pengguna mencatat pemasukan dan pengeluaran, merencanakan anggaran dan target tabungan, serta mengelola pinjaman. Backend menyediakan REST API berbasis Express dan menyimpan data di MongoDB. Beberapa fitur juga memanfaatkan layanan AI dan OCR untuk membantu analisis kesehatan finansial, perhitungan bunga, rekomendasi pinjaman, dan pemindaian catatan keuangan.

## Key Features

- **Autentikasi dan verifikasi akun** dengan registrasi, login, JWT, verifikasi OTP melalui email, dan logout.
- **Profil pengguna** untuk onboarding dan pengelolaan informasi profil.
- **Catatan transaksi** untuk menambah, melihat, memperbarui, dan menghapus transaksi pemasukan maupun pengeluaran.
- **Pemindaian catatan keuangan** dari gambar menggunakan OCR dan analisis AI.
- **Budgeting** dengan batas pengeluaran per kategori, periode anggaran, dan ringkasan penggunaan.
- **Target tabungan** untuk membuat target, mencatat setoran, dan memantau pencapaian.
- **Pengelolaan pinjaman** untuk mencatat pinjaman, pembayaran, pelunasan, dan perubahan jatuh tempo.
- **Kalkulator bunga** dan **Cari Aman** untuk membantu pengguna memahami bunga dan risiko pinjaman.
- **Financial health** dan **dashboard** untuk menyajikan ringkasan serta analisis kondisi keuangan.
- **Dokumentasi API interaktif** melalui Swagger UI.

## Preview

### Base URL

| Lingkungan | URL |
| --- | --- |
| Local | `http://localhost:4000/api` |
| Production | `https://backend-saku-genz.vercel.app/api` |

Swagger UI tersedia di `http://localhost:4000/api-docs` setelah server berjalan. Untuk endpoint yang memerlukan autentikasi, kirim access token dengan header:

```http
Authorization: Bearer <access-token>
```

### Contoh alur autentikasi

Registrasi memerlukan `fullName`, `username`, `email`, `password`, dan `confirmPassword`. Password minimal 6 karakter, harus memiliki setidaknya satu huruf kapital dan satu angka, serta harus sama dengan `confirmPassword`. Email harus valid.

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "fullName": "Rani Putri",
  "username": "raniputri",
  "email": "rani@example.com",
  "password": "SakuGenZ123",
  "confirmPassword": "SakuGenZ123"
}
```

Contoh response ketika OTP berhasil dikirim:

```json
{
  "message": "Registration successful. Please check your email for OTP code.",
  "data": {
    "email": "rani@example.com"
  }
}
```

OTP dikirim ke email dan berlaku selama 5 menit. Verifikasi akun melalui:

```http
POST /api/auth/verify-otp
Content-Type: application/json
```

```json
{
  "email": "rani@example.com",
  "otpCode": "123456"
}
```

Setelah akun aktif, login dengan username atau email:

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "identifier": "raniputri",
  "password": "SakuGenZ123"
}
```

Contoh response login:

```json
{
  "message": "Login successful",
  "data": "<access-token>"
}
```

### Contoh endpoint transaksi

Membuat transaksi memerlukan token. `tipe` hanya menerima `pemasukan` atau `pengeluaran`. `kategori` dan `Sumber_Dana` harus menggunakan nilai yang didukung model; `nominal` harus berupa angka non-negatif. Jika `tanggal` tidak dikirim, server menggunakan waktu saat ini.

```http
POST /api/catatan-keuangan/transaksi
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "Catatan_Transaksi": "Makan siang",
  "tipe": "pengeluaran",
  "kategori": "Makanan",
  "Sumber_Dana": "Tunai",
  "nominal": 25000,
  "tanggal": "2026-10-22T12:00:00.000Z"
}
```

Contoh response sukses (`201 Created`):

```json
{
  "message": "Transaksi berhasil dibuat",
  "data": {
    "_id": "<transaction-id>",
    "user": "<user-id>",
    "Catatan_Transaksi": "Makan siang",
    "tipe": "pengeluaran",
    "kategori": "Makanan",
    "Sumber_Dana": "Tunai",
    "nominal": 25000,
    "tanggal": "2026-10-22T12:00:00.000Z",
    "targetTabungId": null
  }
}
```

Endpoint lain untuk transaksi:

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/api/catatan-keuangan` | Daftar transaksi dan ringkasan saldo; mendukung query `?type=pemasukan` atau `?type=pengeluaran`. |
| `GET` | `/api/catatan-keuangan/:id` | Detail transaksi. |
| `PUT` | `/api/catatan-keuangan/:id` | Memperbarui transaksi. |
| `DELETE` | `/api/catatan-keuangan/:id` | Menghapus transaksi. |

### Ringkasan endpoint API

Semua endpoint berikut menggunakan prefix `/api`. Selain registrasi, login, verifikasi OTP, dan kirim ulang OTP, endpoint memerlukan autentikasi Bearer JWT.

| Fitur | Endpoint |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/verify-otp`, `POST /auth/resend-otp`, `GET /auth/me`, `POST /auth/logout` |
| Profil | `POST /profile/onboarding`, `GET /profile`, `PUT /profile` |
| Scan OCR | `POST /catatan-keuangan/scan` (multipart form-data, field gambar `image`) |
| Pinjaman | `POST /catatan-keuangan/pinjaman/tambah-pinjaman`, `GET /catatan-keuangan/pinjaman`, `PUT /catatan-keuangan/pinjaman/:id/bayar`, `PUT /catatan-keuangan/pinjaman/:id`, `PUT /catatan-keuangan/pinjaman/:id/lunasi`, `PUT /catatan-keuangan/pinjaman/:id/perpanjang`, `DELETE /catatan-keuangan/pinjaman/:id` |
| Target tabungan | `POST /catatan-keuangan/target-tabung/tambah-target`, `GET /catatan-keuangan/target-tabung`, `PUT /catatan-keuangan/target-tabung/:id/setor`, `PUT /catatan-keuangan/target-tabung/:id`, `DELETE /catatan-keuangan/target-tabung/:id` |
| Budgeting | `POST /catatan-keuangan/budgeting/tambah-budget`, `GET /catatan-keuangan/budgeting`, `PUT /catatan-keuangan/budgeting/:id`, `DELETE /catatan-keuangan/budgeting/:id` |
| Transaksi | `POST /catatan-keuangan/transaksi`, `GET /catatan-keuangan`, `GET /catatan-keuangan/:id`, `PUT /catatan-keuangan/:id`, `DELETE /catatan-keuangan/:id` |
| Kalkulator bunga | `POST /kalkulator-bunga`, `GET /kalkulator-bunga/output` |
| Cari Aman | `POST /cariAman`, `GET /cariAman/output` |
| Kesehatan finansial | `POST /financial-health/output`, `GET /dashboard/financial-health` |
| Dashboard | `GET /dashboard` |

**Validasi penting:** registrasi menolak email atau username yang sudah digunakan. OTP harus cocok dan belum kedaluwarsa. Untuk budgeting, batas harus lebih dari 0, tanggal selesai harus setelah tanggal mulai, serta kategori tidak boleh memiliki periode budget yang bertumpang tindih. Validasi model juga membatasi enum untuk kategori transaksi, sumber dana, dan jenis pinjaman. Respons kesalahan umumnya menyertakan `message` dan, bila tersedia, `error`.

> Catatan: contoh request registrasi di atas mengikuti controller yang aktif (`fullName`). Skema pada berkas Swagger yang dihasilkan mungkin tidak sepenuhnya mencerminkan implementasi terbaru; verifikasi request langsung ke endpoint bila terdapat perbedaan.

## Project Structure

```text
.
├── src/
│   ├── controllers/   # Logika handler HTTP per fitur
│   ├── docs/          # Setup Swagger dan spesifikasi OpenAPI
│   ├── knowledge/     # Data pengetahuan, termasuk referensi legal OJK
│   ├── middlewares/   # Autentikasi dan upload file
│   ├── models/        # Schema dan model MongoDB/Mongoose
│   ├── prompts/       # Prompt AI dan basis pengetahuan
│   ├── routes/        # Pemetaan endpoint API
│   ├── scripts/       # Script dan catatan pengujian/logika
│   ├── services/      # Integrasi AI, OCR, dan layanan eksternal
│   ├── utils/         # Database, JWT, enkripsi, konfigurasi, dan email
│   ├── index.ts       # Inisialisasi Express, middleware, route, dan koneksi DB
│   └── tes-pinjaman.js # Script bantu untuk pengujian alur pinjaman
├── package.json       # Dependency dan npm scripts
├── package-lock.json  # Versi dependency yang terkunci
├── tsconfig.json      # Konfigurasi TypeScript
└── vercel.json        # Konfigurasi deployment Vercel
```

Controller menghubungkan request dengan model dan service. Middleware autentikasi memvalidasi JWT sebelum route terlindungi dijalankan. Integrasi layanan AI dan OCR berada di `src/services/`, sedangkan endpoint Swagger UI didaftarkan melalui `src/docs/route.ts`.

## Tech Stack

- **Node.js 22** — runtime JavaScript server.
- **TypeScript 5** — bahasa utama backend.
- **Express 5** — framework HTTP dan routing API.
- **MongoDB dan Mongoose 8** — penyimpanan data dan pemodelan dokumen.
- **JWT (`jsonwebtoken`)** — token autentikasi.
- **Yup dan Zod** — library validasi yang digunakan di proyek.
- **Google GenAI dan Groq** — provider untuk fitur AI.
- **Axios, Sharp, dan FormData** — komunikasi layanan OCR dan pemrosesan gambar.
- **Nodemailer** — pengiriman OTP melalui Gmail.
- **Multer** — penerimaan file upload.
- **Swagger Autogen dan Swagger UI Express** — dokumentasi API.
- **Vercel Node** — adapter deployment serverless di Vercel.

## Local Setup

### Prerequisites

- Node.js **22.x** dan npm.
- MongoDB lokal atau MongoDB Atlas beserta connection string.
- API key Google Gemini dan Groq untuk fitur AI.
- Akun Gmail dengan **App Password** untuk mengirim email OTP.
- Koneksi ke layanan OCR eksternal; URL-nya dapat dikonfigurasi dengan `MODAL_OCR_URL`.
- Git untuk meng-clone repository.

### Langkah instalasi

1. Clone repository dan masuk ke folder project:

   ```bash
   git clone https://github.com/WawanCoding18/Backend-Saku-GenZ.git
   cd Backend-Saku-GenZ
   ```

2. Install dependency:

   ```bash
   npm install
   ```

3. Buat file `.env` di root project. Isi dengan konfigurasi lokal dan ganti semua nilai contoh:

   ```env
   DATABASE_URL=mongodb://127.0.0.1:27017/sakugenz
   SECRET=ganti-dengan-secret-jwt-yang-kuat
   GEMINI_API_KEY=isi-api-key-gemini
   GROQ_API_KEY=isi-api-key-groq
   EMAIL_FROM=alamat-gmail-anda@gmail.com
   EMAIL_APP_PASSWORD=app-password-gmail
   CLIENT_HOST=http://localhost:4001
   MODAL_OCR_URL=isi-api-URL-PADDLEOCR
   ```

   `DATABASE_URL`, `SECRET`, `GEMINI_API_KEY`, dan `GROQ_API_KEY` dibutuhkan oleh konfigurasi aplikasi. Kredensial Gmail dibutuhkan agar pengiriman OTP berhasil. `CLIENT_HOST` memiliki nilai default `http://localhost:4001`.

4. Jalankan server development:

   ```bash
   npm run dev
   ```

   Server lokal berjalan di `http://localhost:4000`. Endpoint health sederhana tersedia di `http://localhost:4000/`, dan dokumentasi API di `http://localhost:4000/api-docs`.

### Build dan start

```bash
npm run build
npm start
```

Hasil kompilasi TypeScript ditulis ke folder `dist/`. Perintah `npm start` menjalankan hasil build tersebut. Pastikan `.env` dan koneksi MongoDB siap sebelum menguji API.

> Jangan commit `.env` atau memasukkan API key, password, dan secret ke repository. File `.env` sudah dicantumkan di `.gitignore`.

## Documentation

- [Node.js](https://nodejs.org/docs/latest-v22.x/api/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Express](https://expressjs.com/)
- [MongoDB Manual](https://www.mongodb.com/docs/)
- [Mongoose](https://mongoosejs.com/docs/)
- [Google GenAI SDK](https://googleapis.github.io/js-genai/)
- [Groq API](https://console.groq.com/docs/overview)
- [JSON Web Token](https://github.com/auth0/node-jsonwebtoken)
- [Yup](https://github.com/jquense/yup)
- [Zod](https://zod.dev/)
- [Nodemailer](https://nodemailer.com/)
- [Multer](https://github.com/expressjs/multer)
- [Sharp](https://sharp.pixelplumbing.com/)
- [Swagger UI Express](https://github.com/scottie1984/swagger-ui-express)
- [Swagger Autogen](https://github.com/swagger-autogen/swagger-autogen)
- [Vercel Node.js](https://vercel.com/docs/functions/runtimes/node-js)

## Commit Format Standards

Riwayat repository memuat beberapa format commit, termasuk `feat:` dan `fix:` serta pesan bebas. Untuk menjaga konsistensi ke depannya, gunakan pola **Conventional Commits**:

```text
<type>(<scope>): <ringkasan dalam bentuk perintah>
```

Gunakan ringkasan singkat, spesifik, dan tanpa tanda titik di akhir. Tipe yang umum:

- `feat`: menambahkan fitur.
- `fix`: memperbaiki bug.
- `docs`: mengubah dokumentasi.
- `refactor`: merapikan atau mengubah struktur kode tanpa mengubah perilaku.
- `test`: menambah atau memperbarui pengujian.
- `chore`: perubahan pemeliharaan, konfigurasi, atau dependency.

Contoh:

```text
feat(transaksi): add transaction category filter
fix(pinjaman): correct installment balance calculation
docs(readme): document local setup and API endpoints
```
