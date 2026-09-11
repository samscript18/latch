import mongoose, { Types } from "mongoose";
import { getAddress } from "viem";
import { normalize } from "viem/ens";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main(): Promise<void> {
  const uri = required("MONGODB_URI");
  const organizationEns = normalize(required("DEMO_ORG_ENS"));
  const ownerWallet = getAddress(required("ADMIN_WALLET_ADDRESS"));
  const agents = [
    {
      displayName: "Procurement Agent",
      ensName: normalize(required("DEMO_PROCUREMENT_AGENT_ENS")),
      wallet: getAddress(required("DEMO_PROCUREMENT_AGENT_WALLET")),
    },
    {
      displayName: "Travel Agent",
      ensName: normalize(required("DEMO_TRAVEL_AGENT_ENS")),
      wallet: getAddress(required("DEMO_TRAVEL_AGENT_WALLET")),
    },
  ];

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });
  try {
    const now = new Date();
    const organizations = mongoose.connection.collection("organizations");
    const existing = await organizations.findOne({ ensName: organizationEns });
    const organizationId =
      (existing?._id as Types.ObjectId | undefined) ?? new Types.ObjectId();
    await organizations.updateOne(
      { _id: organizationId },
      {
        $set: {
          name: process.env.DEMO_ORG_NAME?.trim() || "Acme",
          ensName: organizationEns,
          ownerWallet: ownerWallet.toLowerCase(),
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    const agentCollection = mongoose.connection.collection("agents");
    for (const agent of agents) {
      await agentCollection.updateOne(
        { ensName: agent.ensName },
        {
          $set: {
            displayName: agent.displayName,
            wallet: agent.wallet.toLowerCase(),
            organizationId,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );
    }
    console.log(
      `Seeded ${agents.length} agents for ${organizationEns}. ENS data remains authoritative.`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

void main();
