import type { Address } from "viem";

export interface EnsV2ReadClient {
  getBlockNumber(): Promise<bigint>;
  getEnsAddress(parameters: {
    name: string;
    universalResolverAddress: Address;
  }): Promise<Address | null>;
  getEnsResolver(parameters: {
    name: string;
    universalResolverAddress: Address;
  }): Promise<Address>;
  getEnsText(parameters: {
    key: string;
    name: string;
    universalResolverAddress: Address;
  }): Promise<string | null>;
}
