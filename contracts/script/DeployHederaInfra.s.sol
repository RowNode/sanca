// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockBonzoVault} from "../src/MockBonzoVault.sol";
import {MockDepositGuard} from "../src/MockDepositGuard.sol";
import {USDC} from "../src/MockUSDC.sol";

/**
 * @title DeployHederaInfra
 * @notice Phase 1: Deploy MockBonzoVault + MockDepositGuard (dan USDC jika belum ada).
 * @dev Setelah selesai, set env HEDERA_USDC, BONZO_VAULT, DEPOSIT_GUARD lalu jalankan DeployHederaSanca.
 *   forge script script/DeployHederaInfra.s.sol:DeployHederaInfra --rpc-url testnet --broadcast --gas-limit 15000000
 */
contract DeployHederaInfra is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address usdc = vm.envOr("HEDERA_USDC", address(0));
        address bonzoVaultAddr = vm.envOr("BONZO_VAULT", address(0));
        address depositGuardAddr = vm.envOr("DEPOSIT_GUARD", address(0));

        console.log("Phase 1: Deploy Infra (Vault + Guard)...");
        console.log("Deployer:", deployer);

        // Tx 1: USDC (if not provided)
        if (usdc == address(0)) {
            console.log("\n0. Deploying USDC (testnet)...");
            vm.startBroadcast(deployerPrivateKey);
            USDC usdcToken = new USDC(
                "USD Coin",
                "USDC",
                deployer,
                "ipfs://bafkreiev6flgstwgefqpaieahshidfhz4czgbvryxbtusqzwarmp4mmkfu"
            );
            usdcToken.mint(deployer, 1_000_000 * 10**6);
            usdc = address(usdcToken);
            vm.stopBroadcast();
            console.log("USDC:", usdc);
        } else {
            console.log("\n0. Using USDC:", usdc);
        }

        // Tx 2: MockBonzoVault
        if (bonzoVaultAddr == address(0)) {
            console.log("\n1. Deploying MockBonzoVault (testnet)...");
            vm.startBroadcast(deployerPrivateKey);
            MockBonzoVault bonzoVault = new MockBonzoVault(usdc);
            bonzoVaultAddr = address(bonzoVault);
            vm.stopBroadcast();
            console.log("MockBonzoVault:", bonzoVaultAddr);
            // Tx 3: HIP-719 – vault associated with USDC
            console.log("\n2. Associating vault with USDC (HIP-719)...");
            vm.startBroadcast(deployerPrivateKey);
            MockBonzoVault(bonzoVaultAddr).associateToken(usdc);
            vm.stopBroadcast();
            console.log("   Vault associated with USDC");
        } else {
            console.log("\n1. Using existing Bonzo Vault:", bonzoVaultAddr);
        }

        // Tx 4: MockDepositGuard
        if (depositGuardAddr == address(0)) {
            console.log("\n3. Deploying MockDepositGuard (testnet)...");
            vm.startBroadcast(deployerPrivateKey);
            MockDepositGuard guard = new MockDepositGuard();
            depositGuardAddr = address(guard);
            vm.stopBroadcast();
            console.log("MockDepositGuard:", depositGuardAddr);
        } else {
            console.log("\n3. Using existing Deposit Guard:", depositGuardAddr);
        }

        console.log("\n=== Phase 1 done ===");
        console.log("HEDERA_USDC=", usdc);
        console.log("BONZO_VAULT=", bonzoVaultAddr);
        console.log("DEPOSIT_GUARD=", depositGuardAddr);
        console.log("\nNext: set env above then run Phase 2:");
        console.log("  export HEDERA_USDC=%s", usdc);
        console.log("  export BONZO_VAULT=%s", bonzoVaultAddr);
        console.log("  export DEPOSIT_GUARD=%s", depositGuardAddr);
        console.log("  forge script script/DeployHederaSanca.s.sol:DeployHederaSanca --rpc-url testnet --broadcast --gas-limit 15000000");
    }
}
