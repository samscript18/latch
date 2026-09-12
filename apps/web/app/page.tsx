import Link from "next/link";
import { HeroCanvas } from "../components/hero-canvas";
import { LatchMark } from "../components/latch-logo";
import { SiteFooter, SiteHeader } from "../components/site-chrome";

const layers = [
  {
    step: "01",
    title: "Identity Verification",
    copy: "ENSv2 resolves the agent wallet, organization namespace, role, and authorized capabilities from protected onchain records.",
    detail: "Direct onchain verification via ENSv2 Sepolia subnames.",
  },
  {
    step: "02",
    title: "Organizational Authority",
    copy: "LATCH validates live administrative records for every proposed action. Revoked or unregistered agents fail closed immediately.",
    detail: "No stale database flags. Zero bypass possible.",
  },
  {
    step: "03",
    title: "Confidential Policy",
    copy: "Chainlink CRE evaluates private organizational rules inside a secure TEE without exposing spend limits or vendor restrictions.",
    detail: "Strict sanitized APPROVED / POLICY_DENIED verdict.",
  },
  {
    step: "04",
    title: "Safe Execution",
    copy: "Bazantic Recipe coordinates external catalog and payment services, executing solely the exact immutable action authorized.",
    detail: "Guaranteed single-use replay protection.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-full flex flex-col bg-black text-foreground font-sans overflow-x-hidden">
      <SiteHeader />

      <main className="relative flex flex-1 flex-col overflow-hidden pb-24">
        {/* --- Hero Section with Crazy Animations & The 2 Lines --- */}
        <section className="relative isolate overflow-hidden pt-36 md:pt-44">
          {/* Animated Background Canvas & Atmosphere */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none"
          >
            {/* 1. Interactive 3D Cyber Grid & Particle Constellation Canvas */}
            <HeroCanvas />

            {/* Dual Aurora Waves in Light Green / Cyan Neon Glow */}
            <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[850px] h-[480px] pointer-events-none">
              <div
                className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(78,250,148,0.2)_0%,rgba(52,211,153,0.1)_45%,transparent_75%)] blur-3xl"
                style={{ animation: "aurora-wave-1 9s ease-in-out infinite" }}
              />
              <div
                className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.18)_0%,rgba(56,189,248,0.08)_50%,transparent_75%)] blur-3xl"
                style={{ animation: "aurora-wave-2 11s ease-in-out infinite" }}
              />
            </div>

            {/* --- LINE 1: Top Ambient Horizon Laser Sweep Beam --- */}
            <div className="absolute inset-x-0 top-0 h-96 overflow-hidden pointer-events-none opacity-60">
              <div
                className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#4efa94] to-transparent"
                style={{
                  animation: "laser-comet 6s ease-in-out infinite",
                  filter:
                    "drop-shadow(0 0 10px #4efa94) drop-shadow(0 0 20px #34d399)",
                }}
              />
            </div>
          </div>

          <div className="relative mx-auto max-w-5xl px-6">
            {/* Conic Shimmer Eyebrow Pill */}
            <div className="flex items-center">
              <div className="relative inline-flex items-center overflow-hidden rounded-full p-[1px] shadow-[0_0_25px_rgba(78,250,148,0.25)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_35px_rgba(78,250,148,0.5)]">
                <div
                  className="absolute -inset-[150%] rounded-full bg-[conic-gradient(from_0deg,transparent_0_280deg,#4efa94_330deg,#ffffff_360deg)] pointer-events-none"
                  style={{ animation: "conic-spin 3.5s linear infinite" }}
                />
                <div className="relative flex items-center gap-2.5 rounded-full bg-[#07080A]/90 px-4 py-1.5 backdrop-blur-md border border-white/10">
                  <span className="relative flex h-2 w-2 items-center justify-center">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-[#4efa94] opacity-80" />
                    <span className="absolute h-3.5 w-3.5 rounded-full bg-[#4efa94]/20 animate-pulse" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-[#4efa94] shadow-[0_0_8px_#4efa94]" />
                  </span>
                  <span className="hero-eyebrow-shimmer font-mono text-[11px] font-semibold uppercase tracking-[0.22em]">
                    ENSv2 · Chainlink CRE · Bazantic · Autonomous Authority
                  </span>
                </div>
              </div>
            </div>

            {/* Electric Headline with Glowing Underline */}
            <div className="relative mt-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-8 -left-8 -z-10 h-44 w-96 rounded-full bg-[#4efa94]/15 blur-3xl"
              />
              <h1 className="text-left text-5xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-7xl">
                <span className="relative inline-block hero-glow-layer">
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 select-none pointer-events-none text-[#4efa94]/30 blur-xl md:blur-2xl font-bold tracking-tighter"
                  >
                    Give AI workers a job.
                  </span>
                  <span className="relative inline-block hero-title-electric font-bold">
                    Give AI workers a job.
                  </span>

                  {/* --- LINE 2: Title Underline Laser Comet --- */}
                  <span className="absolute -bottom-2.5 left-0 h-[2px] w-full overflow-hidden rounded-full bg-white/10">
                    <span
                      className="absolute inset-0 w-36 rounded-full bg-gradient-to-r from-transparent via-[#4efa94] to-transparent shadow-[0_0_14px_#4efa94]"
                      style={{
                        animation:
                          "laser-comet 2.6s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                      }}
                    />
                  </span>
                </span>
                <span className="block mt-4 text-4xl font-medium tracking-tight text-white/75 sm:text-5xl md:mt-5 md:text-6xl lg:text-7xl">
                  Not the keys to everything.
                </span>
              </h1>
            </div>

            <div>
              <p className="mt-8 max-w-2xl text-left text-lg leading-relaxed text-muted md:text-xl">
                LATCH establishes verifiable identity on ENSv2, enforces private
                organizational policy via confidential computing, and provides
                fail-closed authority before autonomous agents can touch real
                services.
              </p>
            </div>

            <div>
              <div className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Link className="brand-button" href="/app">
                  <span>Launch LATCH</span>
                  <svg
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 17L17 7M17 7H7M17 7V17"
                    />
                  </svg>
                </Link>
                <a className="brand-button-secondary" href="#how-it-works">
                  <span>How it works</span>
                  <svg
                    className="size-3.5 text-muted"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 5v14m7-7l-7 7-7-7"
                    />
                  </svg>
                </a>
              </div>
            </div>

            {/* Metrics Bar */}
            <div>
              <div className="mt-16 flex flex-wrap items-center gap-8 font-mono text-[11px] text-muted">
                <div>
                  <div className="text-base font-semibold text-foreground">
                    ENSv2
                  </div>
                  <div className="mt-0.5 uppercase tracking-[0.14em]">
                    Onchain Identity
                  </div>
                </div>
                <div>
                  <div className="text-base font-semibold text-foreground">
                    Chainlink CRE
                  </div>
                  <div className="mt-0.5 uppercase tracking-[0.14em]">
                    Confidential TEE
                  </div>
                </div>
                <div>
                  <div className="text-base font-semibold text-foreground">
                    Fail-Closed
                  </div>
                  <div className="mt-0.5 uppercase tracking-[0.14em]">
                    Decision Model
                  </div>
                </div>
                <div>
                  <div className="text-base font-semibold text-foreground">
                    Bazantic
                  </div>
                  <div className="mt-0.5 uppercase tracking-[0.14em]">
                    Controlled Execution
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- Interactive 3D Product Perspective Preview --- */}
          <div
            className="product-perspective group relative -mt-4 px-4 pt-16 pb-16 md:px-0"
            style={{
              WebkitMaskImage:
                "linear-gradient(180deg, transparent, black 5%, black 85%, transparent)",
              maskImage:
                "linear-gradient(180deg, transparent, black 5%, black 85%, transparent)",
            }}
          >
            <div className="relative mx-auto max-w-[1300px] overflow-hidden rounded-xl border border-white/10 bg-[#0F1012] product-preview cursor-pointer select-none">
              <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_bottom_right,rgba(255,255,255,0.05)_0%,transparent_40%)]" />

              <div className="grid h-[640px] grid-cols-[220px_340px_1fr] divide-x divide-white/[0.05]">
                {/* Column 1: Sidebar Simulation */}
                <div className="flex h-full flex-col bg-[#0F1012] p-4">
                  <div className="flex h-12 items-center gap-2 border-b border-white/[0.05] pb-3">
                    <span className="inline-flex items-center gap-2.5 font-semibold text-white text-[13px]">
                      <LatchMark className="size-7 shrink-0" />
                      LATCH
                    </span>
                    <span className="ml-auto rounded-sm border border-white/10 bg-white/[0.02] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
                      Sepolia
                    </span>
                  </div>

                  <div className="mt-4 space-y-1">
                    <div className="flex items-center gap-3 rounded-md bg-white/[0.06] px-3 py-2 text-[13px] text-foreground">
                      <span className="size-2 rounded-full bg-[#4efa94] shadow-[0_0_6px_#4efa94]" />
                      <span>Console</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-muted">
                      <span className="size-2 rounded-full bg-white/20" />
                      <span>AI Workers</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-muted">
                      <span className="size-2 rounded-full bg-white/20" />
                      <span>Activity Log</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-muted">
                      <span className="size-2 rounded-full bg-white/20" />
                      <span>Integrations</span>
                    </div>
                  </div>

                  <div className="mt-auto border-t border-white/[0.05] pt-3">
                    <div className="flex items-center gap-2 font-mono text-[10px] text-muted">
                      <span className="relative flex h-1.5 w-1.5 rounded-full bg-[#4efa94]">
                        <span className="absolute inset-0 animate-ping rounded-full bg-[#4efa94] opacity-60" />
                      </span>
                      <span>indexer live · Sepolia ENSv2</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Live Action Requests Stream */}
                <div className="flex h-full flex-col bg-[#0B0C0E]">
                  <div className="flex h-12 items-center justify-between border-b border-white/[0.05] px-4">
                    <span className="text-[13px] font-medium text-foreground/85">
                      Live agent proposals
                    </span>
                    <span className="font-mono text-[10px] text-[#4efa94]">
                      STREAM
                    </span>
                  </div>

                  <ul className="flex-1 overflow-hidden divide-y divide-white/[0.04]">
                    <li className="p-3.5 border-l-2 border-l-[#4efa94] bg-[#16181D]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-[#4efa94]">
                          ACT-0082
                        </span>
                        <span className="h-1 w-1 rounded-full bg-muted/60" />
                        <span className="text-[10px] text-muted">
                          $4,200.00
                        </span>
                      </div>
                      <p className="text-[12px] font-medium text-foreground">
                        procurement.acme.eth · 20 Monitors
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-sm border border-[#4efa94]/20 bg-[#4efa94]/[0.07] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-[#4efa94]">
                          APPROVED
                        </span>
                        <span className="font-mono text-[10px] text-muted/70">
                          TEE Verified
                        </span>
                      </div>
                    </li>

                    <li className="p-3.5 hover:bg-white/[0.02]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-muted">
                          ACT-0081
                        </span>
                        <span className="h-1 w-1 rounded-full bg-muted/60" />
                        <span className="text-[10px] text-muted">
                          $12,500.00
                        </span>
                      </div>
                      <p className="text-[12px] text-foreground/80">
                        research.acme.eth · Restricted Domain Search
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-sm border border-red-500/20 bg-red-500/[0.07] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-red-400">
                          POLICY_DENIED
                        </span>
                        <span className="font-mono text-[10px] text-muted/70">
                          Exceeds Limit
                        </span>
                      </div>
                    </li>

                    <li className="p-3.5 hover:bg-white/[0.02]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-muted">
                          ACT-0080
                        </span>
                      </div>
                      <p className="text-[12px] text-foreground/80">
                        ops.acme.eth · Cloud Server Spinup
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-sm border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
                          REVOKED_IDENTITY
                        </span>
                        <span className="font-mono text-[10px] text-muted">
                          ENS Stopped
                        </span>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Column 3: Authorization Decision & TEE Code Inspection */}
                <div className="flex h-full flex-col bg-[#0B0C0E] p-6 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
                    <div>
                      <span className="font-mono text-[11px] text-muted">
                        ACT-0082 · Procurement Action
                      </span>
                      <h3 className="text-xl font-medium tracking-tight text-foreground mt-1">
                        Confidential Policy Evaluation
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-sm border border-[#4efa94]/20 bg-[#4efa94]/[0.08] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#4efa94]">
                        ✓ Authorized by TEE
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4 text-[13px] text-foreground/75">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                          Identity
                        </div>
                        <div className="mt-1 font-mono text-base font-semibold text-[#4efa94]">
                          ENS VERIFIED
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                          Spend Amount
                        </div>
                        <div className="mt-1 font-mono text-base font-semibold text-foreground">
                          $4,200.00
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                          CRE Verdict
                        </div>
                        <div className="mt-1 font-mono text-base font-semibold text-[#4efa94]">
                          APPROVED
                        </div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#090A0B]">
                      <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#131416] px-4 py-2">
                        <span className="font-mono text-[11px] text-muted">
                          latch/policy-evaluator.ts
                        </span>
                        <span className="font-mono text-[10px] text-muted/70">
                          Confidential TEE
                        </span>
                      </div>
                      <div className="p-4 font-mono text-[11px] leading-5 space-y-1">
                        <div className="text-muted/70">
                          // TEE evaluates policy secrets without leaking limits
                        </div>
                        <div>
                          <span className="text-purple-400">const</span>{" "}
                          <span className="text-blue-300">policy</span> ={" "}
                          <span className="text-yellow-300">await</span>{" "}
                          runtime.
                          <span className="text-yellow-300">getSecret</span>(
                          <span className="text-[#4efa94]">&quot;procurement_policy&quot;</span>
                          );
                        </div>
                        <div>
                          <span className="text-purple-400">const</span>{" "}
                          <span className="text-blue-300">decision</span> ={" "}
                          evaluatePolicy(action, policy);
                        </div>
                        <div className="text-[#4efa94] pt-2">
                          ✓ Verdict: APPROVED · Passed to Bazantic Recipe
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          Execute authorized task
                        </p>
                        <p className="text-[11px] text-muted">
                          Releases capability to Bazantic external gateway
                        </p>
                      </div>
                      <span className="cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-foreground">
                        Dispatched <span className="text-[#4efa94]">✓</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Continuous Running Marquee Ticker */}
          <div
            className="group relative mt-10 overflow-hidden border-y border-white/[0.06] bg-black/40 py-3 backdrop-blur-sm md:-mt-4"
            style={{
              WebkitMaskImage:
                "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
              maskImage:
                "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
            }}
          >
            <div className="flex w-max gap-10 whitespace-nowrap font-mono text-[11px] animate-marquee">
              {[1, 2].map((iter) => (
                <div className="flex gap-10" key={iter}>
                  <div className="flex items-center gap-3 text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4efa94]" />
                    <span className="text-foreground/85 font-medium">
                      procurement.acme.eth
                    </span>
                    <span className="text-muted/60">·</span>
                    <span className="text-foreground/70">proposed</span>
                    <span className="text-muted/60">·</span>
                    <span className="text-foreground/90">20 Monitors</span>
                    <span className="text-muted/60">·</span>
                    <span className="text-[#4efa94] font-semibold uppercase tracking-[0.14em]">
                      APPROVED
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    <span className="text-foreground/85 font-medium">
                      research.acme.eth
                    </span>
                    <span className="text-muted/60">·</span>
                    <span className="text-foreground/70">proposed</span>
                    <span className="text-muted/60">·</span>
                    <span className="text-foreground/90">Restricted Domain Search</span>
                    <span className="text-muted/60">·</span>
                    <span className="text-red-400 font-semibold uppercase tracking-[0.14em]">
                      POLICY_DENIED
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4efa94]" />
                    <span className="text-foreground/85 font-medium">
                      ops.acme.eth
                    </span>
                    <span className="text-muted/60">·</span>
                    <span className="text-foreground/70">executed</span>
                    <span className="text-muted/60">·</span>
                    <span className="text-foreground/90">Compute Cluster</span>
                    <span className="text-muted/60">·</span>
                    <span className="text-[#4efa94] font-semibold uppercase tracking-[0.14em]">
                      CONFIRMED
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4efa94]" />
                    <span className="text-foreground/85 font-medium">
                      finance.acme.eth
                    </span>
                    <span className="text-muted/60">·</span>
                    <span className="text-foreground/70">authorized</span>
                    <span className="text-muted/60">·</span>
                    <span className="text-foreground/90">SaaS Renewal</span>
                    <span className="text-muted/60">·</span>
                    <span className="text-[#4efa94] font-semibold uppercase tracking-[0.14em]">
                      RECORDED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- How It Works 4-Step Grid --- */}
        <section
          id="how-it-works"
          className="relative z-10 mx-auto max-w-[1300px] px-6 pt-24 pb-20"
        >
          <div className="mb-16 max-w-4xl">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em]">
              <span className="relative inline-flex h-1.5 w-1.5 bg-[#4efa94] rounded-full" />
              <span className="text-foreground/70">How LATCH Works</span>
            </span>
            <h2 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-6xl">
              Propose intent. <br className="hidden md:block" />
              <span className="text-muted">Prove authority. Execute safely.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              Tool access is not authority. LATCH ensures autonomous workers
              operate only within explicit company boundaries, with immutable
              cryptographic proofs at every step.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {layers.map((layer) => (
              <div
                className="relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-white/[0.07] to-white/0 p-8 border border-white/10 transition-all duration-300 hover:border-white/20"
                key={layer.step}
              >
                <div className="inner-border-mask" />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-[#4efa94] font-semibold">
                    {layer.step}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-muted">
                    <LatchMark className="size-4 text-[#4efa94]" />
                  </span>
                </div>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
                  {layer.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {layer.copy}
                </p>
                <div className="mt-6 border-t border-white/5 pt-4 font-mono text-[11px] text-muted/80">
                  {layer.detail}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- Accountable Autonomy Deep Dive --- */}
        <section className="relative z-10 mx-auto mt-12 mb-24 max-w-[1300px] px-6">
          <div className="mb-16 max-w-4xl">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em]">
              <span className="relative inline-flex h-1.5 w-1.5 bg-[#4efa94] rounded-full">
                <span className="absolute inset-0 animate-ping rounded-full bg-[#4efa94] opacity-60" />
              </span>
              <span className="text-[#4efa94]">Fail-Closed Architecture</span>
            </span>
            <h2 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-6xl">
              An identity that can be trusted.{" "}
              <span className="text-muted">Authority that can be revoked.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              Organizations retain full ownership of authorization-critical ENS
              records. Agents cannot elevate their privileges, modify confidential
              rules, or reverse revocation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="relative overflow-hidden rounded-2xl border border-[#4efa94]/20 bg-[#0B0C0E] p-6 text-left shadow-xl">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-[#4efa94]/30 bg-[#4efa94]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#4efa94]">
                  Authorized
                </span>
                <span className="font-mono text-[10px] text-muted">Stage 4/4</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Correct Agent + Compliant Action
              </h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                ENS identity active, action strictly within private spend thresholds,
                and capability released directly to Bazantic.
              </p>
              <div className="mt-6 border-t border-white/5 pt-3 font-mono text-[11px] text-[#4efa94]">
                ✓ Complete execution authorized
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-[#0B0C0E] p-6 text-left shadow-xl">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-red-400">
                  Policy Blocked
                </span>
                <span className="font-mono text-[10px] text-muted">Stage 3/4</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Verified Agent + Non-compliant Action
              </h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Agent identity is authentic on ENS, but proposed spend exceeds confidential
                organizational rules inside the CRE TEE.
              </p>
              <div className="mt-6 border-t border-white/5 pt-3 font-mono text-[11px] text-red-400">
                × Stopped by confidential policy
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-[#0B0C0E] p-6 text-left shadow-xl">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-red-400">
                  Identity Blocked
                </span>
                <span className="font-mono text-[10px] text-muted">Stage 1/4</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Revoked or Unregistered Worker
              </h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Admin wrote revocation to ENS records. Future execution fails immediately
                before any policy or API call is triggered.
              </p>
              <div className="mt-6 border-t border-white/5 pt-3 font-mono text-[11px] text-red-400">
                × Terminated at identity boundary
              </div>
            </div>
          </div>
        </section>

        {/* --- Launch CTA Banner --- */}
        <section className="relative mx-auto mt-12 max-w-6xl rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-white/[0.07] to-white/0 p-8 backdrop-blur sm:p-14">
          <div className="inner-border-mask" />
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#4efa94]">
                <span className="size-1.5 rounded-full bg-[#4efa94]" />
                Establish Your Authority Boundary
              </span>
              <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tighter text-foreground sm:text-5xl">
                Put every agent action through a verifiable decision.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
                Connect your organization admin wallet, configure your ENS namespace,
                and onboard the AI workers LATCH should protect.
              </p>
            </div>
            <div className="flex flex-col items-start lg:items-end justify-center lg:col-span-4 gap-4">
              <Link className="brand-button w-full sm:w-auto" href="/app">
                <span>Launch LATCH</span>
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 17L17 7M17 7H7M17 7V17"
                  />
                </svg>
              </Link>
              <p className="font-mono text-[11px] text-muted text-left lg:text-right">
                Identity on ENSv2. <br />
                <span className="text-[#4efa94]">
                  Confidential policy by Chainlink CRE.
                </span>
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
