import { Request, Response } from "express";
import ProfileModel from "../models/profile.model";
import { IReqUser } from "../middlewares/auth.Middleware";
import UserModel  from "../models/user.model";


export const postProfile = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id;
    console.log("User dari Token:", req.user);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    const { fotoProfilUrl, saldoSekarang, sumberPemasukan, onboardingCompleted } = req.body;

    const updateData: Record<string, any> = {};
    if (fotoProfilUrl !== undefined) updateData.fotoProfilUrl = fotoProfilUrl;
    if (saldoSekarang !== undefined) updateData.saldoSekarang = Number(saldoSekarang);
    if (sumberPemasukan !== undefined) updateData.sumberPemasukan = sumberPemasukan;
    if (onboardingCompleted !== undefined) updateData.onboardingCompleted = onboardingCompleted;

    const profile = await ProfileModel.findOneAndUpdate(
      { user: userId }, 
      { $set: updateData }, 
      { new: true, upsert: true, runValidators: true } 
    );

    return res.status(200).json({ message: "Profile berhasil disimpan", data: profile });
  } catch (error) {
    return res.status(400).json({ message: "Gagal membuat Profile", error: String(error) });
  }
};

//menerima data profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const profile = await ProfileModel.findOne({ user: userId }).populate(
      "user",
      "fullName username email"
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile belum dibuat" });
    }

    res.status(200).json({
      fullName: (profile.user as any).fullName,
      username: (profile.user as any).username,
      email: (profile.user as any).email,
      fotoProfilUrl: profile.fotoProfilUrl,
      saldoSekarang: profile.saldoSekarang,
      sumberPemasukan: profile.sumberPemasukan,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Gagal mengambil profile", error: error.message });
  }
};

//update data profile
export const updateProfile = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    //Ambil hanya field yang diizinkan untuk diubah
    const { username, fullName, fotoProfilUrl, sumberPemasukan } = req.body;

    if (username || fullName) {
      await UserModel.findByIdAndUpdate(
        userId,
        {
          ...(username && { username }),
          ...(fullName && { fullName }),
        },
        { runValidators: true }
      );
    }

    const updateDataProfile: Record<string, any> = {};
    if (fotoProfilUrl !== undefined) updateDataProfile.fotoProfilUrl = fotoProfilUrl;
    if (sumberPemasukan !== undefined) updateDataProfile.sumberPemasukan = sumberPemasukan;

    const profile = await ProfileModel.findOneAndUpdate(
      { user: userId },
      updateDataProfile,
      { new: true, runValidators: true }
    ).populate("user", "fullName username email");

    if (!profile) {
      return res.status(404).json({ message: "Profile tidak ditemukan atau Anda tidak memiliki akses" });
    }

    return res.status(200).json({ message: "Profile berhasil diupdate", data: profile });
  } catch (error) {
    return res.status(400).json({ message: "Gagal update profile", error: String(error) });
  }
};
