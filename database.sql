CREATE DATABASE IF NOT EXISTS tvri_kaltim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tvri_kaltim;

CREATE TABLE IF NOT EXISTS narasumber (
  id VARCHAR(64) PRIMARY KEY,
  nama VARCHAR(180) NOT NULL,
  bidang VARCHAR(120) NOT NULL,
  instansi VARCHAR(180) NOT NULL,
  jabatan VARCHAR(180) NULL,
  phone VARCHAR(40) NULL,
  last_appearance DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS riwayat_siaran (
  id VARCHAR(64) PRIMARY KEY,
  narasumber_id VARCHAR(64) NOT NULL,
  tanggal DATE NOT NULL,
  waktu VARCHAR(10) NULL,
  program VARCHAR(180) NOT NULL,
  jenis_siaran ENUM('live', 'rekaman') NOT NULL DEFAULT 'live',
  topik TEXT NULL,
  catatan TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT riwayat_narasumber_fk FOREIGN KEY (narasumber_id) REFERENCES narasumber(id) ON DELETE CASCADE,
  INDEX riwayat_narasumber_idx (narasumber_id),
  INDEX riwayat_tanggal_idx (tanggal),
  INDEX riwayat_program_idx (program)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS jadwal_siaran (
  id VARCHAR(64) PRIMARY KEY,
  narasumber_id VARCHAR(64) NOT NULL,
  tanggal DATE NOT NULL,
  waktu VARCHAR(10) NULL,
  program VARCHAR(180) NOT NULL,
  jenis_siaran ENUM('live', 'rekaman') NOT NULL DEFAULT 'live',
  topik TEXT NULL,
  catatan TEXT NULL,
  status ENUM('dijadwalkan', 'sudah-tampil', 'dibatalkan', 'ditunda') NOT NULL DEFAULT 'dijadwalkan',
  tanggal_baru DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT jadwal_narasumber_fk FOREIGN KEY (narasumber_id) REFERENCES narasumber(id) ON DELETE CASCADE,
  INDEX jadwal_tanggal_idx (tanggal),
  INDEX jadwal_status_idx (status)
) ENGINE=InnoDB;

ALTER TABLE riwayat_siaran ADD COLUMN IF NOT EXISTS jenis_siaran ENUM('live', 'rekaman') NOT NULL DEFAULT 'live' AFTER program;
ALTER TABLE jadwal_siaran ADD COLUMN IF NOT EXISTS jenis_siaran ENUM('live', 'rekaman') NOT NULL DEFAULT 'live' AFTER program;

CREATE TABLE IF NOT EXISTS log_aktivitas (
  id VARCHAR(64) PRIMARY KEY,
  waktu TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  aktor VARCHAR(180) NOT NULL,
  aksi VARCHAR(255) NOT NULL,
  detail TEXT NULL,
  INDEX log_waktu_idx (waktu)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'operator') NOT NULL DEFAULT 'operator',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX users_email_idx (email),
  INDEX users_role_idx (role)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(64) PRIMARY KEY,
  `key` VARCHAR(120) NOT NULL UNIQUE,
  `value` TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(64) NULL,
  INDEX settings_key_idx (`key`)
) ENGINE=InnoDB;

INSERT INTO settings (id, `key`, `value`, updated_by)
SELECT 'setting-waiting-period', 'waiting_period_value', '3', NULL
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE `key` = 'waiting_period_value');

INSERT INTO settings (id, `key`, `value`, updated_by)
SELECT 'setting-waiting-period-unit', 'waiting_period_unit', 'month', NULL
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE `key` = 'waiting_period_unit');
