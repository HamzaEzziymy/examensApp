import { Link } from '@inertiajs/react';
import {
    GraduationCap,
} from "lucide-react";

export default function Header() {

    const navigations = [
        {
            name: "Etudiantes",
            icon: <GraduationCap size={20} />, // Represents study programs or fields
            href: route("inscriptions.etudiants.index"),
            current: route().current("inscriptions.etudiants.index"),
        }
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
                        </Link>
                    </div>
                ))}
            </nav>
        </header>
    );
}

