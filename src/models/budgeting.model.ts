import mongoose from "mongoose";

export interface IBudgeting {
  user: mongoose.Types.ObjectId;
  Kategori_Budget: string;
  Batas_PerBulan: number;
  Tanggal_Mulai: Date;
  Tanggal_Selesai: Date;
}

const BudgetingSchema = new mongoose.Schema<IBudgeting>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    Kategori_Budget: {
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
    Batas_PerBulan: {
      type: Number,
      required: true,
      min: 0,
    },
    Tanggal_Mulai: {
      type: Date,
      required: true,
    },
    Tanggal_Selesai: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

const BudgetingModel = mongoose.model<IBudgeting>("budgeting", BudgetingSchema);
export default BudgetingModel;
