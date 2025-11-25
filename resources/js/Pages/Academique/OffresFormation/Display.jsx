import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Pencil, Trash2, Plus, Search, ChevronDown, ChevronUp, Filter } from 'lucide-react';

export default function Display({ 
    offresFormation: initialOffres, 
    sections = [], 
    semestres = [], 
    modules = [], 
    coordinateurs = [],
    anneeUniversitaires = []
}) {
    const [expandedRows, setExpandedRows] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState(''); // 'add' or 'edit'
    const [selectedOffre, setSelectedOffre] = useState(null);
    
    // Search and pagination states
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [filteredOffres, setFilteredOffres] = useState(initialOffres);
    const [filters, setFilters] = useState({
        filiere: '',
        semestre: '',
        module: '',
        coordinateur: ''
    });

    const offreForm = useForm({
        id_offre: null,
        id_section: '',
        id_semestre: '',
        id_module: '',
        id_coordinateur: '',
        id_annee: new Date().getFullYear(),
        nom_affiche: ''
    });

    // Extract unique values for filters from offresFormation
    const filieres = [...new Map(initialOffres
        .filter(offre => offre.section?.filiere)
        .map(offre => [offre.section.filiere.id_filiere, offre.section.filiere])
    ).values()];

    // Filter offres based on search term and filters
    useEffect(() => {
        let filtered = initialOffres.filter(offre => {
            const matchesSearch = 
                offre.module?.nom_module?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                offre.module?.code_module?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                offre.section?.nom_section?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                offre.section?.filiere?.nom_filiere?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                offre.semestre?.nom_semestre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                offre.coordinateur?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                offre.coordinateur?.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                offre.nom_affiche?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesFiliere = !filters.filiere || offre.section?.id_filiere?.toString() === filters.filiere;
            const matchesSemestre = !filters.semestre || offre.id_semestre?.toString() === filters.semestre;
            const matchesModule = !filters.module || offre.id_module?.toString() === filters.module;
            const matchesCoordinateur = !filters.coordinateur || offre.id_coordinateur?.toString() === filters.coordinateur;

            return matchesSearch && matchesFiliere && matchesSemestre && matchesModule && matchesCoordinateur;
        });
        
        setFilteredOffres(filtered);
        setCurrentPage(1);
    }, [searchTerm, filters, initialOffres]);

    // Calculate pagination
    const totalItems = filteredOffres.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentOffres = filteredOffres.slice(startIndex, startIndex + itemsPerPage);

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const openAddModal = () => {
        setModalType('add');
        offreForm.setData({
            id_offre: null,
            id_section: '',
            id_semestre: '',
            id_module: '',
            id_coordinateur: '',
            id_annee: new Date().getFullYear(),
            nom_affiche: ''
        });
        setModalOpen(true);
    };

    const openEditModal = (offre) => {
        setModalType('edit');
        setSelectedOffre(offre);
        offreForm.setData({
            id_offre: offre.id_offre,
            id_section: offre.id_section,
            id_semestre: offre.id_semestre,
            id_module: offre.id_module,
            id_coordinateur: offre.id_coordinateur,
            id_annee: offre.id_annee,
            nom_affiche: offre.nom_affiche
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setModalType('');
        setSelectedOffre(null);
        offreForm.reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const action = modalType === 'add' 
            ? offreForm.post(route('academique.offres-formations.store'), {
                onSuccess: () => {
                    offreForm.reset();
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Offre ajoutée',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    // Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                    console.log(offreForm.errors);
                }
            })
            : offreForm.put(route('academique.offres-formations.update', offreForm.data.id_offre), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Offre mise à jour',
                        showConfirmButton: false,
                        timer: 1500
                    });
                }
            });
    };

    const handleDelete = (offre) => {
        Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: "Cette action est irréversible !",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Oui, supprimer !',
            cancelButtonText: 'Annuler'
        }).then((result) => {
            if (result.isConfirmed) {
                offreForm.delete(route('academique.offres-formations.destroy', offre.id_offre), {
                    onSuccess: () => {
                        Swal.fire('Supprimé !', 'L\'offre a été supprimée.', 'success');
                    },
                    onError: () => {
                        Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                    }
                });
            }
        });
    };

    // Pagination handlers
    const goToPage = (page) => {
        setCurrentPage(page);
    };

    const goToPreviousPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    const goToNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilters({
            filiere: '',
            semestre: '',
            module: '',
            coordinateur: ''
        });
        setSearchTerm('');
    };

    const getModuleTypeColor = (type) => {
        const colors = {
            'THESE': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
            'COURS': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
            'STAGE': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
            'PROJET': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
            'MEMOIRE': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        };
        return colors[type] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    };

    const getModuleTypeLabel = (type) => {
        const labels = {
            'THESE': 'Thèse',
            'COURS': 'Cours',
            'STAGE': 'Stage',
            'PROJET': 'Projet',
            'MEMOIRE': 'Mémoire'
        };
        return labels[type] || type;
    };

    return (
        <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-6 rounded-md">
            {/* Header with Search, Filters and Actions */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-300 dark:border-gray-700 pb-4 mb-6">
                <h2 className="text-2xl font-semibold">Gestion des Offres de Formation</h2>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 sm:flex-none">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 w-full sm:w-80 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded whitespace-nowrap"
                        >
                            <Plus size={18} />
                            <span>Nouvelle Offre</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                    <label className="block text-sm font-medium mb-1">Filière</label>
                    <select
                        value={filters.filiere}
                        onChange={(e) => setFilters(prev => ({ ...prev, filiere: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                    >
                        <option value="">Toutes les filières</option>
                        {filieres.map((filiere) => (
                            <option key={filiere.id_filiere} value={filiere.id_filiere}>
                                {filiere.nom_filiere}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Semestre</label>
                    <select
                        value={filters.semestre}
                        onChange={(e) => setFilters(prev => ({ ...prev, semestre: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                    >
                        <option value="">Tous les semestres</option>
                        {semestres.map((semestre) => (
                            <option key={semestre.id_semestre} value={semestre.id_semestre}>
                                {semestre.nom_semestre}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Module</label>
                    <select
                        value={filters.module}
                        onChange={(e) => setFilters(prev => ({ ...prev, module: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                    >
                        <option value="">Tous les modules</option>
                        {modules.map((module) => (
                            <option key={module.id_module} value={module.id_module}>
                                {module.nom_module}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Coordinateur</label>
                    <select
                        value={filters.coordinateur}
                        onChange={(e) => setFilters(prev => ({ ...prev, coordinateur: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                    >
                        <option value="">Tous les coordinateurs</option>
                        {coordinateurs.map((coordinateur) => (
                            <option key={coordinateur.id_enseignant} value={coordinateur.id_enseignant}>
                                {coordinateur.nom} {coordinateur.prenom}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-end">
                    <button
                        onClick={clearFilters}
                        className="w-full px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
                    >
                        Effacer les filtres
                    </button>
                </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {totalItems} offre(s) trouvée(s)
                {(searchTerm || Object.values(filters).some(f => f)) && (
                    <span> - <button onClick={clearFilters} className="text-blue-500 hover:text-blue-700 underline">Afficher tout</button></span>
                )}
            </div>

            {/* Offres Table */}
            <div className="overflow-x-auto rounded shadow border dark:border-gray-700">
                <table className="min-w-full table-auto">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-3 text-left w-12"></th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Module</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Filière & Section</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Semestre & Niveau</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Coordinateur</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Crédits</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentOffres.map((offre) => (
                            <React.Fragment key={offre.id_offre}>
                                <tr className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => toggleRow(offre.id_offre)}
                                            className="text-blue-500 hover:text-blue-700"
                                            aria-label="Toggle détails"
                                        >
                                            {expandedRows[offre.id_offre] ? 
                                                <ChevronUp size={20} /> : 
                                                <ChevronDown size={20} />
                                            }
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm">{offre.module?.nom_module}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                {offre.module?.code_module}
                                            </span>
                                            {offre.module?.type_module && (
                                                <span className={`mt-1 px-2 py-1 rounded text-xs font-medium ${getModuleTypeColor(offre.module.type_module)}`}>
                                                    {getModuleTypeLabel(offre.module.type_module)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{offre.section?.filiere?.nom_filiere}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {offre.section?.nom_section}
                                            </span>
                                            <span className={`mt-1 px-2 py-1 rounded text-xs font-medium ${
                                                offre.section?.langue === 'FR' 
                                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                                    : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                            }`}>
                                                {offre.section?.langue}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{offre.semestre?.nom_semestre}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {offre.semestre?.niveau?.nom_niveau}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                {offre.semestre?.code_semestre}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {offre.coordinateur ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">
                                                    {offre.coordinateur.prenom} {offre.coordinateur.nom}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {offre.coordinateur.email}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                    {offre.coordinateur.matricule}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm italic">Non assigné</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-sm font-medium">
                                            {offre.module?.credits} cr
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditModal(offre)}
                                                className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
                                                aria-label="Modifier l'offre"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(offre)}
                                                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                                                aria-label="Supprimer l'offre"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                {expandedRows[offre.id_offre] && (
                                    <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                        <td colSpan="7" className="px-4 py-4">
                                            <div className="ml-8">
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                    {/* Module Details */}
                                                    <div>
                                                        <h4 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-400">
                                                            Détails du Module
                                                        </h4>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between">
                                                                <span className="font-medium">Nom affiché:</span>
                                                                <span>{offre.nom_affiche || offre.module?.nom_module}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="font-medium">Crédits:</span>
                                                                <span>{offre.module?.credits}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="font-medium">Type:</span>
                                                                <span>{getModuleTypeLabel(offre.module?.type_module)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Elements */}
                                                    <div>
                                                        <h4 className="text-lg font-semibold mb-3 text-green-700 dark:text-green-400">
                                                            Éléments ({offre.module?.elements?.length || 0})
                                                        </h4>
                                                        {offre.module?.elements && offre.module.elements.length > 0 ? (
                                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                                                {offre.module.elements.map((element) => (
                                                                    <div
                                                                        key={element.id_element}
                                                                        className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700"
                                                                    >
                                                                        <div className="flex justify-between items-center">
                                                                            <div>
                                                                                <span className="font-medium block">{element.nom_element}</span>
                                                                                <span className="text-xs text-gray-500 font-mono">{element.code_element}</span>
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                                    element.type_element === 'STAGE_ELEMENT' 
                                                                                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                                                                        : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                                                                }`}>
                                                                                    {element.type_element}
                                                                                </span>
                                                                                <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded text-xs font-medium">
                                                                                    Coef: {element.coefficient}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-500 dark:text-gray-400 italic text-sm">
                                                                Aucun élément défini
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* No results message */}
            {filteredOffres.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p className="text-lg mb-2">Aucune offre trouvée</p>
                    <p className="text-sm">Essayez de modifier vos critères de recherche ou créez une nouvelle offre</p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {/* Items per page selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Afficher:</span>
                        <select
                            value={itemsPerPage}
                            onChange={handleItemsPerPageChange}
                            className="border border-gray-300 dark:border-gray-600 rounded px-5 py-1 bg-white dark:bg-gray-700 text-sm"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span className="text-sm text-gray-600 dark:text-gray-400">par page</span>
                    </div>

                    {/* Page info */}
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Page {currentPage} sur {totalPages} - {totalItems} offre(s)
                    </div>

                    {/* Pagination controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={goToPreviousPage}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Précédent
                        </button>
                        
                        {/* Page numbers */}
                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let page;
                                if (totalPages <= 5) {
                                    page = i + 1;
                                } else if (currentPage <= 3) {
                                    page = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    page = totalPages - 4 + i;
                                } else {
                                    page = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={page}
                                        onClick={() => goToPage(page)}
                                        className={`w-8 h-8 rounded text-sm ${
                                            currentPage === page
                                                ? 'bg-blue-500 text-white'
                                                : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Suivant
                        </button>
                    </div>
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">
                            {modalType === 'add' ? 'Ajouter une Offre' : 'Modifier l\'Offre'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Section *</label>
                                    <select
                                        value={offreForm.data.id_section}
                                        onChange={(e) => offreForm.setData('id_section', e.target.value)}
                                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                        required
                                    >
                                        <option value="">Sélectionner une section</option>
                                        {sections.map((section) => (
                                            <option key={section.id_section} value={section.id_section}>
                                                {section.filiere?.nom_filiere} - {section.nom_section} ({section.langue})
                                            </option>
                                        ))}
                                    </select>
                                    {offreForm.errors.id_section && (
                                        <div className="text-red-500 text-sm mt-1">{offreForm.errors.id_section}</div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Semestre *</label>
                                    <select
                                        value={offreForm.data.id_semestre}
                                        onChange={(e) => offreForm.setData('id_semestre', e.target.value)}
                                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                        required
                                    >
                                        <option value="">Sélectionner un semestre</option>
                                        {semestres.map((semestre) => (
                                            <option key={semestre.id_semestre} value={semestre.id_semestre}>
                                                {semestre.niveau?.nom_niveau} ({semestre.nom_semestre})
                                            </option>
                                        ))}
                                    </select>
                                    {offreForm.errors.id_semestre && (
                                        <div className="text-red-500 text-sm mt-1">{offreForm.errors.id_semestre}</div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Module *</label>
                                    <select
                                        value={offreForm.data.id_module}
                                        onChange={(e) => offreForm.setData('id_module', e.target.value)}
                                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                        required
                                    >
                                        <option value="">Sélectionner un module</option>
                                        {modules.map((module) => (
                                            <option key={module.id_module} value={module.id_module}>
                                                {module.nom_module} ({module.code_module}) - {module.credits} crédits
                                            </option>
                                        ))}
                                    </select>
                                    {offreForm.errors.id_module && (
                                        <div className="text-red-500 text-sm mt-1">{offreForm.errors.id_module}</div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Coordinateur</label>
                                    <select
                                        value={offreForm.data.id_cordinateur}
                                        onChange={(e) => offreForm.setData('id_coordinateur', e.target.value)}
                                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">Sélectionner un coordinateur</option>
                                        {coordinateurs.map((coordinateur) => (
                                            <option key={coordinateur.id_enseignant} value={coordinateur.id_enseignant}>
                                                {coordinateur.nom} {coordinateur.prenom} ({coordinateur.matricule})
                                            </option>
                                        ))}
                                    </select>
                                    {offreForm.errors.id_coordinateur && (
                                        <div className="text-red-500 text-sm mt-1">{offreForm.errors.id_coordinateur}</div>
                                    )}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Nom affiché</label>
                                    <input
                                        type="text"
                                        value={offreForm.data.nom_affiche}
                                        onChange={(e) => offreForm.setData('nom_affiche', e.target.value)}
                                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="Nom personnalisé pour l'affichage (optionnel)"
                                    />
                                    {offreForm.errors.nom_affiche && (
                                        <div className="text-red-500 text-sm mt-1">{offreForm.errors.nom_affiche}</div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Année académique</label>
                                    <select
                                        value={offreForm.data.id_annee}
                                        onChange={(e) => offreForm.setData('id_annee', e.target.value)}
                                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">Sélectionner un coordinateur</option>
                                        {anneeUniversitaires.map((anneeUniversitaire) => (
                                            <option key={anneeUniversitaire.id_annee} value={anneeUniversitaire.id_annee}>
                                                {anneeUniversitaire.annee_univ} {anneeUniversitaire.est_active ? '✅':''}
                                            </option>
                                        ))}
                                    </select>
                                    {offreForm.errors.id_annee && (
                                        <div className="text-red-500 text-sm mt-1">{offreForm.errors.id_annee}</div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={offreForm.processing}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
                                >
                                    {offreForm.processing ? 'Enregistrement...' : modalType === 'add' ? 'Créer l\'offre' : 'Sauvegarder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
