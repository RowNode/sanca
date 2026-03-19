"use client"

import { CheckCircle2 } from "lucide-react"
import type { Pool, Member } from "@/lib/indexer"
import { formatDistanceToNow } from "date-fns"
import { useAccount } from "wagmi"

interface CircleMembersProps {
  circleId: string
  poolData?: {
    pool: Pool | null
    members: Member[]
    cycles: any[]
  }
}

export default function CircleMembers({ circleId, poolData }: CircleMembersProps) {
  const { address } = useAccount()

  if (!poolData?.members || poolData.members.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No members yet</p>
      </div>
    )
  }

  // Helper untuk convert string/number ke BigInt
  const toBigInt = (value: bigint | string | number): bigint => {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'string') return BigInt(value);
    return BigInt(value);
  };

  // Helper untuk format USDC amount (6 decimals)
  const formatUSDC = (amount: bigint | string | number) => {
    const bigIntAmount = toBigInt(amount);
    return (Number(bigIntAmount) / 1e6).toFixed(2);
  };

  // Helper untuk check if member is creator
  const isCreator = (memberAddress: string) => {
    return poolData.pool?.creator.toLowerCase() === memberAddress.toLowerCase()
  }

  // Helper untuk check if member is current user
  const isCurrentUser = (memberAddress: string) => {
    return address?.toLowerCase() === memberAddress.toLowerCase()
  }

  return (
    <div className="space-y-3">
      {poolData.members.map((member) => {
        const joinedDate = new Date(Number(toBigInt(member.joinedAtTimestamp)) * 1000)
        const isCreatorMember = isCreator(member.address)
        const isUser = isCurrentUser(member.address)

        return (
          <div
            key={member.id}
            className="bg-card border border-border rounded-lg p-4 flex items-center justify-between"
          >
          <div className="flex-1">
            <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground font-mono text-sm">
                  {isUser ? "You" : `${member.address.slice(0, 6)}...${member.address.slice(-4)}`}
                </p>
                {isCreatorMember && (
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-primary/10 text-primary">
                    Creator
                  </span>
              )}
                {isUser && (
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-accent/10 text-accent">
                    You
                </span>
              )}
            </div>
              <p className="text-sm text-muted-foreground">
                Joined {formatDistanceToNow(joinedDate, { addSuffix: true })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Contribution: ${formatUSDC(member.contribution)} USDC
              </p>
          </div>

          <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-accent">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-semibold">Joined</span>
              </div>
              </div>
          </div>
        )
      })}
    </div>
  )
}
