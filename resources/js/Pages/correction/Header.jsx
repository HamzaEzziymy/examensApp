import { Link } from '@inertiajs/react';
import { BarChart2, NotebookPen } from 'lucide-react';

const navigation = [
    {
        name: 'Resultats',
        icon: <BarChart2 size={18} />,
        href: route('correction.resultats-modules.index'),
        current: route().current('correction.resultats-modules.*') || route().current('correction.resultats-elements.*'),
    },
    {
        name: 'Notes',
        icon: <NotebookPen size={18} />,
        href: route('correction.notes.index'),
        current: route().current('correction.notes.*'),
    },
];

export default function CorrectionHeader() {
    return (
        <header className="mb-6 rounded-xl bg-white p-4 shadow dark:bg-gray-800">
            <nav className="flex flex-wrap gap-3" aria-label="Correction navigation">
                {navigation.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition
                            ${
                                item.current
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/40 dark:text-indigo-200'
                                    : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-indigo-500'
                            }`}
                    >
                        {item.icon}
                        <span>{item.name}</span>
                    </Link>
                ))}
            </nav>
        </header>
    );
}
