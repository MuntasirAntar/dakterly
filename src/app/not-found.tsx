import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-teal-700">Page not found</h1>
      <p className="text-gray-600">That doctor, clinic or page does not exist, or is no longer available.</p>
      <Link href="/doctors" className="mt-2 rounded-lg bg-teal-700 px-5 py-2.5 font-medium text-white hover:bg-teal-800">
        Browse doctors
      </Link>
    </main>
  );
}
