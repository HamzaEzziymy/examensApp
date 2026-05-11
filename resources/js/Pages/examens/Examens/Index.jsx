import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import ExamHeader from '../Header';
import ExamensCalendar from './ExamensCalendar';
import PlanifierForm from './PlanifierForm';
import ExamensTable from './ExamensTable';

export default function ExamensIndex({ examens, sessions, modules, salles, statuts, semestres, niveaux, sections }) {
    const [view, setView] = useState('list');
    const [formOpen, setFormOpen] = useState(false);

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Planification des examens</h2>}
        >
            <Head title="Planification examens" />

            <ExamHeader />

            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/80 p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
                <div className="text-sm text-gray-600 dark:text-gray-300">Basculez entre la liste et le calendrier.</div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setFormOpen(true)}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-500"
                    >
                        Planifier un examen
                    </button>
                    <div className="inline-flex rounded-lg border border-indigo-200 bg-white/60 p-1 shadow-sm dark:border-indigo-500/40 dark:bg-indigo-900/40">
                        <button
                            type="button"
                            onClick={() => setView('list')}
                            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                                view === 'list'
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'text-indigo-700 hover:bg-indigo-50 dark:text-indigo-100 dark:hover:bg-indigo-800/40'
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
                                    : 'text-indigo-700 hover:bg-indigo-50 dark:text-indigo-100 dark:hover:bg-indigo-800/40'
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
                        semestres={semestres}
                        niveaux={niveaux}
                        sections={sections}
                    />
                )}
                {view === 'calendar' && (
                    <ExamensCalendar
                        examens={examens}
                        sessions={sessions}
                        modules={modules}
                        salles={salles}
                        statuts={statuts}
                        semestres={semestres}
                        niveaux={niveaux}
                        sections={sections}
                    />
                )}
            </div>

            {formOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
                    <div className="flex min-h-full items-start justify-center p-3 sm:p-4 lg:p-6">
                        <div className="my-3 flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800 sm:my-6 sm:max-h-[calc(100vh-3rem)]">
                            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-gray-700 sm:px-6">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Planifier un examen</h3>
                                <button
                                    type="button"
                                    onClick={() => setFormOpen(false)}
                                    className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
                                <PlanifierForm
                                    sessions={sessions}
                                    modules={modules}
                                    salles={salles}
                                    statuts={statuts}
                                    semestres={semestres}
                                    niveaux={niveaux}
                                    sections={sections}
                                    asCard={false}
                                    hideTitle
                                    onCancel={() => setFormOpen(false)}
                                    onSuccess={() => setFormOpen(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
