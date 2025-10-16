import { Head, Link } from '@inertiajs/react';
import { FaFileAlt, FaHome, FaPaperclip, FaProjectDiagram, FaTasks, FaUser } from 'react-icons/fa';
import { IoDocumentsSharp } from 'react-icons/io5';

export default function Header() {

    const docs_navigation = [
        { name: 'PV ABSENCE',icon:<FaFileAlt size={20}/> , href: route('proces-v'), current: route().current('proces-v') },
        // { name: 'Documents',icon:<IoDocumentsSharp size={20}/>, href: route('documents'), current: route().current('documents') },
        // { name: 'Projects',icon:<FaProjectDiagram size={20}/>, href: '#', current: false },
        // { name: 'Tasks',icon:<FaTasks size={20}/>, href: '#', current: false },
        // { name: 'Reports',icon:<FaPaperclip size={20}/>, href: '#', current: false },
        // { name: 'Settings',icon:<CiSettings size={20}/>, href: '#', current: false },
        // { name: 'Profile',icon:<FaUser size={20}/>, href: route('profile.edit'), current: route().current('profile.edit') },
    ];


    return (
        <header className="flex flex-row justify-center max-w-7xl mx-auto py-3 rounded-md -mt-2 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 shadow-lg ">
            <nav className="flex flex-wrap gap-2 sm:gap-4" aria-label="Documentation Navigation">
                {docs_navigation.map((item) => (
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
                ))}
            </nav>
        </header>
    );
}