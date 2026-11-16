import { z } from "zod";

export type ParsedDoctorCsvRow = {
  line: number;
  name: string;
  clinicName: string;
  specialty: string;
  qualifications?: string;
  consultationFee: number;
  avgConsultMinutes: number;
  bio?: string;
};

export type CsvParseResult = {
  rows: ParsedDoctorCsvRow[];
  errors: string[];
};

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

const rowSchema = z.object({
  name: z.string().trim().min(2, "Doctor name is required").max(100),
  clinicName: z.string().trim().min(2, "Clinic name is required").max(120),
  specialty: z.string().trim().min(2, "Specialty is required").max(80),
  qualifications: z.string().trim().max(120).optional(),
  consultationFee: z.coerce.number().int().min(0).max(100000),
  avgConsultMinutes: z.coerce.number().int().min(5).max(120).default(10),
  bio: z.string().trim().max(500).optional(),
});

export function parseDoctorsCsv(raw: string): CsvParseResult {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], errors: ["CSV must include a header row and at least one doctor row."] };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ""));
  const col = (aliases: string[]) => headers.findIndex((h) => aliases.includes(h));

  const idxName = col(["name", "doctor", "doctorname"]);
  const idxClinic = col(["clinic", "clinicname"]);
  const idxSpecialty = col(["specialty", "department"]);
  const idxQual = col(["qualifications", "qualification", "degrees"]);
  const idxFee = col(["consultationfee", "fee"]);
  const idxMinutes = col(["avgconsultminutes", "minutes", "slotminutes"]);
  const idxBio = col(["bio", "about"]);

  if (idxName === -1 || idxClinic === -1 || idxSpecialty === -1 || idxFee === -1) {
    return {
      rows: [],
      errors: ["CSV header must include: name, clinicName, specialty, consultationFee (optional: qualifications, avgConsultMinutes, bio)."],
    };
  }

  const rows: ParsedDoctorCsvRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const get = (idx: number) => (idx >= 0 ? cells[idx] ?? "" : "");

    const parsed = rowSchema.safeParse({
      name: get(idxName),
      clinicName: get(idxClinic),
      specialty: get(idxSpecialty),
      qualifications: get(idxQual) || undefined,
      consultationFee: get(idxFee),
      avgConsultMinutes: get(idxMinutes) || 10,
      bio: get(idxBio) || undefined,
    });

    if (!parsed.success) {
      const msg = parsed.error.issues.map((iss) => iss.message).join(", ");
      errors.push(`Row ${i + 1}: ${msg}`);
    } else {
      rows.push({ line: i + 1, ...parsed.data });
    }
  }

  return { rows, errors };
}
