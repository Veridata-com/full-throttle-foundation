import logo from "@/assets/logo.png";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return <img src={logo} alt="AdRise" className={className} />;
}
