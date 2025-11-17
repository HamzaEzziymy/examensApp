import { useMemo, useState } from 'react';
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

export default function ExamensTable({ examens, sessions, modules, salles, statuts }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const { data, setData, put, delete: destroy, errors, processing, reset } = useForm({
        id_examen: null,
        id_session_examen: '',
        id_module: '',
        id_salle: '',
        date_examen: '',
        date_debut: '',
        date_fin: '',
        statut: statuts[0],
        description: '',
    });

    const openModal = (examen) => {
        setData({
            id_examen: examen.id_examen,
            id_session_examen: examen.id_session_examen ?? '',
            id_module: examen.id_module ?? '',
            id_salle: examen.id_salle ?? '',
            date_examen: toInputDate(examen.date_examen),
            date_debut: toInputDateTime(examen.date_debut),
            date_fin: toInputDateTime(examen.date_fin),
            statut: examen.statut,
            description: examen.description ?? '',
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
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
        <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
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
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700"
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
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Modifier l’examen</h3>
                            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-300">
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Session</label>
                                    <select
                                        value={data.id_session_examen}
                                        onChange={(e) => setData('id_session_examen', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    >
                                        <option value="">Sélectionner</option>
                                        {sessions.map((session) => (
                                            <option key={session.id_session_examen} value={session.id_session_examen}>
                                                {session.nom_session}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.id_session_examen} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Module</label>
                                    <select
                                        value={data.id_module}
                                        onChange={(e) => setData('id_module', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    >
                                        <option value="">Sélectionner</option>
                                        {modules.map((module) => (
                                            <option key={module.id_module} value={module.id_module}>
                                                {module.nom_module}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.id_module} className="mt-1" />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Salle</label>
                                    <select
                                        value={data.id_salle}
                                        onChange={(e) => setData('id_salle', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    >
                                        <option value="">Non assignée</option>
                                        {salles.map((salle) => (
                                            <option key={salle.id_salle} value={salle.id_salle}>
                                                {salle.code_salle}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.id_salle} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Date</label>
                                    <input
                                        type="date"
                                        value={data.date_examen}
                                        onChange={(e) => setData('date_examen', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    />
                                    <InputError message={errors.date_examen} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Statut</label>
                                    <select
                                        value={data.statut}
                                        onChange={(e) => setData('statut', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
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

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Début</label>
                                    <input
                                        type="datetime-local"
                                        value={data.date_debut}
                                        onChange={(e) => setData('date_debut', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    />
                                    <InputError message={errors.date_debut} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Fin</label>
                                    <input
                                        type="datetime-local"
                                        value={data.date_fin}
                                        onChange={(e) => setData('date_fin', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    />
                                    <InputError message={errors.date_fin} className="mt-1" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Notes</label>
                                <textarea
                                    rows={3}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                />
                                <InputError message={errors.description} className="mt-1" />
                            </div>

                            <div className="flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-70"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
