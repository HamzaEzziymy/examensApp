import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import ExamHeader from '../Header';
import ExamensCalendar from './ExamensCalendar';

export default function CalendarPage(props) {
    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Calendrier des examens</h2>}
        >
            <Head title="Calendrier des examens" />

            <ExamHeader />

            <div className="mb-4">
                <Link
                    href={route('examens.examens.index')}
                    className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                    ← Retour à la planification
                </Link>
            </div>

            <ExamensCalendar {...props} />
        </AuthenticatedLayout>
    );
}
