import React from 'react';
import { useForm } from '@inertiajs/react';

export default function CreateForm({ sessions = [], niveaux = [], salles = [], modules = [], filieres = [], sections = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        nomDoc: '',
        descripDoc: '',
        session: '',
        niveau: '',
        filiere: '',
        section: '',
        salle: '',
        module: '',
    });

    // Filter sections based on selected filiere
    const filteredSections = sections.filter(section => 
        !data.filiere || section.id_filiere == data.filiere
    );

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
                        {sessions.map((session) => (
                            <option key={session.id_session_examen} value={session.nom_session}>
                                {session.nom_session}
                            </option>
                        ))}
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
                        {niveaux.map((niveau) => (
                            <option key={niveau.id_niveau} value={niveau.nom_niveau}>
                                {niveau.nom_niveau}
                            </option>
                        ))}
                    </select>
                    {errors.niveau && <p className="text-red-500 text-sm mt-1">{errors.niveau}</p>}
                </div>

                {/* FILIERE */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Filière
                    </label>
                    <select
                        value={data.filiere}
                        onChange={(e) => {
                            setData('filiere', e.target.value);
                            // Reset section when filiere changes
                            if (data.section) {
                                setData('section', '');
                            }
                        }}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        required
                    >
                        <option value="">Select Filière</option>
                        {filieres.map((filiere) => (
                            <option key={filiere.id_filiere} value={filiere.id_filiere}>
                                {filiere.nom_filiere}
                            </option>
                        ))}
                    </select>
                    {errors.filiere && <p className="text-red-500 text-sm mt-1">{errors.filiere}</p>}
                </div>

                {/* SECTION */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Section
                    </label>
                    <select
                        value={data.section}
                        onChange={(e) => setData('section', e.target.value)}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        required
                        disabled={!data.filiere}
                    >
                        <option value="">Select Section</option>
                        {filteredSections.map((section) => (
                            <option key={section.id_section} value={section.nom_section}>
                                {section.nom_section}
                            </option>
                        ))}
                    </select>
                    {errors.section && <p className="text-red-500 text-sm mt-1">{errors.section}</p>}
                    {!data.filiere && (
                        <p className="text-gray-500 text-sm mt-1">Veuillez d'abord sélectionner une filière</p>
                    )}
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
                        {salles.map((salle) => (
                            <option key={salle.id_salle} value={`${salle.code_salle} - ${salle.nom_salle}`}>
                                {salle.code_salle} - {salle.nom_salle}
                            </option>
                        ))}
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
                        {modules.map((module) => (
                            <option key={module.id_module} value={module.nom_module}>
                                {module.nom_module}
                            </option>
                        ))}
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
