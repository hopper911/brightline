import { DocumentTemplateType } from "@prisma/client";

const DISCLAIMER = `<!-- Operational draft — attorney review required before enforceable use. -->`;

function body(intro: string, clauses: string[]) {
  return [DISCLAIMER, `<p>${intro}</p>`, ...clauses.map((c) => `<p>${c}</p>`)].join("\n");
}

export const STARTER_DOCUMENT_TEMPLATES: Array<{
  title: string;
  type: DocumentTemplateType;
  description: string;
  contentHtml: string;
  variables: string[];
}> = [
  {
    title: "Commercial photography agreement (starter)",
    type: DocumentTemplateType.COMMERCIAL_PHOTOGRAPHY_AGREEMENT,
    description: "Draft master terms for commercial assignments.",
    contentHtml: body(
      "This agreement is between {{brandName}} (“Photographer”) and {{clientCompany}} (“Client”) for photography services described on applicable estimates or invoices.",
      [
        "Services: Photographer will perform creative production and deliver licensed image files as outlined in the project scope for {{projectTitle}} in {{projectLocation}}.",
        "Fees & payment: Client agrees to fees on the attached invoice #{{invoiceNumber}}. Totals: {{invoiceTotal}}; balance due: {{invoiceBalanceDue}}. Payment is due per invoice terms unless otherwise signed in writing.",
        "License: Unless a separate license addendum applies, Client receives a non-exclusive license for agreed media channels. Model/property releases and third-party clearances remain Client’s responsibility unless Photographer expressly assumes them in writing.",
        "Cancellation: Rescheduling and cancellation fees follow the cancellation addendum or invoice line items.",
        "Contact: {{brandEmail}} · {{brandUrl}}.",
      ]
    ),
    variables: ["clientCompany", "projectTitle", "projectLocation", "invoiceNumber", "invoiceTotal", "invoiceBalanceDue", "brandName", "brandEmail", "brandUrl", "todayDate"],
  },
  {
    title: "Architecture & real estate agreement (starter)",
    type: DocumentTemplateType.ARCHITECTURE_REAL_ESTATE_AGREEMENT,
    description: "Draft for architectural and real estate commissions.",
    contentHtml: body(
      "Photographer and Client agree to the following for {{projectTitle}} at {{projectLocation}}.",
      [
        "Shoot logistics: access, staging, and site readiness are Client’s responsibility. Delays may affect delivery dates.",
        "Deliverables: edited still imagery as scoped; usage license aligns with project marketing unless otherwise stated.",
        "Privacy & publicity: Client warrants authority to grant location access and to coordinate any required building or owner approvals.",
      ]
    ),
    variables: ["clientCompany", "projectTitle", "projectLocation", "clientName", "brandName", "todayDate"],
  },
  {
    title: "Corporate portrait agreement (starter)",
    type: DocumentTemplateType.CORPORATE_PORTRAIT_AGREEMENT,
    description: "Draft for executive and team portraiture.",
    contentHtml: body(
      "Portrait session terms for {{clientCompany}} on or about {{shootDate}}.",
      [
        "Sitting schedule: Client coordinates participant attendance; late arrivals may reduce coverage within the booked time.",
        "Retouching: included retouching covers standard color, contrast, and skin work; creative composite work is out of scope unless added.",
        "Usage: portrait files are licensed for Client’s corporate communications as agreed in the estimate.",
      ]
    ),
    variables: ["clientCompany", "shootDate", "clientName", "brandName", "todayDate"],
  },
  {
    title: "Image licensing addendum (starter)",
    type: DocumentTemplateType.IMAGE_LICENSING_AGREEMENT,
    description: "Addendum for expanded media licensing.",
    contentHtml: body(
      "This addendum supplements prior photography services for {{projectTitle}}.",
      [
        "Licensed assets: selected deliverables as listed in the delivery package or gallery link {{galleryLink}}.",
        "Territory & term: non-exclusive unless upgraded in writing; paid media extensions require prior approval.",
        "Attribution: credit “{{brandName}}” where customary unless waived in writing.",
      ]
    ),
    variables: ["projectTitle", "galleryLink", "brandName", "clientCompany", "todayDate"],
  },
  {
    title: "Cancellation & rescheduling (starter)",
    type: DocumentTemplateType.CANCELLATION_RESCHEDULING_AGREEMENT,
    description: "Fee schedule for schedule changes.",
    contentHtml: body(
      "For {{projectTitle}}, the following cancellation and rescheduling policy applies.",
      [
        "Notice windows and retainers follow the signed estimate or invoice.",
        "Force majeure: neither party liable for delays outside reasonable control; good-faith rescheduling applies.",
      ]
    ),
    variables: ["projectTitle", "clientCompany", "clientName", "todayDate", "brandName"],
  },
  {
    title: "Model release (starter)",
    type: DocumentTemplateType.MODEL_RELEASE,
    description: "Draft model release — jurisdiction-specific review required.",
    contentHtml: body(
      "I grant {{brandName}} and its licensees the right to use my likeness in connection with images from {{projectTitle}}.",
      [
        "I am of legal age (or parent/guardian signs below) and voluntarily consent without additional compensation beyond what is agreed separately.",
        "I release Photographer from claims arising from authorized use; moral rights are waived to the extent permitted by law.",
      ]
    ),
    variables: ["brandName", "projectTitle", "clientCompany", "todayDate"],
  },
  {
    title: "Property release (starter)",
    type: DocumentTemplateType.PROPERTY_RELEASE,
    description: "Draft property release — attorney review required.",
    contentHtml: body(
      "The undersigned owner or agent authorizes {{brandName}} to photograph {{projectLocation}} for {{projectTitle}}.",
      [
        "Authorized uses include portfolio, marketing, and client-approved editorial placements unless limited in writing.",
      ]
    ),
    variables: ["brandName", "projectLocation", "projectTitle", "clientCompany", "todayDate"],
  },
  {
    title: "Final delivery approval (starter)",
    type: DocumentTemplateType.FINAL_DELIVERY_APPROVAL,
    description: "Client acknowledgement of final delivery.",
    contentHtml: body(
      "Client acknowledges receipt and approval of final deliverables for {{projectTitle}} as provided via {{galleryLink}}.",
      [
        "Upon signing, Client accepts the deliverables as complete except for defects expressly listed in writing within five business days.",
      ]
    ),
    variables: ["clientCompany", "projectTitle", "galleryLink", "clientName", "todayDate", "brandName"],
  },
  {
    title: "Revision request (starter)",
    type: DocumentTemplateType.REVISION_REQUEST,
    description: "Structured request for post-delivery adjustments.",
    contentHtml: body(
      "Client {{clientCompany}} requests revisions related to {{projectTitle}}.",
      [
        "Scope: describe adjustments in writing; work outside the original scope may incur additional fees.",
        "Timeline: Photographer will confirm feasibility and schedule after receiving this request.",
      ]
    ),
    variables: ["clientCompany", "projectTitle", "clientName", "clientEmail", "todayDate", "brandName"],
  },
];
