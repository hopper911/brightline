"use client";

import { m, useReducedMotion } from "framer-motion";

export default function Reveal({
  children,
  delay = 0,
  className,
  id,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  id?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <m.div
      id={id}
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18, filter: "blur(8px)" }}
      whileInView={
        reduce ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }
      }
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.55, ease: "easeOut", delay }}
    >
      {children}
    </m.div>
  );
}
