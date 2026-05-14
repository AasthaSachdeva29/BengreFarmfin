import logo from "@/assets/logo.png";

export function Logo({ className = "h-12 w-12" }: { className?: string }) {
  return <img src={logo} alt="Bengre Farm" className={`${className} object-contain`} />;
}
