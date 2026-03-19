"use client";

import Image from 'next/image'
import React, { useId, useState } from 'react'
import { useTheme } from './theme-provider';
import Link from 'next/link';
import { usePathname } from 'next/navigation'
import { Menu, Moon, Sun, X } from 'lucide-react';
import ConnectWalletButton from './wallet/connect-wallet-button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export default function Navbar() {
    const { theme, toggleTheme, mounted } = useTheme();
    const pathname = usePathname();
    const isMobile = useIsMobile();
    const [mobileOpen, setMobileOpen] = useState(false);
    const mobileMenuId = useId();

    return (
        <>
            {isMobile ? (<>
                <header
                    className="sticky top-0 z-50"
                >
                    <nav className="border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 relative">
                        {/* Left: Brand */}
                        <div className="flex items-center justify-between w-full px-4 sm:px-6 lg:px-8 h-16">
                            <Link href="/">
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
                            </Link>

                            <button
                                type="button"
                                className="relative cursor-pointer inline-flex items-center justify-center lg:hidden"
                                aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
                                aria-controls={mobileMenuId}
                                aria-expanded={mobileOpen}
                                onClick={() => setMobileOpen((v) => !v)}
                            >
                                <Menu
                                    className={cn(
                                        "h-6 w-6 transition-all duration-300 absolute text-foreground",
                                        mobileOpen ? "rotate-90 opacity-0 scale-50" : "rotate-0 opacity-100 scale-100"
                                    )}
                                    aria-hidden="true"
                                />
                                <X
                                    className={cn(
                                        "h-6 w-6 transition-all duration-300 text-foreground",
                                        mobileOpen ? "rotate-0 opacity-100 scale-100" : "-rotate-90 opacity-0 scale-50"
                                    )}
                                    aria-hidden="true"
                                />
                            </button>

                        </div>

                        {/* Mobile Menu */}
                        <div
                            id={mobileMenuId}
                            className={cn(
                                "absolute left-0 right-0 top-full z-50 w-full shadow-lg overflow-hidden transition-all duration-300 ease-out bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60",
                                mobileOpen
                                    ? "max-h-96 opacity-100"
                                    : "max-h-0 opacity-0 pointer-events-none",
                            )}
                        >
                            <div
                                className={cn(
                                    "px-5 md:px-10 pt-2 pb-4 transition-transform duration-300 ease-out",
                                    mobileOpen ? "translate-y-0" : "-translate-y-2"
                                )}
                            >
                                <div className="flex flex-col items-center justify-center gap-4">
                                    <Link href="/dashboard">
                                        <span
                                            className={`text-sm text-foreground hover:underline ${pathname?.startsWith("/dashboard") ? "underline" : ""}`}
                                        >
                                            Dashboard
                                        </span>
                                    </Link>
                                    <Link href="/circles">
                                        <span
                                            className={`text-sm text-foreground hover:underline ${pathname?.startsWith("/circles") ? "underline" : ""}`}
                                        >
                                            Circles
                                        </span>
                                    </Link>
                                    <Link href="/keeper">
                                        <span
                                            className={`text-sm text-foreground hover:underline ${pathname?.startsWith("/keeper") ? "underline" : ""}`}
                                        >
                                            Keeper
                                        </span>
                                    </Link>
                                    <ConnectWalletButton />
                                </div>
                            </div>
                        </div>
                    </nav>
                </header>
            </>) : (
                <header className='sticky top-0 z-50'>
                    <nav className="border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
                        <div className="px-4 sm:px-6 lg:px-8">
                            <div className="max-w-6xl mx-auto">
                                <div className="flex justify-between items-center h-16">
                                    <div className='flex items-center gap-6'>
                                        <Link href="/">
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
                                        </Link>
                                        <Link href="/dashboard">
                                            <span
                                                className={`text-sm text-foreground hover:underline ${pathname?.startsWith("/dashboard") ? "underline" : ""}`}
                                            >
                                                Dashboard
                                            </span>
                                        </Link>
                                        <Link href="/circles">
                                            <span
                                                className={`text-sm text-foreground hover:underline ${pathname?.startsWith("/circles") ? "underline" : ""}`}
                                            >
                                                Circles
                                            </span>
                                        </Link>
                                        <Link href="/keeper">
                                            <span
                                                className={`text-sm text-foreground hover:underline ${pathname?.startsWith("/keeper") ? "underline" : ""}`}
                                            >
                                                Keeper
                                            </span>
                                        </Link>
                                    </div>


                                    <div className="flex items-center gap-4">
                                        {/* <AppKitButton /> */}
                                        <ConnectWalletButton />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </nav>
                </header>)}
        </>
    )
}
