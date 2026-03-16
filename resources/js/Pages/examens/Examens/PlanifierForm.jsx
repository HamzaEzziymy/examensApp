import { useEffect, useMemo, useState } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import InputError from '@/Components/InputError';

export default function PlanifierForm({
    sessions,
    modules,
    salles,
    statuts,
    semestres = [],
    niveaux = [],
    onSuccess,
    onCancel,
    asCard = true,
    hideTitle = false,
}) {
    const { data, setData, post, processing, errors, reset, transform } = useForm({
        id_session_examen: '',
        id_module: '',
        id_salle: '',
        salles: [],
        repartition_salles: [],
        date_examen: '',
        date_debut: '',
        date_fin: '',
        statut: statuts[0],
        description: '',
    });
    const [selectedNiveau, setSelectedNiveau] = useState('');
    const [selectedSemestre, setSelectedSemestre] = useState('');
    const [allocations, setAllocations] = useState({});

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

    useEffect(() => {
        const moduleExists = filteredModules.some((mod) => String(mod.id_module) === String(data.id_module));
        if (!moduleExists) {
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

    const handleSemestreChange = (value) => {
        setSelectedSemestre(value);
        if (value && !selectedNiveau) {
            const sem = semestres.find((s) => String(s.id_semestre) === value);
            if (sem?.id_niveau) {
                setSelectedNiveau(String(sem.id_niveau));
            }
        }
    };

    const autoDistribute = () => {
        if (!selectedSalles.length) return;
        const totalStudents = selectedSalles.reduce(
            (sum, salle) => sum + (salle.capacite_examens ?? salle.capacite ?? 0),
            0,
        );
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

    const submit = (event) => {
        event.preventDefault();
        post(route('examens.examens.store'), {
            onSuccess: () => {
                reset();
                onSuccess?.();
                Swal.fire({
                    icon: 'success',
                    title: 'Examen planifie',
                    timer: 1500,
                    showConfirmButton: false,
                });
            },
        });
    };

    const formBody = (
        <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Session</label>
                    <select
                        value={data.id_session_examen}
                        onChange={(e) => setData('id_session_examen', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                    >
                        <option value="">Selectionner</option>
                        {sessions.map((session) => (
                            <option key={session.id_session_examen} value={session.id_session_examen}>
                                {session.nom_session} -{' '}
                                {session.date_session_examen
                                    ? new Date(session.date_session_examen).toLocaleDateString()
                                    : 'Date a confirmer'}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.id_session_examen} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Niveau</label>
                        <select
                            value={selectedNiveau}
                            onChange={(e) => {
                                setSelectedNiveau(e.target.value);
                                setSelectedSemestre('');
                            }}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        >
                            <option value="">Tous</option>
                            {niveaux.map((niveau) => (
                                <option key={niveau.id_niveau} value={niveau.id_niveau}>
                                    {niveau.nom_niveau}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Semestre</label>
                        <select
                            value={selectedSemestre}
                            onChange={(e) => handleSemestreChange(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        >
                            <option value="">Tous</option>
                            {filteredSemestres.map((semestre) => (
                                <option key={semestre.id_semestre} value={semestre.id_semestre}>
                                    {semestre.nom_niveau ? `${semestre.nom_niveau} - ` : ''}
                                    {semestre.nom_semestre}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Module</label>
                    <select
                        value={data.id_module}
                        onChange={(e) => setData('id_module', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                    >
                        <option value="">Selectionner</option>
                        {filteredModules.map((module) => (
                            <option key={module.id_module} value={module.id_module}>
                                {module.code_module} - {module.nom_module}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.id_module} className="mt-1" />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Salles (multi)</label>
                <select
                    multiple
                    value={data.salles}
                    onChange={(e) => setData('salles', Array.from(e.target.selectedOptions).map((opt) => opt.value))}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                >
                    {salles.map((salle) => (
                        <option key={salle.id_salle} value={String(salle.id_salle)}>
                            {salle.nom_salle} - Capacite {salle.capacite_examens}
                        </option>
                    ))}
                </select>
                <InputError message={errors.salles} className="mt-1" />
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
                            onClick={autoDistribute}
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
                                    className="mt-2 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    placeholder="Ex: 80"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Choisissez des salles pour definir la repartition.</p>
                )}
                <InputError message={errors.repartition_salles} className="mt-2" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Debut</label>
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

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Notes</label>
                <textarea
                    rows={3}
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                    placeholder="Consignes, materiel requis, etc."
                />
                <InputError message={errors.description} className="mt-1" />
            </div>

            <div className="flex justify-end gap-3">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        Annuler
                    </button>
                )}
                <button
                    type="submit"
                    disabled={processing}
                    className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                    Programmer
                </button>
            </div>
        </form>
    );

    if (!asCard) {
        return (
            <div className="space-y-2">
                {!hideTitle && (
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Planifier un examen</h2>
                )}
                {formBody}
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
            {!hideTitle && <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Planifier un examen</h2>}
            {formBody}
        </div>
    );
}
