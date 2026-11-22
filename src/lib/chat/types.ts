export type ChatLanguage = "bn" | "en";

export type ChatRole = "user" | "assistant";

export interface ChatMessageInput {
  role: ChatRole;
  content: string;
}

export interface ChatDoctorResult {
  id: string;
  name: string;
  specialty: string;
  qualifications: string | null;
  photoUrl: string | null;
  clinicId: string;
  clinicName: string;
  city: string;
  address: string;
  fee: number;
  nextAvailable: string | null;
  matchedCity: boolean;
  matchedArea: boolean;
}

export interface ChatApiResponse {
  reply: string;
  doctors: ChatDoctorResult[];
  emergency?: boolean;
  fallbackFromOtherCities?: boolean;
  requestedCity?: string | null;
  error?: string;
}
