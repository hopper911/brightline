"use client";

import { useRef } from "react";
import { m, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import Link from "next/link";

export default function MagneticButton({
  href,
  children,
  className = "btn btn-primary",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 18 });
  const sy = useSpring(y, { stiffness: 250, damping: 18 });

  if (reduce) {
    return (
      <Link ref={ref} href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <m.div style={{ x: sx, y: sy }} className="inline-block">
      <Link
        ref={ref}
        href={href}
        className={className}
        onMouseMove={(e) => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          x.set(dx * 0.12);
          y.set(dy * 0.12);
        }}
        onMouseLeave={() => {
          x.set(0);
          y.set(0);
        }}
      >
        {children}
      </Link>
    </m.div>
  );
}
