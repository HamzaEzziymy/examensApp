import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { BarChart3, Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import CorrectionHeader from '../Header';

export default function ResultatsModulesIndex({
    scope = {},
    filters = {},
    filterOptions = {},
    stats = {},
    students = [],
    exportUrl = '',
}) {
    const [selectedSemesterId, setSelectedSemesterId] = useState(filters.semester_id ? String(filters.semester_id) : '');
    const [selectedStudentId, setSelectedStudentId] = useState(filters.student_id ? String(filters.student_id) : '');
    const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
    const studentDropdownRef = useRef(null);

    const semesters = filterOptions.semesters || [];
    const studentOptions = filterOptions.students || [];
    const selectedStudentOption = studentOptions.find((student) => String(student.id) === selectedStudentId);
    const normalizeText = (value) =>
        String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    const filteredStudentOptions = studentOptions.filter((student) => {
        const query = normalizeText(studentSearch);

        if (!query) {
            return true;
        }

        return normalizeText(student.label || '').includes(query);
    });

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target)) {
                setStudentDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, []);

    const currentQuery = () => {
        const params = {};

        if (selectedSemesterId) {
            params.semester_id = selectedSemesterId;
        }

        if (selectedStudentId) {
            params.student_id = selectedStudentId;
        }

        return params;
    };

    const buildExportHref = () => {
        const query = new URLSearchParams(currentQuery()).toString();
        const baseUrl = exportUrl || route('correction.resultats-modules.export-releve-notes');

        return query ? `${baseUrl}?${query}` : baseUrl;
    };

    const applyFilters = () => {
        router.get(route('correction.resultats-modules.index'), currentQuery(), {
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setSelectedSemesterId('');
        setSelectedStudentId('');
        setStudentSearch('');
        setStudentDropdownOpen(false);

        router.get(route('correction.resultats-modules.index'), {}, {
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Resultats des modules</h2>}
        >
            <Head title="Resultats des modules" />

            <CorrectionHeader />

            <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <BarChart3 size={24} className="text-indigo-600" />
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                    Releve des notes
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Export PDF par etudiant avec notes modules, notes elements et statut du module.
                                </p>
                            </div>
                        </div>
                        <a
                            href={buildExportHref()}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                        >
                            <Download size={16} />
                            Exporter PDF
                        </a>
                    </div>

                    <div className="mb-4 grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40 md:grid-cols-4">
                        <div className="md:col-span-1">
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                                Semestre
                            </label>
                            <select
                                value={selectedSemesterId}
                                onChange={(event) => {
                                    setSelectedSemesterId(event.target.value);
                                    setSelectedStudentId('');
                                    setStudentSearch('');
                                    setStudentDropdownOpen(false);
                                }}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                            >
                                <option value="">Tous les semestres</option>
                                {semesters.map((semester) => (
                                    <option key={semester.id} value={semester.id}>
                                        {semester.nom}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                                Etudiant
                            </label>
                            <div className="relative" ref={studentDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStudentSearch('');
                                        setStudentDropdownOpen((open) => !open);
                                    }}
                                    className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                                    aria-expanded={studentDropdownOpen}
                                >
                                    <span className="truncate">
                                        {selectedStudentOption?.label || 'Tous les etudiants'}
                                    </span>
                                    <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">Rechercher</span>
                                </button>

                                {studentDropdownOpen ? (
                                    <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-slate-900">
                                        <input
                                            type="text"
                                            value={studentSearch}
                                            onChange={(event) => setStudentSearch(event.target.value)}
                                            placeholder="Rechercher par CNE ou nom..."
                                            className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                                        />

                                        <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedStudentId('');
                                                    setStudentSearch('');
                                                    setStudentDropdownOpen(false);
                                                }}
                                                className={`block w-full px-3 py-2 text-left text-sm transition ${
                                                    selectedStudentId === ''
                                                        ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200'
                                                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                Tous les etudiants
                                            </button>

                                            {filteredStudentOptions.length > 0 ? (
                                                filteredStudentOptions.map((student) => (
                                                    <button
                                                        key={student.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedStudentId(String(student.id));
                                                            setStudentSearch('');
                                                            setStudentDropdownOpen(false);
                                                        }}
                                                        className={`block w-full px-3 py-2 text-left text-sm transition ${
                                                            selectedStudentId === String(student.id)
                                                                ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200'
                                                                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        {student.label || student.nom_complet || student.cne || student.id}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                    Aucun etudiant ne correspond a cette recherche.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                type="button"
                                onClick={applyFilters}
                                className="inline-flex flex-1 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                            >
                                Appliquer
                            </button>
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                                Tout afficher
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-900/30">
                            <div className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-300">Filiere</div>
                            <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{scope.filiere || '-'}</div>
                        </div>
                        <div className="rounded-lg bg-sky-50 p-3 dark:bg-sky-900/30">
                            <div className="text-xs font-semibold uppercase text-sky-600 dark:text-sky-300">Annee</div>
                            <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{scope.annee || '-'}</div>
                        </div>
                        <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/30">
                            <div className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-300">Etudiants</div>
                            <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{stats.students || 0}</div>
                        </div>
                        <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/30">
                            <div className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">Modules valides</div>
                            <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{stats.validated_modules || 0}</div>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Apercu etudiants ({students.length})
                    </div>
                    {students.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                            Aucun resultat disponible pour la selection courante.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700/40">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">CNE</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">Nom</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">Prenom</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">Modules</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">Elements</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">Valides</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {students.map((student) => (
                                        <tr key={student.student_id} className="text-sm text-gray-700 dark:text-gray-200">
                                            <td className="px-3 py-2">{student.cne || '-'}</td>
                                            <td className="px-3 py-2">{student.nom || '-'}</td>
                                            <td className="px-3 py-2">{student.prenom || '-'}</td>
                                            <td className="px-3 py-2 text-center">{student.modules_count || 0}</td>
                                            <td className="px-3 py-2 text-center">{student.elements_count || 0}</td>
                                            <td className="px-3 py-2 text-center">{student.validated_modules_count || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
