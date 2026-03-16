import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Users, Edit3, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import InputError from '@/Components/InputError';

export default function CorrectorsIndex({ correcteurs = {}, examens = [], enseignants = [], elements = [] }) {
    const { auth } = usePage().props;
    
    // Get user's selected année and filière from Years_Sectors_Selecters
    const userSelectedAnnee = auth.user_filiere_annee?.id_annee || 'all';
    const userSelectedFiliere = auth.user_filiere_annee?.id_filiere || 'all';
    
    console.log(correcteurs)
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [examenSearch, setExamenSearch] = useState('');
    const [enseignantSearch, setEnseignantSearch] = useState('');
    const [elementSearch, setElementSearch] = useState('');
    const [showExamenDropdown, setShowExamenDropdown] = useState(false);
    const [showEnseignantDropdown, setShowEnseignantDropdown] = useState(false);
    const [showElementDropdown, setShowElementDropdown] = useState(false);

    const form = useForm({
        id_examen: '',
        id_enseignant: '',
        id_element: '',
        nombre_copies: '',
        date_attribution: '',
        date_limite_correction: '',
        statut: 'Attribue',
    });

    const data = correcteurs.data || [];
    const links = correcteurs.links || [];

    // Get the selected exam to filter elements
    const selectedExamen = examens.find(e => e.id_examen == form.data.id_examen);
    const selectedModuleId = selectedExamen?.id_module;

    // Filter elements based on selected exam's module
    const elementsForSelectedModule = selectedModuleId 
        ? elements.filter(el => el.id_module === selectedModuleId)
        : [];

    // Filter examens based on user's selected filière
    const examensForSelectedFiliere = userSelectedFiliere !== 'all'
        ? examens.filter(examen => {
            // Check if the exam's module belongs to an offre in the selected filière
            const hasMatchingOffre = examen.module?.offres_formation?.some(offre => offre.section?.id_filiere == userSelectedFiliere);
            return hasMatchingOffre;
        })
        : examens;
    
    console.log('User selected filière:', userSelectedFiliere);
    console.log('Total examens:', examens.length);
    console.log('Filtered examens:', examensForSelectedFiliere.length);

    const filteredExamens = examensForSelectedFiliere.filter((examen) => {
        const query = examenSearch.toLowerCase();
        const text = `${examen.module?.code_module} ${examen.module?.nom_module}`.toLowerCase();
        return text.includes(query);
    });

    const filteredEnseignants = enseignants.filter((enseignant) => {
        const query = enseignantSearch.toLowerCase();
        const text = `${enseignant.nom} ${enseignant.prenom}`.toLowerCase();
        return text.includes(query);
    });

    const filteredElements = elementsForSelectedModule.filter((element) => {
        const query = elementSearch.toLowerCase();
        const text = `${element.code_element} ${element.nom_element}`.toLowerCase();
        return text.includes(query);
    });

    // Filter correcteurs by selected filière first, then by search term
    const filteredCorrecteurs = data
        .filter((correcteur) => {
            // If a specific filière is selected, only show correcteurs for that filière
            if (userSelectedFiliere !== 'all') {
                const hasMatchingOffre = correcteur.examen?.module?.offres_formation?.some(
                    offre => offre.section?.id_filiere == userSelectedFiliere
                );
                return hasMatchingOffre;
            }
            return true;
        })
        .filter((correcteur) => {
            // Then apply search filter
            const query = searchTerm.toLowerCase();
            const enseignantName = correcteur.enseignant 
                ? `${correcteur.enseignant.nom} ${correcteur.enseignant.prenom}`.toLowerCase()
                : '';
            const moduleName = correcteur.examen?.module?.nom_module?.toLowerCase() || '';
            return enseignantName.includes(query) || moduleName.includes(query) || correcteur.statut.toLowerCase().includes(query);
        });

    const startEdit = (correcteur) => {
        setEditingId(correcteur.id_correcteur);
        form.setData({
            id_examen: correcteur.id_examen || '',
            id_enseignant: correcteur.id_enseignant || '',
            id_element: correcteur.id_element || '',
            nombre_copies: correcteur.nombre_copies || '',
            date_attribution: correcteur.date_attribution || '',
            date_limite_correction: correcteur.date_limite_correction || '',
            statut: correcteur.statut || 'Attribue',
        });
        setElementSearch('');
    };

    const resetForm = () => {
        setEditingId(null);
        form.reset();
        setExamenSearch('');
        setEnseignantSearch('');
        setElementSearch('');
    };

    const submit = (e) => {
        e.preventDefault();
        if (editingId) {
            form.put(route('correction.correcteurs.update', editingId), {
                onSuccess: resetForm,
            });
        } else {
            form.post(route('correction.correcteurs.store'), {
                onSuccess: resetForm,
            });
        }
    };

    const handleDelete = (id) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce correcteur ?')) {
            form.delete(route('correction.correcteurs.destroy', id));
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Termine':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'En cours':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'Attribue':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
        }
    };

    const getSelectedExamenLabel = () => {
        const examen = examens.find(e => e.id_examen == form.data.id_examen);
        return examen ? `${examen.module?.code_module} - ${examen.module?.nom_module}` : 'Sélectionner un examen';
    };

    const getSelectedEnseignantLabel = () => {
        const enseignant = enseignants.find(e => e.id_enseignant == form.data.id_enseignant);
        return enseignant ? `${enseignant.nom} ${enseignant.prenom}` : 'Sélectionner un enseignant';
    };

    const getSelectedElementLabel = () => {
        if (!selectedModuleId) {
            return 'Sélectionner un examen d\'abord';
        }
        const element = elementsForSelectedModule.find(e => e.id_element == form.data.id_element);
        return element ? `${element.code_element} - ${element.nom_element}` : 'Sélectionner un élément';
    };

    return (
        <AuthenticatedLayout>
            <Head title="Gestion des correcteurs" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Users size={32} className="text-indigo-600" />
                            Gestion des correcteurs
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Attribuez et gérez les correcteurs pour les examens
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Form Section */}
                    <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingId ? 'Modifier le correcteur' : 'Ajouter un correcteur'}
                            </h2>
                            {editingId && (
                                <button
                                    onClick={resetForm}
                                    className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                >
                                    Annuler
                                </button>
                            )}
                        </div>

                        <form onSubmit={submit} className="space-y-4">
                            {/* Examen Searchable Select */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Examen *
                                </label>
                                <div className="relative mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowExamenDropdown(!showExamenDropdown)}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    >
                                        {getSelectedExamenLabel()}
                                    </button>
                                    {showExamenDropdown && (
                                        <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
                                            <input
                                                type="text"
                                                placeholder="Rechercher..."
                                                value={examenSearch}
                                                onChange={(e) => setExamenSearch(e.target.value)}
                                                className="w-full rounded-t-lg border-b border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                            />
                                            <div className="max-h-48 overflow-y-auto">
                                                {filteredExamens.map((examen) => (
                                                    <button
                                                        key={examen.id_examen}
                                                        type="button"
                                                        onClick={() => {
                                                            form.setData('id_examen', examen.id_examen);
                                                            form.setData('id_element', ''); // Clear element when exam changes
                                                            setShowExamenDropdown(false);
                                                            setExamenSearch('');
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-gray-600"
                                                    >
                                                        {examen.module?.code_module} - {examen.module?.nom_module}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <InputError message={form.errors.id_examen} className="mt-1" />
                            </div>

                            {/* Enseignant Searchable Select */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Enseignant *
                                </label>
                                <div className="relative mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowEnseignantDropdown(!showEnseignantDropdown)}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    >
                                        {getSelectedEnseignantLabel()}
                                    </button>
                                    {showEnseignantDropdown && (
                                        <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
                                            <input
                                                type="text"
                                                placeholder="Rechercher..."
                                                value={enseignantSearch}
                                                onChange={(e) => setEnseignantSearch(e.target.value)}
                                                className="w-full rounded-t-lg border-b border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                            />
                                            <div className="max-h-48 overflow-y-auto">
                                                {filteredEnseignants.map((enseignant) => (
                                                    <button
                                                        key={enseignant.id_enseignant}
                                                        type="button"
                                                        onClick={() => {
                                                            form.setData('id_enseignant', enseignant.id_enseignant);
                                                            setShowEnseignantDropdown(false);
                                                            setEnseignantSearch('');
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-gray-600"
                                                    >
                                                        {enseignant.nom} {enseignant.prenom}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <InputError message={form.errors.id_enseignant} className="mt-1" />
                            </div>

                            {/* Element Searchable Select */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Élément du module
                                </label>
                                <div className="relative mt-1">
                                    <button
                                        type="button"
                                        disabled={!selectedModuleId}
                                        onClick={() => setShowElementDropdown(!showElementDropdown)}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {getSelectedElementLabel()}
                                    </button>
                                    {showElementDropdown && selectedModuleId && (
                                        <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
                                            <input
                                                type="text"
                                                placeholder="Rechercher..."
                                                value={elementSearch}
                                                onChange={(e) => setElementSearch(e.target.value)}
                                                className="w-full rounded-t-lg border-b border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                            />
                                            <div className="max-h-48 overflow-y-auto">
                                                {filteredElements.length > 0 ? (
                                                    filteredElements.map((element) => (
                                                        <button
                                                            key={element.id_element}
                                                            type="button"
                                                            onClick={() => {
                                                                form.setData('id_element', element.id_element);
                                                                setShowElementDropdown(false);
                                                                setElementSearch('');
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-gray-600"
                                                        >
                                                            {element.code_element} - {element.nom_element}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                        Aucun élément trouvé
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <InputError message={form.errors.id_element} className="mt-1" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Nombre de copies *
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.data.nombre_copies}
                                    onChange={(e) => form.setData('nombre_copies', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                                <InputError message={form.errors.nombre_copies} className="mt-1" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Date d'attribution
                                </label>
                                <input
                                    type="date"
                                    value={form.data.date_attribution}
                                    onChange={(e) => form.setData('date_attribution', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                                <InputError message={form.errors.date_attribution} className="mt-1" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Date limite de correction *
                                </label>
                                <input
                                    type="date"
                                    value={form.data.date_limite_correction}
                                    onChange={(e) => form.setData('date_limite_correction', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                                <InputError message={form.errors.date_limite_correction} className="mt-1" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Statut *
                                </label>
                                <select
                                    value={form.data.statut}
                                    onChange={(e) => form.setData('statut', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="Attribue">Attribué</option>
                                    <option value="En cours">En cours</option>
                                    <option value="Termine">Terminé</option>
                                </select>
                                <InputError message={form.errors.statut} className="mt-1" />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {editingId ? 'Mettre à jour' : 'Ajouter'}
                                </button>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        Annuler
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* List Section */}
                    <div className="lg:col-span-2 rounded-xl bg-white p-6 shadow dark:bg-gray-800">
                        <div className="mb-4">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher un correcteur..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Enseignant
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Examen
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Élément du module
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Copies
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Statut
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Dates
                                        </th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredCorrecteurs.length > 0 ? (
                                        filteredCorrecteurs.map((correcteur) => (
                                            <tr key={correcteur.id_correcteur} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    <div className="font-semibold">
                                                        {correcteur.enseignant
                                                            ? `${correcteur.enseignant.nom} ${correcteur.enseignant.prenom}`
                                                            : 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{correcteur.enseignant?.email}</div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    <div className="font-semibold">
                                                        {correcteur.examen?.module?.code_module}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {correcteur.examen?.module?.nom_module}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    {correcteur.element ? (
                                                        <>
                                                            <div className="font-semibold">
                                                                {correcteur.element.code_element}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {correcteur.element.nom_element}
                                                            </div>
                                                        </>
                                                    ) : correcteur.examen?.module?.elements && correcteur.examen.module.elements.length > 0 ? (
                                                        <div className="text-xs text-gray-500">
                                                            {correcteur.examen.module.elements.length} élément(s)
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Module complet</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    {correcteur.nombre_copies}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(correcteur.statut)}`}>
                                                        {correcteur.statut}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    {correcteur.date_attribution && (
                                                        <div className="text-xs">
                                                            <span className="text-gray-500">Attrib: </span>
                                                            {new Date(correcteur.date_attribution).toLocaleDateString('fr-FR')}
                                                        </div>
                                                    )}
                                                    {correcteur.date_limite_correction && (
                                                        <div className="text-xs font-semibold">
                                                            <span className="text-gray-500">Limite: </span>
                                                            {new Date(correcteur.date_limite_correction).toLocaleDateString('fr-FR')}
                                                        </div>
                                                    )}
                                                    {!correcteur.date_attribution && !correcteur.date_limite_correction && '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => startEdit(correcteur)}
                                                            className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-600"
                                                            title="Modifier"
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(correcteur.id_correcteur)}
                                                            className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-gray-600"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                                Aucun correcteur trouvé
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {links.length > 0 && (
                            <div className="mt-6 flex items-center justify-between">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Affichage de {correcteurs.from || 0} à {correcteurs.to || 0} sur {correcteurs.total || 0} correcteurs
                                </div>
                                <div className="flex gap-2">
                                    {links.map((link, index) => (
                                        <Link
                                            key={index}
                                            href={link.url || '#'}
                                            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                link.active
                                                    ? 'bg-indigo-600 text-white'
                                                    : link.url
                                                    ? 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                                                    : 'border border-gray-300 text-gray-400 cursor-not-allowed dark:border-gray-600 dark:text-gray-600'
                                            }`}
                                            disabled={!link.url}
                                        >
                                            {link.label.includes('Previous') ? <ChevronLeft size={16} /> : link.label.includes('Next') ? <ChevronRight size={16} /> : link.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
