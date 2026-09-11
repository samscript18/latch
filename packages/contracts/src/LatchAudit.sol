// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract LatchAudit {
    error UnauthorizedRecorder(address caller);
    error ZeroIdentifier();

    address public immutable recorder;

    event ActionRequested(
        bytes32 indexed taskId,
        bytes32 indexed agentNode,
        bytes32 indexed capability,
        uint256 amount
    );
    event ActionAuthorized(
        bytes32 indexed taskId, bytes32 indexed agentNode, bytes32 policyVersion
    );
    event ActionBlocked(bytes32 indexed taskId, bytes32 indexed agentNode, bytes32 reasonCode);
    event ActionExecuted(
        bytes32 indexed taskId, bytes32 indexed agentNode, bytes32 executionReference
    );

    constructor(address recorder_) {
        if (recorder_ == address(0)) revert ZeroIdentifier();
        recorder = recorder_;
    }

    modifier onlyRecorder() {
        if (msg.sender != recorder) revert UnauthorizedRecorder(msg.sender);
        _;
    }

    function recordRequested(
        bytes32 taskId,
        bytes32 agentNode,
        bytes32 capability,
        uint256 amount
    ) external onlyRecorder {
        _validate(taskId, agentNode);
        if (capability == bytes32(0)) revert ZeroIdentifier();
        emit ActionRequested(taskId, agentNode, capability, amount);
    }

    function recordAuthorized(bytes32 taskId, bytes32 agentNode, bytes32 policyVersion)
        external
        onlyRecorder
    {
        _validate(taskId, agentNode);
        if (policyVersion == bytes32(0)) revert ZeroIdentifier();
        emit ActionAuthorized(taskId, agentNode, policyVersion);
    }

    function recordBlocked(bytes32 taskId, bytes32 agentNode, bytes32 reasonCode)
        external
        onlyRecorder
    {
        _validate(taskId, agentNode);
        if (reasonCode == bytes32(0)) revert ZeroIdentifier();
        emit ActionBlocked(taskId, agentNode, reasonCode);
    }

    function recordExecuted(bytes32 taskId, bytes32 agentNode, bytes32 executionReference)
        external
        onlyRecorder
    {
        _validate(taskId, agentNode);
        if (executionReference == bytes32(0)) revert ZeroIdentifier();
        emit ActionExecuted(taskId, agentNode, executionReference);
    }

    function _validate(bytes32 taskId, bytes32 agentNode) private pure {
        if (taskId == bytes32(0) || agentNode == bytes32(0)) revert ZeroIdentifier();
    }
}
