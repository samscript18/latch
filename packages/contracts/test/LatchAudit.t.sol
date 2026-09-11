// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {LatchAudit} from "../src/LatchAudit.sol";

interface Vm {
    function expectEmit(bool, bool, bool, bool) external;
    function prank(address) external;
}

contract LatchAuditTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    bytes32 private constant TASK = keccak256("L-1042");
    bytes32 private constant AGENT = keccak256("procurement.example.eth");
    bytes32 private constant CAPABILITY = keccak256("procurement.purchase");

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

    function testRecorderCanEmitRequestedEvent() external {
        LatchAudit audit = new LatchAudit(address(this));
        vm.expectEmit(true, true, true, true);
        emit ActionRequested(TASK, AGENT, CAPABILITY, 124_000);
        audit.recordRequested(TASK, AGENT, CAPABILITY, 124_000);
    }

    function testUnauthorizedAddressCannotRecord() external {
        LatchAudit audit = new LatchAudit(address(this));
        vm.prank(address(0xBEEF));
        try audit.recordRequested(TASK, AGENT, CAPABILITY, 124_000) {
            revert("expected unauthorized call to fail");
        } catch (bytes memory reason) {
            bytes4 selector;
            assembly {
                selector := mload(add(reason, 0x20))
            }
            require(selector == LatchAudit.UnauthorizedRecorder.selector, "wrong error");
        }
    }

    function testRecorderCanEmitSanitizedOutcomeEvents() external {
        LatchAudit audit = new LatchAudit(address(this));
        bytes32 policyVersion = keccak256("procurement-v1");
        bytes32 publicReason = keccak256("POLICY_DENIED");
        bytes32 executionReference = keccak256("opaque-execution-reference");

        vm.expectEmit(true, true, false, true);
        emit ActionAuthorized(TASK, AGENT, policyVersion);
        audit.recordAuthorized(TASK, AGENT, policyVersion);

        vm.expectEmit(true, true, false, true);
        emit ActionBlocked(TASK, AGENT, publicReason);
        audit.recordBlocked(TASK, AGENT, publicReason);

        vm.expectEmit(true, true, false, true);
        emit ActionExecuted(TASK, AGENT, executionReference);
        audit.recordExecuted(TASK, AGENT, executionReference);
    }

    function testZeroRecorderIsRejected() external {
        try new LatchAudit(address(0)) {
            revert("expected zero recorder to fail");
        } catch (bytes memory reason) {
            bytes4 selector;
            assembly {
                selector := mload(add(reason, 0x20))
            }
            require(selector == LatchAudit.ZeroIdentifier.selector, "wrong error");
        }
    }

    function testZeroIdentifiersAreRejected() external {
        LatchAudit audit = new LatchAudit(address(this));
        try audit.recordAuthorized(bytes32(0), AGENT, keccak256("procurement-v1")) {
            revert("expected zero task ID to fail");
        } catch (bytes memory reason) {
            bytes4 selector;
            assembly {
                selector := mload(add(reason, 0x20))
            }
            require(selector == LatchAudit.ZeroIdentifier.selector, "wrong error");
        }
    }
}
