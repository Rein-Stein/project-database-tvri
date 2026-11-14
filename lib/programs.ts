export type ProgramNameValidation =
  | { name: string; error: null }
  | { name: null; error: string };

export function validateProgramName(value: unknown): ProgramNameValidation {
  if (typeof value !== "string") {
    return { name: null, error: "Nama program wajib berupa teks." };
  }
  const name = value.trim();
  if (!name) return { name: null, error: "Nama program wajib diisi." };
  if (Array.from(name).length > 180) {
    return { name: null, error: "Nama program maksimal 180 karakter." };
  }
  return { name, error: null };
}
