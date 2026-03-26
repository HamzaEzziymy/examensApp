import React, { useState, useEffect, useMemo } from 'react';
import { useForm, router, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Pencil, Trash2, Plus, Search, ChevronDown, ChevronUp, Filter } from 'lucide-react';

export default function Display({ 
    offresFormation: paginatedOffres, 
    sections = [], 
    semestres = [], 
    modules = [], 
    coordinateurs = [],
    anneeUniversitaires = [],
    filters: initialFilters = {},
    totalCount = 0
}) {
    const { auth } = usePage().props;
    
    // Get user's selected année and filière from Years_Sectors_Selecters
    const userSelectedAnnee = auth.user_filiere_annee?.id_annee || 'all';
    const userSelectedFiliere = auth.user_filiere_annee?.id_filiere || 'all';
    
    const [expandedRows, setExpandedRows] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState(''); // 'add' or 'edit'
    const [selectedOffre, setSelectedOffre] = useState(null);
    
    // Search and filter states (now using backend)
    const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
    const [semestreFilter, setSemestreFilter] = useState(initialFilters.semestre || '');
    const [perPage, setPerPage] = useState(initialFilters.per_page || 25);
    
    // Filter sections based on user's selected filière
    const filteredSections = useMemo(() => {
        if (userSelectedFiliere === 'all') {
            return sections;
        }
        return sections.filter(section => section.id_filiere == userSelectedFiliere);
    }, [sections, userSelectedFiliere]);

    // Extract offres data from paginated response
    const offres = paginatedOffres.data || [];
    const currentPage = paginatedOffres.current_page || 1;
    const lastPage = paginatedOffres.last_page || 1;
    const total = paginatedOffres.total || 0;

    const offreForm = useForm({
        id_offre: null,
        id_section: '',
        id_semestre: '',
        id_module: '',
        id_coordinateur: '',
        id_annee: new Date().getFullYear(),
        nom_affiche: ''
    });

    // Handle search with backend
    const handleSearch = (value) => {
        setSearchTerm(value);
        router.get(route('academique.offres-formations.index'), {
            search: value,
            annee: userSelectedAnnee !== 'all' ? userSelectedAnnee : '',
            section: '', // Section filtering removed - depends on Years_Sectors_Selecters
            semestre: semestreFilter,
            per_page: perPage,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Handle filter changes with backend
    const handleFilterChange = (filterName, value) => {
        const newFilters = {
            search: searchTerm,
            annee: userSelectedAnnee !== 'all' ? userSelectedAnnee : '',
            section: '', // Section filtering removed - depends on Years_Sectors_Selecters
            semestre: semestreFilter,
            per_page: perPage,
        };
        
        newFilters[filterName] = value;
        
        // Update local state
        if (filterName === 'semestre') setSemestreFilter(value);
        if (filterName === 'per_page') setPerPage(value);
        
        router.get(route('academique.offres-formations.index'), newFilters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Handle pagination
    const goToPage = (page) => {
        router.get(route('academique.offres-formations.index'), {
            search: searchTerm,
            annee: userSelectedAnnee !== 'all' ? userSelectedAnnee : '',
            section: '', // Section filtering removed - depends on Years_Sectors_Selecters
            semestre: semestreFilter,
            per_page: perPage,
            page: page,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

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

    // Filter available modules based on what's already used
    const getAvailableModules = () => {
        // Get all module IDs that are already used in existing offres
        const usedModuleIds = offres.map(offre => offre.id_module);
        
        let availableModules = [];
        
        if (modalType === 'add') {
            // For adding new offre, exclude all used modules
            availableModules = modules.filter(module => !usedModuleIds.includes(module.id_module));
        } else if (modalType === 'edit' && selectedOffre) {
            // For editing, include the current module plus all unused modules
            availableModules = modules.filter(module => 
                module.id_module === selectedOffre.id_module || 
                !usedModuleIds.includes(module.id_module)
            );
        } else {
            availableModules = modules;
        }
        
        // Sort modules by code_module
        return availableModules.sort((a, b) => {
            const codeA = a.code_module || '';
            const codeB = b.code_module || '';
            return codeA.localeCompare(codeB);
        });
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
                    Swal.fire({
                        icon: 'error',
                        title: 'Une erreur est survenue',
                        showConfirmButton: false,
                        timer: 1500
                    });
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

    const clearFilters = () => {
        router.get(route('academique.offres-formations.index'), {
            search: '',
            annee: userSelectedAnnee !== 'all' ? userSelectedAnnee : '',
            section: '', // Section filtering removed - depends on Years_Sectors_Selecters
            semestre: '',
            per_page: 25,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
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
                            onChange={(e) => handleSearch(e.target.value)}
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

            {/* Results Count and Filters */}
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {total} offre(s) trouvée(s)
                    {searchTerm && (
                        <span> pour "{searchTerm}"</span>
                    )}
                </div>
                
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Semestre:</label>
                    <select
                        value={semestreFilter}
                        onChange={(e) => handleFilterChange('semestre', e.target.value)}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Tous</option>
                        {semestres.map(semestre => (
                            <option key={semestre.id_semestre} value={semestre.id_semestre}>
                                {semestre.nom_semestre}
                            </option>
                        ))}
                    </select>
                    
                    <label className="text-sm text-gray-600 dark:text-gray-400">Par page:</label>
                    <select
                        value={perPage}
                        onChange={(e) => handleFilterChange('per_page', Number(e.target.value))}
                        className="px-5 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                    
                    <button
                        onClick={clearFilters}
                        className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
                    >
                        Effacer
                    </button>
                </div>
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
                        {offres.map((offre) => (
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
            {offres.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p className="text-lg mb-2">Aucune offre trouvée</p>
                    <p className="text-sm">Essayez de modifier vos critères de recherche ou créez une nouvelle offre</p>
                </div>
            )}

            {/* Pagination */}
            {lastPage > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {/* Page info */}
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Page {currentPage} sur {lastPage} - {total} offre(s)
                    </div>

                    {/* Pagination controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Précédent
                        </button>
                        
                        {/* Page numbers */}
                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(lastPage, 10) }, (_, i) => {
                                let page;
                                if (lastPage <= 10) {
                                    page = i + 1;
                                } else if (currentPage <= 5) {
                                    page = i + 1;
                                } else if (currentPage >= lastPage - 4) {
                                    page = lastPage - 9 + i;
                                } else {
                                    page = currentPage - 5 + i;
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
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === lastPage}
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
                                        {filteredSections.map((section) => (
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
                                        {getAvailableModules().map((module) => (
                                            <option key={module.id_module} value={module.id_module}>
                                                {module.code_module} - ({module.nom_module})
                                            </option>
                                        ))}
                                    </select>
                                    {offreForm.errors.id_module && (
                                        <div className="text-red-500 text-sm mt-1">{offreForm.errors.id_module}</div>
                                    )}
                                    {modalType === 'add' && getAvailableModules().length === 0 && (
                                        <div className="text-amber-600 dark:text-amber-400 text-sm mt-1">
                                            Tous les modules sont déjà utilisés dans des offres existantes.
                                        </div>
                                    )}
                                    {modalType === 'add' && getAvailableModules().length > 0 && (
                                        <div className="text-green-600 dark:text-green-400 text-sm mt-1">
                                            {getAvailableModules().length} module(s) disponible(s)
                                        </div>
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
