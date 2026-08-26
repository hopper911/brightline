"use client";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Kept for call-site compatibility; motion entrance removed (Lenis broke whileInView). */
  delay?: number;
};

/**
 * Content wrapper for section entrances.
 *
 * Important: do not use Framer `whileInView` opacity here. Lenis smooth-scroll
 * detaches window scroll from layout, so IntersectionObserver often never fires
 * and copy stays invisible — pages look empty aside from the footer.
 */
export default function Reveal({ children, className, id }: RevealProps) {
  return (
    <div id={id} className={className}>
      {children}
    </div>
  );
}
