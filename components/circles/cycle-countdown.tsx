"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface CycleCountdownProps {
  cycleStartTime: bigint;
  periodDuration: bigint;
}

export function CycleCountdown({
  cycleStartTime,
  periodDuration,
}: CycleCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Helper untuk format countdown
  const formatCountdown = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return { days, hours, minutes, seconds: secs };
  };

  // Calculate countdown
  useEffect(() => {
    if (!cycleStartTime || !periodDuration) return;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = Number(cycleStartTime);
      const duration = Number(periodDuration);
      const endTime = startTime + duration;
      const remaining = endTime - now;

      if (remaining <= 0) {
        setIsExpired(true);
        setTimeRemaining("");
        setCountdown(null);
      } else {
        setIsExpired(false);
        const endDate = new Date(endTime * 1000);
        setTimeRemaining(formatDistanceToNow(endDate, { addSuffix: true }));
        setCountdown(formatCountdown(remaining));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000); // Update every second

    return () => clearInterval(interval);
  }, [cycleStartTime, periodDuration]);

  if (isExpired) {
    return (
      <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
        <p className="text-sm font-semibold text-accent text-center">
          ⏰ Period ended. Draw will be triggered automatically...
        </p>
      </div>
    );
  }

  if (!countdown) {
    return null;
  }

  return (
    <div className="bg-muted/50 border border-border rounded-lg p-4">
      <p className="text-sm font-semibold text-foreground mb-2 text-center">
        Period ends in:
      </p>
      <div className="flex items-center justify-center gap-4">
        {countdown.days > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{countdown.days}</div>
            <div className="text-xs text-muted-foreground">days</div>
          </div>
        )}
        <div className="text-center">
          <div className="text-2xl font-bold text-accent">
            {countdown.hours.toString().padStart(2, "0")}
          </div>
          <div className="text-xs text-muted-foreground">hours</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-accent">
            {countdown.minutes.toString().padStart(2, "0")}
          </div>
          <div className="text-xs text-muted-foreground">minutes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-accent">
            {countdown.seconds.toString().padStart(2, "0")}
          </div>
          <div className="text-xs text-muted-foreground">seconds</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">
        {timeRemaining}
      </p>
    </div>
  );
}