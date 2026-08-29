type ExportDownloadLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

/** Native anchor for accountant API downloads (CSV/PDF) — not a Next.js page route. */
export function ExportDownloadLink({ href, children, className }: ExportDownloadLinkProps) {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- API download endpoint
    <a className={className} href={href}>
      {children}
    </a>
  );
}
