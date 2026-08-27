"use client";

import Script from "next/script";

type AnalyticsProps = {
  plausibleDomain?: string;
  gaId?: string;
  nonce?: string;
};

/**
 * Analytics component for loading Plausible or Google Analytics
 * Add to app/layout.tsx inside <body>
 */
export default function Analytics({ plausibleDomain, gaId, nonce }: AnalyticsProps) {
  const plausible = plausibleDomain || process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const googleAnalytics = gaId || process.env.NEXT_PUBLIC_GA_ID;

  return (
    <>
      {plausible && (
        <Script
          defer
          data-domain={plausible}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
          nonce={nonce}
        />
      )}

      {googleAnalytics && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalytics}`}
            strategy="afterInteractive"
            nonce={nonce}
          />
          <Script id="google-analytics" strategy="afterInteractive" nonce={nonce}>
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAnalytics}', {
                page_path: window.location.pathname,
              });
            `}
          </Script>
        </>
      )}
    </>
  );
}
