"use client";

import { createContext, useContext } from "react";

export type SiteBackgroundCoexistValue = {
  siteVideoActive: boolean;
  suppressPageMedia: boolean;
};

export const SiteBackgroundCoexistContext = createContext<SiteBackgroundCoexistValue>({
  siteVideoActive: false,
  suppressPageMedia: false,
});

export function useSiteBackgroundCoexist() {
  return useContext(SiteBackgroundCoexistContext);
}
