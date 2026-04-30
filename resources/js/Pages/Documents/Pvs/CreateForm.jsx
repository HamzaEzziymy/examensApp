import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';

const normalizeFieldValue = (value) => {
    if (value === undefined || value === null) {
        return '';
    }

    return typeof value === 'number' ? String(value) : value;
};

const buildInitialState = (initialValues = {}) => ({
    nomDoc: initialValues.nomDoc ?? '',
    descripDoc: initialValues.descripDoc ?? '',
    session_id: normalizeFieldValue(initialValues.session_id),
    niveau_id: normalizeFieldValue(initialValues.niveau_id),
    filiere_id: normalizeFieldValue(initialValues.filiere_id),
    section_id: normalizeFieldValue(initialValues.section_id),
    salle_id: normalizeFieldValue(initialValues.salle_id),
    module_id: normalizeFieldValue(initialValues.module_id),
});

export default function CreateForm({
    sessions = [],
    niveaux = [],
    salles = [],
    modules = [],
    filieres = [],
    sections = [],
    initialValues = {},
    submitLabel = 'Generer le document',
    onSuccess,
}) {
    const { data, setData, post, processing, errors } = useForm(buildInitialState(initialValues));

    const selectedSession = sessions.find(
        (session) => String(session.id_session_examen) === String(data.session_id)
    );
    const lockedFiliereId = selectedSession?.id_filiere ? String(selectedSession.id_filiere) : '';
    const effectiveFiliereId = lockedFiliereId || data.filiere_id;

    const filteredSections = sections.filter((section) => (
        !effectiveFiliereId || String(section.id_filiere) === String(effectiveFiliereId)
    ));

    const filteredModules = modules.filter((module) => {
        const matchesFiliere = !effectiveFiliereId
            || module.filiere_ids.includes(Number(effectiveFiliereId));
        const matchesSection = !data.section_id
            || module.section_ids.includes(Number(data.section_id));
        const matchesNiveau = !data.niveau_id
            || module.niveau_ids.includes(Number(data.niveau_id));
        const matchesAnnee = !selectedSession?.id_annee
            || module.annee_ids.includes(Number(selectedSession.id_annee));

        return matchesFiliere && matchesSection && matchesNiveau && matchesAnnee;
    });

    useEffect(() => {
        if (
            data.section_id
            && !filteredSections.some((section) => String(section.id_section) === String(data.section_id))
        ) {
            setData('section_id', '');
        }
    }, [data.section_id, filteredSections, setData]);

    useEffect(() => {
        if (
            data.module_id
            && !filteredModules.some((module) => String(module.id_module) === String(data.module_id))
        ) {
            setData('module_id', '');
        }
    }, [data.module_id, filteredModules, setData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('proces-v.store'), {
            preserveScroll: true,
            onSuccess,
        });
    };

    const handleSessionChange = (value) => {
        const session = sessions.find(
            (item) => String(item.id_session_examen) === String(value)
        );

        setData('session_id', value);
        setData('section_id', '');
        setData('module_id', '');

        if (session?.id_filiere) {
            setData('filiere_id', String(session.id_filiere));
            return;
        }

        setData('filiere_id', '');
    };

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 m-2">
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">
                CREATION PROCES VERBAL D&apos;ABSENCE
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Le PDF genere une page distincte pour chaque module correspondant.
            </p>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nom du document
                    </label>
                    <input
                        type="text"
                        value={data.nomDoc}
                        onChange={(e) => setData('nomDoc', e.target.value)}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        placeholder="PV absence session principale"
                        required
                    />
                    {errors.nomDoc && <p className="text-red-500 text-sm mt-1">{errors.nomDoc}</p>}
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                    </label>
                    <textarea
                        value={data.descripDoc}
                        onChange={(e) => setData('descripDoc', e.target.value)}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        placeholder="Optionnel"
                        rows={3}
                    />
                    {errors.descripDoc && <p className="text-red-500 text-sm mt-1">{errors.descripDoc}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Session
                    </label>
                    <select
                        value={data.session_id}
                        onChange={(e) => handleSessionChange(e.target.value)}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        required
                    >
                        <option value="">Selectionner une session</option>
                        {sessions.map((session) => (
                            <option key={session.id_session_examen} value={session.id_session_examen}>
                                {session.nom_session}
                            </option>
                        ))}
                    </select>
                    {errors.session_id && <p className="text-red-500 text-sm mt-1">{errors.session_id}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Niveau
                    </label>
                    <select
                        value={data.niveau_id}
                        onChange={(e) => {
                            setData('niveau_id', e.target.value);
                            setData('module_id', '');
                        }}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        required
                    >
                        <option value="">Selectionner un niveau</option>
                        {niveaux.map((niveau) => (
                            <option key={niveau.id_niveau} value={niveau.id_niveau}>
                                {niveau.nom_niveau}
                            </option>
                        ))}
                    </select>
                    {errors.niveau_id && <p className="text-red-500 text-sm mt-1">{errors.niveau_id}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Filiere
                    </label>
                    <select
                        value={effectiveFiliereId}
                        onChange={(e) => {
                            setData('filiere_id', e.target.value);
                            setData('section_id', '');
                            setData('module_id', '');
                        }}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        required
                        disabled={Boolean(lockedFiliereId)}
                    >
                        <option value="">Selectionner une filiere</option>
                        {filieres.map((filiere) => (
                            <option key={filiere.id_filiere} value={filiere.id_filiere}>
                                {filiere.nom_filiere}
                            </option>
                        ))}
                    </select>
                    {lockedFiliereId && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            La filiere est imposee par la session selectionnee.
                        </p>
                    )}
                    {errors.filiere_id && <p className="text-red-500 text-sm mt-1">{errors.filiere_id}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Section
                    </label>
                    <select
                        value={data.section_id}
                        onChange={(e) => {
                            setData('section_id', e.target.value);
                            setData('module_id', '');
                        }}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        required
                        disabled={!effectiveFiliereId}
                    >
                        <option value="">Selectionner une section</option>
                        {filteredSections.map((section) => (
                            <option key={section.id_section} value={section.id_section}>
                                {section.nom_section}
                            </option>
                        ))}
                    </select>
                    {!effectiveFiliereId && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Selectionnez d&apos;abord une session ou une filiere.
                        </p>
                    )}
                    {errors.section_id && <p className="text-red-500 text-sm mt-1">{errors.section_id}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Salle
                    </label>
                    <select
                        value={data.salle_id}
                        onChange={(e) => setData('salle_id', e.target.value)}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        required
                    >
                        <option value="">Selectionner une salle</option>
                        {salles.map((salle) => (
                            <option key={salle.id_salle} value={salle.id_salle}>
                                {salle.code_salle ? `${salle.code_salle} - ${salle.nom_salle}` : salle.nom_salle}
                            </option>
                        ))}
                    </select>
                    {errors.salle_id && <p className="text-red-500 text-sm mt-1">{errors.salle_id}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Module
                    </label>
                    <select
                        value={data.module_id}
                        onChange={(e) => setData('module_id', e.target.value)}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">Tous les modules correspondants</option>
                        {filteredModules.map((module) => (
                            <option key={module.id_module} value={module.id_module}>
                                {module.label || module.nom_module}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Laisser vide pour generer un PV distinct pour chaque module.
                    </p>
                    {errors.module_id && <p className="text-red-500 text-sm mt-1">{errors.module_id}</p>}
                </div>

                <div className="md:col-span-2 flex justify-center">
                    <button
                        type="submit"
                        disabled={processing}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-all duration-300 disabled:opacity-50"
                    >
                        {processing ? 'Generation...' : submitLabel}
                    </button>
                </div>
            </form>
        </div>
    );
}
