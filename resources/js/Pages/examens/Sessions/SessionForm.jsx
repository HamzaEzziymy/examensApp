import { useForm } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import Swal from 'sweetalert2';

export default function SessionForm({ filieres, annees, typesSession }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        id_filiere: '',
        id_annee: '',
        nom_session: '',
        type_session: typesSession[0],
        date_session_examen: '',
        quadrimestre: '',
        description: '',
    });

    const handleSubmit = (event) => {
        event.preventDefault();

        post(route('examens.sessions.store'), {
            onSuccess: () => {
                reset();
                Swal.fire({
                    icon: 'success',
                    title: 'Session ajoutée',
                    timer: 1600,
                    showConfirmButton: false,
                });
            },
        });
    };

    return (
        <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Nouvelle session</h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Nom
                    </label>
                    <input
                        type="text"
                        value={data.nom_session}
                        onChange={(e) => setData('nom_session', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-gray-100"
                        placeholder="Session principale"
                    />
                    <InputError message={errors.nom_session} className="mt-1" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Type
                        </label>
                        <select
                            value={data.type_session}
                            onChange={(e) => setData('type_session', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-gray-100"
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Quadrimestre
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={6}
                            value={data.quadrimestre}
                            onChange={(e) => setData('quadrimestre', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-gray-100"
                        />
                        <InputError message={errors.quadrimestre} className="mt-1" />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Année universitaire
                        </label>
                        <select
                            value={data.id_annee}
                            onChange={(e) => setData('id_annee', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-gray-100"
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Filière (optionnel)
                        </label>
                        <select
                            value={data.id_filiere}
                            onChange={(e) => setData('id_filiere', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-gray-100"
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

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Date
                        </label>
                        <input
                            type="date"
                            value={data.date_session_examen}
                            onChange={(e) => setData('date_session_examen', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-gray-100"
                        />
                        <InputError message={errors.date_session_examen} className="mt-1" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Description
                    </label>
                    <textarea
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-gray-100"
                        rows={3}
                        placeholder="Notes internes..."
                    />
                    <InputError message={errors.description} className="mt-1" />
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {processing ? 'Enregistrement...' : 'Créer la session'}
                    </button>
                </div>
            </form>
        </div>
    );
}
