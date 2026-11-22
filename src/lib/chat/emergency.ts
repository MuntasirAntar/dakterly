import type { ChatLanguage } from "./types";
import { CHAT_UI_TEXT } from "./ui-text";

// Deterministic pre-model emergency keyword check across English, Bangla script, and common Banglish.
// Covers: chest pain, trouble breathing, stroke signs, severe bleeding, unconsciousness,
// seizure, suspected poisoning, self-harm, severe injury, and pregnancy bleeding.
const EMERGENCY_PATTERNS: RegExp[] = [
  // 1. Chest pain / heart attack
  /\bchest\s+(?:pain|tightness|pressure|heaviness|discomfort)\b/i,
  /\bpain\s+in\s+(?:my\s+|the\s+)?chest\b/i,
  /\bheart\s+attack\b/i,
  /বুকে\s*(?:খুব\s*)?(?:ব্যথা|ব্যাথা|চাপ|যন্ত্রণা|জ্বালাপোড়া)/,
  /বুক\s*(?:ব্যথা|ব্যাথা|চাপ|ধড়ফড়)/,
  /হার্ট\s*অ্যাটাক/,
  /\bbuk(?:e|er)?\s*(?:khub\s*)?(?:betha|byatha|vyatha|chap|jontrona)\b/i,
  /\bheart\s*attack\b/i,

  // 2. Trouble breathing / cannot breathe
  /\b(?:trouble|difficulty|hard|struggling|unable)\s+(?:to\s+)?breath(?:e|ing)\b/i,
  /\b(?:can\s*not|cannot|can't|cant)\s+breathe?\b/i,
  /\bshortness\s+of\s+breath\b/i,
  /\bsuffocat(?:ing|ion)\b/i,
  /\bgasping\s+for\s+air\b/i,
  /শ্বাসকষ্ট|শ্বাস\s*নিতে\s*(?:কষ্ট|পারছি\s*না|পারছে\s*না|সমস্যা)|দম\s*বন্ধ/,
  /\bshash\s*koshto\b/i,
  /\bshashkoshto\b/i,
  /\bshash\s*nite\s*(?:koshto|parchi\s*na|parche\s*na)\b/i,
  /\bdom\s*bondho\b/i,

  // 3. Signs of stroke
  /\bstroke\b/i,
  /\bface\s+(?:droop|drooping|numb|twisted)\b/i,
  /\bslurred\s+speech\b/i,
  /\bsudden\s+(?:weakness|numbness)\b/i,
  /\bone\s+side\s+(?:weak|numb|paralyzed)\b/i,
  /স্ট্রোক|মুখ\s*বেঁকে|কথা\s*জড়িয়ে|এক\s*পাশ\s*অবশ|হাত[\s-]*পা\s*অবশ/,
  /\bmukh\s*beke\b/i,
  /\bek\s*pash\s*obosh\b/i,
  /\bkotha\s*joriye\b/i,

  // 4. Severe bleeding
  /\b(?:severe|heavy|uncontrolled|excessive|lot\s+of)\s+bleeding\b/i,
  /\bbleeding\s+(?:heavily|badly|severely|nonstop|non-stop|won't\s+stop)\b/i,
  /\b(?:vomiting|coughing|throwing\s+up)\s+blood\b/i,
  /প্রচুর\s*রক্ত|অতিরিক্ত\s*রক্তপাত|তীব্র\s*রক্তপাত|রক্ত\s*থামছে\s*না|রক্ত\s*বমি|কাশির\s*সাথে\s*রক্ত/,
  /\b(?:prochur|onek)\s*rokto\b/i,
  /\brokto\s*(?:bomi|thamche\s*na|porche)\b/i,
  /\broktopat\b/i,

  // 5. Unconsciousness
  /\bunconscious\b/i,
  /\bpassed\s+out\b/i,
  /\bnot\s+(?:waking\s+up|responding|responsive)\b/i,
  /\bunresponsive\b/i,
  /\blost\s+consciousness\b/i,
  /অজ্ঞান|জ্ঞান\s*হারিয়ে|জ্ঞান\s*নেই|চেতনা\s*নেই|সাড়া\s*দিচ্ছে\s*না/,
  /\b(?:oggan|agyan|ogyan)\b/i,
  /\b(?:gyan|gayn)\s*(?:harie|hariye|nai|nei)\b/i,

  // 6. Seizure
  /\bseizures?\b/i,
  /\bconvulsions?\b/i,
  /খিঁচুনি|মৃগী/,
  /\bkhichuni\b/i,

  // 7. Suspected poisoning / overdose
  /\bpoison(?:ing|ed)?\b/i,
  /\bswallowed\s+(?:poison|acid|bleach|pesticide|chemical|pills)\b/i,
  /\boverdose(?:d)?\b/i,
  /বিষপান|বিষ\s*(?:খেয়ে|খেয়েছে|খেয়েছি|পান)|অতিরিক্ত\s*ওষুধ\s*খেয়ে|ওভারডোজ/,
  /\bbish\s*(?:kheyeche|kheyechi|kheye|pan)\b/i,
  /\bbishpan\b/i,

  // 8. Thoughts of self-harm / suicide
  /\bsuicid(?:e|al)\b/i,
  /\bkill\s+myself\b/i,
  /\bend\s+my\s+life\b/i,
  /\bself[\s-]?harm\b/i,
  /\bhurt\s+myself\b/i,
  /\bwant\s+to\s+die\b/i,
  /আত্মহত্যা|মরতে\s*চাই|নিজেকে\s*(?:শেষ|ক্ষতি)|বাঁচতে\s*চাই\s*না/,
  /\b(?:atmohatya|attohotta)\b/i,
  /\b(?:morte\s*chai|bachte\s*chai\s*na)\b/i,

  // 9. Severe injury / major trauma / severe burn
  /\b(?:severe|serious|major|critical)\s+(?:injury|trauma|accident|burn|burns)\b/i,
  /\bhead\s+injury\b/i,
  /\bbadly\s+(?:injured|burned|burnt)\b/i,
  /গুরুতর\s*আঘাত|মাথায়\s*(?:গুরুতর\s*)?আঘাত|বড়\s*দুর্ঘটনা|মারাত্মক\s*পুড়ে/,
  /\b(?:gurotoro|mathay)\s*aghat\b/i,

  // 10. Pregnancy bleeding
  /\bpregnan(?:t|cy)\s+(?:and\s+)?bleeding\b/i,
  /\bbleeding\s+(?:while|during|in)\s+pregnan(?:t|cy)\b/i,
  /গর্ভাবস্থায়\s*রক্ত|গর্ভবতী.*রক্ত|প্রেগন্যান্সি.*রক্ত/,
  /\b(?:gorbhoboti|gorvoboti|pregnancy)\s*(?:te|e| অবস্থায়)?\s*rokto\b/i,
];

export function detectEmergencyRedFlags(text: string): boolean {
  const normalized = text.normalize("NFC").trim().replace(/\s+/g, " ");
  if (!normalized) return false;
  return EMERGENCY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function getFixedEmergencyMessage(language: ChatLanguage): string {
  return CHAT_UI_TEXT[language].emergencyText;
}
