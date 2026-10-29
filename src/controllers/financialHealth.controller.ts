import { Response } from "express";
import { IReqUser } from "../middlewares/auth.Middleware";
import FinancialHealthModel from "../models/financialHealth.model";
import BudgetingModel from "../models/budgeting.model";
import PinjamanModel from "../models/pinjaman.model";
import TargetTabungModel from "../models/targetTabung.model";
import TransaksiModel from "../models/transaksi.model";
import { askAIStream } from "../services/ai.FinancialHealth.services";

interface IAIResult {
  disiplinAnggaran?: {
    ringkasan?: string;
    saranPerkembangan?: string[];
  };
  pengelolaanPinjaman?: {
    ringkasan?: string;
    saranPerkembangan?: string[];
  };
  targetNabung?: {
    ringkasan?: string;
    saranPerkembangan?: string[];
  };
}

const hitungDisiplinAnggaran = async (userId: string) => {
  const listBudgeting = await BudgetingModel.find({ user: userId });

  if (listBudgeting.length === 0) {
    return {
      skor: 0,
      maksimal: 34,
      persentase: 0,
      status: "Perlu Perhatian" as const,
      ringkasan:
        "Kamu belum membuat budget apapun. Buat budget untuk mulai melacak pengeluaranmu.",
    };
  }

  let kategoriDalamBatas = 0;

  for (const budget of listBudgeting) {
    const transaksiDalamPeriode = await TransaksiModel.find({
      user: userId,
      kategori: budget.Kategori_Budget,
      tipe: "pengeluaran",
      tanggal: { $gte: budget.Tanggal_Mulai, $lte: budget.Tanggal_Selesai },
    });

    const terpakai = transaksiDalamPeriode.reduce(
      (acc, t) => acc + (t.nominal ?? 0),
      0,
    );

    if (terpakai <= budget.Batas_PerBulan) {
      kategoriDalamBatas++;
    }
  }

  const totalKategori = listBudgeting.length;
  const rasio = kategoriDalamBatas / totalKategori;
  const skor = Math.round(rasio * 34);

  let status: "Excellent" | "Good" | "Perlu Perhatian" | "Buruk";
  if (rasio >= 0.9) status = "Excellent";
  else if (rasio >= 0.7) status = "Good";
  else if (rasio >= 0.4) status = "Perlu Perhatian";
  else status = "Buruk";

  const ringkasan =
    kategoriDalamBatas === totalKategori
      ? "Semua pengeluaran bulan ini masih sesuai dengan batas anggaran yang kamu buat. Mantap, berarti kamu cukup disiplin dalam mengatur pengeluaran."
      : `Ada ${
          totalKategori - kategoriDalamBatas
        } dari ${totalKategori} kategori budget yang sudah melebihi batas. Coba lebih perhatikan pengeluaran di kategori tersebut.`;

  return {
    skor,
    maksimal: 34,
    persentase: Math.round(rasio * 100),
    status,
    ringkasan,
  };
};

const hitungPengelolaanPinjaman = async (userId: string) => {
  const listPinjaman = await PinjamanModel.find({ user: userId });

  const tigaPuluhHariLalu = new Date();
  tigaPuluhHariLalu.setDate(tigaPuluhHariLalu.getDate() - 30);

  const transaksiPemasukan = await TransaksiModel.find({
    user: userId,
    tipe: "pemasukan",
    tanggal: { $gte: tigaPuluhHariLalu },
  });
  const totalPemasukan = transaksiPemasukan.reduce(
    (acc, t) => acc + (t.nominal ?? 0),
    0,
  );

  if (listPinjaman.length === 0) {
    return {
      skor: 33,
      maksimal: 33,
      persentase: 0,
      status: "Excellent" as const,
      ringkasan:
        "Kamu tidak memiliki pinjaman aktif saat ini. Kondisi ini sangat baik untuk kesehatan keuanganmu.",
    };
  }

  const kewajibanPerbulan = listPinjaman.reduce((acc, item) => {
    if (item.statusPinjaman !== "Lunas")
      return acc + (item.cicilanBulanan ?? 0);
    return acc;
  }, 0);

  const rasioDTI = totalPemasukan > 0 ? kewajibanPerbulan / totalPemasukan : 1;

  let skor: number;
  let status: "Excellent" | "Good" | "Perlu Perhatian" | "Buruk";

  if (rasioDTI <= 0.3) {
    skor = 33;
    status = "Excellent";
  } else if (rasioDTI <= 0.5) {
    skor = 23;
    status = "Good";
  } else if (rasioDTI <= 0.7) {
    skor = 13;
    status = "Perlu Perhatian";
  } else {
    skor = 3;
    status = "Buruk";
  }

  const persentase = Math.round(rasioDTI * 100);
  const ringkasan = `Sekitar ${persentase}% pemasukanmu masih digunakan untuk membayar cicilan. ${
    rasioDTI <= 0.3
      ? "Kondisi ini sangat aman."
      : rasioDTI <= 0.5
        ? "Masih aman, tapi usahakan jangan bertambah supaya keuangan tetap sehat."
        : "Ini sudah cukup berat, sebaiknya prioritaskan pelunasan cicilan sebelum ambil pinjaman baru."
  }`;

  return { skor, maksimal: 33, persentase, status, ringkasan };
};

const hitungTargetNabung = async (userId: string) => {
  const listTarget = await TargetTabungModel.find({ user: userId });

  if (listTarget.length === 0) {
    return {
      skor: 17,
      maksimal: 33,
      persentase: 0,
      status: "Perlu Perhatian" as const,
      ringkasan:
        "Kamu belum membuat target tabungan apapun. Mulai buat target untuk melatih kebiasaan menabung.",
    };
  }

  const sekarang = new Date();
  let totalRasioPencapaian = 0;
  let jumlahTargetValid = 0;
  let adaYangGagal = false;

  for (const target of listTarget) {
    
    //Target yang sudah eksplisit Gagal langsung dianggap rasio 0
    if (target.status === "Gagal") {
      totalRasioPencapaian += 0;
      jumlahTargetValid++;
      adaYangGagal = true;
      continue;
    }

    //Target yang sudah Tercapai langsung dianggap rasio penuh 1
    if (target.status === "Tercapai") {
      totalRasioPencapaian += 1;
      jumlahTargetValid++;
      continue;
    }

    const tanggalMulai = (target as any).createdAt
      ? new Date((target as any).createdAt)
      : sekarang;
    const deadline = new Date(target.deadlineTarget);

    const totalDurasiMs = deadline.getTime() - tanggalMulai.getTime();
    const waktuBerjalanMs = sekarang.getTime() - tanggalMulai.getTime();

    if (totalDurasiMs <= 0) continue; //data tidak valid skip

    const progresDiharapkan = Math.min(
      1,
      Math.max(0, waktuBerjalanMs / totalDurasiMs),
    );

    const progresAktual =
      target.targetNominal > 0
        ? target.terkumpulNominal / target.targetNominal
        : 0;

    const rasioPencapaian =
      progresDiharapkan > 0
        ? Math.min(1, progresAktual / progresDiharapkan)
        : 1;

    totalRasioPencapaian += rasioPencapaian;
    jumlahTargetValid++;
  }

  if (jumlahTargetValid === 0) {
    return {
      skor: 17,
      maksimal: 33,
      persentase: 0,
      status: "Perlu Perhatian" as const,
      ringkasan:
        "Data target tabunganmu belum lengkap, sehingga belum dapat dihitung progresnya.",
    };
  }

  const rataRataRasio = totalRasioPencapaian / jumlahTargetValid;
  const persentase = Math.round(rataRataRasio * 100);

  let skor: number;
  let status: "Excellent" | "Good" | "Perlu Perhatian" | "Buruk";

  if (rataRataRasio >= 0.9) {
    skor = 33;
    status = "Excellent";
  } else if (rataRataRasio >= 0.7) {
    skor = 23 + Math.round((rataRataRasio - 0.7) * 45);
    status = "Good";
  } else if (rataRataRasio >= 0.5) {
    skor = 13 + Math.round((rataRataRasio - 0.5) * 45);
    status = "Perlu Perhatian";
  } else {
    skor = Math.max(0, Math.round(rataRataRasio * 26));
    status = "Buruk";
  }

  const catatanGagal = adaYangGagal
    ? " Ada target yang gagal tercapai, ini menurunkan skor keseluruhan."
    : "";

  const ringkasan =
    rataRataRasio >= 0.9
      ? `Progres menabungmu sangat baik, rata-rata sudah **${persentase}%** sesuai target waktu yang direncanakan.${catatanGagal}`
      : rataRataRasio >= 0.5
        ? `Progres tabunganmu saat ini sekitar **${persentase}%** dari yang diharapkan sesuai jadwal. Masih bisa dikejar.${catatanGagal}`
        : `Progres tabunganmu baru **${persentase}%** dari target yang seharusnya sudah tercapai sesuai jadwal. Perlu ditingkatkan.${catatanGagal}`;

  return { skor, maksimal: 33, persentase, status, ringkasan };
};

const tentukanGrade = (skorTotal: number): "A" | "B" | "C" | "D" | "E" => {
  if (skorTotal >= 85) return "A";
  if (skorTotal >= 70) return "B";
  if (skorTotal >= 55) return "C";
  if (skorTotal >= 40) return "D";
  return "E";
};

export const hitungDanSimpanFinancialHealth = async (userId: string) => {
  const disiplinAnggaran = await hitungDisiplinAnggaran(userId);
  const pengelolaanPinjaman = await hitungPengelolaanPinjaman(userId);
  const targetNabung = await hitungTargetNabung(userId);

  const skorTotal =
    disiplinAnggaran.skor + pengelolaanPinjaman.skor + targetNabung.skor;
  const grade = tentukanGrade(skorTotal);

  const financialHealth = await FinancialHealthModel.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      skorTotal,
      grade,
      disiplinAnggaran: { ...disiplinAnggaran, saranPerkembangan: [] },
      pengelolaanPinjaman: { ...pengelolaanPinjaman, saranPerkembangan: [] },
      targetNabung: { ...targetNabung, saranPerkembangan: [] },
    },
    { new: true, upsert: true, runValidators: true },
  );

  return financialHealth;
};

export const postFinancialHealth = async (req: IReqUser, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res
      .status(401)
      .json({ message: "Unauthorized: User tidak teridentifikasi" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const disiplinAnggaran = await hitungDisiplinAnggaran(userId.toString());
    const pengelolaanPinjaman = await hitungPengelolaanPinjaman(
      userId.toString(),
    );
    const targetNabung = await hitungTargetNabung(userId.toString());

    const skorTotal =
      disiplinAnggaran.skor + pengelolaanPinjaman.skor + targetNabung.skor;
    const grade = tentukanGrade(skorTotal);

    const aiResponse = (await askAIStream(
      JSON.stringify({
        skorTotal,
        grade,
        disiplinAnggaran,
        pengelolaanPinjaman,
        targetNabung,
      }),
      res,
    )) as unknown as IAIResult;

    const saranDisiplin = aiResponse?.disiplinAnggaran?.saranPerkembangan || [
      "Tetap catat setiap pengeluaran sekecil apa pun.",
      "Sisihkan uang tabungan di awal bulan, bukan di akhir.",
      "Kalau ada sisa budget, simpan ke tabungan daripada dihabiskan.",
    ];

    const saranPinjaman = aiResponse?.pengelolaanPinjaman
      ?.saranPerkembangan || [
      "Prioritaskan melunasi utang dengan bunga paling tinggi.",
      "Tunda ambil pinjaman baru kalau belum benar-benar perlu.",
      "Kalau ada uang lebih, coba bayar cicilan lebih awal.",
    ];

    const saranTabungan = aiResponse?.targetNabung?.saranPerkembangan || [
      "Buat target tabungan dengan nominal dan tenggat waktu yang realistis.",
      "Sisihkan tabungan secara otomatis begitu menerima pemasukan.",
      "Pantau progres target tabunganmu secara berkala supaya tetap on-track.",
    ];

    const financialHealth = await FinancialHealthModel.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        skorTotal,
        grade,
        disiplinAnggaran: {
          ...disiplinAnggaran,
          ringkasan:
            aiResponse?.disiplinAnggaran?.ringkasan ||
            disiplinAnggaran.ringkasan,
          saranPerkembangan: saranDisiplin,
        },
        pengelolaanPinjaman: {
          ...pengelolaanPinjaman,
          ringkasan:
            aiResponse?.pengelolaanPinjaman?.ringkasan ||
            pengelolaanPinjaman.ringkasan,
          saranPerkembangan: saranPinjaman,
        },
        targetNabung: {
          ...targetNabung,
          ringkasan:
            aiResponse?.targetNabung?.ringkasan || targetNabung.ringkasan,
          saranPerkembangan: saranTabungan,
        },
      },
      { new: true, upsert: true, runValidators: true },
    );

    res.write(
      `data: ${JSON.stringify({
        type: "done",
        message: "Berhasil menghitung detail Financial Health",
        data: financialHealth,
      })}\n\n`,
    );
  } catch (error: any) {
    console.error("❌ Error pada postFinancialHealth:", error.message);
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        message: "Gagal menghitung Financial Health",
        error: String(error.message || error),
      })}\n\n`,
    );
  } finally {
    res.end();
  }
};

export const getFinancialHealth = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    const latestData = await FinancialHealthModel.findOne({ user: userId })
      .select(
        "skorTotal grade disiplinAnggaran pengelolaanPinjaman targetNabung createdAt updatedAt",
      )
      .sort({ updatedAt: -1 });

    if (!latestData) {
      return res.status(200).json({
        message: "Belum ada data Financial Health",
        data: null,
      });
    }

    return res.status(200).json({
      message: "Berhasil mengambil data Financial Health terbaru",
      data: latestData,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal mengambil data Financial Health",
      error: String(error),
    });
  }
};


export const ambilKondisiKeuangan = async (userId: string) => {
  const sekarang = new Date();
  const tigaPuluhHariLalu = new Date();
  tigaPuluhHariLalu.setDate(tigaPuluhHariLalu.getDate() - 30);

  const [pemasukan, pinjamanAktif, budgetAktif, targetAktif, fh] = await Promise.all([
    TransaksiModel.find({ user: userId, tipe: "pemasukan", tanggal: { $gte: tigaPuluhHariLalu } }),
    PinjamanModel.find({ user: userId, statusPinjaman: { $ne: "Lunas" } }),
    BudgetingModel.find({ user: userId, Tanggal_Selesai: { $gte: sekarang } }),
    TargetTabungModel.find({ user: userId, status: "Aktif" }),
    FinancialHealthModel.findOne({ user: userId }).select(
      "skorTotal grade disiplinAnggaran.status pengelolaanPinjaman.status targetNabung.status",
    ),
  ]);

  const pemasukanBulanan = pemasukan.reduce((a, t) => a + (t.nominal ?? 0), 0);
  const cicilanAktif = pinjamanAktif.reduce((a, p) => a + (p.cicilanBulanan ?? 0), 0);
  const totalBudgetBulanan = budgetAktif.reduce((a, b) => a + (b.Batas_PerBulan ?? 0), 0);

  const tabunganBulanan = targetAktif.reduce((a, t) => {
    const sisaBulan = Math.max(
      1,
      Math.ceil((new Date(t.deadlineTarget).getTime() - sekarang.getTime()) / (1000 * 60 * 60 * 24 * 30)),
    );
    return a + Math.max(0, t.targetNominal - t.terkumpulNominal) / sisaBulan;
  }, 0);

  return {
    pemasukanBulanan,
    cicilanAktif,
    jumlahPinjamanAktif: pinjamanAktif.length,
    totalBudgetBulanan,
    tabunganBulanan: Math.round(tabunganBulanan),
    financialHealth: fh
      ? {
          skorTotal: fh.skorTotal,
          grade: fh.grade,
          statusAnggaran: fh.disiplinAnggaran?.status,
          statusPinjaman: fh.pengelolaanPinjaman?.status,
          statusTabungan: fh.targetNabung?.status,
        }
      : null,
  };
};