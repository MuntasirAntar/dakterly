import NavbarClient from "@/components/NavbarClient";

export default function Navbar() {
  const demoNow =
    process.env.DEMO_NOW && !Number.isNaN(new Date(process.env.DEMO_NOW).getTime())
      ? process.env.DEMO_NOW
      : null;

  return <NavbarClient demoNow={demoNow} />;
}
