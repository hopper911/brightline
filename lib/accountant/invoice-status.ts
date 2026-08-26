import { StudioInvoiceStatus } from "@prisma/client";

export function invoiceStatusLabel(status: StudioInvoiceStatus): string {
  switch (status) {
    case StudioInvoiceStatus.DRAFT:
      return "Draft";
    case StudioInvoiceStatus.SENT:
      return "Sent";
    case StudioInvoiceStatus.VIEWED:
      return "Viewed";
    case StudioInvoiceStatus.PARTIALLY_PAID:
      return "Partially paid";
    case StudioInvoiceStatus.PAID:
      return "Paid";
    case StudioInvoiceStatus.OVERDUE:
      return "Overdue";
    case StudioInvoiceStatus.CANCELED:
      return "Cancelled";
    case StudioInvoiceStatus.VOID:
      return "Void";
    default:
      return status;
  }
}
