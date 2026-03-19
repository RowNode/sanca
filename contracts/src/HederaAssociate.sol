// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/**
 * @title HederaAssociate
 * @notice Helper to associate Hedera HTS tokens with accounts (Pool, Vault)
 * @dev Calls HTS precompile at 0x167. responseCode == 22 means SUCCESS.
 */
contract HederaAssociate {
    address constant HTS_PRECOMPILE = address(0x167);

    /**
     * @notice Associate account with HTS token (required before receiving HTS on Hedera)
     * @param account Account to associate (e.g. pool or vault address)
     * @param token HTS token address
     * @return success True if association succeeded (responseCode == 22)
     */
    function associate(address account, address token) external returns (bool success) {
        if (account == address(0) || token == address(0)) return false;
        (bool ok, bytes memory result) = HTS_PRECOMPILE.call(
            abi.encodeWithSignature("associateToken(address,address)", account, token)
        );
        if (!ok || result.length == 0) return false;
        int256 responseCode = abi.decode(result, (int256));
        return responseCode == 22; // Hedera SUCCESS
    }
}
