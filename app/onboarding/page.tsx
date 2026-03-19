"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import OnboardingStep1 from "@/components/onboarding/step-1";
import OnboardingStep2 from "@/components/onboarding/step-2";
import OnboardingStep3 from "@/components/onboarding/step-3";
import OnboardingStep4 from "@/components/onboarding/step-4";
import OnboardingStep5 from "@/components/onboarding/step-5";
import Image from "next/image";
import { useTheme } from "@/components/theme-provider";
import { useAccount } from "wagmi";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

const STEPS = [
  { id: 1, title: "Welcome", description: "Learn about Sanca" },
  { id: 2, title: "How It Works", description: "Understand the cycle" },
  { id: 3, title: "Your Role", description: "Know what's expected" },
  { id: 4, title: "Demo Preview", description: "See it in action" },
  { id: 5, title: "Ready to Go", description: "Get started" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [currentStep, setCurrentStep] = useState(1);
  const {
    isOnboarded,
    isReady: onboardingReady,
    markOnboarded,
  } = useOnboardingStatus();
  const { theme, mounted } = useTheme();

  // useEffect(() => {
  //   if (!onboardingReady) return
  //   // Redirect to home if wallet is not connected
  //   if (!isConnected || !address) {
  //     router.push("/")
  //     return
  //   }
  //   // If already onboarded, go straight to dashboard
  //   if (isOnboarded) {
  //     router.push("/dashboard")
  //   }
  // }, [router, isConnected, address, onboardingReady, isOnboarded])

  // Don't render content if wallet is not connected

  useEffect(() => {
    if (!isConnected || !address) {
      router.push("/");
      return;
    }
  }, [isConnected, address]);

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    markOnboarded();
    router.push("/dashboard");
  };

  const handleSkip = () => {
    markOnboarded();
    router.push("/dashboard");
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <OnboardingStep1 />;
      case 2:
        return <OnboardingStep2 />;
      case 3:
        return <OnboardingStep3 />;
      case 4:
        return <OnboardingStep4 />;
      case 5:
        return <OnboardingStep5 onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  return (
    <>
      {isConnected || address ? (
        <div className="min-h-screen bg-linear-to-br from-background to-background">
          {/* Header with Skip */}
          <div className="border-b border-border bg-card/50 backdrop-blur">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 bg-transparent flex items-center justify-center">
                  {mounted ? (
                    <Image
                      src="/logo/sanca-logo.svg"
                      className={theme === "dark" ? "" : "invert"}
                      alt="Sanca"
                      width={32}
                      height={32}
                    />
                  ) : (
                    <Image
                      src="/logo/sanca-logo.svg"
                      className=""
                      alt="Sanca"
                      width={32}
                      height={32}
                    />
                  )}
                </div>
                <span className="font-semibold text-foreground">Sanca</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                Skip
              </Button>
            </div>
          </div>

          {/* Progress Indicators */}
          <div>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Step Circle and Connecting Line */}
              <div className="flex items-start justify-between gap-2">
                {STEPS.map((step, idx) => (
                  <div
                    key={step.id}
                    className="flex flex-col items-center flex-1"
                  >
                    {/* Step Circle and Connecting Line */}
                    <div className="flex items-center w-full justify-center relative mb-4">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all z-10 ${
                          step.id < currentStep
                            ? "bg-accent border-accent text-accent-foreground"
                            : step.id === currentStep
                            ? "border-accent bg-background text-accent"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {step.id < currentStep ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          step.id
                        )}
                      </div>

                      {/* Connecting Line */}
                      {idx < STEPS.length - 1 && (
                        <div
                          className={`absolute left-1/2 top-5 w-full h-1 rounded transition-all ${
                            step.id < currentStep ? "bg-accent" : "bg-border"
                          }`}
                          style={{
                            marginLeft: "20px",
                            width: "calc(100% - 20px)",
                          }}
                        ></div>
                      )}
                    </div>

                    {/* Title and Description - Centered Below Circle */}
                    <div className="text-center">
                      <p className="text-xs font-semibold text-foreground">
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-transparent border border-border rounded-lg p-8 sm:p-12 min-h-96 flex flex-col justify-between">
              {renderStep()}
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <div className="flex gap-4 justify-between mt-8">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="flex-1 bg-transparent"
              >
                Previous
              </Button>
              <Button onClick={handleNext} className="flex-1 gap-2">
                {currentStep === STEPS.length ? "Go to Dashboard" : "Next"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-linear-to-br from-background to-background flex items-center justify-center">
          {/* <span className="text-sm text-muted-foreground">Loading…</span> */}
        </div>
      )}
    </>
  );
}
