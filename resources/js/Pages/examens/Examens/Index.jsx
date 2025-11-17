import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import ExamHeader from '../Header';
import PlanifierForm from './PlanifierForm';
import ExamensTable from './ExamensTable';

export default function ExamensIndex({ examens, sessions, modules, salles, statuts }) {
    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Planification des examens</h2>}
        >
            <Head title="Planification examens" />

            <ExamHeader />

            <div className="mb-4 flex justify-end">
                <Link
                    href={route('examens.calendar')}
                    className="inline-flex items-center rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                >
                    Ouvrir le calendrier
                </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <PlanifierForm sessions={sessions} modules={modules} salles={salles} statuts={statuts} />
                </div>
                <div className="lg:col-span-2">
                    <ExamensTable
                        examens={examens}
                        sessions={sessions}
                        modules={modules}
                        salles={salles}
                        statuts={statuts}
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
