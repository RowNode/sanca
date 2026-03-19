import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";

type OnboardingStatus = {
  isOnboarded: boolean;
  isReady: boolean;
  markOnboarded: () => void;
  resetOnboarding: () => void;
};

/**
 * Tracks onboarding completion per wallet.
 * - Returns `isOnboarded` (true/false)
 * - Returns `isReady` to signal localStorage has been checked
 * - Helpers to mark or reset onboarding status
 */
export function useOnboardingStatus(): OnboardingStatus {
  const { address, isConnected } = useAccount();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      setIsOnboarded(false);
      setIsReady(true);
      return;
    }

    const stored = localStorage.getItem(`onboardingComplete_${address}`);
    setIsOnboarded(stored === "true");
    setIsReady(true);
  }, [address, isConnected]);

  const markOnboarded = useCallback(() => {
    if (!address) return;
    localStorage.setItem(`onboardingComplete_${address}`, "true");
    localStorage.setItem("walletAddress", address);
    setIsOnboarded(true);
  }, [address]);

  const resetOnboarding = useCallback(() => {
    if (!address) return;
    localStorage.removeItem(`onboardingComplete_${address}`);
    setIsOnboarded(false);
  }, [address]);

  return { isOnboarded, isReady, markOnboarded, resetOnboarding };
}

