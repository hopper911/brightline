-- Optional From address on Mission Control email drafts (verified brightline senders via Resend/SMTP).
ALTER TABLE "StudioEmailDraft" ADD COLUMN "fromEmail" TEXT;
