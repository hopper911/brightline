export type EmailDraft = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailProvider = {
  name: string;
  createDraft(input: EmailDraft): Promise<{ provider: string; id?: string }>;
  send?(input: EmailDraft): Promise<never>;
};

const resendPlaceholderProvider: EmailProvider = {
  name: "resend-placeholder",
  async createDraft() {
    throw new Error("Resend provider is not configured.");
  },
};

export function getEmailProvider(): EmailProvider | null {
  if (process.env.STUDIO_OS_EMAIL_PROVIDER === "resend") {
    return resendPlaceholderProvider;
  }
  return null;
}
