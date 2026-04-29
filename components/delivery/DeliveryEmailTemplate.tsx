type DeliveryEmailTemplateProps = {
  clientName?: string | null;
  projectName?: string | null;
  deliveryLink?: string | null;
};

export function getDeliveryEmailText({
  clientName,
  projectName,
  deliveryLink,
}: DeliveryEmailTemplateProps) {
  const greetingName = clientName?.trim() || "Client";
  const projectLine = projectName?.trim()
    ? ` for ${projectName.trim()}`
    : "";
  const linkLine = deliveryLink?.trim() || "[Insert client delivery link]";

  return `Hi ${greetingName},

I'm happy to share the final image delivery${projectLine}.

You can access the files here:

${linkLine}

The delivery is organized into sections so the images are easy to use:

01_FULL_RES - high-resolution files for print, archive, and large-format use
02_WEB_READY - optimized files for website, listing, and online use
03_SOCIAL - resized files for social media and digital posting
04_SELECTED_HEROES - my recommended strongest images for cover use, marketing, or first impression placement

I recommend using the WEB_READY files for your website and online platforms, and the FULL_RES files for print or long-term archive.

Please download and save a copy of the files for your records.

Thank you again for trusting Bright Line with this project.

Best,
Kiril
Bright Line Photography`;
}

export function DeliveryEmailTemplate(props: DeliveryEmailTemplateProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
        Delivery email draft
      </p>
      <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-white/75">
        {getDeliveryEmailText(props)}
      </pre>
    </div>
  );
}
