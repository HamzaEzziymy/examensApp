import { Head, Link, usePage } from '@inertiajs/react';
import { FaArrowLeft, FaArrowRight, FaFileAlt, FaHome, FaPaperclip, FaProjectDiagram, FaTasks, FaTheaterMasks, FaUser } from 'react-icons/fa';
import { IoDocumentsSharp } from 'react-icons/io5';
import {
    CalendarDays,
    GraduationCap,
    Layers,
    BookOpen,
    FolderTree,
    FileText,
} from "lucide-react";
import { useEffect, useState } from 'react';

export default function Header() {
    
    const navigations = [
        {
            name: "Années Universitaires",
            icon: <CalendarDays size={20} />, // Symbolizes academic year or calendar
            href: route("academique.annees-universitaires.index"),
            current: route().current("academique.annees-universitaires.index"),
        },
        {
            name: "Filières",
            icon: <GraduationCap size={20} />, // Represents study programs or fields
            href: route("academique.filieres.index"),
            current: route().current("academique.filieres.index"),
        },
        {
            name: "Niveaux",
            icon: <Layers size={20} />, // Symbolizes levels/stages
            // send a parameter in niveaux route to indicate it's for filieres

            href: route("academique.niveaux.index"),
            current: route().current("academique.niveaux.index"),
        },
        {
            name: "Modules",
            icon: <FolderTree size={20} />, // Represents grouped academic modules
            href: route("academique.modules.index"),
            current: route().current("academique.modules.index"),
        },
    ];


    return (
        <header className="flex flex-row justify-center max-w-7xl mx-auto py-2 rounded-md -mt-3 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 shadow-lg ">
            <nav className="flex flex-wrap gap-2 sm:gap-4" aria-label="Documentation Navigation">
                {navigations.map((item, index) => (
                    <div key={index}>
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`
                            group relative px-4 py-3 font-medium text-sm rounded-lg 
                            transition-all duration-200 ease-in-out flex items-center space-x-2
                            ${item.current
                                    ? 'bg-blue-600 text-white shadow-md scale-105'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 hover:shadow-md transform hover:scale-105'
                                }
                        `}
                            aria-current={item.current ? 'page' : undefined}
                        >
                            {/* Animated icon wrapper */}
                            <span className={`
                            transition-transform duration-200 
                            ${item.current ? 'scale-110' : 'group-hover:scale-110'}
                        `}>
                                {item.icon}
                            </span>

                            {/* Navigation text */}
                            <span className="font-semibold whitespace-nowrap">
                                {item.name}
                            </span>
                            {item !== navigations[navigations.length - 1] && (

                                <FaArrowRight className="self-center text-gray-400" />
                            )
                            }
                        </Link>
                    </div>
                ))}
            </nav>
        </header>
    );
}