import React from 'react'
import { Link, usePage } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { FaHome, FaPaperclip, FaTasks, FaUser } from 'react-icons/fa';
import { IoDocumentsSharp } from "react-icons/io5";
import { MdAccountTree, MdFestival } from "react-icons/md";
import { PiGearBold } from "react-icons/pi";
import { CalendarDays } from 'lucide-react';


function Sidebar({ sidebarOpen, setSidebarOpen, mobileMenuOpen, setMobileMenuOpen }) {

    // Navigation items
    const navigation = [
        { name: 'Dashboard', icon: <FaHome size={20} />, href: route('dashboard'), current: route().current('dashboard') },
        { name: 'Documents', icon: <IoDocumentsSharp size={20} />, href: route('proces-v'), current: route().current('*.documents.*') },
        {
            name: 'Structure académique',
            icon: <MdAccountTree size={20} />,
            href: route('academique.annees-universitaires.index'),
            current: route().current('academique.*')
        },
        {
            name: 'Examens',
            icon: <FaTasks size={20} />,
            href: route('examens.sessions.index'),
            current: route().current('examens.*') || route().current('surveillance.repartition-etudiants.*')
        },
        { name: 'Reports', icon: <FaPaperclip size={20} />, href: '#', current: false },
        { name: 'Profile', icon: <FaUser size={20} />, href: route('profile.edit'), current: route().current('profile.edit') }
    ];

    const configRoutes = [
        { name: 'Faculte', icon: <PiGearBold size={20} />, href: route('configuration.faculte.index'), current: route().current('configuration.faculte.index') },
        { name: 'Années Universitaires', icon: <CalendarDays size={20} />, href: route("configuration.annees-universitaires.index"), current: route().current('configuration.annees-universitaires.index') }

    ]

    return (
        <>
            {/* Sidebar for mobile */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white dark:bg-gray-800 transition-transform duration-300 ease-in-out lg:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
                    <ApplicationLogo className="w-auto fill-current text-gray-800 dark:text-gray-200" />
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <nav className="mt-5 space-y-1 px-3">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${item.current
                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                                }`}
                        >
                            {item.icon && <span className="mr-3">{item.icon}</span>}
                            {item.name}
                        </Link>
                    ))}
                </nav>
                
            </div>

            {/* Sidebar for desktop */}
            <div className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ${sidebarOpen ? 'lg:w-64' : 'lg:w-20'
                }`}>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
                        {sidebarOpen && (
                            <ApplicationLogo className="w-auto fill-current text-gray-800 dark:text-gray-200" />
                        )}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d={sidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
                            </svg>
                        </button>
                    </div>
                    <nav className="flex flex-1 flex-col px-3">
                        <ul className="space-y-1">
                            {navigation.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={`group flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${item.current
                                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                                            }`}
                                        title={!sidebarOpen ? item.name : ''}
                                    >
                                        <span className={`${!sidebarOpen && 'mx-auto'}`}>
                                            {item.icon}
                                        </span>
                                        {sidebarOpen && <span>{item.name}</span>}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    {/* bottom route */}
                <div className="mt-4 space-y-1 px-3 mb-8">
                    {
                        configRoutes.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`group flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${item.current
                                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                                    }`}
                                title={!sidebarOpen ? item.name : ''}
                            >
                                <span className={`${!sidebarOpen && 'mx-auto'}`}>
                                    {item.icon}
                                </span>
                                {sidebarOpen && <span>{item.name}</span>}
                            </Link>
                        ))
                    }
                    {/* <Link
                        href={faculteRoute.href}
                        className={`group flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${faculteRoute.current
                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                            }`}
                        title={!sidebarOpen ? faculteRoute.name : ''}
                    >
                        <span className={`${!sidebarOpen && 'mx-auto'}`}>
                            {faculteRoute.icon}
                        </span>
                        {sidebarOpen && <span>{faculteRoute.name}</span>}
                    </Link> */}
                </div>
                </div>
            </div>
        </>
    )
}

export default Sidebar
