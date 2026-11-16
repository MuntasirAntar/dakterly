import { describe, expect, it } from "vitest";
import { parseDoctorsCsv } from "./csv";

describe("parseDoctorsCsv", () => {
  it("parses valid CSV rows including quoted fields", () => {
    const csv = [
      'name,clinicName,specialty,qualifications,consultationFee,avgConsultMinutes,bio',
      'Dr. Nadia Islam,Green Crescent Medical Center,Cardiologist,"MBBS, MD",1400,15,"Focuses on preventive cardiology."',
    ].join("\n");

    const result = parseDoctorsCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      name: "Dr. Nadia Islam",
      clinicName: "Green Crescent Medical Center",
      specialty: "Cardiologist",
      qualifications: "MBBS, MD",
      consultationFee: 1400,
      avgConsultMinutes: 15,
    });
  });

  it("reports missing required columns", () => {
    const result = parseDoctorsCsv("name,specialty\nDr. Test,Cardiologist");
    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toContain("CSV header must include");
  });
});
