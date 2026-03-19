"use client"

import React from "react"
import { useAccount, useBalance, useDisconnect } from "wagmi"
import { useAppKit } from "@reown/appkit/react"
import type { Address } from "viem"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Check, Copy, History, LogOut, MoveRight, User } from "lucide-react"
import Link from "next/link"

function shortAddress(address: string) {
    return `${address.slice(0, 6)}…${address.slice(-4)}`
}

const CHAIN_NAMES: Record<number, string> = {
    296: "Hedera Testnet",
}

export default function ConnectWalletButton() {
    const { address, isConnected, chainId } = useAccount()
    const { disconnect } = useDisconnect()
    const { open } = useAppKit()

    const hbarTokenAddress =
        process.env.NEXT_PUBLIC_HBAR_TOKEN_ADDRESS &&
            /^0x[a-fA-F0-9]{40}$/.test(process.env.NEXT_PUBLIC_HBAR_TOKEN_ADDRESS)
            ? (process.env.NEXT_PUBLIC_HBAR_TOKEN_ADDRESS as Address)
            : undefined

    const { data: balance, isLoading: isBalanceLoading } = useBalance({
        address,
        token: hbarTokenAddress,
        query: { enabled: !!address },
    })

    const [copied, setCopied] = React.useState(false)

    const handleCopyAddress = React.useCallback(async (addr?: string) => {
        if (!addr) return
        try {
            await navigator.clipboard.writeText(addr)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1200)
        } catch {
            /* ignore */
        }
    }, [])

    const openConnectModal = () => open({ view: "Connect" })
    const openNetworksModal = () => open({ view: "Networks" })

    const chainName = CHAIN_NAMES[chainId ?? 0] ?? `Chain ${chainId ?? 0}`
    const isWrongNetwork = isConnected && chainId != null && chainId !== 296

    return (
        <div>
            {!isConnected ? (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={openConnectModal}
                >
                    Connect Wallet
                </Button>
            ) : isWrongNetwork ? (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={openNetworksModal}
                >
                    Wrong network
                </Button>
            ) : (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="sm"
                            variant="outline"
                        >
                            {shortAddress(address ?? "")}
                            {balance
                                ? ` (${Number(balance.formatted).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${balance.symbol})`
                                : ""}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded">


                        <DropdownMenuGroup>
                            <Link href="/profile">
                                <DropdownMenuItem className="flex items-center justify-between cursor-pointer group">
                                    Profile
                                    <User className="w-4 h-4 group-hover:text-white" />
                                </DropdownMenuItem>
                            </Link>

                            <Link href="/activity">
                                <DropdownMenuItem className="flex items-center justify-between cursor-pointer group">
                                    Activity
                                    <History className="w-4 h-4 group-hover:text-white" />
                                </DropdownMenuItem>
                            </Link>

                            <DropdownMenuItem
                                onSelect={(e) => {
                                    e.preventDefault()
                                    handleCopyAddress(address ?? undefined)
                                }}
                                className="flex items-center justify-between cursor-pointer group"
                            >
                                {address ? shortAddress(address) : ""}
                                {copied ? <Check className="w-4 h-4 group-hover:text-white" /> : <Copy className="w-4 h-4 group-hover:text-white" />}
                            </DropdownMenuItem>

                            <DropdownMenuLabel className="flex items-center gap-2">
                                <span className="font-medium">Wallet</span>
                                <DropdownMenuShortcut className="tracking-normal">
                                    {chainName}
                                </DropdownMenuShortcut>
                            </DropdownMenuLabel>

                            <DropdownMenuLabel className="flex items-center gap-2">
                                <span className="font-medium">HBAR Balance</span>
                                <DropdownMenuShortcut className="tracking-normal">
                                    {isBalanceLoading
                                        ? "…"
                                        : balance
                                            ? `${Number(balance.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${balance.symbol}`
                                            : "-"}
                                </DropdownMenuShortcut>
                            </DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="flex items-center justify-between cursor-pointer"
                            variant="destructive"
                            onSelect={(e) => {
                                e.preventDefault()
                                disconnect()
                            }}
                        >
                            Disconnect
                            <LogOut className="w-4 h-4" />
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    )
}
