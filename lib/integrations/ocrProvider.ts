export type ReceiptParseInput = {
  key: string;
  url?: string;
  mimeType?: string;
};

export type ReceiptParseResult = {
  amount?: number;
  date?: string;
  merchant?: string;
  category?: string;
  confidence?: number;
};

export type OcrProvider = {
  name: string;
  parseReceipt(input: ReceiptParseInput): Promise<ReceiptParseResult | null>;
};

const manualReceiptProvider: OcrProvider = {
  name: "manual",
  async parseReceipt() {
    return null;
  },
};

const tesseractPlaceholderProvider: OcrProvider = {
  name: "tesseract-placeholder",
  async parseReceipt() {
    // Disabled until local OCR is explicitly configured.
    return null;
  },
};

export function getOcrProvider(): OcrProvider {
  if (process.env.STUDIO_OS_OCR_PROVIDER === "tesseract") {
    return tesseractPlaceholderProvider;
  }
  return manualReceiptProvider;
}
