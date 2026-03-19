"use client";

import Image from 'next/image'
import React from 'react'
import { useTheme } from './theme-provider';
import Link from 'next/link';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Moon, Sun } from 'lucide-react';

export default function Footer() {
    const { theme, toggleTheme, mounted } = useTheme();

    return (
        <footer className="border-t border-border bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="col-span-1 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-transparent flex items-center justify-center">
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
                        <p className="text-sm text-muted-foreground">
                            Transparent rotating savings for everyone.
                        </p>
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

                    {[
                        {
                            title: "Menu",
                            links: [
                                {
                                    label: "Circles",
                                    path: "/circles",
                                },
                                {
                                    label: "Keeper",
                                    path: "/keeper",
                                },
                            ],
                        },
                        // { title: "Learn", links: ["Documentation", "Blog", "FAQs"] },
                        // { title: "Legal", links: ["Terms", "Privacy", "Contact"] },
                    ].map((column) => (
                        <div key={column.title} className="text-start md:text-end">
                            <h4 className="font-semibold text-foreground mb-4 text-sm">
                                {column.title}
                            </h4>
                            <ul className="space-y-2">
                                {column.links.map((link) => (
                                    <li key={link.path}>
                                        <Link
                                            href={link.path}
                                            className="text-sm text-muted-foreground hover:text-foreground transition"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="border-t border-border pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-muted-foreground">
                            © 2026 Sanca Circle. All rights reserved.
                        </p>
                        <div className="flex gap-6">
                            {[
                                {
                                    id: 2,
                                    name: "GitHub",
                                    url: "https://github.com/RowNode/sanca",
                                },
                            ].map((social) => (
                                <Link
                                    key={social.id}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-muted-foreground hover:text-foreground transition"
                                >
                                    {social.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
