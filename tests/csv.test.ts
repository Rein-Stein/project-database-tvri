import { describe, expect, it } from "vitest";
import { buildCsv, csvText } from "@/lib/utils";

describe("ekspor CSV untuk Excel", () => {
  it("diawali BOM UTF-8, memakai titik koma dan baris CRLF", () => {
    const csv = buildCsv(["Nama", "Program"], [["Gia", "Dialog Pagi"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toBe('\uFEFF"Nama";"Program"\r\n"Gia";"Dialog Pagi"\r\n');
  });

  it("koma dan titik koma di dalam isi sel tidak memecah kolom", () => {
    const csv = buildCsv(["Instansi"], [["Dinas A; Kaltim, Samarinda"]]);
    expect(csv).toContain('"Dinas A; Kaltim, Samarinda"');
  });

  it("menggandakan tanda kutip dan mempertahankan baris baru di dalam sel", () => {
    const csv = buildCsv(["Topik"], [['Soal "jeda"\nbaris dua']]);
    expect(csv).toContain('"Soal ""jeda""\nbaris dua"');
  });

  it("nomor telepon ditulis sebagai teks agar angka 0 di depan tidak hilang", () => {
    expect(buildCsv(["Kontak"], [[csvText("081234567890")]])).toContain('"=""081234567890"""');
    expect(buildCsv(["Kontak"], [[csvText("")]])).toContain('\r\n""\r\n');
  });

  it("angka dan nilai kosong ditulis apa adanya", () => {
    expect(buildCsv(["A", "B", "C"], [[12, null, undefined]])).toContain('"12";"";""');
  });

  it("teks berawalan rumus diberi awalan agar tidak dijalankan Excel", () => {
    expect(buildCsv(["Nama"], [["=1+1"]])).toContain(`"'=1+1"`);
    expect(buildCsv(["Nama"], [["@SUM(A1)"]])).toContain(`"'@SUM(A1)"`);
    expect(buildCsv(["Nama"], [["-cmd|calc"]])).toContain(`"'-cmd|calc"`);
  });

  it("tanda hubung, nomor berawalan plus, dan tanda pisah panjang tidak diberi awalan", () => {
    expect(buildCsv(["X"], [["-"]])).toContain('\r\n"-"\r\n');
    expect(buildCsv(["X"], [["+62 812-3456"]])).toContain('"+62 812-3456"');
    expect(buildCsv(["X"], [["—"]])).toContain('"—"');
  });
});
