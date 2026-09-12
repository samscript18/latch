"use client";

import {
  ENSV2_HACKATHON_ETH_REGISTRY_ADDRESS,
  ENSV2_HACKATHON_PERMISSIONED_RESOLVER_IMPL_ADDRESS,
  ENSV2_HACKATHON_VERIFIABLE_FACTORY_ADDRESS,
} from "@latch/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  keccak256,
  parseAbi,
  parseEventLogs,
  stringToHex,
  toHex,
  type Address,
  type Hash,
} from "viem";
import { normalize, packetToBytes } from "viem/ens";
import { usePublicClient, useWriteContract } from "wagmi";
import type { AgentView } from "../lib/api";
import { useWalletSession } from "./wallet-session";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const AVAILABLE = 0;
const REGISTERED = 2;
const ALL_ROLES =
  0x1111111111111111111111111111111111111111111111111111111111111111n;

const ethRegistryAbi = parseAbi([
  "function getSubregistry(string label) view returns (address)",
  "function getExpiry(uint256 anyId) view returns (uint64)",
]);
const userRegistryAbi = parseAbi([
  "function getStatus(uint256 anyId) view returns (uint8)",
  "function getResolver(string label) view returns (address)",
  "function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expiry) returns (uint256 tokenId)",
]);
const factoryAbi = parseAbi([
  "function deployProxy(address implementation, uint256 salt, bytes data) returns (address proxy)",
  "event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)",
]);
const resolverAbi = parseAbi([
  "function initialize((address account, uint256 roleBitmap)[] grants, bytes[] calls)",
  "function setAddress(bytes name, uint256 coinType, bytes addressBytes)",
  "function setText(bytes name, string key, string value)",
  "function multicall(bytes[] data) returns (bytes[] results)",
  "function grantSetterRoles(bytes setter, address account) returns (bool)",
]);

type Step = "idle" | "resolver" | "name" | "records" | "permission" | "done";

export function AgentProvisioningAction({ agent }: { agent: AgentView }) {
  const session = useWalletSession();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const organization = session.profile?.organization;
  const configured =
    agent.intendedRole &&
    agent.intendedCapabilities[0] &&
    agent.intendedPolicyVersion;

  const waitFor = async (hash: Hash) => {
    if (!client) throw new Error("Sepolia RPC client is unavailable");
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success")
      throw new Error(`Transaction ${hash} reverted`);
    return receipt;
  };

  const provision = async () => {
    if (!session.address || !organization || !client || !configured) {
      setError("Complete the organization and agent setup first");
      return;
    }
    setError(null);
    try {
      const parent = normalize(organization.ensName);
      const parentLabel = parent.split(".")[0];
      const suffix = `.${parent}`;
      const name = normalize(agent.ensName);
      const label = name.slice(0, -suffix.length);
      if (!parentLabel || parent !== `${parentLabel}.eth`) {
        throw new Error(
          "The current ENSv2 flow requires a second-level .eth organization namespace",
        );
      }
      if (!name.endsWith(suffix) || !label || label.includes(".")) {
        throw new Error(`${name} must be a direct child of ${parent}`);
      }

      const parentId = BigInt(keccak256(stringToHex(parentLabel)));
      const labelId = BigInt(keccak256(stringToHex(label)));
      const [subregistry, parentExpiry, status] = await Promise.all([
        client.readContract({
          address: ENSV2_HACKATHON_ETH_REGISTRY_ADDRESS,
          abi: ethRegistryAbi,
          functionName: "getSubregistry",
          args: [parentLabel],
        }),
        client.readContract({
          address: ENSV2_HACKATHON_ETH_REGISTRY_ADDRESS,
          abi: ethRegistryAbi,
          functionName: "getExpiry",
          args: [parentId],
        }),
        (async () => {
          const registry = await client.readContract({
            address: ENSV2_HACKATHON_ETH_REGISTRY_ADDRESS,
            abi: ethRegistryAbi,
            functionName: "getSubregistry",
            args: [parentLabel],
          });
          if (registry === ZERO_ADDRESS) return AVAILABLE;
          return Number(
            await client.readContract({
              address: registry,
              abi: userRegistryAbi,
              functionName: "getStatus",
              args: [labelId],
            }),
          );
        })(),
      ]);
      if (subregistry === ZERO_ADDRESS)
        throw new Error(
          "The organization ENS name has no ENSv2 subregistry. Configure it before provisioning agents.",
        );

      let resolver: Address;
      if (status === REGISTERED) {
        resolver = getAddress(
          await client.readContract({
            address: subregistry,
            abi: userRegistryAbi,
            functionName: "getResolver",
            args: [label],
          }),
        );
        if (resolver === ZERO_ADDRESS)
          throw new Error("The existing agent name has no resolver");
      } else if (status === AVAILABLE) {
        setStep("resolver");
        const salt = BigInt(
          keccak256(
            encodeAbiParameters(
              [{ type: "bytes32" }, { type: "address" }, { type: "bytes32" }],
              [
                keccak256(stringToHex("LATCH_AGENT_RESOLVER")),
                session.address,
                keccak256(stringToHex(name)),
              ],
            ),
          ),
        );
        const initData = encodeFunctionData({
          abi: resolverAbi,
          functionName: "initialize",
          args: [[{ account: session.address, roleBitmap: ALL_ROLES }], []],
        });
        const resolverHash = await writeContractAsync({
          address: ENSV2_HACKATHON_VERIFIABLE_FACTORY_ADDRESS,
          abi: factoryAbi,
          functionName: "deployProxy",
          args: [
            ENSV2_HACKATHON_PERMISSIONED_RESOLVER_IMPL_ADDRESS,
            salt,
            initData,
          ],
        });
        const resolverReceipt = await waitFor(resolverHash);
        const [event] = parseEventLogs({
          abi: factoryAbi,
          eventName: "ProxyDeployed",
          logs: resolverReceipt.logs,
        });
        if (!event) throw new Error("Resolver deployment event was not found");
        resolver = getAddress(event.args.proxyAddress);
        setStep("name");
        await waitFor(
          await writeContractAsync({
            address: subregistry,
            abi: userRegistryAbi,
            functionName: "register",
            args: [
              label,
              session.address,
              ZERO_ADDRESS,
              resolver,
              ALL_ROLES,
              parentExpiry,
            ],
          }),
        );
      } else {
        throw new Error(
          "The requested ENS child label is reserved or unavailable",
        );
      }

      const encodedName = toHex(packetToBytes(name));
      const capability = agent.intendedCapabilities[0];
      setStep("records");
      const calls = [
        encodeFunctionData({
          abi: resolverAbi,
          functionName: "setAddress",
          args: [encodedName, 60n, getAddress(agent.expectedWallet)],
        }),
        ...(
          [
            "latch.role",
            "latch.status",
            "latch.capabilities",
            "latch.organization",
            "latch.policyVersion",
          ] as const
        ).map((key, index) =>
          encodeFunctionData({
            abi: resolverAbi,
            functionName: "setText",
            args: [
              encodedName,
              key,
              [
                agent.intendedRole,
                "active",
                capability,
                parent,
                agent.intendedPolicyVersion,
              ][index]!,
            ],
          }),
        ),
      ];
      await waitFor(
        await writeContractAsync({
          address: resolver,
          abi: resolverAbi,
          functionName: "multicall",
          args: [calls],
        }),
      );

      setStep("permission");
      const safeSetter = encodeFunctionData({
        abi: resolverAbi,
        functionName: "setText",
        args: [encodedName, "latch.profile", ""],
      });
      await waitFor(
        await writeContractAsync({
          address: resolver,
          abi: resolverAbi,
          functionName: "grantSetterRoles",
          args: [safeSetter, getAddress(agent.expectedWallet)],
        }),
      );
      setStep("done");
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    } catch (cause) {
      setStep("idle");
      setError(
        cause instanceof Error ? cause.message : "ENS provisioning failed",
      );
    }
  };

  if (agent.ensVerified)
    return <span className="status status-active">Verified on ENSv2</span>;
  return (
    <div className="provision-action">
      <button
        className="button button-primary"
        disabled={step !== "idle" || !configured}
        onClick={provision}
      >
        {step === "idle"
          ? "Provision on ENSv2"
          : step === "resolver"
            ? "Deploying resolver…"
            : step === "name"
              ? "Creating agent name…"
              : step === "records"
                ? "Writing protected records…"
                : step === "permission"
                  ? "Delegating profile record…"
                  : "Verifying…"}
      </button>
      {error && <p className="field-error">{error}</p>}
      <small>Transactions are signed by your connected admin wallet.</small>
    </div>
  );
}
