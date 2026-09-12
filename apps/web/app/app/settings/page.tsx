"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { PageSkeleton } from "../../../components/loading-state";
import { useWalletSession, type OrganizationProfile } from "../../../components/wallet-session";
import { api } from "../../../lib/api";

type SettingsTab = "profile" | "policy";
const splitList = (value: string) => [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))];

export default function SettingsPage() {
  const session = useWalletSession();
  const organization = session.profile?.organization;
  const policy = organization?.policy;
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [provider, setProvider] = useState<"manual" | "chainlink">("manual");
  const [maxSpend, setMaxSpend] = useState("2000");
  const [vendors, setVendors] = useState("demo-vendor-a, demo-vendor-b");
  const [allowedDomains, setAllowedDomains] = useState("");
  const [blockedDomains, setBlockedDomains] = useState("");
  const [maxResults, setMaxResults] = useState("10");

  useEffect(() => {
    if (!organization) return;
    setName(organization.name);
    setIndustry(organization.industry ?? "");
    setWebsite(organization.website ?? "");
  }, [organization]);

  useEffect(() => {
    if (!policy) return;
    setProvider(policy.provider);
    if (policy.procurement.maxAutonomousSpendCents !== undefined) setMaxSpend(String(policy.procurement.maxAutonomousSpendCents / 100));
    setVendors(policy.procurement.allowedVendors?.join(", ") ?? "");
    setAllowedDomains(policy.research.allowedDomains?.join(", ") ?? "");
    setBlockedDomains(policy.research.blockedDomains?.join(", ") ?? "");
    if (policy.research.maxResults !== undefined) setMaxResults(String(policy.research.maxResults));
  }, [policy]);

  const profileSave = useMutation({
    mutationFn: () => api<{ organization: OrganizationProfile }>("/organization/me/profile", {
      method: "PUT", headers: { authorization: `Bearer ${session.token}` }, body: JSON.stringify({ name, industry, website }),
    }),
    onSuccess: () => session.refreshProfile(),
  });
  const policySave = useMutation({
    mutationFn: () => api<{ organization: OrganizationProfile }>("/organization/me/policy", {
      method: "PUT",
      headers: { authorization: `Bearer ${session.token}` },
      body: JSON.stringify(provider === "chainlink" ? { provider } : {
        provider,
        procurement: { policyVersion: "procurement-v1", maxAutonomousSpendCents: Math.round(Number(maxSpend) * 100), allowedVendors: splitList(vendors) },
        research: { policyVersion: "research-v1", allowedDomains: splitList(allowedDomains), blockedDomains: splitList(blockedDomains), maxResults: Number(maxResults) },
      }),
    }),
    onSuccess: () => session.refreshProfile(),
  });

  if (session.profileLoading) return <PageSkeleton cards={3} />;

  return (
    <main className="detail-shell app-page">
      <header className="detail-header"><div><p className="eyebrow">Organization controls</p><h1>Settings</h1><p className="muted">Manage workspace information and action enforcement in one place.</p></div></header>
      <nav className="settings-tabs" aria-label="Settings sections">
        <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>Profile settings</button>
        <button className={tab === "policy" ? "active" : ""} onClick={() => setTab("policy")}>Policy settings</button>
      </nav>

      {tab === "profile" ? (
        <form className="settings-form" onSubmit={(event) => { event.preventDefault(); profileSave.mutate(); }}>
          <section className="panel settings-section">
            <div><p className="eyebrow">Workspace profile</p><h2>Organization information</h2><p className="muted">The ENS namespace and owner wallet are identity anchors and cannot be changed here.</p></div>
            <div className="settings-fields">
              <label>Organization name<input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} /></label>
              <label>Industry<input value={industry} onChange={(event) => setIndustry(event.target.value)} /></label>
              <label className="full-field">Website<input type="url" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://example.com" /></label>
              <label>ENS namespace<input disabled value={organization?.ensName ?? ""} /></label>
              <label>Admin wallet<input disabled value={organization?.ownerWallet ?? ""} /></label>
            </div>
          </section>
          <SaveState pending={profileSave.isPending} success={profileSave.isSuccess} error={profileSave.error} message="Profile settings saved." label="Save profile" />
        </form>
      ) : (
        <form className="policy-settings" onSubmit={(event: FormEvent) => { event.preventDefault(); policySave.mutate(); }}>
          <section className="panel policy-provider-selector"><h2>Enforcement provider</h2><div className="agent-template-grid">
            <button type="button" className={`agent-type-option ${provider === "chainlink" ? "agent-type-option-selected" : ""}`} onClick={() => setProvider("chainlink")}><strong>Chainlink Confidential</strong><small>Rules remain in CRE secrets and only sanitized verdicts leave the TEE.</small><code>Production</code></button>
            <button type="button" className={`agent-type-option ${provider === "manual" ? "agent-type-option-selected" : ""}`} onClick={() => setProvider("manual")}><strong>Manual</strong><small>Organization-specific rules stored for transparent local enforcement.</small><code>Development</code></button>
          </div></section>
          {provider === "chainlink" ? (
            <section className="policy-grid"><PolicyStatus title="Procurement Policy" status={policy?.procurement.status ?? "Connected externally"} /><PolicyStatus title="Research Policy" status={policy?.research.status ?? "Connected externally"} /><div className="onboarding-note policy-secret-note">Secret policy values are intentionally unavailable here. Configure both CRE secrets in the server deployment environment.</div></section>
          ) : (
            <section className="policy-grid">
              <div className="panel policy-form-card"><p className="eyebrow">procurement.purchase</p><h2>Procurement Policy</h2><label>Maximum autonomous spend (USD)<input required min="0" step="0.01" type="number" value={maxSpend} onChange={(event) => setMaxSpend(event.target.value)} /></label><label>Allowed vendors<textarea rows={3} value={vendors} onChange={(event) => setVendors(event.target.value)} /></label></div>
              <div className="panel policy-form-card"><p className="eyebrow">research.search</p><h2>Research Policy</h2><label>Allowed domains<textarea rows={3} value={allowedDomains} onChange={(event) => setAllowedDomains(event.target.value)} placeholder="Leave empty for unrestricted domains" /></label><label>Blocked domains<textarea rows={3} value={blockedDomains} onChange={(event) => setBlockedDomains(event.target.value)} /></label><label>Maximum results<input required min="1" max="20" type="number" value={maxResults} onChange={(event) => setMaxResults(event.target.value)} /></label></div>
            </section>
          )}
          <SaveState pending={policySave.isPending} success={policySave.isSuccess} error={policySave.error} message="Policy settings saved." label="Save policy" />
        </form>
      )}
    </main>
  );
}

function SaveState({ pending, success, error, message, label }: { pending: boolean; success: boolean; error: Error | null; message: string; label: string }) {
  return <><div aria-live="polite">{error && <div className="notice error">{error.message}</div>}{success && <div className="notice status-configured">{message}</div>}</div><div className="dialog-actions"><button className="brand-button" disabled={pending}>{pending ? "Saving…" : label}</button></div></>;
}

function PolicyStatus({ title, status }: { title: string; status: string }) {
  return <article className="panel policy-status-card"><div><p className="eyebrow">Confidential policy</p><h2>{title}</h2></div><span className="status status-configured">{status.replaceAll("_", " ")}</span></article>;
}
