import { Inject, Injectable } from "@nestjs/common";
import {
  AuthorizationRequestSchema,
  publicDenialMessages,
  type AuthorizationRequest,
  type AuthorizationResponse,
} from "@latch/shared";
import {
  CONFIDENTIAL_POLICY_PROVIDER,
  type ConfidentialPolicyProvider,
} from "../chainlink/policy-provider.interface.js";
import { PublicActivityService } from "../common/public-activity.service.js";
import { EnsAuthorizationService } from "../ens/ens-authorization.service.js";

@Injectable()
export class AuthorizationOrchestrator {
  constructor(
    @Inject(EnsAuthorizationService)
    private readonly ens: EnsAuthorizationService,
    @Inject(CONFIDENTIAL_POLICY_PROVIDER)
    private readonly policy: ConfidentialPolicyProvider,
    @Inject(PublicActivityService)
    private readonly activity: PublicActivityService,
  ) {}

  async authorize(
    unsafeRequest: AuthorizationRequest,
    onProgress?: (stage: "ens_authorized" | "policy_checking") => Promise<void>,
  ): Promise<AuthorizationResponse> {
    const request = AuthorizationRequestSchema.parse(unsafeRequest);
    const baseActivity = {
      taskId: request.taskId,
      agentName: request.agentName,
      capability: request.capability,
    };
    this.activity.record({
      ...baseActivity,
      stage: "authorization",
      result: "started",
    });

    const ens = await this.ens.authorize({
      agentName: request.agentName,
      expectedWallet: request.agentWallet,
      capability: request.capability,
      expectedOrganization: request.organization,
    });

    if (!ens.authorized) {
      const code = ens.denialCode ?? "ENS_NAME_UNRESOLVED";
      this.activity.record({
        ...baseActivity,
        stage: "ens",
        result: "blocked",
        publicDenialCode: code,
      });
      return {
        authorized: false,
        stage: "ens",
        code,
        message: publicDenialMessages[code],
      };
    }

    this.activity.record({
      ...baseActivity,
      stage: "ens",
      result: "authorized",
    });
    if (!ens.policyVersion) {
      return {
        authorized: false,
        stage: "ens",
        code: "ENS_NAME_UNRESOLVED",
        message: publicDenialMessages.ENS_NAME_UNRESOLVED,
      };
    }
    await onProgress?.("ens_authorized");
    await onProgress?.("policy_checking");

    let verdict;
    try {
      verdict = await this.policy.evaluate(
        request.capability === "procurement.purchase"
          ? {
              taskId: request.taskId,
              agent: request.agentName,
              capability: request.capability,
              vendor: request.vendor,
              amountCents: request.amountCents,
              policyVersion: ens.policyVersion,
            }
          : {
              taskId: request.taskId,
              agent: request.agentName,
              capability: request.capability,
              query: request.query,
              domains: request.domains,
              maxResults: request.maxResults,
              policyVersion: ens.policyVersion,
            },
      );
    } catch {
      this.activity.record({
        ...baseActivity,
        stage: "policy",
        result: "failed",
      });
      return {
        authorized: false,
        stage: "policy",
        code: "POLICY_DENIED",
        message:
          "Confidential policy verification unavailable. Action not executed.",
        policyVersion: ens.policyVersion,
      };
    }

    if (!verdict.approved) {
      this.activity.record({
        ...baseActivity,
        stage: "policy",
        result: "blocked",
        publicDenialCode: "POLICY_DENIED",
      });
      return {
        authorized: false,
        stage: "policy",
        code: "POLICY_DENIED",
        message: publicDenialMessages.POLICY_DENIED,
        policyVersion: verdict.policyVersion,
      };
    }

    this.activity.record({
      ...baseActivity,
      stage: "policy",
      result: "authorized",
    });
    return {
      authorized: true,
      stage: "policy",
      message: "Identity and confidential policy checks passed.",
      policyVersion: verdict.policyVersion,
    };
  }
}
