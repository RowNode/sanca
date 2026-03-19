"use client"

import { CheckCircle2, TrendingUp, Users, AlertCircle, Clock, DollarSign, AlertTriangle, Play, CheckCircle, LogOut } from "lucide-react"
import { useAllActivities } from "@/hooks/useAllActivities"
import { formatDistanceToNow } from "date-fns"
import { Loader2 } from "lucide-react"

interface Activity {
  id: string
  type: "contribution" | "payout" | "member_joined" | "cycle_completed" | "pool_created" | "pool_started" | "pool_completed" | "collateral_liquidated"
  title: string
  description: string
  circle: string
  member?: string
  amount?: string
  date: string
  timestamp: Date
  icon: typeof CheckCircle2 | typeof TrendingUp | typeof Users | typeof AlertCircle | typeof Clock | typeof DollarSign | typeof AlertTriangle | typeof Play | typeof CheckCircle
  color: string
  bgColor: string
}

const getActivityIcon = (type: Activity["type"]) => {
  switch (type) {
    case "contribution":
      return DollarSign
    case "payout":
      return TrendingUp
    case "member_joined":
      return Users
    case "cycle_completed":
    case "pool_completed":
      return CheckCircle2
    case "pool_created":
      return CheckCircle
    case "pool_started":
      return Play
    case "collateral_liquidated":
      return AlertTriangle
    default:
      return CheckCircle2
  }
}

const getActivityColor = (type: Activity["type"]) => {
  switch (type) {
    case "payout":
    case "pool_completed":
      return { color: "text-green-500", bgColor: "bg-green-500/10" }
    case "collateral_liquidated":
      return { color: "text-orange-500", bgColor: "bg-orange-500/10" }
    case "pool_started":
      return { color: "text-blue-500", bgColor: "bg-blue-500/10" }
    default:
      return { color: "text-accent", bgColor: "bg-accent/10" }
  }
}

interface ActivityListProps {
  searchQuery: string
  filterType: "all" | "contributions" | "payouts" | "cycles"
}

export default function ActivityList({ searchQuery, filterType }: ActivityListProps) {
  const { data: activitiesData, isLoading, error } = useAllActivities()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading activities...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load activities</p>
      </div>
    )
  }

  if (!activitiesData || activitiesData.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No activity yet. Join a pool to see activities here!</p>
      </div>
    )
  }

  // Transform activities data to Activity format
  const activities: Activity[] = activitiesData.map((activity) => {
    const icon = getActivityIcon(activity.type)
    const { color, bgColor } = getActivityColor(activity.type)
    
    return {
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      circle: activity.circle,
      member: activity.member,
      amount: activity.amount,
      date: formatDistanceToNow(activity.timestamp, { addSuffix: true }),
      timestamp: activity.timestamp,
      icon,
      color,
      bgColor,
    }
  })

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = 
      activity.circle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase())

    let matchesFilter = true
    if (filterType === "contributions") {
      matchesFilter = activity.type === "contribution" || activity.type === "collateral_liquidated"
    } else if (filterType === "payouts") {
      matchesFilter = activity.type === "payout"
    } else if (filterType === "cycles") {
      matchesFilter = 
        activity.type === "cycle_completed" || 
        activity.type === "member_joined" ||
        activity.type === "pool_started" ||
        activity.type === "pool_completed"
    }

    return matchesSearch && matchesFilter
  })

  // Group by date
  const groupedActivities = filteredActivities.reduce(
    (acc, activity) => {
      const dateKey = activity.timestamp.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: activity.timestamp.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
      })

      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(activity)
      return acc
    },
    {} as Record<string, Activity[]>,
  )

  return (
    <div className="space-y-8">
      {Object.entries(groupedActivities).map(([dateGroup, activities]) => (
        <div key={dateGroup} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">{dateGroup}</h3>

          {activities.map((activity) => {
            const Icon = activity.icon
            return (
              <div
                key={activity.id}
                className={`${activity.bgColor} border border-current/20 rounded-lg p-4 hover:shadow-md transition-shadow`}
              >
                <div className="flex gap-4">
                  <Icon className={`w-5 h-5 ${activity.color} flex-shrink-0 mt-1`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={`font-semibold text-sm ${activity.color}`}>{activity.title}</h4>
                      {activity.amount && (
                        <span className="font-mono font-bold text-accent text-sm flex-shrink-0">{activity.amount}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{activity.description}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-medium">{activity.circle}</p>
                      <p className="text-xs text-muted-foreground">{activity.date}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {filteredActivities.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No activity matching your search</p>
        </div>
      )}
    </div>
  )
}
