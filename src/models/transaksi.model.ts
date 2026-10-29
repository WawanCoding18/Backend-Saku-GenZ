import mongoose from "mongoose";

export interface Transaksi {
  user: mongoose.Types.ObjectId;
  Catatan_Transaksi: string;
  tipe: "pengeluaran" | "pemasukan";
  kategori: string;
  Sumber_Dana: string;
  nominal: number;
  tanggal: Date;
  targetTabungId?: mongoose.Types.ObjectId;
  createdAt?: string;
}

const TransaksiSchema = new mongoose.Schema<Transaksi>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    Catatan_Transaksi: {
      type: String,
      required: true,
    },
    tipe: {
      type: String,
      enum: ["pengeluaran", "pemasukan"],
      required: true,
    },
    kategori: {
      type: String,
      enum: [
        "Makanan",
        "Transportasi",
        "Belanja",
        "Tagihan",
        "Kesehatan",
        "Pendidikan",
        "Hiburan",
        "Tabungan",
        "Gaji",
        "Uang Saku",
        "Part-time",
        "Freelance",
        "Beasiswa",
        "Bisnis Kecil",
        "Investasi",
        "Lainnya",
      ],
      required: true,
    },
    Sumber_Dana: {
      type: String,
      enum: [
        "Tunai",
        "Gopay",
        "DANA",
        "ShopeePay",
        "Bank Mandiri",
        "BSI",
        "BRI",
        "BTN",
        "BSA",
        "OVO",
        "Lainnya",
      ],
      required: true,
    },
    nominal: {
      type: Number,
      required: true,
      min: 0,
    },
    tanggal: {
      type: Date,
      required: true,
    },
    targetTabungId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "targettabung",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const TransaksiModel =
  mongoose.models.Transaksi ||
  mongoose.model<Transaksi>("Transaksi", TransaksiSchema);

export default TransaksiModel;
