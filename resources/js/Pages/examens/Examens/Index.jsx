import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ExamHeader from '../Header';
import PlanifierForm from './PlanifierForm';
import ExamensTable from './ExamensTable';
import ExamensCalendar from './ExamensCalendar';
import { useState } from 'react';

export default function ExamensIndex({ examens, sessions, modules, salles, statuts }) {
    const [view, setView] = useState('list');

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Planification des examens</h2>}
        >
            <Head title="Planification examens" />

            <ExamHeader />

            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm text-gray-500 dark:text-gray-400">Basculez entre la liste et le calendrier.</div>
                <div className="inline-flex rounded-lg border border-indigo-200 p-1 dark:border-indigo-500/40">
                    <button
                        type="button"
                        onClick={() => setView('list')}
                        className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                            view === 'list'
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-indigo-700 hover:bg-indigo-50 dark:text-indigo-200 dark:hover:bg-indigo-500/10'
                        }`}
                    >
                        Vue liste
                    </button>
                    <button
                        type="button"
                        onClick={() => setView('calendar')}
                        className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                            view === 'calendar'
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-indigo-700 hover:bg-indigo-50 dark:text-indigo-200 dark:hover:bg-indigo-500/10'
                        }`}
                    >
                        Calendrier
                    </button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <PlanifierForm sessions={sessions} modules={modules} salles={salles} statuts={statuts} />
                </div>
                <div className="lg:col-span-2 space-y-6">
                    {view === 'list' && (
                        <ExamensTable
                            examens={examens}
                            sessions={sessions}
                            modules={modules}
                            salles={salles}
                            statuts={statuts}
                        />
                    )}
                    {view === 'calendar' && (
                        <ExamensCalendar
                            examens={examens}
                            sessions={sessions}
                            modules={modules}
                            salles={salles}
                            statuts={statuts}
                        />
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
