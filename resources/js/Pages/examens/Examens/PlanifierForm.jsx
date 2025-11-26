import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import InputError from '@/Components/InputError';

export default function PlanifierForm({
    sessions,
    modules,
    salles,
    statuts,
    onSuccess,
    onCancel,
    asCard = true,
    hideTitle = false,
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        id_session_examen: '',
        id_module: '',
        id_salle: '',
        salles: [],
        date_examen: '',
        date_debut: '',
        date_fin: '',
        statut: statuts[0],
        description: '',
    });

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
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Module</label>
                    <select
                        value={data.id_module}
                        onChange={(e) => setData('id_module', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                    >
                        <option value="">Selectionner</option>
                        {modules.map((module) => (
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
                            {salle.code_salle} - Capacite {salle.capacite_examens}
                        </option>
                    ))}
                </select>
                <InputError message={errors.salles} className="mt-1" />
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
