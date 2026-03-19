"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { InfoIcon, Moon, Sun } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "../theme-provider";

export function SiteHeader() {
  const pathname = usePathname();
  const title = pathname.split("/").pop();
  const router = useRouter();
  const { theme, toggleTheme, mounted } = useTheme();

  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handleOpenOnboarding = () => {
    if (typeof window !== "undefined") {
      router.push("/dashboard");
      window.dispatchEvent(new Event("open-onboarding"));
    }
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:gap-3 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">
          {capitalizeFirstLetter(title || "")}
        </h1>
        <div className="ml-auto">
          <button
            onClick={toggleTheme}
            className="cursor-pointer p-2 rounded-lg border border-border hover:bg-card transition-colors"
            aria-label="Toggle theme"
          >
            {mounted && theme === "dark" ? (
              <Sun className="w-4 h-4 text-foreground" />
            ) : (
              <Moon className="w-4 h-4 text-foreground" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
