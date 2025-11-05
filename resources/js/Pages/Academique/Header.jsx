import { Head, Link } from '@inertiajs/react';
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
            href: "#",
            current: false,
        },
        {
            name: "Niveaux",
            icon: <Layers size={20} />, // Symbolizes levels/stages
            href: "#",
            current: false,
        },
        {
            name: "Semestres",
            icon: <BookOpen size={20} />, // Represents semesters and study materials
            href: "#",
            current: false,
        },
        {
            name: "Modules",
            icon: <FolderTree size={20} />, // Represents grouped academic modules
            href: "#",
            current: false,
        },
        {
            name: "Éléments de Module",
            icon: <FileText size={20} />, // Represents specific course elements
            href: "#",
            current: false,
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
                            ${
                            item.current 
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
                        
                        {/* Current page indicator */}
                        {item.current && (
                            <span className="absolute -bottom-1 left-1/2 w-2 h-2 bg-blue-400 rounded-full transform -translate-x-1/2" />
                        )}
                        </Link>
                        {item !== navigations[navigations.length - 1] && (
                            
                            <FaArrowRight className="self-center text-gray-400" />
                        )
                        }
                    </div>
                ))}
            </nav>
        </header>
    );
}