import React from 'react';
import { useForm } from '@inertiajs/react';

export default function CreateForm() {
    const { data, setData, post, processing, errors } = useForm({
        nomDoc: '',
        descripDoc: '',
        session: '',
        niveau: '',
        salle: '',
        module: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('proces-v.store')); // Change to your Laravel route
    };

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 m-2">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
                CREATION PROCÈS VERBAL
            </h2>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom Document */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nom Document
                    </label>
                    <input
                        type="text"
                        value={data.nomDoc}
                        onChange={(e) => setData('nomDoc', e.target.value)}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter document name"
                        required
                    />
                    {errors.nomDoc && <p className="text-red-500 text-sm mt-1">{errors.nomDoc}</p>}
                </div>

                {/* Description Document */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                    </label>
                    <textarea
                        value={data.descripDoc}
                        onChange={(e) => setData('descripDoc', e.target.value)}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter document description"
                        rows={3}
                        required
                    />
                    {errors.descripDoc && <p className="text-red-500 text-sm mt-1">{errors.descripDoc}</p>}
                </div>

                {/* SESSION */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Session
                    </label>
                    <select
                        value={data.session}
                        onChange={(e) => setData('session', e.target.value)}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        required
                    >
                        <option value="">Select Session</option>
                        <option value="2024/2025">2024/2025</option>
                        <option value="2025/2026">2025/2026</option>
                    </select>
                    {errors.session && <p className="text-red-500 text-sm mt-1">{errors.session}</p>}
                </div>

                {/* NIVEAU */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Niveau
                    </label>
                    <select
                        value={data.niveau}
                        onChange={(e) => setData('niveau', e.target.value)}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        required
                    >
                        <option value="">Select Niveau</option>
                        <option value="1ère année">1ère année</option>
                        <option value="2ème année medecine dentaire">2ème année medecine dentaire</option>
                        <option value="3ème année">3ème année</option>
                    </select>
                    {errors.niveau && <p className="text-red-500 text-sm mt-1">{errors.niveau}</p>}
                </div>

                {/* SALLE */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Salle
                    </label>
                    <select
                        value={data.salle}
                        onChange={(e) => setData('salle', e.target.value)}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        required
                    >
                        <option value="">Select Salle</option>
                        <option value="Salle A">Salle A</option>
                        <option value="Salle B">Salle B</option>
                        <option value="Salle C">Salle C</option>
                        <option value="centre d'examen CDIM(2)">centre d'examen CDIM(2)</option>
                    </select>
                    {errors.salle && <p className="text-red-500 text-sm mt-1">{errors.salle}</p>}
                </div>

                {/* MODULE */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Module
                    </label>
                    <select
                        value={data.module}
                        onChange={(e) => setData('module', e.target.value)}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        required
                    >
                        <option value="">Select Module</option>
                        <option value="Mathématiques">Mathématiques</option>
                        <option value="Informatique">Informatique</option>
                        <option value="Physique">Physique</option>
                        <option value="Langue étrangère">Langue étrangère</option>

                    </select>
                    {errors.module && <p className="text-red-500 text-sm mt-1">{errors.module}</p>}
                </div>

                {/* SUBMIT BUTTON */}
                <div className="md:col-span-2 flex justify-center">
                    <button
                        type="submit"
                        disabled={processing}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-all duration-300 disabled:opacity-50"
                    >
                        {processing ? 'Generating...' : 'Generate Document'}
                    </button>
                </div>
            </form>
        </div>
    );
}
