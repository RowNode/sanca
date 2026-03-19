"use client";
import * as React from "react";
// import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/dashboard/nav-main";
// import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/dashboard/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  ArrowRightLeft,
  ChartBar,
  ChartColumnDecreasing,
  ChartPie,
  ChevronsUpDown,
  HelpCircle,
  History,
  Home,
  List,
  Moon,
  Sparkle,
  Sun,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import { useTheme } from "../theme-provider";
import Image from "next/image";
import Link from "next/link";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: ChartPie,
    },
    {
      title: "Circles",
      url: "/circles",
      icon: Users,
    },
    {
      title: "Activity",
      url: "/activity",
      icon: History,
    },
    {
      title: "Keeper",
      url: "/keeper",
      icon: Sparkle,
    },
    {
      title: "Profile",
      url: "/profile",
      icon: Wallet,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/">
              <SidebarMenuButton size="lg" className="cursor-pointer">
                <div className="bg-transparent flex aspect-square size-8 items-center justify-center rounded">
                  <Image
                    src="/logo/sanca-logo.svg"
                    className={theme === "dark" ? "" : "invert"}
                    alt="Sanca"
                    width={32}
                    height={32}
                  />
                </div>
                <span className="truncate font-medium">Sanca</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter id="account-menu">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
