import { Response } from "express";
import TargetTabungModel from "../models/targetTabung.model";
import TransaksiModel from "../models/transaksi.model";
import { IReqUser } from "../middlewares/auth.Middleware";

//Tambah Target Tabungan Baru
export const postTargetTabung = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    const { icon, namaTarget, targetNominal, deadlineTarget } = req.body || {};

    const nominalTarget = Number(targetNominal);
    const deadline = new Date(deadlineTarget);

    if (!icon) {
      return res.status(400).json({ message: "Icon target wajib dipilih" });
    }
    if (!namaTarget || !namaTarget.trim()) {
      return res.status(400).json({ message: "Nama Target wajib diisi" });
    }
    if (!nominalTarget || nominalTarget <= 0) {
      return res
        .status(400)
        .json({ message: "Target Nominal harus lebih dari 0" });
    }
    if (isNaN(deadline.getTime())) {
      return res.status(400).json({ message: "Deadline Target tidak valid" });
    }
    if (deadline <= new Date()) {
      return res
        .status(400)
        .json({ message: "Deadline Target harus di masa mendatang" });
    }

    const newTarget = await TargetTabungModel.create({
      user: userId,
      icon,
      namaTarget,
      targetNominal: nominalTarget,
      terkumpulNominal: 0,
      deadlineTarget: deadline,
      status: "Aktif",
    });

    return res.status(201).json({
      message: "Berhasil membuat target tabung baru",
      data: newTarget,
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({
        message: "Gagal membuat target tabung",
        error: String(error.message || error),
      });
  }
};

//Ambil Semua Target Tabung
export const getAllTargetTabung = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    const listTarget = await TargetTabungModel.find({ user: userId }).sort({
      createdAt: -1,
    });

    const today = new Date();

    const formattedData = listTarget.map((item) => {
      const persentase =
        item.targetNominal > 0
          ? Math.min(
              100,
              Math.round((item.terkumpulNominal / item.targetNominal) * 100),
            )
          : 0;

      const deadline = new Date(item.deadlineTarget);
      const selisihMs = deadline.getTime() - today.getTime();
      const sisaHari = Math.max(
        0,
        Math.ceil(selisihMs / (1000 * 60 * 60 * 24)),
      );

      return {
        _id: item._id,
        icon: item.icon,
        namaTarget: item.namaTarget,
        targetNominal: item.targetNominal,
        terkumpulNominal: item.terkumpulNominal,
        deadlineTarget: item.deadlineTarget,
        status: item.status,
        persentase,
        sisaHari,
      };
    });

    const totalMenabung = listTarget.reduce(
      (acc, item) => acc + (item.terkumpulNominal ?? 0),
      0,
    );
    const totalTarget = listTarget.reduce(
      (acc, item) => acc + (item.targetNominal ?? 0),
      0,
    );

    return res.status(200).json({
      message: "Berhasil mengambil data target tabung",
      summary: {
        totalMenabung,
        totalTarget,
      },
      totalItems: formattedData.length,
      data: formattedData,
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({
        message: "Gagal mengambil data target tabung",
        error: String(error.message || error),
      });
  }
};

//Setor Tabungan Update Saldo Tabungan + Otomatis Buat Transaksi Pengeluaran
export const setorTargetTabung = async (req: IReqUser, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { nominalSetor, Sumber_Dana } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    const setor = Number(nominalSetor);
    if (!setor || setor <= 0) {
      return res
        .status(400)
        .json({ message: "Nominal setor harus lebih dari 0" });
    }

    //Cari target tabung
    const target = await TargetTabungModel.findOne({ _id: id, user: userId });
    if (!target) {
      return res.status(404).json({ message: "Target tabung tidak ditemukan" });
    }

    if ( target.status === "Tercapai" || target.terkumpulNominal >= target.targetNominal) {
      return res.status(400).json({
        message: "Target tabung sudah tercapai, tidak bisa menambah setoran lagi",
      });
    }

    const sisa = target.targetNominal - target.terkumpulNominal;
    const setorFinal = Math.min(setor, sisa);
    target.terkumpulNominal += setorFinal;  
 
    if (target.terkumpulNominal >= target.targetNominal) {
      target.status = "Tercapai";
    }
    

    await target.save();
    
    return res.status(200).json({
      message: `Berhasil menyisihkan Rp${setorFinal.toLocaleString("id-ID")} ke ${target.namaTarget}`,
      data: target,
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({
        message: "Gagal memperbarui tabungan",
        error: String(error.message || error),
      });
  }
};

//Edit Informasi Target Tabung
export const editTargetTabung = async (req: IReqUser, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    const target = await TargetTabungModel.findOne({ _id: id, user: userId });
    if (!target) {
      return res.status(404).json({ message: "Target tabung tidak ditemukan" });
    }

    const {
      icon,
      namaTarget,
      targetNominal,
      deadlineTarget,
      terkumpulNominal,
      status,
    } = req.body;

    if (icon !== undefined) target.icon = icon;
    if (namaTarget !== undefined) target.namaTarget = namaTarget;
    if (targetNominal !== undefined)
      target.targetNominal = Number(targetNominal);
    if (deadlineTarget !== undefined)
      target.deadlineTarget = new Date(deadlineTarget);
    if (terkumpulNominal !== undefined)
      target.terkumpulNominal = Number(terkumpulNominal);
    if (status !== undefined) target.status = status;

    if (target.terkumpulNominal >= target.targetNominal) {
      target.status = "Tercapai";
    } else {
      target.status = "Aktif";
    }

    await target.save();

    return res.status(200).json({
      message: "Berhasil memperbarui data target tabung",
      data: target,
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({
        message: "Gagal mengupdate target tabung",
        error: String(error.message || error),
      });
  }
};

//Hapus Target Tabung
export const deleteTargetTabung = async (req: IReqUser, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const deletedData = await TargetTabungModel.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!deletedData) {
      return res
        .status(404)
        .json({
          message: "Target tabung tidak ditemukan atau bukan milik Anda",
        });
    }

    return res.status(200).json({
      message: "Berhasil menghapus target tabung",
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({
        message: "Gagal menghapus target tabung",
        error: String(error.message || error),
      });
  }
};

