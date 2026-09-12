"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, type AgentView } from "../lib/api";
import { useWalletSession } from "./wallet-session";

const templates = {
  procurement: {
    name: "Procurement Agent",
    description: "Source products and request authorized purchases.",
    capability: "procurement.purchase",
  },
  research: {
    name: "Research Agent",
    description: "Perform authorized web research using approved research tools.",
    capability: "research.search",
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
        <div className="dialog-backdrop">
          <section className="dialog create-agent-dialog" role="dialog" aria-modal="true" aria-labelledby="create-agent-title">
            <div className="agent-modal-heading">
              <div>
                <p className="eyebrow">Supported AI workers</p>
                <h2 id="create-agent-title">Create AI Worker</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            <form onSubmit={submit}>
              <div className="agent-template-grid">
                {Object.entries(templates).map(([key, template]) => (
                  <button
                    type="button"
                    key={key}
                    aria-pressed={type === key}
                    className={`agent-type-option ${type === key ? "agent-type-option-selected" : ""}`}
                    onClick={() => selectType(key as AgentType)}
                  >
                    <strong>{template.name}</strong>
                    <small>{template.description}</small>
                    <code>{template.capability}</code>
                  </button>
                ))}
              </div>
              <div className="form-grid agent-create-fields">
                <label>
                  Agent subname
                  <div className="subname-input">
                    <input required value={label} onChange={(event) => setLabel(event.target.value.replace(/\./g, ""))} />
                    <span>.{parent}</span>
                  </div>
                </label>
                <label>
                  Agent wallet
                  <input required value={wallet} onChange={(event) => setWallet(event.target.value)} placeholder="0x…" />
                </label>
              </div>
              <div className="agent-preview">
                <span>Identity preview</span>
                <strong>{ensName}</strong>
                <small>Role and capability are assigned by the {templates[type].name} template.</small>
              </div>
              {create.error && <div className="notice error">{create.error.message}</div>}
              <footer className="dialog-actions">
                <button className="brand-button-secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
                <button className="brand-button" disabled={create.isPending}>
                  {create.isPending ? "Creating Worker…" : "Create Worker"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
