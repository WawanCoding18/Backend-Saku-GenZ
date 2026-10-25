import mongoose, { Schema, Document } from "mongoose";

export interface ISimulasiPinjaman {
  user: mongoose.Types.ObjectId;
  jumlahPinjaman: number;
  bungaPerBulan: number;
  tenorCicilan: number;
  dendaPerHari: number;
  deadlineTarget?: Date;
  totalBunga: number;
  totalPembayaran: number;
  totalBayarPerBulan: number;
  bungaEfektifTahunan: number;
  levelRisiko: "Rendah" | "Sedang" | "Tinggi";
  analisisAI: string;
}

const SimulasiPinjamanSchema = new Schema<ISimulasiPinjaman>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  
    jumlahPinjaman: {
      type: Number,
      required: true,
      min: 0,
    },
    bungaPerBulan: {
      type: Number,
      required: true,
      min: 0,
    },
    tenorCicilan: {
      type: Number,
      required: true,
      min: 1,
    },
    dendaPerHari: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    deadlineTarget: {
      type: Date,
      required: false,
    },
  
    totalBunga: {
      type: Number,
      required: true,
    },
    totalPembayaran: {
      type: Number,
      required: true,
    },
    totalBayarPerBulan: {
      type: Number,
      required: true,
    },
    bungaEfektifTahunan: {
      type: Number,
      required: true,
    },
    levelRisiko: {
      type: String,
      enum: ["Rendah", "Sedang", "Tinggi"],
      required: true,
    },
    analisisAI: {
      type: String,
    },
  },
  {
    timestamps: true, 
  }
);


const SimulasiPinjamanModel = mongoose.model<ISimulasiPinjaman>(
  "kalkulatorbunga",
  SimulasiPinjamanSchema
);
export default SimulasiPinjamanModel;