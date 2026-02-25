import { createInquiry as dbCreateInquiry } from "@/lib/queries/inquiry";

export type InquiryInput = {
  name: string;
  email: string;
  message: string;
};

export async function createInquiry(data: InquiryInput) {
  return dbCreateInquiry(data);
}

export async function notifyInquiry(data: InquiryInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_NOTIFY_EMAIL;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !to || !from) {
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[Bright Line] New inquiry from ${data.name}`,
        text: [
          `Name: ${data.name}`,
          `Email: ${data.email}`,
          ``,
          `Message:`,
          data.message,
        ].join("\n"),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend email failed:", res.status, err);
    }
  } catch (err) {
    console.error("Resend email error:", err);
  }
}
