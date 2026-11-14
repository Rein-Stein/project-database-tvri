export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function escapeCsvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/** Pemisah kolom CSV. Excel berbahasa Indonesia memakai titik koma; ganti ke "," jika dibuka di Excel/Sheets berbahasa Inggris. */
export const CSV_DELIMITER = ";";

/** Sel yang harus dibaca sebagai TEKS oleh Excel (mis. nomor telepon berawalan 0). */
export interface CsvTextCell {
  text: string;
}

export type CsvCell = string | number | boolean | null | undefined | CsvTextCell;

export function csvText(value: unknown): CsvTextCell {
  return { text: String(value ?? "") };
}

function formatCsvCell(cell: CsvCell): string {
  if (cell !== null && typeof cell === "object") {
    if (cell.text === "") return '""';
    return `"=""${cell.text.replace(/"/g, '""')}"""`;
  }
  let text = String(cell ?? "");
  if (typeof cell === "string" && /^[=+\-@\t\r]/.test(text) && !/^[+-]?[\d\s().-]+$/.test(text)) {
    text = `'${text}`;
  }
  return escapeCsvCell(text);
}

/** Membuat isi file CSV yang rapi di Excel: BOM UTF-8, pemisah titik koma, baris CRLF, semua sel dikutip. */
export function buildCsv(header: string[], rows: CsvCell[][]): string {
  const lines = [header, ...rows].map((row) => row.map(formatCsvCell).join(CSV_DELIMITER));
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
