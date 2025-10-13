import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';

export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth.user;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', href: route('dashboard'), current: route().current('dashboard') },
        { name: 'Projects', href: '#', current: false },
        { name: 'Tasks', href: '#', current: false },
        { name: 'Reports', href: '#', current: false },
        { name: 'Settings', href: '#', current: false },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar for mobile */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white dark:bg-gray-800 transition-transform duration-300 ease-in-out lg:hidden ${
                mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
                    <ApplicationLogo className="h-8 w-auto fill-current text-gray-800 dark:text-gray-200" />
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
                            className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                item.current
                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                            }`}
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Sidebar for desktop */}
            <div className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ${
                sidebarOpen ? 'lg:w-64' : 'lg:w-20'
            }`}>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
                        {sidebarOpen && (
                            <ApplicationLogo className="h-8 w-auto fill-current text-gray-800 dark:text-gray-200" />
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
                                        className={`group flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                            item.current
                                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                                        }`}
                                        title={!sidebarOpen ? item.name : ''}
                                    >
                                        <span className={`${!sidebarOpen && 'mx-auto'}`}>
                                            {item.name.charAt(0)}
                                        </span>
                                        {sidebarOpen && <span>{item.name}</span>}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>
            </div>

            {/* Main content */}
            <div className={`transition-all duration-300 ${!sidebarOpen ? 'lg:pl-20':'lg:pl-64'}`}>
                {/* Top navigation */}
                <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:gap-x-6 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden"
                        onClick={() => setMobileMenuOpen(true)}
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 lg:hidden" />

                    <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                        <div className="flex flex-1 items-center">
                            {header}
                        </div>
                        <div className="flex items-center gap-x-4 lg:gap-x-6">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button className="flex items-center gap-x-3 rounded-full p-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-medium text-white">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                        <span className="hidden lg:flex lg:items-center">
                                            <span className="ml-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {user.name}
                                            </span>
                                            <svg className="ml-2 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')}>
                                        Profile
                                    </Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button">
                                        Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </div>

                <main className="py-6">
                    <div className="px-4 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}