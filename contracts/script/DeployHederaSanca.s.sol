// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SancaFactory} from "../src/SancaFactory.sol";
import {SancaPool} from "../src/SancaPool.sol";

/**
 * @title DeployHederaSanca
 * @notice Phase 2: Deploy SancaPool implementation + SancaFactory.
 * @dev Requires env: HEDERA_USDC, BONZO_VAULT, DEPOSIT_GUARD (from Phase 1 / DeployHederaInfra).
 *   forge script script/DeployHederaSanca.s.sol:DeployHederaSanca --rpc-url testnet --broadcast --gas-limit 15000000
 */
contract DeployHederaSanca is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        address usdc = vm.envAddress("HEDERA_USDC");
        address bonzoVaultAddr = vm.envAddress("BONZO_VAULT");
        address depositGuardAddr = vm.envAddress("DEPOSIT_GUARD");
        address keeperAddr = vm.envOr("KEEPER_ADDRESS", address(0));

        console.log("Phase 2: Deploy Sanca (Pool impl + Factory)...");
        require(usdc != address(0), "Set HEDERA_USDC (from Phase 1)");
        require(bonzoVaultAddr != address(0), "Set BONZO_VAULT (from Phase 1)");
        require(depositGuardAddr != address(0), "Set DEPOSIT_GUARD (from Phase 1)");

        // Tx 1: SancaPool implementation
        console.log("\n1. Deploying SancaPool implementation...");
        vm.startBroadcast(deployerPrivateKey);
        SancaPool poolImplementation = new SancaPool();
        vm.stopBroadcast();
        console.log("SancaPool implementation:", address(poolImplementation));

        // Tx 2: SancaFactory
        console.log("\n2. Deploying SancaFactory...");
        vm.startBroadcast(deployerPrivateKey);
        SancaFactory factory = new SancaFactory(
            address(poolImplementation),
            usdc,
            bonzoVaultAddr,
            depositGuardAddr
        );
        vm.stopBroadcast();
        console.log("SancaFactory:", address(factory));

        // Optional Tx 3: Set global keeper if provided
        if (keeperAddr != address(0)) {
            console.log("\n3. Setting global Keeper on factory...");
            vm.startBroadcast(deployerPrivateKey);
            factory.setKeeper(keeperAddr);
            vm.stopBroadcast();
            console.log("Keeper set to:", keeperAddr);
        } else {
            console.log("\n3. No KEEPER_ADDRESS provided, keeper remains unset");
        }

        console.log("\n=== Phase 2 done ===");
        console.log("USDC:", usdc);
        console.log("Bonzo Vault:", bonzoVaultAddr);
        console.log("Deposit Guard:", depositGuardAddr);
        console.log("SancaPool Implementation:", address(poolImplementation));
        console.log("SancaFactory:", address(factory));
        console.log("Keeper (optional):", keeperAddr);
        console.log("\nNext: factory.createPool(...) to create pools (pool auto-associates with USDC via HIP-719).");
    }
}
