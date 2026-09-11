// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {LatchAudit} from "../src/LatchAudit.sol";

interface Vm {
    function envAddress(string calldata name) external view returns (address value);
    function envUint(string calldata name) external view returns (uint256 value);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployLatchAudit {
    Vm private constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    /// @notice Broadcasts a Sepolia deployment using server-only environment values.
    function run() external returns (LatchAudit deployed) {
        uint256 deployerPrivateKey = VM.envUint("SEPOLIA_DEPLOYER_PRIVATE_KEY");
        address recorder = VM.envAddress("ADMIN_WALLET_ADDRESS");

        VM.startBroadcast(deployerPrivateKey);
        deployed = new LatchAudit(recorder);
        VM.stopBroadcast();
    }

    /// @notice Retained for deterministic unit/script composition without broadcasting.
    function deploy(address recorder) external returns (LatchAudit) {
        return new LatchAudit(recorder);
    }
}
