"use client"

import { CheckCircle2, Clock, Loader2, AlertTriangle } from "lucide-react"
import { useUserAlerts } from "@/hooks/useUserAlerts"
import Link from "next/link"

export default function AlertsSection() {
  const { data: alerts, isLoading } = useUserAlerts()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!alerts || alerts.length === 0) return null

  const getAlertConfig = (type: string) => {
    switch (type) {
      case "reminder":
        return {
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-600/10",
        }
      case "success":
        return {
          icon: CheckCircle2,
          color: "text-accent",
          bgColor: "bg-accent/10",
        }
      case "warning":
        return {
          icon: AlertTriangle,
          color: "text-orange-500",
          bgColor: "bg-orange-500/10",
        }
      default:
        return {
    icon: CheckCircle2,
    color: "text-accent",
    bgColor: "bg-accent/10",
        }
    }
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const config = getAlertConfig(alert.type)
        const Icon = config.icon

        const content = (
          <div className={`${config.bgColor} border border-current/20 rounded-lg p-4`}>
            <div className="flex gap-3">
              <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
              <div className="flex-1">
                <p className={`font-semibold text-sm ${config.color}`}>{alert.title}</p>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
              </div>
            </div>
          </div>
        )

        if (alert.poolId) {
          return (
            <Link key={alert.id} href={`/circles/${alert.poolId}`}>
              <div className="hover:opacity-80 transition-opacity cursor-pointer">
                {content}
              </div>
            </Link>
          )
        }

        return <div key={alert.id}>{content}</div>
      })}
    </div>
  )
}
