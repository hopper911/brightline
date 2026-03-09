export type ClientEntry = {
  name: string;
  url?: string;
  /** Optional: path to logo image (e.g. /images/clients/logo.svg) */
  logo?: string;
};

export const CLIENTS: ClientEntry[] = [
  { name: "Maison Delmar" },
  { name: "Meridian Studio" },
  { name: "Northpoint" },
  { name: "Atlas Square" },
  { name: "Sable & Salt" },
];
