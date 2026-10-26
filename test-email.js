const fs = require("fs");
const nodemailer = require("nodemailer");

const env = {};
for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2];
}

const [kUser, kPass] = process.argv.slice(2);

if (!kUser || !kPass) {
  console.log("Variabel yang mungkin terkait email di .env:\n");
  for (const [k, v] of Object.entries(env)) {
    if (!/mail|smtp|pass|user/i.test(k) || /mongo|jwt|secret/i.test(k)) continue;
    const tampil = v.includes("@") ? v : "(disembunyikan)";
    console.log(`  ${k}  panjang=${v.length}  nilai=${tampil}`);
    if (/\s/.test(v)) console.log("    ! ADA SPASI di dalam nilai");
    if (/^["']|["']$/.test(v)) console.log("    ! ADA TANDA KUTIP di nilai");
    if (/pass/i.test(k) && v.replace(/["'\s]/g, "").length !== 16)
      console.log("    ! App Password harus tepat 16 karakter (tanpa spasi/kutip)");
  }
  console.log("\nLalu jalankan: node test-email.js NAMA_VAR_EMAIL NAMA_VAR_PASSWORD");
  process.exit(0);
}

const user = (env[kUser] || "").replace(/^["']|["']$/g, "").trim();
const pass = (env[kPass] || "").replace(/^["']|["']$/g, "").replace(/\s/g, "");

console.log(`Mencoba login sebagai: ${user}  (panjang password: ${pass.length})`);

nodemailer
  .createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } })
  .verify()
  .then(() => console.log("\nBERHASIL: Gmail menerima email dan password ini."))
  .catch((e) => console.log("\nGAGAL:", e.message));
