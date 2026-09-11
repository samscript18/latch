export const latchAuditAbi = [
  {
    type: "function",
    name: "recorder",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "recordRequested",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "bytes32" },
      { name: "agentNode", type: "bytes32" },
      { name: "capability", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "recordAuthorized",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "bytes32" },
      { name: "agentNode", type: "bytes32" },
      { name: "policyVersion", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "recordBlocked",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "bytes32" },
      { name: "agentNode", type: "bytes32" },
      { name: "reasonCode", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "recordExecuted",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "bytes32" },
      { name: "agentNode", type: "bytes32" },
      { name: "executionReference", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;
