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

export default function SessionTable({ sessions, filieres, annees, typesSession }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const { data, setData, put, delete: destroy, errors, processing, reset } = useForm({
        id_session_examen: null,
        id_filiere: '',
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
            id_filiere: session.id_filiere ?? '',
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
                    title: 'Session modifiée',
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
            text: 'Toutes les informations liées seront perdues.',
            showCancelButton: true,
            confirmButtonText: 'Oui, supprimer',
            cancelButtonText: 'Annuler',
        }).then((result) => {
            if (!result.isConfirmed) return;
            destroy(route('examens.sessions.destroy', sessionId), {
                onSuccess: () =>
                    Swal.fire({
                        icon: 'success',
                        title: 'Session supprimée',
                        timer: 1200,
                        showConfirmButton: false,
                    }),
            });
        });
    };

    const filteredSessions = useMemo(() => {
        const query = normalizeText(searchTerm.trim());

        if (!query) {
            return sessions;
        }

        return sessions.filter((session) => {
            const searchableValues = [
                session.nom_session,
                session.type_session,
                session.quadrimestre,
                session.description,
                session.date_session_examen,
                session.filiere?.nom_filiere,
                session.annee_universitaire?.annee_univ,
            ];

            return searchableValues.some((value) => normalizeText(value).includes(query));
        });
    }, [sessions, searchTerm]);

    const searchActive = searchTerm.trim().length > 0;

    return (
        <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Sessions planifiées</h2>
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
                <div className="w-full md:w-64">
                    <label htmlFor="session-search" className="sr-only">
                        Rechercher une session
                    </label>
                    <input
                        id="session-search"
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Rechercher (nom, filière, type...)"
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700"
                    />
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
                                Filière
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Année
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
                                <td className="px-4 py-3">{session.filiere?.nom_filiere ?? '—'}</td>
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
                                        ? 'Aucune session ne correspond à votre recherche.'
                                        : 'Aucune session prévue pour le moment.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Modifier la session</h3>
                            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-300">
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-4">
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

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Année</label>
                                    <select
                                        value={data.id_annee}
                                        onChange={(e) => setData('id_annee', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    >
                                        <option value="">Sélectionner</option>
                                        {annees.map((annee) => (
                                            <option key={annee.id_annee} value={annee.id_annee}>
                                                {annee.annee_univ}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.id_annee} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Filière</label>
                                    <select
                                        value={data.id_filiere}
                                        onChange={(e) => setData('id_filiere', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    >
                                        <option value="">Toutes les filières</option>
                                        {filieres.map((filiere) => (
                                            <option key={filiere.id_filiere} value={filiere.id_filiere}>
                                                {filiere.nom_filiere}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.id_filiere} className="mt-1" />
                                </div>
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
                                    Modifier
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
