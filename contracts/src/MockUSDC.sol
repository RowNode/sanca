// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract USDC is ERC20, Ownable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    // Optional off-chain metadata for token logo (e.g. IPFS URI)
    string public logoURI;

    // Faucet configuration
    uint256 public constant FAUCET_AMOUNT = 1_000e6; // 1,000 USDC (6 decimals)
    uint256 public constant FAUCET_COOLDOWN = 1 days;
    mapping(address => uint256) public lastFaucetTime;

    constructor(
        string memory _name,
        string memory _symbol,
        address _minterRole,
        string memory _logoURI
    )
        ERC20(_name, _symbol)
        Ownable(msg.sender)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, _minterRole);
        logoURI = _logoURI;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    function mintByMinter(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burnByMinter(address from, uint256 amount) external onlyRole(MINTER_ROLE) {
        _burn(from, amount);
    }

    /**
     * @notice Public faucet to mint a fixed amount of test USDC
     * @dev Rate limited by FAUCET_COOLDOWN to prevent abuse
     */
    function faucet() external {
        require(
            block.timestamp >= lastFaucetTime[msg.sender] + FAUCET_COOLDOWN,
            "Faucet: cooldown not passed"
        );

        lastFaucetTime[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @notice Override decimals to return 6 (USDC standard)
     * @return 6 decimals
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}