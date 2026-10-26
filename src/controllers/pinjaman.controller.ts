// import { Request, Response } from "express";
// import { Types } from "mongoose";
// import PinjamanModel from "../models/pinjaman.model";
// import TransaksiModel from "../models/transaksi.model";
// import { IReqUser } from "../middlewares/auth.Middleware";

// const BATAS_PINJAMAN_AKTIF = 3;
// const PESAN_PERINGATAN =
//   "Jumlah pinjaman aktif kamu melebihi 3 platform. Kondisi ini dapat berisiko terhadap kesehatan keuanganmu.";

// const buatPeringatan = (jumlahAktif: number) =>
//   jumlahAktif > BATAS_PINJAMAN_AKTIF ? PESAN_PERINGATAN : null;

// const HARI_MS = 24 * 60 * 60 * 1000;
// const hitungSisaHari = (jt: Date) =>
//   Math.ceil((new Date(jt).getTime() - Date.now()) / HARI_MS);
// const wajibPelunasan = (jt: Date) => hitungSisaHari(jt) <= 1; // H-1 dan lewat
// // const hitungCicilanMinimum = (total: number, tenor: number) =>
// //   tenor > 0 ? Math.ceil(total / tenor) : total;
// const hitungCicilanMinimum = (p: {
//   cicilanBulanan?: number;
//   totalYangHarusDibayar: number;
//   tenorCicilan: number;
// }) =>
//   p.cicilanBulanan && p.cicilanBulanan > 0
//     ? p.cicilanBulanan
//     : Math.ceil(p.totalYangHarusDibayar / (p.tenorCicilan || 1));

// //Tambah Data Pinjaman Baru 3
// export const postPinjaman = async (req: IReqUser, res: Response) => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) {
//       return res
//         .status(401)
//         .json({ message: "Unauthorized: User tidak teridentifikasi" });
//     }

//     const {
//       namaPlatform,
//       jenisPinjaman,
//       totalPinjaman,
//       tenorCicilan,
//       cicilanBulanan,
//       totalYangHarusDibayar,
//       jatuhTempo,
//       persenBunga,
//     } = req.body;

//     const angka = (v: unknown) =>
//       Number(
//         String(v ?? "")
//           .replace(/\./g, "")
//           .replace(/,/g, "."),
//       );

//     const nominalTotal = angka(totalPinjaman);
//     const tenor = angka(tenorCicilan);
//     const totalBayar = angka(totalYangHarusDibayar);
//     const sisaTagihanAwal = totalBayar > 0 ? totalBayar : nominalTotal;
//     const cicilanInput = angka(cicilanBulanan);
//     const cicilan =
//       cicilanInput > 0
//         ? cicilanInput
//         : Math.ceil(sisaTagihanAwal / (tenor || 1));
//     // const nominalTotal = Number(totalPinjaman);
//     // const tenor = Number(tenorCicilan);
//     // const cicilan = Number(cicilanBulanan);
//     // const sisaTagihanAwal =
//     //   totalYangHarusDibayar !== undefined
//     //     ? Number(totalYangHarusDibayar)
//     //     : nominalTotal;

//     if (!nominalTotal || nominalTotal <= 0) {
//       return res
//         .status(400)
//         .json({ message: "Total Pinjaman harus lebih dari 0" });
//     }
//     if (!tenor || tenor <= 0) {
//       return res
//         .status(400)
//         .json({ message: "Tenor Cicilan harus lebih dari 0 bulan" });
//     }
//     const tglTempo = jatuhTempo ? new Date(jatuhTempo) : new Date();
//     if (isNaN(tglTempo.getTime())) {
//       return res
//         .status(400)
//         .json({ message: "Format Jatuh Tempo tidak valid" });
//     }

//     const newPinjaman = await PinjamanModel.create({
//       user: userId,
//       namaPlatform,
//       jenisPinjaman,
//       totalPinjaman: nominalTotal,
//       tenorCicilan: tenor,
//       cicilanBulanan: cicilan,
//       totalYangHarusDibayar: sisaTagihanAwal,
//       jatuhTempo: jatuhTempo ? new Date(jatuhTempo) : new Date(),
//       persenBunga: Number(persenBunga) || 0,
//       statusPinjaman: "Aktif",
//     });

//     const jumlahAktif = await PinjamanModel.countDocuments({
//       user: userId,
//       statusPinjaman: { $ne: "Lunas" },
//     });

//     return res.status(201).json({
//       message: "Berhasil menambahkan data pinjaman",
//       data: newPinjaman,
//       jumlahAktif,
//       peringatan: buatPeringatan(jumlahAktif),
//     });
//   } catch (error) {
//     return res
//       .status(400)
//       .json({ message: "Gagal membuat data pinjaman", error: String(error) });
//   }
// };

// //Hitung Data Pinjaman
// export const hitungDataPinjaman = async (userId: string) => {
//   const listPinjaman = await PinjamanModel.find({ user: userId }).sort({
//     createdAt: -1,
//   });

//   const formattedData = listPinjaman.map((item) => {
//     const progress =
//       item.totalPinjaman > 0
//         ? ((item.totalPinjaman - item.totalYangHarusDibayar) /
//             item.totalPinjaman) *
//           100
//         : 0;
//     const sisaHari = hitungSisaHari(item.jatuhTempo);

//     return {
//       _id: item._id,
//       namaPlatform: item.namaPlatform,
//       jenisPinjaman: item.jenisPinjaman,
//       totalPinjaman: item.totalPinjaman,
//       tenorCicilan: item.tenorCicilan,
//       cicilanBulanan: item.cicilanBulanan,
//       totalYangHarusDibayar: item.totalYangHarusDibayar,
//       jatuhTempo: item.jatuhTempo,
//       persenBunga: item.persenBunga,
//       statusPinjaman: item.statusPinjaman,
//       progress: Number(Math.max(0, Math.min(100, progress)).toFixed(1)),
//       cicilanMinimum: const hitungCicilanMinimum(pinjaman);
//       sisaHari,
//       mode:
//         item.statusPinjaman === "Lunas"
//           ? "lunas"
//           : wajibPelunasan(item.jatuhTempo)
//             ? "pelunasan"
//             : "cicilan",
//     };
//   });

//   // Total Sisa Tagihan (Belum Dibayar)
//   const belumDibayar = listPinjaman.reduce((acc, item) => {
//     return acc + (item.totalYangHarusDibayar ?? 0);
//   }, 0);

//   // Total yang sudah terbayar
//   const sudahDibayar = listPinjaman.reduce((acc, item) => {
//     const terbayarPerItem =
//       (item.totalPinjaman ?? 0) - (item.totalYangHarusDibayar ?? 0);
//     return acc + Math.max(0, terbayarPerItem);
//   }, 0);

//   //Kewajiban perbulan untuk pinjaman yang belum lunas
//   const kewajibanPerbulan = listPinjaman.reduce((acc, item) => {
//     if (item.totalYangHarusDibayar > 0 && item.statusPinjaman !== "Lunas") {
//       return acc + (item.cicilanBulanan ?? 0);
//     }
//     return acc;
//   }, 0);

//   const jumlahAktif = listPinjaman.filter(
//     (p) => p.statusPinjaman !== "Lunas",
//   ).length;
//   return {
//     summary: { belumDibayar, sudahDibayar, kewajibanPerbulan },
//     totalPinjaman: formattedData.length,
//     jumlahAktif,
//     peringatan: buatPeringatan(jumlahAktif),
//     data: formattedData,
//   };
// };

// //Ambil Semua Data
// export const getAllPinjaman = async (req: IReqUser, res: Response) => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) {
//       return res
//         .status(401)
//         .json({ message: "Unauthorized: User tidak teridentifikasi" });
//     }

//     const result = await hitungDataPinjaman(userId.toString());

//     return res.status(200).json({
//       message: "Berhasil mengambil data pinjaman",
//       ...result,
//     });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Gagal mengambil data pinjaman", error: String(error) });
//   }
// };

// //Aksi Bayar Cicilan Kurangi Tagihan + Otomatis Catat Transaksi Pengeluaran
// export const putPinjaman = async (req: IReqUser, res: Response) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user?.id;
//     const { nominalBayar, Sumber_Dana } = req.body;

//     if (!userId) {
//       return res
//         .status(401)
//         .json({ message: "Unauthorized: User tidak teridentifikasi" });
//     }

//     const pinjaman = await PinjamanModel.findOne({ _id: id, user: userId });
//     if (!pinjaman) {
//       return res.status(404).json({ message: "Pinjaman tidak ditemukan" });
//     }

//     if (pinjaman.statusPinjaman === "Lunas") {
//       return res
//         .status(400)
//         .json({ message: "Pinjaman ini sudah lunas, tidak bisa dibayar lagi" });
//     }

//     //H-1 jatuh tempo (dan lewat): cicilan dikunci, hanya pelunasan / perpanjang
//     if (wajibPelunasan(pinjaman.jatuhTempo)) {
//       return res.status(400).json({
//         message:
//           "Sudah H-1 jatuh tempo. Pilih Pelunasan atau Perpanjang tempo.",
//       });
//     }

//     //Cicilan minimum = totalPinjaman / tenor
//     const minimum = hitungCicilanMinimum(
//       pinjaman.totalPinjaman,
//       pinjaman.tenorCicilan,
//     );
//     const sisa = pinjaman.totalYangHarusDibayar;
//     const bayarInput =
//       Number(nominalBayar) > 0 ? Number(nominalBayar) : minimum;

//     if (bayarInput < Math.min(minimum, sisa)) {
//       return res.status(400).json({
//         message: `Cicilan minimal Rp${minimum.toLocaleString("id-ID")}`,
//       });
//     }

//     const bayar = Math.min(bayarInput, sisa);
//     const sisaTagihanBaru = sisa - bayar;

//     //Update jatuh tempo ke bulan berikutnya jika sisa tagihan masih ada
//     const tglSekarang = new Date(pinjaman.jatuhTempo);
//     const jatuhTempoBaru = new Date(
//       tglSekarang.setMonth(tglSekarang.getMonth() + 1),
//     );

//     pinjaman.totalYangHarusDibayar = sisaTagihanBaru;
//     pinjaman.jatuhTempo = jatuhTempoBaru;

//     if (sisaTagihanBaru === 0) {
//       pinjaman.statusPinjaman = "Lunas";
//     }

//     await pinjaman.save();

//     await TransaksiModel.create({
//       user: userId,
//       Catatan_Transaksi: `Bayar Cicilan: ${pinjaman.namaPlatform}`,
//       tipe: "pengeluaran",
//       kategori: "Tagihan",
//       Sumber_Dana: Sumber_Dana || "Tunai",
//       nominal: bayar,
//       tanggal: new Date(),
//     });

//     return res.status(200).json({
//       message: `Berhasil membayar cicilan ${pinjaman.namaPlatform} sebesar Rp${bayar.toLocaleString("id-ID")}`,
//       data: pinjaman,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Gagal memproses pembayaran cicilan",
//       error: String(error),
//     });
//   }
// };

// //Edit Data Informasi Pinjaman
// export const editPinjaman = async (req: IReqUser, res: Response) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user?.id;

//     if (!userId) {
//       return res
//         .status(401)
//         .json({ message: "Unauthorized: User tidak teridentifikasi" });
//     }

//     const pinjaman = await PinjamanModel.findOne({ _id: id, user: userId });
//     if (!pinjaman) {
//       return res.status(404).json({ message: "Pinjaman tidak ditemukan" });
//     }

//     const {
//       namaPlatform,
//       jenisPinjaman,
//       totalPinjaman,
//       tenorCicilan,
//       cicilanBulanan,
//       totalYangHarusDibayar,
//       jatuhTempo,
//       persenBunga,
//       statusPinjaman,
//     } = req.body;

//     if (namaPlatform !== undefined) pinjaman.namaPlatform = namaPlatform;
//     if (jenisPinjaman !== undefined) pinjaman.jenisPinjaman = jenisPinjaman;
//     if (totalPinjaman !== undefined)
//       pinjaman.totalPinjaman = Number(totalPinjaman);
//     if (tenorCicilan !== undefined)
//       pinjaman.tenorCicilan = Number(tenorCicilan);
//     if (cicilanBulanan !== undefined)
//       pinjaman.cicilanBulanan = Number(cicilanBulanan);
//     if (totalYangHarusDibayar !== undefined)
//       pinjaman.totalYangHarusDibayar = Number(totalYangHarusDibayar);
//     if (jatuhTempo !== undefined) pinjaman.jatuhTempo = new Date(jatuhTempo);
//     if (persenBunga !== undefined) pinjaman.persenBunga = Number(persenBunga);
//     // if (statusPinjaman !== undefined) pinjaman.statusPinjaman = statusPinjaman;

//     //Jika sisa tagihan diubah jadi 0, set Lunas
//     if (pinjaman.totalYangHarusDibayar === 0) {
//       pinjaman.statusPinjaman = "Lunas";
//     }

//     await pinjaman.save();

//     return res.status(200).json({
//       message: "Berhasil memperbarui data pinjaman",
//       data: pinjaman,
//     });
//   } catch (error) {
//     return res
//       .status(400)
//       .json({ message: "Gagal update data pinjaman", error: String(error) });
//   }
// };

// //Hapus Pinjaman
// export const deletePinjaman = async (req: IReqUser, res: Response) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user?.id;

//     const deletedData = await PinjamanModel.findOneAndDelete({
//       _id: id,
//       user: userId,
//     });

//     if (!deletedData) {
//       return res.status(404).json({
//         message: "Data pinjaman tidak ditemukan atau bukan milik Anda",
//       });
//     }

//     return res.status(200).json({
//       message: "Berhasil menghapus data pinjaman",
//     });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Gagal menghapus data pinjaman", error: String(error) });
//   }
// };

// //Pelunasan: bayar seluruh sisa tagihan
// export const lunasiPinjaman = async (req: IReqUser, res: Response) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user?.id;
//     const { Sumber_Dana } = req.body;
//     if (!userId) return res.status(401).json({ message: "Unauthorized" });

//     const pinjaman = await PinjamanModel.findOne({ _id: id, user: userId });
//     if (!pinjaman)
//       return res.status(404).json({ message: "Pinjaman tidak ditemukan" });
//     if (pinjaman.statusPinjaman === "Lunas")
//       return res.status(400).json({ message: "Pinjaman ini sudah lunas" });

//     const bayar = pinjaman.totalYangHarusDibayar;
//     pinjaman.totalYangHarusDibayar = 0;
//     pinjaman.statusPinjaman = "Lunas";
//     await pinjaman.save();

//     await TransaksiModel.create({
//       user: userId,
//       Catatan_Transaksi: `Pelunasan: ${pinjaman.namaPlatform}`,
//       tipe: "pengeluaran",
//       kategori: "Tagihan",
//       Sumber_Dana: Sumber_Dana || "Tunai",
//       nominal: bayar,
//       tanggal: new Date(),
//     });

//     return res.status(200).json({
//       message: `Berhasil melunasi ${pinjaman.namaPlatform} sebesar Rp${bayar.toLocaleString("id-ID")}`,
//       data: pinjaman,
//     });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Gagal melunasi pinjaman", error: String(error) });
//   }
// };

// //Perpanjang tempo
// export const perpanjangTempo = async (req: IReqUser, res: Response) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user?.id;
//     const { jatuhTempoBaru } = req.body;
//     if (!userId) return res.status(401).json({ message: "Unauthorized" });

//     const pinjaman = await PinjamanModel.findOne({ _id: id, user: userId });
//     if (!pinjaman)
//       return res.status(404).json({ message: "Pinjaman tidak ditemukan" });
//     if (pinjaman.statusPinjaman === "Lunas")
//       return res.status(400).json({ message: "Pinjaman ini sudah lunas" });

//     const tanggalBaru = new Date(jatuhTempoBaru);
//     if (
//       isNaN(tanggalBaru.getTime()) ||
//       tanggalBaru <= new Date(pinjaman.jatuhTempo)
//     ) {
//       return res.status(400).json({
//         message: "Tanggal baru harus lebih lambat dari jatuh tempo saat ini",
//       });
//     }

//     pinjaman.jatuhTempo = tanggalBaru;
//     await pinjaman.save();

//     return res
//       .status(200)
//       .json({ message: "Jatuh tempo berhasil diperpanjang", data: pinjaman });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Gagal memperpanjang tempo", error: String(error) });
//   }
// };

import { Request, Response } from "express";
import { Types } from "mongoose";
import PinjamanModel from "../models/pinjaman.model";
import TransaksiModel from "../models/transaksi.model";
import { IReqUser } from "../middlewares/auth.Middleware";

const BATAS_PINJAMAN_AKTIF = 3;
const PESAN_PERINGATAN =
  "Jumlah pinjaman aktif kamu melebihi 3 platform. Kondisi ini dapat berisiko terhadap kesehatan keuanganmu.";

const buatPeringatan = (jumlahAktif: number) =>
  jumlahAktif > BATAS_PINJAMAN_AKTIF ? PESAN_PERINGATAN : null;

const HARI_MS = 24 * 60 * 60 * 1000;
const hitungSisaHari = (jt: Date) =>
  Math.ceil((new Date(jt).getTime() - Date.now()) / HARI_MS);
const wajibPelunasan = (jt: Date) => hitungSisaHari(jt) <= 1; // H-1 dan lewat

// [REVISI] Minimum cicilan sekarang mengikuti angka cicilanBulanan yang
// diinput user. Rumus lama (sisa tagihan / tenor) hanya dipakai sebagai
// cadangan kalau cicilanBulanan kosong atau 0.
const hitungCicilanMinimum = (p: {
  cicilanBulanan?: number;
  totalYangHarusDibayar: number;
  tenorCicilan: number;
}) =>
  p.cicilanBulanan && p.cicilanBulanan > 0
    ? p.cicilanBulanan
    : Math.ceil(p.totalYangHarusDibayar / (p.tenorCicilan || 1));

//Tambah Data Pinjaman Baru
export const postPinjaman = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    const {
      namaPlatform,
      jenisPinjaman,
      totalPinjaman,
      tenorCicilan,
      cicilanBulanan,
      totalYangHarusDibayar,
      jatuhTempo,
      persenBunga,
    } = req.body;

    const angka = (v: unknown) =>
      Number(
        String(v ?? "")
          .replace(/\./g, "")
          .replace(/,/g, "."),
      );

    const nominalTotal = angka(totalPinjaman);
    const tenor = angka(tenorCicilan);
    const totalBayar = angka(totalYangHarusDibayar);
    const sisaTagihanAwal = totalBayar > 0 ? totalBayar : nominalTotal;
    const cicilanInput = angka(cicilanBulanan);
    const cicilan =
      cicilanInput > 0
        ? cicilanInput
        : Math.ceil(sisaTagihanAwal / (tenor || 1));

    if (!nominalTotal || nominalTotal <= 0) {
      return res
        .status(400)
        .json({ message: "Total Pinjaman harus lebih dari 0" });
    }
    if (!tenor || tenor <= 0) {
      return res
        .status(400)
        .json({ message: "Tenor Cicilan harus lebih dari 0 bulan" });
    }

    // Validasi supaya input user tidak ngawur
    if (totalBayar > 0 && totalBayar < nominalTotal) {
      return res.status(400).json({
        message:
          "Total yang harus dibayar tidak boleh lebih kecil dari Total Pinjaman",
      });
    }

    if (cicilan > sisaTagihanAwal) {
      return res.status(400).json({
        message:
          "Cicilan per bulan tidak boleh lebih besar dari total yang harus dibayar",
      });
    }

    const tglTempo = jatuhTempo ? new Date(jatuhTempo) : new Date();
    if (isNaN(tglTempo.getTime())) {
      return res
        .status(400)
        .json({ message: "Format Jatuh Tempo tidak valid" });
    }

    const newPinjaman = await PinjamanModel.create({
      user: userId,
      namaPlatform,
      jenisPinjaman,
      totalPinjaman: nominalTotal,
      tenorCicilan: tenor,
      cicilanBulanan: cicilan,
      totalYangHarusDibayar: sisaTagihanAwal,
      jatuhTempo: tglTempo,
      persenBunga: Number(persenBunga) || 0,
      statusPinjaman: "Aktif",
    });

    const jumlahAktif = await PinjamanModel.countDocuments({
      user: userId,
      statusPinjaman: { $ne: "Lunas" },
    });

    return res.status(201).json({
      message: "Berhasil menambahkan data pinjaman",
      data: newPinjaman,
      jumlahAktif,
      peringatan: buatPeringatan(jumlahAktif),
    });
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Gagal membuat data pinjaman", error: String(error) });
  }
};

//Hitung Data Pinjaman
export const hitungDataPinjaman = async (userId: string) => {
  const listPinjaman = await PinjamanModel.find({ user: userId }).sort({
    createdAt: -1,
  });

  const formattedData = listPinjaman.map((item) => {
    const progress =
      item.totalPinjaman > 0
        ? ((item.totalPinjaman - item.totalYangHarusDibayar) /
            item.totalPinjaman) *
          100
        : 0;
    const sisaHari = hitungSisaHari(item.jatuhTempo);

    return {
      _id: item._id,
      namaPlatform: item.namaPlatform,
      jenisPinjaman: item.jenisPinjaman,
      totalPinjaman: item.totalPinjaman,
      tenorCicilan: item.tenorCicilan,
      cicilanBulanan: item.cicilanBulanan,
      totalYangHarusDibayar: item.totalYangHarusDibayar,
      jatuhTempo: item.jatuhTempo,
      persenBunga: item.persenBunga,
      statusPinjaman: item.statusPinjaman,
      progress: Number(Math.max(0, Math.min(100, progress)).toFixed(1)),
      // [REVISI] Pakai fungsi yang sama dengan putPinjaman
      cicilanMinimum: hitungCicilanMinimum(item),
      sisaHari,
      mode:
        item.statusPinjaman === "Lunas"
          ? "lunas"
          : wajibPelunasan(item.jatuhTempo)
            ? "pelunasan"
            : "cicilan",
    };
  });

  // Total Sisa Tagihan (Belum Dibayar)
  const belumDibayar = listPinjaman.reduce((acc, item) => {
    return acc + (item.totalYangHarusDibayar ?? 0);
  }, 0);

  // Total yang sudah terbayar
  const sudahDibayar = listPinjaman.reduce((acc, item) => {
    const terbayarPerItem =
      (item.totalPinjaman ?? 0) - (item.totalYangHarusDibayar ?? 0);
    return acc + Math.max(0, terbayarPerItem);
  }, 0);

  //Kewajiban perbulan untuk pinjaman yang belum lunas
  const kewajibanPerbulan = listPinjaman.reduce((acc, item) => {
    if (item.totalYangHarusDibayar > 0 && item.statusPinjaman !== "Lunas") {
      return acc + (item.cicilanBulanan ?? 0);
    }
    return acc;
  }, 0);

  const jumlahAktif = listPinjaman.filter(
    (p) => p.statusPinjaman !== "Lunas",
  ).length;
  return {
    summary: { belumDibayar, sudahDibayar, kewajibanPerbulan },
    totalPinjaman: formattedData.length,
    jumlahAktif,
    peringatan: buatPeringatan(jumlahAktif),
    data: formattedData,
  };
};

//Ambil Semua Data
export const getAllPinjaman = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    const result = await hitungDataPinjaman(userId.toString());

    return res.status(200).json({
      message: "Berhasil mengambil data pinjaman",
      ...result,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Gagal mengambil data pinjaman", error: String(error) });
  }
};

//Aksi Bayar Cicilan Kurangi Tagihan + Otomatis Catat Transaksi Pengeluaran
export const putPinjaman = async (req: IReqUser, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { nominalBayar, Sumber_Dana } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    const pinjaman = await PinjamanModel.findOne({ _id: id, user: userId });
    if (!pinjaman) {
      return res.status(404).json({ message: "Pinjaman tidak ditemukan" });
    }

    if (pinjaman.statusPinjaman === "Lunas") {
      return res
        .status(400)
        .json({ message: "Pinjaman ini sudah lunas, tidak bisa dibayar lagi" });
    }

    //H-1 jatuh tempo (dan lewat): cicilan dikunci, hanya pelunasan / perpanjang
    if (wajibPelunasan(pinjaman.jatuhTempo)) {
      return res.status(400).json({
        message:
          "Sudah H-1 jatuh tempo. Pilih Pelunasan atau Perpanjang tempo.",
      });
    }

    // [REVISI] Minimum mengikuti cicilanBulanan yang diinput user
    const minimum = hitungCicilanMinimum(pinjaman);
    const sisa = pinjaman.totalYangHarusDibayar;
    const bayarInput =
      Number(nominalBayar) > 0 ? Number(nominalBayar) : minimum;

    if (bayarInput < Math.min(minimum, sisa)) {
      return res.status(400).json({
        message: `Cicilan minimal Rp${minimum.toLocaleString("id-ID")}`,
      });
    }

    const bayar = Math.min(bayarInput, sisa);
    const sisaTagihanBaru = sisa - bayar;

    //Update jatuh tempo ke bulan berikutnya jika sisa tagihan masih ada
    const tglSekarang = new Date(pinjaman.jatuhTempo);
    const jatuhTempoBaru = new Date(
      tglSekarang.setMonth(tglSekarang.getMonth() + 1),
    );

    pinjaman.totalYangHarusDibayar = sisaTagihanBaru;
    pinjaman.jatuhTempo = jatuhTempoBaru;

    if (sisaTagihanBaru === 0) {
      pinjaman.statusPinjaman = "Lunas";
    }

    await pinjaman.save();

    await TransaksiModel.create({
      user: userId,
      Catatan_Transaksi: `Bayar Cicilan: ${pinjaman.namaPlatform}`,
      tipe: "pengeluaran",
      kategori: "Tagihan",
      Sumber_Dana: Sumber_Dana || "Tunai",
      nominal: bayar,
      tanggal: new Date(),
    });

    return res.status(200).json({
      message: `Berhasil membayar cicilan ${pinjaman.namaPlatform} sebesar Rp${bayar.toLocaleString("id-ID")}`,
      data: pinjaman,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal memproses pembayaran cicilan",
      error: String(error),
    });
  }
};

//Edit Data Informasi Pinjaman
export const editPinjaman = async (req: IReqUser, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    const pinjaman = await PinjamanModel.findOne({ _id: id, user: userId });
    if (!pinjaman) {
      return res.status(404).json({ message: "Pinjaman tidak ditemukan" });
    }

    const {
      namaPlatform,
      jenisPinjaman,
      totalPinjaman,
      tenorCicilan,
      cicilanBulanan,
      totalYangHarusDibayar,
      jatuhTempo,
      persenBunga,
    } = req.body;

    if (namaPlatform !== undefined) pinjaman.namaPlatform = namaPlatform;
    if (jenisPinjaman !== undefined) pinjaman.jenisPinjaman = jenisPinjaman;
    if (totalPinjaman !== undefined)
      pinjaman.totalPinjaman = Number(totalPinjaman);
    if (tenorCicilan !== undefined)
      pinjaman.tenorCicilan = Number(tenorCicilan);
    if (cicilanBulanan !== undefined)
      pinjaman.cicilanBulanan = Number(cicilanBulanan);
    if (totalYangHarusDibayar !== undefined)
      pinjaman.totalYangHarusDibayar = Number(totalYangHarusDibayar);
    if (jatuhTempo !== undefined) pinjaman.jatuhTempo = new Date(jatuhTempo);
    if (persenBunga !== undefined) pinjaman.persenBunga = Number(persenBunga);

    // [REVISI] Cicilan tidak boleh melebihi sisa tagihan
    if (
      pinjaman.totalYangHarusDibayar > 0 &&
      pinjaman.cicilanBulanan > pinjaman.totalYangHarusDibayar
    ) {
      return res.status(400).json({
        message:
          "Cicilan per bulan tidak boleh lebih besar dari total yang harus dibayar",
      });
    }

    //Jika sisa tagihan diubah jadi 0, set Lunas
    if (pinjaman.totalYangHarusDibayar === 0) {
      pinjaman.statusPinjaman = "Lunas";
    }

    await pinjaman.save();

    return res.status(200).json({
      message: "Berhasil memperbarui data pinjaman",
      data: pinjaman,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Gagal update data pinjaman", error: String(error) });
  }
};

//Hapus Pinjaman
export const deletePinjaman = async (req: IReqUser, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const deletedData = await PinjamanModel.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!deletedData) {
      return res.status(404).json({
        message: "Data pinjaman tidak ditemukan atau bukan milik Anda",
      });
    }

    return res.status(200).json({
      message: "Berhasil menghapus data pinjaman",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Gagal menghapus data pinjaman", error: String(error) });
  }
};

//Pelunasan: bayar seluruh sisa tagihan
export const lunasiPinjaman = async (req: IReqUser, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { Sumber_Dana } = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const pinjaman = await PinjamanModel.findOne({ _id: id, user: userId });
    if (!pinjaman)
      return res.status(404).json({ message: "Pinjaman tidak ditemukan" });
    if (pinjaman.statusPinjaman === "Lunas")
      return res.status(400).json({ message: "Pinjaman ini sudah lunas" });

    const bayar = pinjaman.totalYangHarusDibayar;
    pinjaman.totalYangHarusDibayar = 0;
    pinjaman.statusPinjaman = "Lunas";
    await pinjaman.save();

    await TransaksiModel.create({
      user: userId,
      Catatan_Transaksi: `Pelunasan: ${pinjaman.namaPlatform}`,
      tipe: "pengeluaran",
      kategori: "Tagihan",
      Sumber_Dana: Sumber_Dana || "Tunai",
      nominal: bayar,
      tanggal: new Date(),
    });

    return res.status(200).json({
      message: `Berhasil melunasi ${pinjaman.namaPlatform} sebesar Rp${bayar.toLocaleString("id-ID")}`,
      data: pinjaman,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Gagal melunasi pinjaman", error: String(error) });
  }
};

//Perpanjang tempo
export const perpanjangTempo = async (req: IReqUser, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { jatuhTempoBaru } = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const pinjaman = await PinjamanModel.findOne({ _id: id, user: userId });
    if (!pinjaman)
      return res.status(404).json({ message: "Pinjaman tidak ditemukan" });
    if (pinjaman.statusPinjaman === "Lunas")
      return res.status(400).json({ message: "Pinjaman ini sudah lunas" });

    const tanggalBaru = new Date(jatuhTempoBaru);
    if (
      isNaN(tanggalBaru.getTime()) ||
      tanggalBaru <= new Date(pinjaman.jatuhTempo)
    ) {
      return res.status(400).json({
        message: "Tanggal baru harus lebih lambat dari jatuh tempo saat ini",
      });
    }

    pinjaman.jatuhTempo = tanggalBaru;
    await pinjaman.save();

    return res
      .status(200)
      .json({ message: "Jatuh tempo berhasil diperpanjang", data: pinjaman });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Gagal memperpanjang tempo", error: String(error) });
  }
};