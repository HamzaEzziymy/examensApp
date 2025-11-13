import { Link } from '@inertiajs/react';
import { CalendarClock, ClipboardList, Rows4 } from 'lucide-react';

const navigation = [
    {
        name: 'Sessions',
        icon: <CalendarClock size={18} />,
        href: route('examens.sessions.index'),
        current: route().current('examens.sessions.*'),
    },
    {
        name: 'Planification',
        icon: <ClipboardList size={18} />,
        href: route('examens.examens.index'),
        current: route().current('examens.examens.*'),
    },
    {
        name: 'Répartition',
        icon: <Rows4 size={18} />,
        href: route('surveillance.repartition-etudiants.index'),
        current: route().current('surveillance.repartition-etudiants.*'),
    },
];

export default function ExamHeader() {
    return (
        <header className="mb-6 rounded-xl bg-white p-4 shadow dark:bg-gray-800">
            <nav className="flex flex-wrap gap-3" aria-label="Exam navigation">
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
