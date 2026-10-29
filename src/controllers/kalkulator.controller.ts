import { Request, Response } from "express";
import SimulasiPinjamanModel from "../models/kalkulator.model";
import { ambilKondisiKeuangan } from "./financialHealth.controller";
import { IReqUser } from "../middlewares/auth.Middleware";
import { askAIStream } from "../services/ai.KalkulatorBunga.services";

interface IAIResult {
  levelRisiko: "Rendah" | "Sedang" | "Tinggi";
  analisisAI: string;
}

const parseAngka = (value: unknown): number => {
  if (value === undefined || value === null || value === "") return NaN;
  const cleaned = String(value).replace(/\./g, "").replace(/,/g, ".");
  return Number(cleaned);
};

//Hitung & simpan Simulasi Kalkulator Bunga
export const postKalkulatorBunga = async (req: IReqUser, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res
      .status(401)
      .json({ message: "Unauthorized: User tidak teridentifikasi" });
  }

  const {
    jumlahPinjaman,
    bungaPerBulan,
    tenorCicilan,
    dendaPerHari,
    deadlineTarget,
  } = req.body;

  const pokok = parseAngka(jumlahPinjaman);
  const bunga = Number(String(bungaPerBulan).replace(",", "."));
  const tenor = parseAngka(tenorCicilan);
  const denda = dendaPerHari != undefined ? parseAngka(dendaPerHari) || 0 : 0;

  if (!pokok || pokok <= 0) {
    return res
      .status(400)
      .json({ message: "Jumlah Pinjaman harus lebih dari 0" });
  }
  if (Number.isNaN(bunga) || bunga < 0) {
    return res.status(400).json({ message: "Bunga per Bulan tidak valid" });
  }

  if (!tenor || tenor <= 0) {
    return res
      .status(400)
      .json({ message: "Tenor Cicilan harus lebih dari 0 bulan" });
  }

  //Rumus kalkulasi bunga
  const totalBunga = pokok * (bunga / 100) * tenor;
  const totalPembayaran = pokok + totalBunga;
  const totalBayarPerBulan = totalPembayaran / tenor;
  const bungaEfektifTahunan = (Math.pow(1 + bunga / 100, 12) - 1) * 100;

  const k = await ambilKondisiKeuangan(userId.toString());
  const ada = k.pemasukanBulanan > 0;

  const dtiSebelum = ada
    ? Math.round((k.cicilanAktif / k.pemasukanBulanan) * 100)
    : null;
  const dtiSesudah = ada
    ? Math.round(
        ((k.cicilanAktif + totalBayarPerBulan) / k.pemasukanBulanan) * 100,
      )
    : null;
  const sisaRuang = ada
    ? Math.round(
        k.pemasukanBulanan -
          k.cicilanAktif -
          k.totalBudgetBulanan -
          k.tabunganBulanan -
          totalBayarPerBulan,
      )
    : null;

  let kemampuanBayar:
    | "Mampu"
    | "Pas-pasan"
    | "Tidak Mampu"
    | "Tidak diketahui" = "Tidak diketahui";
  if (ada && sisaRuang !== null && dtiSesudah !== null) {
    if (sisaRuang < 0 || dtiSesudah > 50) kemampuanBayar = "Tidak Mampu";
    else if (sisaRuang < k.pemasukanBulanan * 0.1 || dtiSesudah > 30)
      kemampuanBayar = "Pas-pasan";
    else kemampuanBayar = "Mampu";
  }

  

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    //Panggil AI Stream
    const aiResponse = (await askAIStream(
      JSON.stringify({
           jumlahPinjaman: pokok,
    bungaPerBulan: bunga,
    tenorCicilan: tenor,
    dendaPerHari: denda,
    totalBunga: Number(totalBunga.toFixed(2)),
    totalPembayaran: Number(totalPembayaran.toFixed(2)),
    totalBayarPerBulan: Number(totalBayarPerBulan.toFixed(2)),
    bungaEfektifTahunan: Number(bungaEfektifTahunan.toFixed(1)),
    
    //kondisi keuangan:
    pemasukanBulanan: k.pemasukanBulanan,
    cicilanAktif: k.cicilanAktif,
    jumlahPinjamanAktif: k.jumlahPinjamanAktif,
    totalBudgetBulanan: k.totalBudgetBulanan,
    tabunganBulanan: k.tabunganBulanan,
    dtiSebelum,
    dtiSesudah,
    sisaRuang,
    kemampuanBayar,
    financialHealth: k.financialHealth,
      }),
      res,
    )) as IAIResult;

    const levelRisiko =
      aiResponse?.levelRisiko ||
      (bunga > 4 ? "Tinggi" : bunga > 2 ? "Sedang" : "Rendah");
    const analisisAI =
  aiResponse?.analisisAI ||
  (kemampuanBayar === "Tidak diketahui"
    ? "Catat pemasukanmu dulu agar kemampuan bayar bisa dinilai. Usahakan total cicilan **tidak melebihi 30% pemasukan**."
    : `Berdasarkan kondisi keuanganmu, kemampuan bayarmu untuk pinjaman ini: **${kemampuanBayar}**. Rasio cicilan naik dari **${dtiSebelum}%** menjadi **${dtiSesudah}%** dari pemasukan.`);

    //Simpan ke Database
    const newSimulasi = await SimulasiPinjamanModel.create({
      user: userId,
      jumlahPinjaman: pokok,
      bungaPerBulan: bunga,
      tenorCicilan: tenor,
      dendaPerHari: denda,
      deadlineTarget,
      totalBunga: Number(totalBunga.toFixed(2)),
      totalPembayaran: Number(totalPembayaran.toFixed(2)),
      totalBayarPerBulan: Number(totalBayarPerBulan.toFixed(2)),
      bungaEfektifTahunan: Number(bungaEfektifTahunan.toFixed(1)),
      levelRisiko: levelRisiko,
      analisisAI: analisisAI,
    });

    res.write(
      `data: ${JSON.stringify({
        type: "done",
        message: "Berhasil menghitung dan menyimpan simulasi",
        data: newSimulasi,
        pemasukanBulanan: k.pemasukanBulanan,
        cicilanAktif: k.cicilanAktif,
        jumlahPinjamanAktif: k.jumlahPinjamanAktif,
        totalBudgetBulanan: k.totalBudgetBulanan,
        tabunganBulanan: k.tabunganBulanan,
        dtiSebelum,
        dtiSesudah,
        sisaRuang,
        kemampuanBayar,
        financialHealth: k.financialHealth,
      })}\n\n`,
    );
  } catch (error: any) {
    console.error("❌ Error pada postKalkulatorBunga:", error.message);
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        message: "Gagal menghitung simulasi",
        error: String(error.message || error),
      })}\n\n`,
    );
  } finally {
    res.end();
  }
};

export const getKalkulatorBunga = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    const latestData = await SimulasiPinjamanModel.findOne({ user: userId })
      .select(
        "jumlahPinjaman bungaPerBulan tenorCicilan dendaPerHari totalBunga totalPembayaran totalBayarPerBulan bungaEfektifTahunan levelRisiko analisisAI createdAt",
      )
      .sort({ createdAt: -1 });

    if (!latestData) {
      return res.status(200).json({
        message: "Belum ada data simulasi",
        data: null,
      });
    }

    return res.status(200).json({
      message: "Berhasil mengambil data simulasi terbaru",
      data: latestData,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Gagal mengambil data", error: String(error) });
  }
};
