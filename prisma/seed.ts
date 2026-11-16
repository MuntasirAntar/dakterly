import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const specialtyNames = [
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Gastroenterologist",
  "Pediatrician",
  "Orthopedic Surgeon",
  "Gynecologist",
  "ENT Specialist",
  "Neurologist",
  "Psychiatrist",
];

// weekday: 0 = Sunday ... 6 = Saturday
const clinics = [
  {
    name: "Green Crescent Medical Center",
    address: "House 12, Road 5, Dhanmondi",
    city: "Dhaka",
    phone: "01700-000001",
    adminEmail: "reception.greencrescent@example.com",
    doctors: [
      { name: "Dr. Farzana Rahman", specialty: "General Physician", qualifications: "MBBS, FCPS (Medicine)", fee: 800, days: [0, 1, 2, 3, 4], start: "16:00", end: "20:00", slot: 10 },
      { name: "Dr. Tanvir Hossain", specialty: "Cardiologist", qualifications: "MBBS, MD (Cardiology)", fee: 1500, days: [0, 2, 4], start: "17:00", end: "21:00", slot: 15 },
      { name: "Dr. Nusrat Jahan", specialty: "Dermatologist", qualifications: "MBBS, DDV", fee: 1000, days: [1, 3], start: "18:00", end: "21:00", slot: 10 },
      { name: "Dr. Imran Chowdhury", specialty: "Gastroenterologist", qualifications: "MBBS, MD (Gastroenterology)", fee: 1200, days: [0, 3], start: "16:00", end: "20:00", slot: 15 },
    ],
  },
  {
    name: "Riverside Care Clinic",
    address: "Plot 8, Sector 7, Uttara",
    city: "Dhaka",
    phone: "01700-000002",
    adminEmail: "reception.riverside@example.com",
    doctors: [
      { name: "Dr. Sabrina Akter", specialty: "Pediatrician", qualifications: "MBBS, DCH", fee: 900, days: [0, 1, 2, 3, 4], start: "15:00", end: "19:00", slot: 20 },
      { name: "Dr. Mahmudul Karim", specialty: "Orthopedic Surgeon", qualifications: "MBBS, MS (Orthopedics)", fee: 1300, days: [0, 2], start: "17:00", end: "21:00", slot: 15 },
      { name: "Dr. Rubina Sultana", specialty: "Gynecologist", qualifications: "MBBS, FCPS (Obs & Gynae)", fee: 1200, days: [0, 2, 4], start: "16:00", end: "20:00", slot: 15 },
      { name: "Dr. Arif Mahmud", specialty: "ENT Specialist", qualifications: "MBBS, DLO", fee: 1000, days: [1, 3], start: "17:00", end: "20:00", slot: 10 },
    ],
  },
  {
    name: "Harbor Health Center",
    address: "27 GEC Circle",
    city: "Chattogram",
    phone: "01700-000003",
    adminEmail: "reception.harbor@example.com",
    doctors: [
      { name: "Dr. Shamim Uddin", specialty: "General Physician", qualifications: "MBBS, MD", fee: 700, days: [0, 1, 2, 3, 4], start: "17:00", end: "21:00", slot: 10 },
      { name: "Dr. Tasnia Islam", specialty: "Dermatologist", qualifications: "MBBS, MD (Dermatology)", fee: 1000, days: [0, 2, 4], start: "17:00", end: "20:00", slot: 10 },
      { name: "Dr. Kamrul Hasan", specialty: "Neurologist", qualifications: "MBBS, MD (Neurology)", fee: 1500, days: [1, 3], start: "16:00", end: "20:00", slot: 20 },
      { name: "Dr. Maliha Anwar", specialty: "Psychiatrist", qualifications: "MBBS, MD (Psychiatry)", fee: 1300, days: [0, 3], start: "17:00", end: "20:00", slot: 20 },
    ],
  },
];

async function main() {
  const superPassword = process.env.SUPERADMIN_PASSWORD;
  if (!superPassword) {
    throw new Error("Add SUPERADMIN_PASSWORD=... to your .env file first.");
  }

  // Clear old data, children before parents
  await db.reminder.deleteMany();
  await db.appointment.deleteMany();
  await db.doctorSchedule.deleteMany();
  await db.doctor.deleteMany();
  await db.auditLog.deleteMany();
  await db.user.deleteMany();
  await db.specialty.deleteMany();
  await db.clinic.deleteMany();

  // Specialties
  const specialtyIds: Record<string, string> = {};
  for (const name of specialtyNames) {
    const s = await db.specialty.create({ data: { name } });
    specialtyIds[name] = s.id;
  }

  // Clinics, their doctors and receptionist accounts
  const clinicPasswordHash = bcrypt.hashSync("Clinic@12345", 10);
  for (const c of clinics) {
    const clinic = await db.clinic.create({
      data: { name: c.name, address: c.address, city: c.city, phone: c.phone },
    });

    for (const d of c.doctors) {
      await db.doctor.create({
        data: {
          clinicId: clinic.id,
          specialtyId: specialtyIds[d.specialty],
          name: d.name,
          qualifications: d.qualifications,
          bio: `${d.specialty} at ${c.name}, focused on clear, patient-friendly care.`,
          consultationFee: d.fee,
          avgConsultMinutes: d.slot,
          schedules: {
            create: d.days.map((weekday) => ({
              weekday,
              startTime: d.start,
              endTime: d.end,
              slotMinutes: d.slot,
            })),
          },
        },
      });
    }

    await db.user.create({
      data: {
        name: `${c.name} Reception`,
        email: c.adminEmail,
        passwordHash: clinicPasswordHash,
        role: "CLINIC_ADMIN",
        clinicId: clinic.id,
      },
    });
  }

  // Super admin (password comes from .env)
  await db.user.create({
    data: {
      name: "Super Admin",
      email: "superadmin@example.com",
      passwordHash: bcrypt.hashSync(superPassword, 10),
      role: "SUPER_ADMIN",
    },
  });

  // A demo patient
  await db.user.create({
    data: {
      name: "Demo Patient",
      email: "patient@example.com",
      passwordHash: bcrypt.hashSync("Patient@12345", 10),
      role: "PATIENT",
    },
  });

  console.log("Seed complete:");
  console.log(`  ${specialtyNames.length} specialties, ${clinics.length} clinics, ${clinics.reduce((n, c) => n + c.doctors.length, 0)} doctors`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());