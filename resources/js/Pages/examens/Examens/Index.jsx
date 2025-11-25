import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ExamHeader from '../Header';
import PlanifierForm from './PlanifierForm';
import ExamensTable from './ExamensTable';
import ExamensCalendar from './ExamensCalendar';
import { useState } from 'react';

export default function ExamensIndex({ examens, sessions, modules, salles, statuts }) {
    const [view, setView] = useState('list');
    const [formOpen, setFormOpen] = useState(false);

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Planification des examens</h2>}
        >
            <Head title="Planification examens" />

            <ExamHeader />

            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm text-gray-500 dark:text-gray-400">Basculez entre la liste et le calendrier.</div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setFormOpen(true)}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-500"
                    >
                        Planifier un examen
                    </button>
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
            </div>

            <div className="space-y-6">
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

            {formOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Planifier un examen</h3>
                            <button
                                type="button"
                                onClick={() => setFormOpen(false)}
                                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                ×
                            </button>
                        </div>
                        <PlanifierForm
                            sessions={sessions}
                            modules={modules}
                            salles={salles}
                            statuts={statuts}
                            asCard={false}
                            hideTitle
                            onCancel={() => setFormOpen(false)}
                            onSuccess={() => setFormOpen(false)}
                        />
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
