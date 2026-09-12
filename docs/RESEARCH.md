# Research Agent

LATCH supports `research.search` as its second real AI-worker capability. The
Research Agent has an organization-owned ENSv2 identity with these protected
records:

```text
latch.role=research
latch.status=active
latch.capabilities=research.search
latch.organization=<organization ENS namespace>
latch.policyVersion=research-v1
```

The application persists an immutable `ResearchProposal` containing the query,
requested domains, maximum result count, agent, task version, and proposal
digest. It then resolves ENS records fresh, evaluates the capability-aware
policy, and calls Tavily only after both checks approve. Denial or unavailable
policy infrastructure fails closed before Tavily receives a request.

## Tavily configuration

Create a Tavily API key in the Tavily dashboard and set it only in the backend
environment:

```dotenv
TAVILY_API_KEY=tvly-...
```

Never prefix this key with `NEXT_PUBLIC_`. LATCH calls the official
`POST https://api.tavily.com/search` endpoint with Bearer authentication. It
uses the exact authorized `query`, `include_domains`, and `max_results`, disables
generated answers and raw page content, and preserves a real response/header
request ID when Tavily supplies one.

## Confidential policy

The Chainlink workflow selects `LATCH_RESEARCH_POLICY` for `research.search`
and reads the secret only inside the TEE handler. A controlled verification
policy can be injected for CRE simulation as:

```dotenv
LATCH_RESEARCH_POLICY_ALL={"policyVersion":"research-v1","allowedDomains":["*.edu","who.int","nih.gov"],"blockedDomains":[],"maxResults":10}
```

The public verdict contains only `POLICY_ALLOWED` or `POLICY_DENIED`; it does
not reveal which domain or limit rule caused a denial.

## Execution guarantees

- Tavily is never called before ENS and policy authorization succeed.
- The requested domain list and result count are part of the immutable proposal digest.
- The provider receives only the exact authorized query parameters.
- Generated answers and raw page content are disabled.
- Results are schema-validated before persistence and presentation.
- Provider failures stop the task without manufacturing sources.
- Replaying the same task version is rejected.

## Request examples

Create and run a task through the authenticated application API:

```json
{
  "agentEnsName": "research.<organization-name>",
  "prompt": "Research recent public-health guidance from who.int and return five sources"
}
```

The structured planner produces a research action rather than procurement
fields:

```json
{
  "capability": "research.search",
  "query": "recent public-health guidance",
  "domains": ["who.int"],
  "maxResults": 5
}
```

## Execution output

Successful tasks return:

```json
{
  "actionType": "research.search",
  "query": "recent public-health guidance",
  "domains": ["who.int"],
  "maxResults": 5,
  "executionReference": "opaque-provider-request-id",
  "results": [
    {
      "title": "Source title",
      "url": "https://www.who.int/example",
      "content": "Public excerpt returned by the provider",
      "score": 0.92
    }
  ]
}
```

The task detail page renders each result as an external link and preserves the
provider request reference for operational correlation.
