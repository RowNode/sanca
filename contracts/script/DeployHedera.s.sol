// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SancaFactory} from "../src/SancaFactory.sol";
import {SancaPool} from "../src/SancaPool.sol";
import {MockBonzoVault} from "../src/MockBonzoVault.sol";
import {MockDepositGuard} from "../src/MockDepositGuard.sol";
import {USDC} from "../src/MockUSDC.sol";

/**
 * @title DeployHedera
 * @notice All-in-one deployment for Sanca on Hedera (multiple txs to stay under 15M gas/tx).
 * @dev Alternatif: deploy pisah agar tiap run lebih ringan:
 *      Phase 1: forge script script/DeployHederaInfra.s.sol:DeployHederaInfra --rpc-url testnet --broadcast --gas-limit 15000000
 *      Set HEDERA_USDC, BONZO_VAULT, DEPOSIT_GUARD lalu Phase 2:
 *      Phase 2: forge script script/DeployHederaSanca.s.sol:DeployHederaSanca --rpc-url testnet --broadcast --gas-limit 15000000
 *      Jika simulasi OutOfGas: --skip-simulation (setiap tx tetap dapat 15M).
 */
contract DeployHedera is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address usdc = vm.envOr("HEDERA_USDC", address(0));
        address bonzoVaultAddr = vm.envOr("BONZO_VAULT", address(0));
        address depositGuardAddr = vm.envOr("DEPOSIT_GUARD", address(0));

        console.log("Deploying Sanca on Hedera...");
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
            // Tx 3: HIP-719 – vault calls token.associate() so vault gets associated with USDC
            console.log("\n2. Associating vault with USDC (HIP-719)...");
            vm.startBroadcast(deployerPrivateKey);
            MockBonzoVault(bonzoVaultAddr).associateToken(usdc);
            vm.stopBroadcast();
            console.log("   Vault associated with USDC");
        } else {
            console.log("\n2. Using existing Bonzo Vault:", bonzoVaultAddr);
        }

        // Tx 4: MockDepositGuard
        if (depositGuardAddr == address(0)) {
            console.log("\n2b. Deploying MockDepositGuard (testnet)...");
            vm.startBroadcast(deployerPrivateKey);
            MockDepositGuard guard = new MockDepositGuard();
            depositGuardAddr = address(guard);
            vm.stopBroadcast();
            console.log("MockDepositGuard:", depositGuardAddr);
        } else {
            console.log("\n2b. Using existing Deposit Guard:", depositGuardAddr);
        }

        // Tx 5: SancaPool implementation
        console.log("\n3. Deploying SancaPool implementation...");
        vm.startBroadcast(deployerPrivateKey);
        SancaPool poolImplementation = new SancaPool();
        vm.stopBroadcast();
        console.log("SancaPool implementation:", address(poolImplementation));

        // Tx 6: SancaFactory
        console.log("\n4. Deploying SancaFactory...");
        vm.startBroadcast(deployerPrivateKey);
        SancaFactory factory = new SancaFactory(
            address(poolImplementation),
            usdc,
            bonzoVaultAddr,
            depositGuardAddr
        );
        vm.stopBroadcast();
        console.log("SancaFactory:", address(factory));

        console.log("\n=== Deployment Summary ===");
        console.log("USDC:", usdc);
        console.log("Bonzo Vault:", bonzoVaultAddr);
        console.log("Deposit Guard:", depositGuardAddr);
        console.log("SancaPool Implementation:", address(poolImplementation));
        console.log("SancaFactory:", address(factory));
        console.log("\nNext steps:");
        console.log("1. Pool auto-associates with USDC on create (HTS). Vault uses HIP-719 token.associate() at deploy.");
        console.log("2. Create pool: factory.createPool(...)");
        console.log("3. Hedera PRNG (0x169) is built-in");
    }
}
