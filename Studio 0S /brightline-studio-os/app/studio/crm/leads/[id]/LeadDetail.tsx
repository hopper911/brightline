"use client";

import { Panel } from "@/components/studio/Panel";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  status: string;
  notes?: string | null;
  clientId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function LeadDetail({ lead }: { lead: Lead }) {
  return (
    <Panel padding="base" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">Email</p>
          <p className="mt-1 text-sm text-white/95">{lead.email}</p>
        </div>
        {lead.phone && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">Phone</p>
            <p className="mt-1 text-sm text-white/95">{lead.phone}</p>
          </div>
        )}
        {lead.company && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">Company</p>
            <p className="mt-1 text-sm text-white/95">{lead.company}</p>
          </div>
        )}
        {lead.source && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">Source</p>
            <p className="mt-1 text-sm text-white/95">{lead.source}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">Status</p>
          <p className="mt-1 text-sm text-white/95">{lead.status}</p>
        </div>
      </div>
      {lead.notes && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">Notes</p>
          <p className="mt-1 text-sm text-white/80 whitespace-pre-wrap">{lead.notes}</p>
        </div>
      )}
    </Panel>
  );
}
