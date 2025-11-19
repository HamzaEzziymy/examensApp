import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Pencil, Trash2, Plus, ChevronDown, ChevronUp, Search } from 'lucide-react';

export default function ModulesDisplay({ modules: initialModules }) {
    const [expandedRows, setExpandedRows] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState(''); // 'add' or 'edit'
    const [entityType, setEntityType] = useState(''); // 'module' or 'element'
    const [selectedModule, setSelectedModule] = useState(null);
    
    // Search and pagination states
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [filteredModules, setFilteredModules] = useState(initialModules);

    const elementForm = useForm({
        id_element: null,
        nom_element: '',
        code_element: '',
        type_element: '',
        coefficient: '',
        id_module: ''
    });

    const moduleForm = useForm({
        id_module: null,
        nom_module: '',
        code_module: '',
        type_module: '',
        credits: ''
    });

    // Filter modules based on search term
    useEffect(() => {
        const filtered = initialModules.filter(module =>
            module.nom_module.toLowerCase().includes(searchTerm.toLowerCase()) ||
            module.code_module.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredModules(filtered);
        setCurrentPage(1); // Reset to first page when search changes
    }, [searchTerm, initialModules]);

    // Calculate pagination
    const totalItems = filteredModules.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentModules = filteredModules.slice(startIndex, startIndex + itemsPerPage);

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const openAddElementModal = (module) => {
        setSelectedModule(module);
        setModalType('add');
        setEntityType('element');
        elementForm.setData({
            id_element: null,
            nom_element: '',
            code_element: '',
            type_element: '',
            coefficient: '',
            id_module: module.id_module
        });
        setModalOpen(true);
    };

    const openEditElementModal = (element, module) => {
        setSelectedModule(module);
        setModalType('edit');
        setEntityType('element');
        elementForm.setData({
            id_element: element.id_element,
            nom_element: element.nom_element,
            code_element: element.code_element,
            type_element: element.type_element,
            coefficient: element.coefficient,
            id_module: element.id_module
        });
        setModalOpen(true);
    };

    const openAddModuleModal = () => {
        setModalType('add');
        setEntityType('module');
        moduleForm.setData({
            id_module: null,
            nom_module: '',
            code_module: '',
            type_module: '',
            credits: ''
        });
        setModalOpen(true);
    };

    const openEditModuleModal = (module) => {
        setModalType('edit');
        setEntityType('module');
        moduleForm.setData({
            id_module: module.id_module,
            nom_module: module.nom_module,
            code_module: module.code_module,
            type_module: module.type_module,
            credits: module.credits
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setModalType('');
        setEntityType('');
        setSelectedModule(null);
        elementForm.reset();
        moduleForm.reset();
    };

    const handleElementSubmit = (e) => {
        e.preventDefault();
        const action = modalType === 'add' 
            ? elementForm.post(route('academique.elements-module.store'), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: modalType === 'add' ? 'Élément ajouté' : 'Élément modifié',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            })
            : elementForm.put(route('academique.elements-module.update', elementForm.data.id_element), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: modalType === 'add' ? 'Élément ajouté' : 'Élément modifié',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            });
    };

    const handleModuleSubmit = (e) => {
        e.preventDefault();
        const action = modalType === 'add' 
            ? moduleForm.post(route('academique.modules.store'), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: modalType === 'add' ? 'Module ajouté' : 'Module modifié',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            })
            : moduleForm.put(route('academique.modules.update', moduleForm.data.id_module), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: modalType === 'add' ? 'Module ajouté' : 'Module modifié',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            });
    };

    const handleElementDelete = (element) => {
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
                elementForm.delete(route('academique.elements-module.destroy', element.id_element), {
                    onSuccess: () => {
                        Swal.fire('Supprimé !', 'L\'élément a été supprimé.', 'success');
                    }
                });
            }
        });
    };

    const handleModuleDelete = (module) => {
        Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: "Cette action supprimera également tous les éléments associés !",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Oui, supprimer !',
            cancelButtonText: 'Annuler'
        }).then((result) => {
            if (result.isConfirmed) {
                moduleForm.delete(route('academique.modules.destroy', module.id_module), {
                    onSuccess: () => {
                        Swal.fire('Supprimé !', 'Le module a été supprimé.', 'success');
                    }
                });
            }
        });
    };

    const getTypeElementColor = (type) => {
        const colors = {
            'PRE_CLINIQUE': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
            'TP': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
            'COURS': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
            'TD': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
            'EXAMEN': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        };
        return colors[type] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    };

    const getTypeElementLabel = (type) => {
        const labels = {
            'PRE_CLINIQUE': 'Pré-clinique',
            'TP': 'Travaux Pratiques',
            'COURS': 'Cours',
            'TD': 'Travaux Dirigés',
            'EXAMEN': 'Examen'
        };
        return labels[type] || type;
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

    return (
        <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-6 rounded-md">
            {/* Header with Search and Add Button */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-300 dark:border-gray-700 pb-4 mb-6">
                <h2 className="text-2xl font-semibold">Modules et Éléments</h2>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 sm:flex-none">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher par nom ou code module..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 w-full sm:w-80 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    
                    {/* Add Module Button */}
                    <button
                        onClick={openAddModuleModal}
                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded whitespace-nowrap"
                        aria-label="Ajouter un module"
                    >
                        <Plus size={18} />
                        <span>Ajouter Module</span>
                    </button>
                </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {totalItems} module(s) trouvé(s)
                {searchTerm && (
                    <span> pour "{searchTerm}"</span>
                )}
            </div>

            {/* Modules Table */}
            <div className="overflow-x-auto rounded shadow border dark:border-gray-700">
                <table className="min-w-full table-auto">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-2 text-left w-12"></th>
                            <th className="px-4 py-2 text-left">Code Module</th>
                            <th className="px-4 py-2 text-left">Nom du Module</th>
                            <th className="px-4 py-2 text-left">Type Module</th>
                            <th className="px-4 py-2 text-left">Crédits</th>
                            <th className="px-4 py-2 text-left">Éléments</th>
                            <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentModules.map((module) => (
                            <React.Fragment key={module.id_module}>
                                <tr className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-2">
                                        <button
                                            onClick={() => toggleRow(module.id_module)}
                                            className="text-blue-500 hover:text-blue-700"
                                            aria-label="Toggle éléments"
                                        >
                                            {expandedRows[module.id_module] ? 
                                                <ChevronUp size={20} /> : 
                                                <ChevronDown size={20} />
                                            }
                                        </button>
                                    </td>
                                    <td className="px-4 py-2 font-medium">
                                        {module.code_module}
                                    </td>
                                    <td className="px-4 py-2 font-medium">{module.nom_module}</td>
                                    <td className="px-4 py-2 font-medium">{module.type_module}</td>
                                    <td className="px-4 py-2">
                                        <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-sm">
                                            {module.credits} crédits
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm">
                                            {module.elements?.length || 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openAddElementModal(module)}
                                                className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded"
                                                aria-label="Ajouter un élément"
                                            >
                                                <Plus size={16} />
                                                <span className="text-sm">Élément</span>
                                            </button>
                                            <button
                                                onClick={() => openEditModuleModal(module)}
                                                className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
                                                aria-label="Modifier le module"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleModuleDelete(module)}
                                                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                                                aria-label="Supprimer le module"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                {expandedRows[module.id_module] && (
                                    <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                        <td colSpan="6" className="px-4 py-4">
                                            <div className="ml-8">
                                                <h3 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-400">
                                                    Éléments du module:
                                                </h3>
                                                {module.elements && module.elements.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {module.elements.map((element) => (
                                                            <div
                                                                key={element.id_element}
                                                                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-4">
                                                                        <div>
                                                                            <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                                                                                {element.nom_element}
                                                                            </span>
                                                                            <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                                                                {element.code_element}
                                                                            </span>
                                                                        </div>
                                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeElementColor(element.type_element)}`}>
                                                                            {getTypeElementLabel(element.type_element)}
                                                                        </span>
                                                                        <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded text-xs font-medium">
                                                                            Coef: {element.coefficient}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => openEditElementModal(element, module)}
                                                                            className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
                                                                            aria-label="Modifier l'élément"
                                                                        >
                                                                            <Pencil size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleElementDelete(element)}
                                                                            className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                                                                            aria-label="Supprimer l'élément"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-500 dark:text-gray-400 italic">
                                                        Aucun élément disponible pour ce module
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

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
                        Page {currentPage} sur {totalPages} - {totalItems} module(s)
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
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
                            ))}
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

            {/* No results message */}
            {filteredModules.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>Aucun module trouvé</p>
                    {searchTerm && (
                        <p className="text-sm mt-2">Essayez de modifier vos termes de recherche</p>
                    )}
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">
                            {modalType === 'add' 
                                ? entityType === 'module' ? 'Ajouter un Module' : 'Ajouter un Élément'
                                : entityType === 'module' ? 'Modifier le Module' : 'Modifier l\'Élément'
                            }
                        </h2>
                        <form onSubmit={entityType === 'module' ? handleModuleSubmit : handleElementSubmit} className="space-y-4">
                            {entityType === 'module' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nom du Module</label>
                                        <input
                                            type="text"
                                            value={moduleForm.data.nom_module}
                                            onChange={(e) => moduleForm.setData('nom_module', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                        />
                                        {moduleForm.errors.nom_module && (
                                            <div className="text-red-500 text-sm mt-1">{moduleForm.errors.nom_module}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Code du Module</label>
                                        <input
                                            type="text"
                                            value={moduleForm.data.code_module}
                                            onChange={(e) => moduleForm.setData('code_module', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 font-mono"
                                            required
                                        />
                                        {moduleForm.errors.code_module && (
                                            <div className="text-red-500 text-sm mt-1">{moduleForm.errors.code_module}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Type de Module</label>
                                        <select
                                            value={moduleForm.data.type_module}
                                            onChange={(e) => moduleForm.setData('type_module', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                        >
                                            <option value="CONNAISSANCE">CONNAISSANCE</option>
                                            <option value="HORIZONTAL">HORIZONTAL</option>
                                            <option value="STAGE">STAGE</option>
                                            <option value="THESE">THESE</option>
                                        </select>
                                        {moduleForm.errors.type_module && (
                                            <div className="text-red-500 text-sm mt-1">{moduleForm.errors.type_module}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Crédits</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={moduleForm.data.credits}
                                            onChange={(e) => moduleForm.setData('credits', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                            min="0"
                                        />
                                        {moduleForm.errors.credits && (
                                            <div className="text-red-500 text-sm mt-1">{moduleForm.errors.credits}</div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nom de l'Élément</label>
                                        <input
                                            type="text"
                                            value={elementForm.data.nom_element}
                                            onChange={(e) => elementForm.setData('nom_element', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                        />
                                        {elementForm.errors.nom_element && (
                                            <div className="text-red-500 text-sm mt-1">{elementForm.errors.nom_element}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Code de l'Élément</label>
                                        <input
                                            type="text"
                                            value={elementForm.data.code_element}
                                            onChange={(e) => elementForm.setData('code_element', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 font-mono"
                                            required
                                        />
                                        {elementForm.errors.code_element && (
                                            <div className="text-red-500 text-sm mt-1">{elementForm.errors.code_element}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Type d'Élément</label>
                                        <select
                                            value={elementForm.data.type_element}
                                            onChange={(e) => elementForm.setData('type_element', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                        >
                                            <option value="">--Sélectionner un type--</option>
                                            <option value="PRE_CLINIQUE">Pré-clinique</option>
                                            <option value="TP">Travaux Pratiques</option>
                                            <option value="COURS">Cours</option>
                                            <option value="TD">Travaux Dirigés</option>
                                            <option value="EXAMEN">Examen</option>
                                        </select>
                                        {elementForm.errors.type_element && (
                                            <div className="text-red-500 text-sm mt-1">{elementForm.errors.type_element}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Coefficient</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={elementForm.data.coefficient}
                                            onChange={(e) => elementForm.setData('coefficient', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                            min="0"
                                        />
                                        {elementForm.errors.coefficient && (
                                            <div className="text-red-500 text-sm mt-1">{elementForm.errors.coefficient}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Module</label>
                                        <input
                                            type="text"
                                            value={selectedModule?.nom_module || ''}
                                            disabled
                                            className="w-full px-3 py-2 border rounded dark:border-gray-600 bg-gray-100 dark:bg-gray-600"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={entityType === 'module' ? moduleForm.processing : elementForm.processing}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
                                >
                                    {entityType === 'module' 
                                        ? (moduleForm.processing ? 'Enregistrement...' : modalType === 'add' ? 'Ajouter' : 'Sauvegarder')
                                        : (elementForm.processing ? 'Enregistrement...' : modalType === 'add' ? 'Ajouter' : 'Sauvegarder')
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}