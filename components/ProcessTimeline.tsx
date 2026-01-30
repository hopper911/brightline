import { CREDIBILITY } from "@/lib/config/credibility";

type ProcessTimelineProps = {
  variant?: "light" | "dark";
  className?: string;
};

export default function ProcessTimeline({
  variant = "dark",
  className = "",
}: ProcessTimelineProps) {
  const isDark = variant === "dark";
  
  return (
    <div className={`grid gap-6 md:grid-cols-4 ${className}`}>
      {CREDIBILITY.process.map((item, index) => (
        <div
          key={item.step}
          className={`relative ${index < CREDIBILITY.process.length - 1 ? "md:pr-6" : ""}`}
        >
          {/* Connector line on desktop */}
          {index < CREDIBILITY.process.length - 1 && (
            <div
              className={`hidden md:block absolute right-0 top-4 h-px w-6 ${isDark ? "bg-white/20" : "bg-black/20"}`}
            />
          )}
          
          <div className={`flex items-start gap-4 md:flex-col md:gap-3`}>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                isDark
                  ? "bg-white/10 text-white/70"
                  : "bg-black/10 text-black/70"
              }`}
            >
              {item.step}
            </span>
            
            <div>
              <h3
                className={`text-sm font-medium uppercase tracking-[0.2em] ${
                  isDark ? "text-white" : "text-black"
                }`}
              >
                {item.title}
              </h3>
              <p
                className={`mt-2 text-sm ${
                  isDark ? "text-white/70" : "text-black/70"
                }`}
              >
                {item.description}
              </p>
              <p
                className={`mt-2 text-xs ${
                  isDark ? "text-white/50" : "text-black/50"
                }`}
              >
                {item.duration}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
