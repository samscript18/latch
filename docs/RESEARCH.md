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

## Policy

Local development uses a deterministic `research-v1` fixture. The Chainlink
workflow selects `LATCH_RESEARCH_POLICY` for `research.search` and reads the
secret only inside the TEE handler. Configure the simulation secret as:

```dotenv
LATCH_RESEARCH_POLICY_ALL={"policyVersion":"research-v1","allowedDomains":["*.edu","who.int","nih.gov"],"blockedDomains":[],"maxResults":10}
```

The public verdict contains only `POLICY_ALLOWED` or `POLICY_DENIED`; it does
not reveal which domain or limit rule caused a denial.

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
