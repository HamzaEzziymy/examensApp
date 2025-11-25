import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import ExamHeader from '../Header';
import { useEffect, useMemo, useState } from 'react';
import InputError from '@/Components/InputError';
import Swal from 'sweetalert2';
import { CheckCircle2, Edit3, Trash2, XCircle } from 'lucide-react';

const badgeClasses = (present) =>
    present
        ? 'inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200'
        : 'inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-900/40 dark:text-amber-200';

const formatTime = (value) => (value ? value.substring(0, 5) : '—');

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

const defaultFormState = (examenId) => ({
    id_examen: examenId ? String(examenId) : '',
    id_inscription_pedagogique: '',
    code_grille: '',
    code_anonymat: '',
    numero_place: '',
    present: false,
    heure_arrivee: '',
    heure_sortie: '',
    observation: '',
});

export default function RepartitionIndex({ examens, repartitions, inscriptions, selectedExamenId, salles }) {
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSalles, setSelectedSalles] = useState(() => salles?.map((s) => String(s.id_salle)) || []);
    const { data, setData, post, put, delete: destroy, processing, errors } = useForm(
        defaultFormState(selectedExamenId),
    );

    const selectedExamen = useMemo(
        () => examens.find((examen) => examen.id_examen === selectedExamenId),
        [examens, selectedExamenId],
    );

    const editingRow = useMemo(
        () => repartitions.find((item) => item.id_repartition === editingId),
        [editingId, repartitions],
    );

    useEffect(() => {
        setData(() => defaultFormState(selectedExamenId));
        setEditingId(null);
        setSearchTerm('');
    }, [selectedExamenId]);

    useEffect(() => {
        setSelectedSalles(salles?.map((s) => String(s.id_salle)) || []);
    }, [salles]);

    const handleExamChange = (event) => {
        const value = event.target.value;
        router.get(
            route('surveillance.repartition-etudiants.index'),
            value ? { examen: value } : {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const assignedIds = useMemo(
        () => new Set(repartitions.map((item) => item.id_inscription_pedagogique)),
        [repartitions],
    );

    const availableInscriptions = inscriptions.filter((inscription) => {
        if (!assignedIds.has(inscription.id_inscription_pedagogique)) {
            return true;
        }

        return editingRow?.id_inscription_pedagogique === inscription.id_inscription_pedagogique;
    });

    const filteredRepartitions = useMemo(() => {
        const query = normalizeText(searchTerm.trim());

        if (!query) {
            return repartitions;
        }

        return repartitions.filter((item) => {
            const searchableValues = [
                item.inscription_pedagogique?.etudiant?.nom,
                item.inscription_pedagogique?.etudiant?.prenom,
                item.inscription_pedagogique?.etudiant?.cne,
                item.inscription_pedagogique?.module?.nom_module,
                item.inscription_pedagogique?.module?.code_module,
                item.code_grille,
                item.numero_place,
                item.code_anonymat,
                item.observation,
                item.present ? 'present' : 'absent',
                item.heure_arrivee,
                item.heure_sortie,
            ];

            return searchableValues.some((value) => normalizeText(value).includes(query));
        });
    }, [repartitions, searchTerm]);

    const searchActive = searchTerm.trim().length > 0;

    const resetForm = () => {
        setEditingId(null);
        setData(() => defaultFormState(selectedExamenId));
    };

    const startEdit = (repartition) => {
        setEditingId(repartition.id_repartition);
        setData((values) => ({
            ...values,
            id_examen: selectedExamenId ? String(selectedExamenId) : '',
            id_inscription_pedagogique: repartition.id_inscription_pedagogique
                ? String(repartition.id_inscription_pedagogique)
                : '',
            code_grille: repartition.code_grille ?? '',
            code_anonymat: repartition.code_anonymat ?? '',
            numero_place: repartition.numero_place ?? '',
            present: Boolean(repartition.present),
            heure_arrivee: repartition.heure_arrivee ?? '',
            heure_sortie: repartition.heure_sortie ?? '',
            observation: repartition.observation ?? '',
        }));
    };

    const submit = (event) => {
        event.preventDefault();
        if (!data.id_examen) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }

        if (editingId) {
            put(route('surveillance.repartition-etudiants.update', editingId), {
                preserveScroll: true,
                onSuccess: () => {
                    Swal.fire({ icon: 'success', title: 'Répartition mise à jour', timer: 1200, showConfirmButton: false });
                    resetForm();
                },
            });
        } else {
            post(route('surveillance.repartition-etudiants.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    Swal.fire({ icon: 'success', title: 'Étudiant ajouté', timer: 1200, showConfirmButton: false });
                    resetForm();
                },
            });
        }
    };

    const handleDelete = (id, examenId) => {
        Swal.fire({
            icon: 'warning',
            title: 'Supprimer cette affectation ?',
            showCancelButton: true,
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler',
        }).then((result) => {
            if (!result.isConfirmed) return;
            destroy(route('surveillance.repartition-etudiants.destroy', { repartition_etudiant: id, examen: examenId }), {
                onSuccess: () =>
                    Swal.fire({
                        icon: 'success',
                        title: 'Répartition supprimée',
                        timer: 1200,
                        showConfirmButton: false,
                    }),
            });
        });
    };

    const handleAutoAssign = () => {
        if (!selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }
        if (!selectedSalles.length) {
            Swal.fire({ icon: 'info', title: 'Choisissez au moins une salle' });
            return;
        }

        router.post(
            route('surveillance.repartition-etudiants.auto'),
            {
                id_examen: selectedExamenId,
                salles: selectedSalles,
            },
            {
                preserveScroll: true,
                onSuccess: () =>
                    Swal.fire({
                        icon: 'success',
                        title: 'Répartition automatique effectuée',
                        timer: 1200,
                        showConfirmButton: false,
                    }),
                onError: () =>
                    Swal.fire({
                        icon: 'error',
                        title: 'Impossible de répartir',
                    }),
            },
        );
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Répartition des étudiants</h2>}
        >
            <Head title="Répartition des examens" />

            <ExamHeader />

            <div className="mb-6 grid gap-4 rounded-xl bg-white p-4 shadow dark:bg-gray-800 md:grid-cols-3">
                <div className="md:col-span-2 space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Sélectionnez un examen</label>
                        <select
                            value={selectedExamenId ? String(selectedExamenId) : ''}
                            onChange={handleExamChange}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        >
                            <option value="">— Choisir un examen —</option>
                            {examens.map((examen) => (
                                <option key={examen.id_examen} value={examen.id_examen}>
                                    {examen.module?.nom_module ?? 'Module'} • {examen.session_examen?.nom_session ?? 'Session'} •{' '}
                                    {new Date(examen.date_examen).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Salles disponibles</label>
                        <select
                            multiple
                            value={selectedSalles}
                            onChange={(e) => setSelectedSalles(Array.from(e.target.selectedOptions).map((opt) => opt.value))}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        >
                            {salles.map((salle) => (
                                <option key={salle.id_salle} value={String(salle.id_salle)}>
                                    {salle.code_salle} • {salle.nom_salle} ({salle.capacite_examens} places)
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                            Répartition alphabétique, parts égales par salle (surplus ajouté à la dernière salle).
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleAutoAssign}
                        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!selectedExamenId}
                    >
                        Répartition automatique
                    </button>
                </div>
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                    {selectedExamen ? (
                        <>
                            <div className="font-semibold">{selectedExamen.module?.nom_module}</div>
                            <div className="text-xs text-gray-500">
                                {selectedExamen.session_examen?.nom_session} •{' '}
                                {selectedExamen.salle ? `${selectedExamen.salle.nom_salle} (${selectedExamen.salle.capacite_examens} places)` : 'Salle non définie'}
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs">
                                <span>Affectations</span>
                                <span className="font-semibold">
                                    {selectedExamen.repartitions_count} / {selectedExamen.salle?.capacite_examens ?? '∼'}
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-xs text-gray-500">Choisissez un examen pour voir les détails.</div>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <div className="rounded-xl bg-white p-5 shadow dark:bg-gray-800">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                {editingId ? 'Modifier la répartition' : 'Nouvelle répartition'}
                            </h3>
                            {editingId && (
                                <button
                                    onClick={resetForm}
                                    className="text-sm text-indigo-600 hover:underline dark:text-indigo-300"
                                >
                                    Annuler l’édition
                                </button>
                            )}
                        </div>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Étudiant</label>
                                <select
                                    value={data.id_inscription_pedagogique}
                                    onChange={(e) => setData('id_inscription_pedagogique', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    disabled={!selectedExamenId}
                                >
                                    <option value="">Sélectionner</option>
                                    {availableInscriptions.map((inscription) => (
                                        <option key={inscription.id_inscription_pedagogique} value={inscription.id_inscription_pedagogique}>
                                            {inscription.etudiant?.cne} • {inscription.etudiant?.nom} {inscription.etudiant?.prenom}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.id_inscription_pedagogique} className="mt-1" />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Code grille</label>
                                    <input
                                        type="number"
                                        value={data.code_grille}
                                        onChange={(e) => setData('code_grille', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                        disabled={!selectedExamenId}
                                    />
                                    <InputError message={errors.code_grille} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Code anonymat</label>
                                    <input
                                        value={data.code_anonymat}
                                        onChange={(e) => setData('code_anonymat', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    />
                                    <InputError message={errors.code_anonymat} className="mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Numéro de place</label>
                                <input
                                    value={data.numero_place}
                                    onChange={(e) => setData('numero_place', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                />
                                <InputError message={errors.numero_place} className="mt-1" />
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    id="present"
                                    type="checkbox"
                                    checked={data.present}
                                    onChange={(e) => setData('present', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="present" className="text-sm text-gray-700 dark:text-gray-200">
                                    Étudiant présent
                                </label>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Heure d’arrivée</label>
                                    <input
                                        type="time"
                                        value={data.heure_arrivee}
                                        onChange={(e) => setData('heure_arrivee', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    />
                                    <InputError message={errors.heure_arrivee} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Heure de sortie</label>
                                    <input
                                        type="time"
                                        value={data.heure_sortie}
                                        onChange={(e) => setData('heure_sortie', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    />
                                    <InputError message={errors.heure_sortie} className="mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Observation</label>
                                <textarea
                                    rows={3}
                                    value={data.observation}
                                    onChange={(e) => setData('observation', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                />
                                <InputError message={errors.observation} className="mt-1" />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                    onClick={resetForm}
                                >
                                    Réinitialiser
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || !selectedExamenId}
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {editingId ? 'Mettre à jour' : 'Affecter'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Étudiants affectés</h3>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {searchActive ? (
                                        <>
                                            {filteredRepartitions.length} / {repartitions.length} lignes
                                        </>
                                    ) : (
                                        `${repartitions.length} lignes`
                                    )}
                                </span>
                            </div>
                            <div className="w-full md:w-72">
                                <label htmlFor="repartition-search" className="sr-only">
                                    Rechercher un étudiant
                                </label>
                                <input
                                    id="repartition-search"
                                    type="search"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Rechercher (nom, CNE, grille...)"
                                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700"
                                    disabled={!selectedExamenId}
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900/40">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Étudiant
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Grille / Place
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Anonymat
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Présence
                                        </th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredRepartitions.map((repartition) => (
                                        <tr key={repartition.id_repartition} className="text-sm text-gray-700 dark:text-gray-200">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold">
                                                    {repartition.inscription_pedagogique?.etudiant?.nom}{' '}
                                                    {repartition.inscription_pedagogique?.etudiant?.prenom}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {repartition.inscription_pedagogique?.etudiant?.cne}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>Grille #{repartition.code_grille}</div>
                                                <div className="text-xs text-gray-500">Place {repartition.numero_place ?? '—'}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{repartition.code_anonymat ?? '—'}</div>
                                                <div className="text-xs text-gray-500">
                                                    {formatTime(repartition.heure_arrivee)} → {formatTime(repartition.heure_sortie)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={badgeClasses(repartition.present)}>
                                                    {repartition.present ? (
                                                        <>
                                                            <CheckCircle2 size={14} />
                                                            Présent
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle size={14} />
                                                            Absent
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => startEdit(repartition)}
                                                        className="rounded-full p-2 text-indigo-600 transition hover:bg-indigo-50 dark:hover:bg-gray-700"
                                                        title="Modifier"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(repartition.id_repartition, repartition.id_examen)}
                                                        className="rounded-full p-2 text-red-600 transition hover:bg-red-50 dark:hover:bg-gray-700"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredRepartitions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                                {searchActive
                                                    ? 'Aucun résultat ne correspond à cette recherche.'
                                                    : 'Aucune répartition pour cet examen.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
