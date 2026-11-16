import { initials } from "@/lib/format";

type Props = {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASSES = {
  sm: "h-10 w-10 text-sm",
  md: "h-14 w-14 text-lg",
  lg: "h-20 w-20 text-2xl",
};

export default function DoctorAvatar({ name, photoUrl, size = "md" }: Props) {
  const dim = SIZE_CLASSES[size];

  if (photoUrl) {
    return (
      <div className={`relative shrink-0 overflow-hidden rounded-full border border-teal-200 bg-teal-50 shadow-sm ${dim}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={name}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-700 to-emerald-600 font-bold text-white shadow-sm ${dim}`}
    >
      {initials(name)}
    </div>
  );
}
