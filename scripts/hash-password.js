#!/usr/bin/env node
/**
 * Bikin hash password admin untuk dipasang di .env.local (ADMIN_PASSWORD_HASH).
 *
 * Pemakaian:
 *   node scripts/hash-password.js "password-baru-kamu"
 *
 * Salin output-nya ke .env.local:
 *   ADMIN_PASSWORD_HASH=<hasil-output>
 *
 * Lalu restart server (npm run dev / npm run start) agar terbaca.
 */
const crypto = require("crypto");

const password = process.argv[2];
if (!password) {
  console.error("Pemakaian: node scripts/hash-password.js <password-baru>");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Sebaiknya password minimal 8 karakter.");
}

const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(password, salt, 64).toString("hex");
console.log(`${salt}:${hash}`);
