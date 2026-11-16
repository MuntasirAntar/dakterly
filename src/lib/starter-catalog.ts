// Starter clinics, specialties, doctors, and weekly schedules exported from initial database.
export const STARTER_CATALOG = {
  "clinics": [
    {
      "id": "cmwg7pi4y000auahswcrhs230",
      "name": "Green Crescent Medical Center",
      "address": "House 12, Road 5, Dhanmondi",
      "city": "Dhaka",
      "phone": "01700-000001",
      "openTime": "09:00",
      "closeTime": "21:00",
      "isActive": true
    },
    {
      "id": "cmwg7pi6n000xuahstq60lcol",
      "name": "Riverside Care Clinic",
      "address": "Plot 8, Sector 7, Uttara",
      "city": "Dhaka",
      "phone": "01700-000002",
      "openTime": "09:00",
      "closeTime": "21:00",
      "isActive": true
    },
    {
      "id": "cmwg7pi7v001kuahslm3hcaq8",
      "name": "Harbor Health Center",
      "address": "27 GEC Circle",
      "city": "Chattogram",
      "phone": "01700-000003",
      "openTime": "09:00",
      "closeTime": "21:00",
      "isActive": true
    }
  ],
  "specialties": [
    {
      "id": "cmwg7pi0p0000uahsvfghqefi",
      "name": "General Physician"
    },
    {
      "id": "cmwg7pi130001uahso63dfkqk",
      "name": "Cardiologist"
    },
    {
      "id": "cmwg7pi190002uahsy8wts3ss",
      "name": "Dermatologist"
    },
    {
      "id": "cmwg7pi1g0003uahsxc1ymq14",
      "name": "Gastroenterologist"
    },
    {
      "id": "cmwg7pi1n0004uahs64yklku3",
      "name": "Pediatrician"
    },
    {
      "id": "cmwg7pi1u0005uahssq59p928",
      "name": "Orthopedic Surgeon"
    },
    {
      "id": "cmwg7pi200006uahswcx3ncoo",
      "name": "Gynecologist"
    },
    {
      "id": "cmwg7pi280007uahstforos0j",
      "name": "ENT Specialist"
    },
    {
      "id": "cmwg7pi2f0008uahsc098vrai",
      "name": "Neurologist"
    },
    {
      "id": "cmwg7pi2l0009uahse187hs39",
      "name": "Psychiatrist"
    }
  ],
  "doctors": [
    {
      "id": "cmwg7pi58000cuahs75zeogyo",
      "clinicId": "cmwg7pi4y000auahswcrhs230",
      "specialtyId": "cmwg7pi0p0000uahsvfghqefi",
      "name": "Dr. Farzana Rahman",
      "qualifications": "MBBS, FCPS (Medicine)",
      "bio": "General Physician at Green Crescent Medical Center, focused on clear, patient-friendly care.",
      "photoUrl": null,
      "consultationFee": 800,
      "avgConsultMinutes": 10,
      "isActive": true
    },
    {
      "id": "cmwg7pi5s000juahsc62yzcvu",
      "clinicId": "cmwg7pi4y000auahswcrhs230",
      "specialtyId": "cmwg7pi130001uahso63dfkqk",
      "name": "Dr. Tanvir Hossain",
      "qualifications": "MBBS, MD (Cardiology)",
      "bio": "Cardiologist at Green Crescent Medical Center, focused on clear, patient-friendly care.",
      "photoUrl": null,
      "consultationFee": 1500,
      "avgConsultMinutes": 15,
      "isActive": true
    },
    {
      "id": "cmwg7pi62000ouahseno5axgm",
      "clinicId": "cmwg7pi4y000auahswcrhs230",
      "specialtyId": "cmwg7pi190002uahsy8wts3ss",
      "name": "Dr. Nusrat Jahan",
      "qualifications": "MBBS, DDV",
      "bio": "Dermatologist at Green Crescent Medical Center, focused on clear, patient-friendly care.",
      "photoUrl": null,
      "consultationFee": 1000,
      "avgConsultMinutes": 10,
      "isActive": true
    },
    {
      "id": "cmwg7pi69000suahsjf1h1c3a",
      "clinicId": "cmwg7pi4y000auahswcrhs230",
      "specialtyId": "cmwg7pi1g0003uahsxc1ymq14",
      "name": "Dr. Imran Chowdhury",
      "qualifications": "MBBS, MD (Gastroenterology)",
      "bio": "Gastroenterologist at Green Crescent Medical Center, focused on clear, patient-friendly care.",
      "photoUrl": null,
      "consultationFee": 1200,
      "avgConsultMinutes": 15,
      "isActive": true
    },
    {
      "id": "cmwg7pi6u000zuahs1ep6483n",
      "clinicId": "cmwg7pi6n000xuahstq60lcol",
      "specialtyId": "cmwg7pi1n0004uahs64yklku3",
      "name": "Dr. Sabrina Akter",
      "qualifications": "MBBS, DCH",
      "bio": "Pediatrician at Riverside Care Clinic, focused on clear, patient-friendly care.",
      "photoUrl": null,
      "consultationFee": 900,
      "avgConsultMinutes": 10,
      "isActive": true
    },
    {
      "id": "cmwg7pi720016uahsui198m7x",
      "clinicId": "cmwg7pi6n000xuahstq60lcol",
      "specialtyId": "cmwg7pi1u0005uahssq59p928",
      "name": "Dr. Mahmudul Karim",
      "qualifications": "MBBS, MS (Orthopedics)",
      "bio": "Orthopedic Surgeon at Riverside Care Clinic, focused on clear, patient-friendly care.",
      "photoUrl": null,
      "consultationFee": 1300,
      "avgConsultMinutes": 15,
      "isActive": true
    },
    {
      "id": "cmwg7pi79001auahsx4fy0bnd",
      "clinicId": "cmwg7pi6n000xuahstq60lcol",
      "specialtyId": "cmwg7pi200006uahswcx3ncoo",
      "name": "Dr. Rubina Sultana",
      "qualifications": "MBBS, FCPS (Obs & Gynae)",
      "bio": "Gynecologist at Riverside Care Clinic, focused on clear, patient-friendly care.",
      "photoUrl": null,
      "consultationFee": 1200,
      "avgConsultMinutes": 15,
      "isActive": true
    },
    {
      "id": "cmwg7pi7g001fuahs8ezvqk7m",
      "clinicId": "cmwg7pi6n000xuahstq60lcol",
      "specialtyId": "cmwg7pi280007uahstforos0j",
      "name": "Dr. Arif Mahmud",
      "qualifications": "MBBS, DLO",
      "bio": "ENT Specialist at Riverside Care Clinic, focused on clear, patient-friendly care.",
      "photoUrl": null,
      "consultationFee": 1000,
      "avgConsultMinutes": 10,
      "isActive": true
    },
    {
      "id": "cmwg7pi82001muahss0y1i6qn",
      "clinicId": "cmwg7pi7v001kuahslm3hcaq8",
      "specialtyId": "cmwg7pi0p0000uahsvfghqefi",
      "name": "Dr. Shamim Uddin",
      "qualifications": "MBBS, MD",
      "bio": "General Physician at Harbor Health Center, focused on clear, patient-friendly care.",
      "photoUrl": null,
      "consultationFee": 700,
      "avgConsultMinutes": 10,
      "isActive": true
    },
    {
      "id": "cmwg7pi89001tuahs0jdqb943",
      "clinicId": "cmwg7pi7v001kuahslm3hcaq8",
      "specialtyId": "cmwg7pi190002uahsy8wts3ss",
      "name": "Dr. Tasnia Islam",
      "qualifications": "MBBS, MD (Dermatology)",
      "bio": "Dermatologist at Harbor Health Center, focused on clear, patient-friendly care.",
      "photoUrl": null,
      "consultationFee": 1000,
      "avgConsultMinutes": 10,
      "isActive": true
    },
    {
      "id": "cmwg7pi8h001yuahsozqyce6x",
      "clinicId": "cmwg7pi7v001kuahslm3hcaq8",
      "specialtyId": "cmwg7pi2f0008uahsc098vrai",
      "name": "Dr. Kamrul Hasan",
      "qualifications": "MBBS, MD (Neurology)",
      "bio": "Neurologist at Harbor Health Center, focused on clear, patient-friendly care.",
      "photoUrl": null,
      "consultationFee": 1500,
      "avgConsultMinutes": 20,
      "isActive": true
    },
    {
      "id": "cmwg7pi8p0022uahsrhgfstpt",
      "clinicId": "cmwg7pi7v001kuahslm3hcaq8",
      "specialtyId": "cmwg7pi2l0009uahse187hs39",
      "name": "Dr. Maliha Anwar",
      "qualifications": "MBBS, MD (Psychiatry)",
      "bio": "Psychiatrist at Harbor Health Center, focused on clear, patient-friendly care.",
      "photoUrl": null,
      "consultationFee": 1300,
      "avgConsultMinutes": 20,
      "isActive": true
    }
  ],
  "doctorSchedules": [
    {
      "id": "cmwg7pi58000duahspyv0iot0",
      "doctorId": "cmwg7pi58000cuahs75zeogyo",
      "weekday": 0,
      "startTime": "16:00",
      "endTime": "20:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi58000euahsgkfrp4dn",
      "doctorId": "cmwg7pi58000cuahs75zeogyo",
      "weekday": 1,
      "startTime": "16:00",
      "endTime": "20:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi58000fuahsd3hh02nf",
      "doctorId": "cmwg7pi58000cuahs75zeogyo",
      "weekday": 2,
      "startTime": "16:00",
      "endTime": "20:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi58000guahssudv8wxf",
      "doctorId": "cmwg7pi58000cuahs75zeogyo",
      "weekday": 3,
      "startTime": "16:00",
      "endTime": "20:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi58000huahsz6c47pte",
      "doctorId": "cmwg7pi58000cuahs75zeogyo",
      "weekday": 4,
      "startTime": "16:00",
      "endTime": "20:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi5s000kuahs2yhfxade",
      "doctorId": "cmwg7pi5s000juahsc62yzcvu",
      "weekday": 0,
      "startTime": "17:00",
      "endTime": "21:00",
      "slotMinutes": 15
    },
    {
      "id": "cmwg7pi5s000luahs6eq1gvrc",
      "doctorId": "cmwg7pi5s000juahsc62yzcvu",
      "weekday": 2,
      "startTime": "17:00",
      "endTime": "21:00",
      "slotMinutes": 15
    },
    {
      "id": "cmwg7pi5s000muahs8odeiv7f",
      "doctorId": "cmwg7pi5s000juahsc62yzcvu",
      "weekday": 4,
      "startTime": "17:00",
      "endTime": "21:00",
      "slotMinutes": 15
    },
    {
      "id": "cmwg7pi62000puahs2ah7qn7y",
      "doctorId": "cmwg7pi62000ouahseno5axgm",
      "weekday": 1,
      "startTime": "18:00",
      "endTime": "21:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi62000quahsr5605xaw",
      "doctorId": "cmwg7pi62000ouahseno5axgm",
      "weekday": 3,
      "startTime": "18:00",
      "endTime": "21:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi69000tuahsnvxjd61v",
      "doctorId": "cmwg7pi69000suahsjf1h1c3a",
      "weekday": 0,
      "startTime": "16:00",
      "endTime": "20:00",
      "slotMinutes": 15
    },
    {
      "id": "cmwg7pi69000uuahsmsmepzzn",
      "doctorId": "cmwg7pi69000suahsjf1h1c3a",
      "weekday": 3,
      "startTime": "16:00",
      "endTime": "20:00",
      "slotMinutes": 15
    },
    {
      "id": "cmwg7pi6u0010uahssv01b29c",
      "doctorId": "cmwg7pi6u000zuahs1ep6483n",
      "weekday": 0,
      "startTime": "15:00",
      "endTime": "19:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi6u0011uahsb9g2cmlh",
      "doctorId": "cmwg7pi6u000zuahs1ep6483n",
      "weekday": 1,
      "startTime": "15:00",
      "endTime": "19:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi6u0012uahse3fgcetb",
      "doctorId": "cmwg7pi6u000zuahs1ep6483n",
      "weekday": 2,
      "startTime": "15:00",
      "endTime": "19:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi6u0013uahs9fd5pp34",
      "doctorId": "cmwg7pi6u000zuahs1ep6483n",
      "weekday": 3,
      "startTime": "15:00",
      "endTime": "19:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi6u0014uahs2qcgpujj",
      "doctorId": "cmwg7pi6u000zuahs1ep6483n",
      "weekday": 4,
      "startTime": "15:00",
      "endTime": "19:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi720017uahs5qi9jtwq",
      "doctorId": "cmwg7pi720016uahsui198m7x",
      "weekday": 0,
      "startTime": "17:00",
      "endTime": "21:00",
      "slotMinutes": 15
    },
    {
      "id": "cmwg7pi720018uahstnlfx74k",
      "doctorId": "cmwg7pi720016uahsui198m7x",
      "weekday": 2,
      "startTime": "17:00",
      "endTime": "21:00",
      "slotMinutes": 15
    },
    {
      "id": "cmwg7pi79001buahsa43g3pft",
      "doctorId": "cmwg7pi79001auahsx4fy0bnd",
      "weekday": 0,
      "startTime": "16:00",
      "endTime": "20:00",
      "slotMinutes": 15
    },
    {
      "id": "cmwg7pi79001cuahs3uc2mzja",
      "doctorId": "cmwg7pi79001auahsx4fy0bnd",
      "weekday": 2,
      "startTime": "16:00",
      "endTime": "20:00",
      "slotMinutes": 15
    },
    {
      "id": "cmwg7pi79001duahsipu8ht7w",
      "doctorId": "cmwg7pi79001auahsx4fy0bnd",
      "weekday": 4,
      "startTime": "16:00",
      "endTime": "20:00",
      "slotMinutes": 15
    },
    {
      "id": "cmwg7pi7g001guahsn6lgcy2o",
      "doctorId": "cmwg7pi7g001fuahs8ezvqk7m",
      "weekday": 1,
      "startTime": "17:00",
      "endTime": "20:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi7g001huahs7xihcful",
      "doctorId": "cmwg7pi7g001fuahs8ezvqk7m",
      "weekday": 3,
      "startTime": "17:00",
      "endTime": "20:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi82001nuahs9nbrxxgg",
      "doctorId": "cmwg7pi82001muahss0y1i6qn",
      "weekday": 0,
      "startTime": "17:00",
      "endTime": "21:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi82001ouahskpm2qziu",
      "doctorId": "cmwg7pi82001muahss0y1i6qn",
      "weekday": 1,
      "startTime": "17:00",
      "endTime": "21:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi82001puahs1mz8yxw0",
      "doctorId": "cmwg7pi82001muahss0y1i6qn",
      "weekday": 2,
      "startTime": "17:00",
      "endTime": "21:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi82001quahs5scoij83",
      "doctorId": "cmwg7pi82001muahss0y1i6qn",
      "weekday": 3,
      "startTime": "17:00",
      "endTime": "21:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi82001ruahso4ab78s3",
      "doctorId": "cmwg7pi82001muahss0y1i6qn",
      "weekday": 4,
      "startTime": "17:00",
      "endTime": "21:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi89001uuahsubdlvk9t",
      "doctorId": "cmwg7pi89001tuahs0jdqb943",
      "weekday": 0,
      "startTime": "17:00",
      "endTime": "20:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi8a001vuahs6pir5pa2",
      "doctorId": "cmwg7pi89001tuahs0jdqb943",
      "weekday": 2,
      "startTime": "17:00",
      "endTime": "20:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi8a001wuahs3uls7f9r",
      "doctorId": "cmwg7pi89001tuahs0jdqb943",
      "weekday": 4,
      "startTime": "17:00",
      "endTime": "20:00",
      "slotMinutes": 10
    },
    {
      "id": "cmwg7pi8h001zuahsyybzc7k9",
      "doctorId": "cmwg7pi8h001yuahsozqyce6x",
      "weekday": 1,
      "startTime": "16:00",
      "endTime": "20:00",
      "slotMinutes": 20
    },
    {
      "id": "cmwg7pi8h0020uahs7jkw70m1",
      "doctorId": "cmwg7pi8h001yuahsozqyce6x",
      "weekday": 3,
      "startTime": "16:00",
      "endTime": "20:00",
      "slotMinutes": 20
    },
    {
      "id": "cmwg7pi8p0023uahsdj4nbl8i",
      "doctorId": "cmwg7pi8p0022uahsrhgfstpt",
      "weekday": 0,
      "startTime": "17:00",
      "endTime": "20:00",
      "slotMinutes": 20
    },
    {
      "id": "cmwg7pi8p0024uahsm3nuf2lt",
      "doctorId": "cmwg7pi8p0022uahsrhgfstpt",
      "weekday": 3,
      "startTime": "17:00",
      "endTime": "20:00",
      "slotMinutes": 20
    }
  ]
} as const;
