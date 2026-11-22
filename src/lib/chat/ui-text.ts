import type { ChatLanguage } from "./types";

export const LANGUAGE_PROMPT_TITLE =
  "আপনি কোন ভাষায় কথা বলতে চান? / Which language would you like to use?";

export interface ChatUiCopy {
  launcherLabel: string;
  headerTitle: string;
  disclaimer: string;
  privacyNote: string;
  newChat: string;
  close: string;
  switchToEn: string;
  switchToBn: string;
  welcomeMessage: string;
  quickChips: readonly [string, string, string];
  inputPlaceholder: string;
  inputDisabledPlaceholder: string;
  sendLabel: string;
  typingLabel: string;
  useLocation: string;
  locating: string;
  locationUnsupported: string;
  locationDenied: string;
  locationNotFound: string;
  locationDetectedPrefix: string;
  viewProfile: string;
  bookAppointment: string;
  consultationFee: string;
  nextAvailableLabel: string;
  otherCitiesBadge: string;
  emergencyBadge: string;
  emergencyText: string;
  emergencyCallCta: string;
  errors: {
    rateLimited: string;
    invalidRequest: string;
    missingConfig: string;
    unavailable: string;
    network: string;
  };
}

export const CHAT_UI_TEXT: Record<ChatLanguage, ChatUiCopy> = {
  en: {
    launcherLabel: "Open symptom assistant",
    headerTitle: "Dakterly Care Guide",
    disclaimer: "Not a doctor · Guidance only, no diagnosis or medicines.",
    privacyNote: "Private: chats are not saved or logged. Do not share personal IDs or phone numbers.",
    newChat: "New chat",
    close: "Close",
    switchToEn: "English",
    switchToBn: "বাংলা",
    welcomeMessage:
      "Tell me what symptoms you or your family member are having, how long they have lasted, and your city or area so I can suggest the right specialist.",
    quickChips: ["I have a fever", "Skin problem", "Child is unwell"],
    inputPlaceholder: "Describe symptoms, city or area...",
    inputDisabledPlaceholder: "Choose বাংলা or English above to start...",
    sendLabel: "Send message",
    typingLabel: "Checking symptoms & doctors...",
    useLocation: "Use my location",
    locating: "Finding area...",
    locationUnsupported: "Location is not supported in this browser. Please type your city and area.",
    locationDenied: "Location access was not granted. Please type your city and area instead.",
    locationNotFound: "Could not detect your exact area. Please type your city and area.",
    locationDetectedPrefix: "Area",
    viewProfile: "View profile",
    bookAppointment: "Book appointment",
    consultationFee: "Fee",
    nextAvailableLabel: "Next slot",
    otherCitiesBadge: "Nearest available in other cities",
    emergencyBadge: "Emergency Alert",
    emergencyText:
      "These symptoms could be a medical emergency. Please call 999 in Bangladesh right now or go to the nearest hospital emergency room immediately. Do not wait for a regular clinic appointment.",
    emergencyCallCta: "Call 999 (Bangladesh Emergency)",
    errors: {
      rateLimited: "Too many messages right now. Please wait a moment and try again.",
      invalidRequest: "Please keep each message under 500 characters and try again.",
      missingConfig: "The symptom assistant is temporarily unavailable right now. You can browse doctors directly.",
      unavailable: "Sorry, I could not get a response right now. Please try again in a moment.",
      network: "Connection problem. Please check your internet and try again.",
    },
  },
  bn: {
    launcherLabel: "স্বাস্থ্য সহায়ক চ্যাট খুলুন",
    headerTitle: "ডাক্তারলি স্বাস্থ্য সহায়ক",
    disclaimer: "ডাক্তার নয় · শুধু প্রাথমিক পরামর্শ, রোগ নির্ণয় বা ওষুধ নয়।",
    privacyNote: "গোপনীয়: আপনার চ্যাট কোথাও সংরক্ষণ করা হয় না। নাম বা ফোন নম্বর দেবেন না।",
    newChat: "নতুন চ্যাট",
    close: "বন্ধ করুন",
    switchToEn: "English",
    switchToBn: "বাংলা",
    welcomeMessage:
      "আপনার বা পরিবারের কারো কী সমস্যা হচ্ছে, কতদিন ধরে হচ্ছে এবং আপনি কোন শহর ও এলাকায় আছেন তা লিখুন—আমি সঠিক বিশেষজ্ঞ ডাক্তার খুঁজে দিতে সাহায্য করব।",
    quickChips: ["আমার জ্বর হয়েছে", "ত্বকের সমস্যা", "বাচ্চার শরীর খারাপ"],
    inputPlaceholder: "আপনার সমস্যা, শহর ও এলাকার নাম লিখুন...",
    inputDisabledPlaceholder: "শুরু করতে উপরে বাংলা বা English বেছে নিন...",
    sendLabel: "মেসেজ পাঠান",
    typingLabel: "লক্ষণ ও ডাক্তার খোঁজা হচ্ছে...",
    useLocation: "আমার অবস্থান ব্যবহার করুন",
    locating: "এলাকা খোঁজা হচ্ছে...",
    locationUnsupported: "এই ব্রাউজারে লোকেশন চালু করা যাচ্ছে না। অনুগ্রহ করে শহর ও এলাকা লিখুন।",
    locationDenied: "লোকেশন অনুমতি পাওয়া যায়নি। অনুগ্রহ করে আপনার শহর ও এলাকার নাম লিখুন।",
    locationNotFound: "সঠিক এলাকা শনাক্ত করা যায়নি। অনুগ্রহ করে শহর ও এলাকা লিখুন।",
    locationDetectedPrefix: "এলাকা",
    viewProfile: "প্রোফাইল দেখুন",
    bookAppointment: "অ্যাপয়েন্টমেন্ট নিন",
    consultationFee: "ফি",
    nextAvailableLabel: "পরবর্তী সময়",
    otherCitiesBadge: "আপনার শহরে না থাকায় অন্য শহরের ডাক্তার দেখানো হয়েছে",
    emergencyBadge: "জরুরি সতর্কতা",
    emergencyText:
      "এই লক্ষণগুলো জরুরি অবস্থার ইঙ্গিত হতে পারে। অনুগ্রহ করে এখনই বাংলাদেশে ৯৯৯ (999)-এ কল করুন অথবা নিকটস্থ হাসপাতালের জরুরি বিভাগে (ইমার্জেন্সি) যান। সাধারণ অ্যাপয়েন্টমেন্টের জন্য অপেক্ষা করবেন না।",
    emergencyCallCta: "৯৯৯ (999) জরুরি সেবায় কল করুন",
    errors: {
      rateLimited: "একটু বেশি অনুরোধ পাঠানো হয়েছে। কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।",
      invalidRequest: "প্রতিটি মেসেজ ৫০০ অক্ষরের মধ্যে লিখে আবার চেষ্টা করুন।",
      missingConfig: "স্বাস্থ্য সহায়কটি এখন সাময়িকভাবে বন্ধ আছে। অনুগ্রহ করে সরাসরি ডাক্তার তালিকা দেখুন।",
      unavailable: "দুঃখিত, এই মুহূর্তে উত্তর দেওয়া যাচ্ছে না। একটু পর আবার চেষ্টা করুন।",
      network: "ইন্টারনেট সংযোগে সমস্যা হয়েছে। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",
    },
  },
};
