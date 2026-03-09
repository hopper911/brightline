import { CREDIBILITY } from "@/lib/config/credibility";

type CredibilityBarProps = {
  variant?: "light" | "dark";
  className?: string;
  showDescription?: boolean;
};

export default function CredibilityBar({
  variant = "dark",
  className = "",
  showDescription = false,
}: CredibilityBarProps) {
  const isDark = variant === "dark";
  const stats = CREDIBILITY?.stats ?? [];
  return (
    <div className={`grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6 ${className}`}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`text-center ${isDark ? "text-white" : "text-black"}`}
        >
          <p className={`font-display text-2xl md:text-3xl ${isDark ? "text-white" : "text-black"}`}>
            {stat.value}
          </p>
          <p className={`mt-1 text-xs uppercase tracking-[0.28em] ${isDark ? "text-white/60" : "text-black/50"}`}>
            {stat.label}
          </p>
          {showDescription && (
            <p className={`mt-1 text-xs ${isDark ? "text-white/40" : "text-black/40"}`}>
              {stat.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
