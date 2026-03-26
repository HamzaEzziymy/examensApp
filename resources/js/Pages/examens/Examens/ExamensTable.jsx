import { useEffect, useMemo, useState } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import InputError from '@/Components/InputError';
import { Edit3, Trash2 } from 'lucide-react';

const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
};

const formatDateTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString();
};

const toInputDate = (value) => (value ? value.substring(0, 10) : '');

const toInputDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    const pad = (num) => `${num}`.padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
        date.getMinutes(),
    )}`;
};

const formatSessionLabel = (session) => {
    const parts = [session.nom_session];

    if (session.type_session) {
        parts.push(session.type_session);
    }

    parts.push(
        session.date_session_examen ? new Date(session.date_session_examen).toLocaleDateString() : 'Date a confirmer',
    );

    return parts.join(' - ');
};

const statusTone = {
    Planifiee: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-200',
    'En cours': 'bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-200',
    Terminee: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200',
    Annulee: 'bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-200',
};

const normalizeText = (value) => {
    if (value === undefined || value === null) {
        return '';
    }

    return value
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

export default function ExamensTable({ examens, sessions, modules, salles, statuts, semestres = [], niveaux = [] }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedNiveau, setSelectedNiveau] = useState('');
    const [selectedSemestre, setSelectedSemestre] = useState('');
    const [allocations, setAllocations] = useState({});

    const { data, setData, put, delete: destroy, errors, processing, reset, transform } = useForm({
        id_examen: null,
        id_session_examen: '',
        id_module: '',
        id_salle: '',
        salles: [],
        repartition_salles: [],
        anonymat_start: '',
        anonymat_end: '',
        date_examen: '',
        date_debut: '',
        date_fin: '',
        statut: statuts[0],
        description: '',
    });

    const filteredSemestres = useMemo(
        () => semestres.filter((sem) => !selectedNiveau || String(sem.id_niveau) === String(selectedNiveau)),
        [semestres, selectedNiveau],
    );

    const filteredModules = useMemo(() => {
        return modules.filter((module) => {
            const sems = module.semestres || [];
            const matchesNiveau =
                !selectedNiveau || sems.some((sem) => String(sem.id_niveau) === String(selectedNiveau));
            const matchesSemestre =
                !selectedSemestre || sems.some((sem) => String(sem.id_semestre) === String(selectedSemestre));
            return matchesNiveau && matchesSemestre;
        });
    }, [modules, selectedNiveau, selectedSemestre]);

    const selectedSalles = useMemo(
        () => salles.filter((salle) => data.salles.includes(String(salle.id_salle))),
        [salles, data.salles],
    );
    const plannedAnonymatCount = useMemo(() => {
        const start = Number.parseInt(data.anonymat_start, 10);
        const end = Number.parseInt(data.anonymat_end, 10);

        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
            return null;
        }

        return (end - start) + 1;
    }, [data.anonymat_end, data.anonymat_start]);

    useEffect(() => {
        const exists = filteredModules.some((mod) => String(mod.id_module) === String(data.id_module));
        if (!exists) {
            setData('id_module', '');
        }
    }, [filteredModules, data.id_module, setData]);

    useEffect(() => {
        setAllocations((current) => {
            const next = {};
            data.salles.forEach((id) => {
                if (current[id] !== undefined) {
                    next[id] = current[id];
                }
            });
            return next;
        });
    }, [data.salles]);

    useEffect(() => {
        transform((currentData) => ({
            ...currentData,
            repartition_salles: (currentData.salles || [])
                .map((id) => {
                    const value = allocations[id];
                    return {
                        id_salle: Number(id),
                        nombre: value ? Number(value) : null,
                    };
                })
                .filter((row) => row.nombre),
        }));
    }, [allocations, data.salles, transform]);

    const autoDistributeSelectedSalles = () => {
        if (!selectedSalles.length) return;

        const totalStudents =
            plannedAnonymatCount ??
            selectedSalles.reduce((sum, salle) => sum + (salle.capacite_examens ?? salle.capacite ?? 0), 0);
        let remaining = totalStudents;
        const next = {};

        selectedSalles.forEach((salle, index) => {
            const roomsLeft = selectedSalles.length - index;
            const capacity = salle.capacite_examens ?? salle.capacite ?? remaining;
            const target = Math.ceil(remaining / Math.max(1, roomsLeft));
            const take = Math.min(capacity > 0 ? capacity : remaining, target, remaining);
            next[String(salle.id_salle)] = remaining > 0 ? take : '';
            remaining -= take;
        });

        setAllocations(next);
    };

    const openModal = (examen) => {
        const moduleData = modules.find((m) => String(m.id_module) === String(examen.id_module));
        const firstSem = moduleData?.semestres?.[0];
        setSelectedNiveau(firstSem?.id_niveau ? String(firstSem.id_niveau) : '');
        setSelectedSemestre(firstSem?.id_semestre ? String(firstSem.id_semestre) : '');

        setData({
            id_examen: examen.id_examen,
            id_session_examen: examen.id_session_examen ?? '',
            id_module: examen.id_module ?? '',
            id_salle: examen.id_salle ?? '',
            salles: (examen.salles || []).map((s) => String(s.id_salle)),
            anonymat_start: examen.anonymat_start ?? '',
            anonymat_end: examen.anonymat_end ?? '',
            date_examen: toInputDate(examen.date_examen),
            date_debut: toInputDateTime(examen.date_debut),
            date_fin: toInputDateTime(examen.date_fin),
            statut: examen.statut,
            description: examen.description ?? '',
        });
        setAllocations({});
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedNiveau('');
        setSelectedSemestre('');
        setAllocations({});
        reset();
    };

    const handleUpdate = (event) => {
        event.preventDefault();
        if (!data.id_examen) return;

        put(route('examens.examens.update', data.id_examen), {
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
                Swal.fire({
                    icon: 'success',
                    title: 'Examen mis à jour',
                    timer: 1500,
                    showConfirmButton: false,
                });
            },
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            icon: 'warning',
            title: 'Supprimer cet examen ?',
            text: 'Les surveillances et répartitions associées seront également supprimées.',
            showCancelButton: true,
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler',
        }).then((result) => {
            if (!result.isConfirmed) return;
            destroy(route('examens.examens.destroy', id), {
                onSuccess: () =>
                    Swal.fire({
                        icon: 'success',
                        title: 'Examen supprimé',
                        timer: 1200,
                        showConfirmButton: false,
                    }),
            });
        });
    };

    const filteredExamens = useMemo(() => {
        const query = normalizeText(searchTerm.trim());

        if (!query) {
            return examens;
        }

        return examens.filter((examen) => {
            const searchableValues = [
                examen.module?.nom_module,
                examen.module?.code_module,
                examen.session_examen?.nom_session,
                examen.session_examen?.type_session,
                examen.salle?.nom_salle,
                examen.salle?.code_salle,
                examen.statut,
                examen.description,
                examen.date_examen,
                examen.date_debut,
                examen.date_fin,
            ];

            return searchableValues.some((value) => normalizeText(value).includes(query));
        });
    }, [examens, searchTerm]);

    const searchActive = searchTerm.trim().length > 0;

    return (
        <div className="rounded-xl border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-gray-700 dark:text-white dark:bg-gray-900">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Examens programmés</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {searchActive ? (
                            <>
                                {filteredExamens.length} / {examens.length} examens
                            </>
                        ) : (
                            `${examens.length} examens`
                        )}
                    </span>
                </div>
                <div className="w-full md:w-64">
                    <label htmlFor="examens-search" className="sr-only">
                        Rechercher un examen
                    </label>
                    <input
                        id="examens-search"
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Rechercher (module, session, salle...)"
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/40">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Module
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Session
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Salle
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Horaires
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Statut
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Répartitions
                            </th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredExamens.map((examen) => (
                            <tr key={examen.id_examen} className="text-sm text-gray-700 dark:text-gray-200">
                                <td className="px-4 py-3 font-medium">
                                    <div>{examen.module?.nom_module ?? 'Module inconnu'}</div>
                                    <div className="text-xs text-gray-500">{examen.module?.code_module}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div>{examen.session_examen?.nom_session ?? '—'}</div>
                                    <div className="text-xs text-gray-500">{examen.session_examen?.type_session}</div>
                                </td>
                                <td className="px-4 py-3">
                                    {examen.salle ? (
                                        <>
                                            <div>{examen.salle.nom_salle}</div>
                                            <div className="text-xs text-gray-500">
                                                {examen.salle.code_salle} • {examen.salle.capacite_examens} places
                                            </div>
                                        </>
                                    ) : (
                                        <span className="text-xs text-gray-500">Non assignée</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div>{formatDate(examen.date_examen)}</div>
                                    <div className="text-xs text-gray-500">
                                        {formatDateTime(examen.date_debut)} → {formatDateTime(examen.date_fin)}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                            statusTone[examen.statut] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700'
                                        }`}
                                    >
                                        {examen.statut}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {examen.repartitions_count}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openModal(examen)}
                                            className="rounded-full p-2 text-indigo-600 transition hover:bg-indigo-50 dark:hover:bg-gray-700"
                                            title="Modifier"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(examen.id_examen)}
                                            className="rounded-full p-2 text-red-600 transition hover:bg-red-50 dark:hover:bg-gray-700"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredExamens.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                    {searchActive
                                        ? 'Aucun examen ne correspond à cette recherche.'
                                        : 'Aucun examen planifié pour l’instant.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-4">
                    <div className="flex min-h-full items-start justify-center">
                        <div className="my-3 flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800 dark:text-white sm:my-6 sm:max-h-[calc(100vh-3rem)]">
                        <div className="mb-0 flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-gray-700 sm:px-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Modifier l’examen</h3>
                            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-200">
                                ×
                            </button>
                        </div>

                        <div className="overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
                        <form onSubmit={handleUpdate} className="min-w-0 space-y-4 pt-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Session</label>
                                    <select
                                        value={data.id_session_examen}
                                        onChange={(e) => setData('id_session_examen', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    >
                                        <option value="">Sélectionner</option>
                                        {sessions.map((session) => (
                                            <option key={session.id_session_examen} value={session.id_session_examen}>
                                                {formatSessionLabel(session)}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.id_session_examen} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Module</label>
                                    <select
                                        value={data.id_module}
                                        onChange={(e) => setData('id_module', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    >
                                        <option value="">Sélectionner</option>
                                        {filteredModules.map((module) => (
                                            <option key={module.id_module} value={module.id_module}>
                                                {module.nom_module}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.id_module} className="mt-1" />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Anonymat debut</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={data.anonymat_start}
                                        onChange={(e) => setData('anonymat_start', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                        placeholder="Ex: 101"
                                    />
                                    <InputError message={errors.anonymat_start} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Anonymat fin</label>
                                    <input
                                        type="number"
                                        min={data.anonymat_start || '1'}
                                        value={data.anonymat_end}
                                        onChange={(e) => setData('anonymat_end', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                        placeholder="Ex: 200"
                                    />
                                    <InputError message={errors.anonymat_end} className="mt-1" />
                                </div>
                                <div className="sm:col-span-2">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Laissez vide pour commencer a 1. Si vous renseignez une plage, seuls les anonymats compris entre ces deux valeurs seront generes.
                                    </p>
                                    {plannedAnonymatCount !== null && (
                                        <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-300">
                                            {plannedAnonymatCount} anonymats seront generes pour cette planification.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Salles (multi)</label>
                                <select
                                    multiple
                                    value={data.salles}
                                    onChange={(e) => setData('salles', Array.from(e.target.selectedOptions).map((opt) => opt.value))}
                                    className="mt-1 min-h-[8rem] w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                >
                                    {salles.map((salle) => (
                                        <option key={salle.id_salle} value={String(salle.id_salle)}>
                                            {salle.code_salle} - Capacite {salle.capacite_examens ?? salle.capacite ?? 0}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.salles} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Date</label>
                                    <input
                                        type="date"
                                        value={data.date_examen}
                                        onChange={(e) => setData('date_examen', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    />
                                    <InputError message={errors.date_examen} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Statut</label>
                                    <select
                                        value={data.statut}
                                        onChange={(e) => setData('statut', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    >
                                        {statuts.map((statut) => (
                                            <option key={statut} value={statut}>
                                                {statut}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.statut} className="mt-1" />
                                </div>
                            </div>

                            <div className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Repartition par salle (optionnel)</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Laissez vide pour l&apos;equilibrage automatique. Renseignez un nombre pour imposer l&apos;effectif par salle.
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={autoDistributeSelectedSalles}
                                            disabled={!selectedSalles.length}
                                            className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/40 dark:text-indigo-100 dark:hover:bg-indigo-900/40"
                                        >
                                            Equilibrer
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAllocations({})}
                                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                        >
                                            Vider
                                        </button>
                                    </div>
                                </div>

                                {selectedSalles.length > 0 ? (
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        {selectedSalles.map((salle) => (
                                            <div key={salle.id_salle} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                                    {salle.nom_salle} ({salle.code_salle})
                                                </div>
                                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    Capacite : {salle.capacite_examens ?? salle.capacite ?? 'N/C'}
                                                </div>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={allocations[String(salle.id_salle)] ?? ''}
                                                    onChange={(e) =>
                                                        setAllocations((prev) => ({
                                                            ...prev,
                                                            [String(salle.id_salle)]: e.target.value,
                                                        }))
                                                    }
                                                    className="mt-2 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                                    placeholder="Ex: 80"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                        Choisissez des salles pour definir la repartition.
                                    </p>
                                )}
                                <InputError message={errors.repartition_salles} className="mt-2" />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Début</label>
                                    <input
                                        type="datetime-local"
                                        value={data.date_debut}
                                        onChange={(e) => setData('date_debut', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    />
                                    <InputError message={errors.date_debut} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Fin</label>
                                    <input
                                        type="datetime-local"
                                        value={data.date_fin}
                                        onChange={(e) => setData('date_fin', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    />
                                    <InputError message={errors.date_fin} className="mt-1" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Notes</label>
                                <textarea
                                    rows={3}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                />
                                <InputError message={errors.description} className="mt-1" />
                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 sm:w-auto"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-70 sm:w-auto"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                        </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
