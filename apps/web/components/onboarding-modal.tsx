"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useWalletSession, type OrganizationProfile } from "./wallet-session";

interface AgentInput {
  displayName: string;
  ensName: string;
  wallet: string;
  role: "procurement" | "travel";
  capability: "procurement.purchase" | "travel.booking";
  policyVersion: string;
}

export function OnboardingModal() {
  const session = useWalletSession();
  const existing = session.profile?.organization;
  const [name, setName] = useState("");
  const [ensName, setEnsName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [agents, setAgents] = useState<AgentInput[]>([
    {
      displayName: "Procurement Agent",
      ensName: "",
      wallet: "",
      role: "procurement",
      capability: "procurement.purchase",
      policyVersion: "procurement-v1",
    },
  ]);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setEnsName(existing.ensName);
    setIndustry(existing.industry);
    setWebsite(existing.website);
    if (existing.agents.length)
      setAgents(
        existing.agents.map((agent) => ({
          ...agent,
          role: agent.role ?? "procurement",
          capability: agent.capability ?? "procurement.purchase",
          policyVersion: agent.policyVersion ?? "procurement-v1",
        })),
      );
  }, [existing]);

  const save = useMutation({
    mutationFn: () =>
      api<{ organization: OrganizationProfile }>("/organization/me", {
        method: "PUT",
        headers: { authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ name, ensName, industry, website, agents }),
      }),
    onSuccess: () => session.refreshProfile(),
  });

  if (
    !session.connected ||
    !session.token ||
    session.profileLoading ||
    session.profile?.complete
  ) {
    return null;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };
  const updateAgent = <K extends keyof AgentInput>(
    index: number,
    field: K,
    value: AgentInput[K],
  ) => {
    setAgents((current) =>
      current.map((agent, position) =>
        position === index ? { ...agent, [field]: value } : agent,
      ),
    );
  };

  return (
    <div className="dialog-backdrop onboarding-backdrop">
      <section
        className="onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <header className="onboarding-header">
          <div>
            <p className="eyebrow">Organization setup</p>
            <h2 id="onboarding-title">Establish your LATCH workspace</h2>
            <p>
              Connect your company namespace to the AI workers whose authority
              LATCH will verify. Saving this profile does not create ENS
              records.
            </p>
          </div>
          <span className="setup-step">Required</span>
        </header>
        <form onSubmit={submit} className="onboarding-form">
          <fieldset>
            <legend>Organization</legend>
            <div className="form-grid">
              <label>
                Organization name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme"
                />
              </label>
              <label>
                Industry
                <input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Technology"
                />
              </label>
              <label>
                Organization ENS namespace
                <input
                  required
                  value={ensName}
                  onChange={(e) => setEnsName(e.target.value)}
                  placeholder="company.eth"
                />
              </label>
              <label>
                Website
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://company.com"
                />
              </label>
              <label className="full-field">
                Connected admin wallet
                <input readOnly value={session.address ?? ""} />
              </label>
            </div>
          </fieldset>
          <fieldset>
            <div className="fieldset-heading">
              <legend>AI workers</legend>
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setAgents((items) => [
                    ...items,
                    {
                      displayName: "",
                      ensName: "",
                      wallet: "",
                      role: "procurement",
                      capability: "procurement.purchase",
                      policyVersion: "procurement-v1",
                    },
                  ])
                }
              >
                + Add agent
              </button>
            </div>
            <p className="field-help">
              Each ENS identity must be a subname of the organization namespace.
              ENS remains authoritative for role, status and capabilities.
            </p>
            <div className="agent-input-list">
              {agents.map((agent, index) => (
                <div className="agent-input-row" key={index}>
                  <label>
                    Display name
                    <input
                      required
                      value={agent.displayName}
                      onChange={(e) =>
                        updateAgent(index, "displayName", e.target.value)
                      }
                      placeholder="Procurement Agent"
                    />
                  </label>
                  <label>
                    Agent ENS name
                    <input
                      required
                      value={agent.ensName}
                      onChange={(e) =>
                        updateAgent(index, "ensName", e.target.value)
                      }
                      placeholder={`procurement.${ensName || "company.eth"}`}
                    />
                  </label>
                  <label>
                    Agent wallet
                    <input
                      required
                      value={agent.wallet}
                      onChange={(e) =>
                        updateAgent(index, "wallet", e.target.value)
                      }
                      placeholder="0x…"
                    />
                  </label>
                  <label>
                    Intended role
                    <select
                      value={agent.role}
                      onChange={(event) => {
                        const role = event.target.value as AgentInput["role"];
                        updateAgent(index, "role", role);
                        updateAgent(
                          index,
                          "capability",
                          role === "procurement"
                            ? "procurement.purchase"
                            : "travel.booking",
                        );
                      }}
                    >
                      <option value="procurement">Procurement</option>
                      <option value="travel">Travel</option>
                    </select>
                  </label>
                  <label>
                    Capability
                    <input readOnly value={agent.capability} />
                  </label>
                  <label>
                    Policy version
                    <input
                      required
                      value={agent.policyVersion}
                      onChange={(event) =>
                        updateAgent(index, "policyVersion", event.target.value)
                      }
                    />
                  </label>
                  {agents.length > 1 && (
                    <button
                      type="button"
                      className="danger-link remove-agent"
                      onClick={() =>
                        setAgents((items) =>
                          items.filter((_, position) => position !== index),
                        )
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </fieldset>
          <div className="onboarding-note">
            After setup, LATCH resolves these identities from the ENSv2 Sepolia
            deployment. Missing onchain records remain visibly unverified and
            cannot authorize actions.
          </div>
          {save.error && (
            <div className="notice error">{save.error.message}</div>
          )}
          <footer className="dialog-actions">
            <button
              type="button"
              className="button"
              onClick={session.disconnectWallet}
            >
              Use another wallet
            </button>
            <button className="button button-primary" disabled={save.isPending}>
              {save.isPending ? "Saving workspace…" : "Create workspace"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
