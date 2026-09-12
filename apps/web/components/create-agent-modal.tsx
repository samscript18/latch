"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { api, type AgentView } from "../lib/api";
import { useWalletSession } from "./wallet-session";

const templates = {
  procurement: {
    name: "Procurement Agent",
    description: "Source products and request authorized purchases.",
    capability: "procurement.purchase",
    accent: "procurement",
  },
  research: {
    name: "Research Agent",
    description: "Perform authorized web research using approved research tools.",
    capability: "research.search",
    accent: "research",
  },
} as const;

type AgentType = keyof typeof templates;

export function CreateAgentModal() {
  const session = useWalletSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AgentType>("procurement");
  const [label, setLabel] = useState("procurement");
  const [wallet, setWallet] = useState("");
  const parent = session.profile?.organization?.ensName ?? "organization.eth";
  const ensName = `${label.trim().toLowerCase()}.${parent}`;

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const create = useMutation({
    mutationFn: () =>
      api<AgentView>("/agents", {
        method: "POST",
        headers: { authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ type, ensName, wallet }),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agents"] }),
        session.refreshProfile(),
      ]);
      setOpen(false);
      setWallet("");
    },
  });

  const selectType = (next: AgentType) => {
    setType(next);
    if (label === "procurement" || label === "research") setLabel(next);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <>
      <button className="brand-button" type="button" onClick={() => setOpen(true)}>
        Create AI Worker
      </button>
      {open && (
        <div className="dialog-backdrop create-agent-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="dialog create-agent-dialog" role="dialog" aria-modal="true" aria-labelledby="create-agent-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="agent-dialog-glow" aria-hidden="true" />
            <div className="agent-modal-heading">
              <div>
                <div className="agent-modal-kicker"><span>01</span> Identity provisioning</div>
                <h2 id="create-agent-title">Create an AI worker</h2>
                <p>Choose a governed role, assign its ENS identity, and bind the wallet that will operate it.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label="Close dialog">
                <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="agent-form-section-heading">
                <span>Worker template</span>
                <small>Role and capability are enforced server-side</small>
              </div>
              <div className="agent-template-grid">
                {Object.entries(templates).map(([key, template]) => (
                  <button
                    type="button"
                    key={key}
                    aria-pressed={type === key}
                    className={`agent-type-option agent-type-${template.accent} ${type === key ? "agent-type-option-selected" : ""}`}
                    onClick={() => selectType(key as AgentType)}
                  >
                    <span className="agent-template-topline">
                      <AgentTypeIcon type={key as AgentType} />
                      <i aria-hidden="true">{type === key ? "✓" : ""}</i>
                    </span>
                    <span className="agent-template-copy"><strong>{template.name}</strong><small>{template.description}</small></span>
                    <code><span aria-hidden="true" />{template.capability}</code>
                  </button>
                ))}
              </div>
              <div className="agent-form-section-heading agent-identity-heading">
                <span>Identity details</span>
                <small>Stored for this organization</small>
              </div>
              <div className="form-grid agent-create-fields">
                <label className="agent-field">
                  <span>ENS subname</span>
                  <div className="subname-input">
                    <input required autoComplete="off" value={label} onChange={(event) => setLabel(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
                    <span>.{parent}</span>
                  </div>
                  <small>Permanent, human-readable worker identity</small>
                </label>
                <label className="agent-field">
                  <span>Operator wallet</span>
                  <div className="wallet-address-input">
                    <span aria-hidden="true">◇</span>
                    <input required value={wallet} onChange={(event) => setWallet(event.target.value.trim())} placeholder="0x0000…" />
                  </div>
                  <small>The wallet address this identity must resolve to</small>
                </label>
              </div>
              <div className="agent-preview">
                <div className="agent-preview-mark" aria-hidden="true"><AgentTypeIcon type={type} /></div>
                <div className="agent-preview-identity">
                  <span>ENS identity preview</span>
                  <strong>{label ? ensName : `worker.${parent}`}</strong>
                  <small>{templates[type].name} · {templates[type].capability}</small>
                </div>
                <div className="agent-preview-security"><i /> Protected records</div>
              </div>
              {create.error && <div className="notice error">{create.error.message}</div>}
              <footer className="dialog-actions">
                <button className="brand-button-secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
                <button className="brand-button" disabled={create.isPending}>
                  <span>{create.isPending ? "Creating worker…" : "Create worker"}</span>
                  {!create.isPending && <span aria-hidden="true">→</span>}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function AgentTypeIcon({ type }: { type: AgentType }) {
  return type === "procurement" ? (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M4 7h16l-1.2 11H5.2L4 7Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" /><path d="M8 9V6a4 4 0 0 1 8 0v3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /></svg>
  ) : (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.5" /><path d="m15.5 15.5 4 4M7.5 10.5h6M10.5 7.5v6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /></svg>
  );
}
