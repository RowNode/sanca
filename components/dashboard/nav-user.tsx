"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { EllipsisVertical, LogOut, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount, useDisconnect, useBalance } from "wagmi";
import { formatUSDC } from "@/lib/utils";
import { CONTRACTS } from "@/lib/contracts";
import { toast } from "sonner";

export function NavUser() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("User");
  const [avatar, setAvatar] = useState("https://github.com/shadcn.png");
  const [copied, setCopied] = useState(false);

  // Get token balances (HBAR = native, USDC = token)
  const { data: hbarBalance } = useBalance({
    address: address,
  });

  const { data: usdcBalance } = useBalance({
    address: address,
    token: CONTRACTS.USDC,
  });

  // Format wallet address to show first 6 and last 4 characters
  const formatAddress = (addr: string | undefined) => {
    if (!addr) return "Not connected";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Format HBAR balance (8 decimals on Hedera)
  const formatHBAR = (value: bigint | undefined) => {
    if (!value) return "0.00";
    return (Number(value) / 1e8).toFixed(4);
  };

  useEffect(() => {
    if (address) {
      setIsLoading(false);
    }
  }, [address]);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    router.push("/");
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 grayscale">
                  <AvatarImage src={avatar} alt={userName} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{userName}</span>
                  <span className="truncate text-xs">
                    {formatAddress(address)}
                  </span>
                </div>
                <EllipsisVertical className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 grayscale">
                    <AvatarImage src={avatar} alt={userName} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{userName}</span>
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs">
                        {formatAddress(address)}
                      </span>

                      {address && (
                        <div
                          onClick={handleCopyAddress}
                          className="cursor-pointer text-muted-foreground"
                          title="Copy address"
                        >
                          {copied ? (
                            <Check className="size-4" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* Token Balances */}
              <div className="px-2 py-1.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    HBAR Balance
                  </span>
                  <span className="text-xs font-mono text-foreground">
                    {formatHBAR(hbarBalance?.value)} HBAR
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    USDC Balance
                  </span>
                  <span className="text-xs font-mono text-foreground">
                    {formatUSDC(usdcBalance?.value || 0)} USDC
                  </span>
                </div>
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={handleDisconnect}
                className="group cursor-pointer hover:text-red-500! hover:bg-transparent!"
              >
                <LogOut className="hover:text-red-500" />
                Disconnect Wallet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
