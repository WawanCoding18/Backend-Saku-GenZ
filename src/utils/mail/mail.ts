import nodemailer from "nodemailer";
import { EMAIL_FROM, EMAIL_APP_PASSWORD } from "../env";

//Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_FROM,
    pass: EMAIL_APP_PASSWORD,
  },
});

//Generate OTP 6 digit
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

//Kirim OTP via Gmail
export const sendOTPEmail = async (
  toEmail: string,
  fullName: string,
  otpCode: string
): Promise<void> => {
  await transporter.sendMail({
    from: `"Saku Gen Z App" <${EMAIL_FROM}>`,
    to: toEmail,
    subject: "Kode OTP Verifikasi Akun Kamu",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
        <h2 style="color: #333;">Verifikasi Akun Kamu</h2>
        <p>Halo <strong>${fullName}</strong>,</p>
        <p>Masukkan kode OTP berikut untuk mengaktifkan akun:</p>
        <div style="
          background: #f4f4f4;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
        ">
          <h1 style="
            letter-spacing: 8px;
            color: #4F46E5;
            font-size: 36px;
            margin: 0;
          ">
            ${otpCode}
          </h1>
        </div>
        <p style="color: #666; font-size: 14px;">
          ⏰ Kode berlaku selama <strong>5 menit</strong>.
        </p>
        <p style="color: #666; font-size: 14px;">
          Abaikan email ini jika kamu tidak mendaftar.
        </p>
      </div>
    `,
  });
};