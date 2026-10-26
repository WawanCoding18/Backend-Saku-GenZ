import { Response } from "express";
import { IReqUser } from "../middlewares/auth.Middleware";
import { hitungDataTransaksi } from "./transaksi.controller";
import { hitungDataPinjaman } from "./pinjaman.controller";
import { hitungDanSimpanFinancialHealth } from "./financialHealth.controller";
import { cekBudgetWarning } from "./budgeting.controller";
import UserModel from "../models/user.model";
import FinancialHealthModel from "../models/financialHealth.model";
import TargetTabungModel from "../models/targetTabung.model";

export const getDashboard = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }
    const id = userId.toString();

    const [
      user,
      transaksiData,
      fhTersimpan,
      pinjamanData,
      budgetWarnings,
      targetAktif,
    ] = await Promise.all([
      UserModel.findById(id).select("username").lean(),
      hitungDataTransaksi(id),
      FinancialHealthModel.findOne({ user: id })
        .select("skorTotal grade updatedAt")
        .lean(),
      hitungDataPinjaman(id),
      cekBudgetWarning(id),
      TargetTabungModel.find({ user: id, status: "Aktif" })
        .sort({ deadlineTarget: 1 })
        .limit(1)
        .lean(),
    ]);

    // Hanya hitung kalau belum pernah ada, supaya saran AI tidak tertimpa
    const fh: any = fhTersimpan ?? (await hitungDanSimpanFinancialHealth(id));

    const transaksiTerakhir = transaksiData.data.slice(0, 5).map((t: any) => ({
      _id: t._id,
      catatan: t.Catatan_Transaksi,
      kategori: t.kategori,
      tipe: t.tipe,
      nominal: t.nominal,
      tanggal: t.tanggal,
    }));

    const cicilanMendatang = pinjamanData.data
      .filter((p) => p.statusPinjaman !== "Lunas")
      .sort(
        (a, b) =>
          new Date(a.jatuhTempo).getTime() - new Date(b.jatuhTempo).getTime(),
      )
      .slice(0, 2)
      .map((p) => ({
        _id: p._id,
        namaPlatform: p.namaPlatform,
        jatuhTempo: p.jatuhTempo,
        cicilanBulanan: p.cicilanBulanan,
      }));

    const targetNabung = targetAktif.map((t: any) => ({
      _id: t._id,
      icon: t.icon,
      namaTarget: t.namaTarget,
      targetNominal: t.targetNominal,
      terkumpulNominal: t.terkumpulNominal,
      persentase:
        t.targetNominal > 0
          ? Math.min(
              100,
              Math.round((t.terkumpulNominal / t.targetNominal) * 100),
            )
          : 0,
    }));

    return res.status(200).json({
      message: "Dashboard data berhasil diambil",
      data: {
        nama: user?.username,
        notifikasi: budgetWarnings,
        ringkasan: {
          saldo: transaksiData.summary.saldo,
          totalPemasukan: transaksiData.summary.totalPemasukan,
          totalPengeluaran: transaksiData.summary.totalPengeluaran,
        },
        financialHealth: {
          skorTotal: fh.skorTotal,
          grade: fh.grade,
          updatedAt: fh.updatedAt,
        },
        transaksiTerakhir,
        cicilanMendatang,
        pinjamanAktif: {
          jumlahAktif: pinjamanData.jumlahAktif,
          peringatan: pinjamanData.peringatan,
        },
        targetNabung,
      },
    });
  } catch (error: any) {
    console.error("❌ Gagal mengambil data dashboard:", error.message);
    return res.status(500).json({
      message: "Gagal mengambil data dashboard",
      error: error.message,
    });
  }
};
