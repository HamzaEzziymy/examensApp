import { useMemo, useState } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import InputError from '@/Components/InputError';
import { Edit, Trash2 } from 'lucide-react';

const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
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

export default function SessionTable({ sessions, annees, typesSession }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFiliere, setSelectedFiliere] = useState('all');

    const { data, setData, put, delete: destroy, errors, processing, reset } = useForm({
        id_session_examen: null,
        id_annee: '',
        nom_session: '',
        type_session: typesSession[0],
        date_session_examen: '',
        quadrimestre: '',
        description: '',
    });

    const openModal = (session) => {
        setData({
            id_session_examen: session.id_session_examen,
            id_annee: session.id_annee ?? '',
            nom_session: session.nom_session,
            type_session: session.type_session,
            date_session_examen: session.date_session_examen,
            quadrimestre: session.quadrimestre,
            description: session.description ?? '',
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        reset();
    };

    const handleUpdate = (event) => {
        event.preventDefault();
        if (!data.id_session_examen) return;

        put(route('examens.sessions.update', data.id_session_examen), {
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
                Swal.fire({
                    icon: 'success',
                    title: 'Session modifiee',
                    timer: 1500,
                    showConfirmButton: false,
                });
            },
        });
    };

    const handleDelete = (sessionId) => {
        Swal.fire({
            icon: 'warning',
            title: 'Supprimer cette session ?',
            text: 'La session sera supprimee. Les examens lies garderont leurs donnees sans session.',
            showCancelButton: true,
            confirmButtonText: 'Oui, supprimer',
            cancelButtonText: 'Annuler',
        }).then((result) => {
            if (!result.isConfirmed) return;
            destroy(route('examens.sessions.destroy', sessionId), {
                onSuccess: () =>
                    Swal.fire({
                        icon: 'success',
                        title: 'Session supprimee',
                        timer: 1200,
                        showConfirmButton: false,
                    }),
                onError: (formErrors) => {
                    const errorMessage =
                        formErrors.error ||
                        Object.values(formErrors).flat().join(', ') ||
                        'Impossible de supprimer cette session.';

                    Swal.fire({
                        icon: 'error',
                        title: 'Suppression impossible',
                        text: errorMessage,
                    });
                },
            });
        });
    };

    const filiereOptions = useMemo(() => {
        const options = new Map();

        sessions.forEach((session) => {
            const key = String(session.filiere?.id_filiere ?? 'commune');
            const label = session.filiere?.nom_filiere ?? 'Commune';

            if (!options.has(key)) {
                options.set(key, label);
            }
        });

        return Array.from(options.entries()).map(([value, label]) => ({
            value,
            label,
        }));
    }, [sessions]);

    const filteredSessions = useMemo(() => {
        const query = normalizeText(searchTerm.trim());

        return sessions.filter((session) => {
            const filiereLabel = session.filiere?.nom_filiere ?? 'Commune';
            const filiereValue = String(session.filiere?.id_filiere ?? 'commune');
            const searchableValues = [
                session.nom_session,
                session.type_session,
                session.quadrimestre,
                session.description,
                session.date_session_examen,
                filiereLabel,
                session.annee_universitaire?.annee_univ,
            ];

            const matchesFiliere = selectedFiliere === 'all' || filiereValue === selectedFiliere;
            const matchesSearch =
                !query || searchableValues.some((value) => normalizeText(value).includes(query));

            return matchesFiliere && matchesSearch;
        });
    }, [searchTerm, selectedFiliere, sessions]);

    const searchActive = searchTerm.trim().length > 0 || selectedFiliere !== 'all';

    return (
        <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Sessions planifiees</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {searchActive ? (
                            <>
                                {filteredSessions.length} / {sessions.length} sessions
                            </>
                        ) : (
                            `${sessions.length} sessions`
                        )}
                    </span>
                </div>
                <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
                    <div className="w-full md:w-48">
                        <label htmlFor="session-filiere-filter" className="sr-only">
                            Filtrer par filiere
                        </label>
                        <select
                            id="session-filiere-filter"
                            value={selectedFiliere}
                            onChange={(event) => setSelectedFiliere(event.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700"
                        >
                            <option value="all">Toutes les filieres</option>
                            {filiereOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full md:w-64">
                        <label htmlFor="session-search" className="sr-only">
                            Rechercher une session
                        </label>
                        <input
                            id="session-search"
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Rechercher (nom, filiere, type...)"
                            className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700"
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/40">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Session
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Quadrimestre
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Filiere
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Annee
                            </th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredSessions.map((session) => (
                            <tr key={session.id_session_examen} className="text-sm text-gray-700 dark:text-gray-200">
                                <td className="px-4 py-3 font-medium">{session.nom_session}</td>
                                <td className="px-4 py-3">
                                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-200">
                                        {session.type_session}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{session.quadrimestre}</td>
                                <td className="px-4 py-3">{formatDate(session.date_session_examen)}</td>
                                <td className="px-4 py-3">{session.filiere?.nom_filiere ?? 'Commune'}</td>
                                <td className="px-4 py-3">{session.annee_universitaire?.annee_univ ?? '—'}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openModal(session)}
                                            className="rounded-full p-2 text-indigo-600 transition hover:bg-indigo-50 dark:hover:bg-gray-700"
                                            title="Modifier"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(session.id_session_examen)}
                                            className="rounded-full p-2 text-red-600 transition hover:bg-red-50 dark:hover:bg-gray-700"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredSessions.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-5 text-center text-sm text-gray-500 dark:text-gray-400">
                                    {searchActive
                                        ? 'Aucune session ne correspond a votre recherche.'
                                        : 'Aucune session prevue pour le moment.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
                    <div className="flex min-h-full items-start justify-center p-3 sm:p-4 lg:p-6">
                        <div className="my-3 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800 sm:my-6 sm:max-h-[calc(100vh-3rem)]">
                            <div className="mb-0 flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-gray-700 sm:px-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Modifier la session</h3>
                            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-300">
                                ×
                            </button>
                        </div>
                            <div className="overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
                        <form onSubmit={handleUpdate} className="min-w-0 space-y-4 pt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Nom</label>
                                <input
                                    value={data.nom_session}
                                    onChange={(e) => setData('nom_session', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                />
                                <InputError message={errors.nom_session} className="mt-1" />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Type</label>
                                    <select
                                        value={data.type_session}
                                        onChange={(e) => setData('type_session', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    >
                                        {typesSession.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.type_session} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Quadrimestre</label>
                                    <input
                                        type="number"
                                        value={data.quadrimestre}
                                        onChange={(e) => setData('quadrimestre', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    />
                                    <InputError message={errors.quadrimestre} className="mt-1" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Annee</label>
                                <select
                                    value={data.id_annee}
                                    onChange={(e) => setData('id_annee', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                >
                                    <option value="">Selectionner</option>
                                    {annees.map((annee) => (
                                        <option key={annee.id_annee} value={annee.id_annee}>
                                            {annee.annee_univ}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.id_annee} className="mt-1" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Date</label>
                                <input
                                    type="date"
                                    value={data.date_session_examen}
                                    onChange={(e) => setData('date_session_examen', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                />
                                <InputError message={errors.date_session_examen} className="mt-1" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={3}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                />
                                <InputError message={errors.description} className="mt-1" />
                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 sm:w-auto"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-70 sm:w-auto"
                                >
                                    Modifier
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
