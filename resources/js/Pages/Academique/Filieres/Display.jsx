import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Pencil, Trash2, Plus, Search, ChevronDown, ChevronUp, Filter } from 'lucide-react';

export default function SectionsDisplay({ filieres: initialFilieres, facultes }) {
    const [expandedRows, setExpandedRows] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState(''); // 'add' or 'edit'
    const [entityType, setEntityType] = useState(''); // 'filiere' or 'section'
    const [selectedFiliere, setSelectedFiliere] = useState(null);
    
    // Search and pagination states
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [filteredFilieres, setFilteredFilieres] = useState(initialFilieres);
    const [filters, setFilters] = useState({
        faculte: ''
    });

    const sectionForm = useForm({
        id_section: null,
        nom_section: '',
        langue: '',
        id_filiere: ''
    });

    const filiereForm = useForm({
        id_filiere: null,
        nom_filiere: '',
        id_faculte: ''
    });

    // Filter filieres based on search term and filters
    useEffect(() => {
        let filtered = initialFilieres.filter(filiere => {
            const matchesSearch = 
                filiere.nom_filiere?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                filiere.sections?.some(section => 
                    section.nom_section?.toLowerCase().includes(searchTerm.toLowerCase())
                );

            const matchesFaculte = !filters.faculte || filiere.id_faculte?.toString() === filters.faculte;

            return matchesSearch && matchesFaculte;
        });
        
        setFilteredFilieres(filtered);
        setCurrentPage(1);
    }, [searchTerm, filters, initialFilieres]);

    // Calculate pagination
    const totalItems = filteredFilieres.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentFilieres = filteredFilieres.slice(startIndex, startIndex + itemsPerPage);

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const openAddSectionModal = (filiere) => {
        setSelectedFiliere(filiere);
        setModalType('add');
        setEntityType('section');
        sectionForm.setData({
            id_section: null,
            nom_section: '',
            langue: '',
            id_filiere: filiere.id_filiere
        });
        setModalOpen(true);
    };

    const openEditSectionModal = (section, filiere) => {
        setSelectedFiliere(filiere);
        setModalType('edit');
        setEntityType('section');
        sectionForm.setData({
            id_section: section.id_section,
            nom_section: section.nom_section,
            langue: section.langue,
            id_filiere: section.id_filiere
        });
        setModalOpen(true);
    };

    const openAddFiliereModal = () => {
        setModalType('add');
        setEntityType('filiere');
        filiereForm.setData({
            id_filiere: null,
            nom_filiere: '',
            id_faculte: ''
        });
        setModalOpen(true);
    };

    const openEditFiliereModal = (filiere) => {
        setModalType('edit');
        setEntityType('filiere');
        filiereForm.setData({
            id_filiere: filiere.id_filiere,
            nom_filiere: filiere.nom_filiere,
            id_faculte: filiere.id_faculte
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setModalType('');
        setEntityType('');
        setSelectedFiliere(null);
        sectionForm.reset();
        filiereForm.reset();
    };

    const handleSectionSubmit = (e) => {
        e.preventDefault();
        const action = modalType === 'add' 
            ? sectionForm.post(route('academique.sections.store'), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: modalType === 'add' ? 'Section ajoutée' : 'Section modifiée',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            })
            : sectionForm.put(route('academique.sections.update', sectionForm.data.id_section), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: modalType === 'add' ? 'Section ajoutée' : 'Section modifiée',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            });
    };

    const handleFiliereSubmit = (e) => {
        e.preventDefault();
        const action = modalType === 'add' 
            ? filiereForm.post(route('academique.filieres.store'), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: modalType === 'add' ? 'Filière ajoutée' : 'Filière modifiée',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            })
            : filiereForm.put(route('academique.filieres.update', filiereForm.data.id_filiere), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: modalType === 'add' ? 'Filière ajoutée' : 'Filière modifiée',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            });
    };

    const handleSectionDelete = (section) => {
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
                sectionForm.delete(route('academique.sections.destroy', section.id_section), {
                    onSuccess: () => {
                        Swal.fire('Supprimé !', 'La section a été supprimée.', 'success');
                    }
                });
            }
        });
    };

    const handleFiliereDelete = (filiere) => {
        Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: "Cette action supprimera également toutes les sections associées !",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Oui, supprimer !',
            cancelButtonText: 'Annuler'
        }).then((result) => {
            if (result.isConfirmed) {
                filiereForm.delete(route('academique.filieres.destroy', filiere.id_filiere), {
                    onSuccess: () => {
                        Swal.fire('Supprimé !', 'La filière a été supprimée.', 'success');
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

    return (
        <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-6 rounded-md">
            {/* Header with Search, Filters and Actions */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-300 dark:border-gray-700 pb-4 mb-6">
                <h2 className="text-2xl font-semibold">Filières et Sections</h2>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 sm:flex-none">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher par nom de filière ou section..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 w-full sm:w-80 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={openAddFiliereModal}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded whitespace-nowrap"
                            aria-label="Ajouter une filière"
                        >
                            <Plus size={18} />
                            <span>Ajouter Filière</span>
                        </button>
                    </div>
                </div>
            </div>
            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {totalItems} filière(s) trouvée(s)
            </div>

            {/* Filieres Table */}
            <div className="overflow-x-auto rounded shadow border dark:border-gray-700">
                <table className="min-w-full table-auto">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-3 text-left w-12"></th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Nom de la Filière</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Faculté</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Sections</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentFilieres.map((filiere) => (
                            <React.Fragment key={filiere.id_filiere}>
                                <tr className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => toggleRow(filiere.id_filiere)}
                                            className="text-blue-500 hover:text-blue-700"
                                            aria-label="Toggle sections"
                                        >
                                            {expandedRows[filiere.id_filiere] ? 
                                                <ChevronUp size={20} /> : 
                                                <ChevronDown size={20} />
                                            }
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm">{filiere.nom_filiere}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-sm">
                                            {filiere.faculte?.nom_faculte || 'Non assignée'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm font-medium">
                                            {filiere.sections?.length || 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openAddSectionModal(filiere)}
                                                className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded"
                                                aria-label="Ajouter une section"
                                            >
                                                <Plus size={16} />
                                                <span className="text-sm">Section</span>
                                            </button>
                                            <button
                                                onClick={() => openEditFiliereModal(filiere)}
                                                className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
                                                aria-label="Modifier la filière"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleFiliereDelete(filiere)}
                                                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                                                aria-label="Supprimer la filière"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                {expandedRows[filiere.id_filiere] && (
                                    <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                        <td colSpan="5" className="px-4 py-4">
                                            <div className="ml-8">
                                                <h3 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-400">
                                                    Sections:
                                                </h3>
                                                {filiere.sections && filiere.sections.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {filiere.sections.map((section) => (
                                                            <div
                                                                key={section.id_section}
                                                                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                                        {section.nom_section}
                                                                    </span>
                                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                        section.langue === 'FR' 
                                                                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                                                            : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                                                    }`}>
                                                                        {section.langue}
                                                                    </span>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => openEditSectionModal(section, filiere)}
                                                                        className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
                                                                        aria-label="Modifier la section"
                                                                    >
                                                                        <Pencil size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleSectionDelete(section)}
                                                                        className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                                                                        aria-label="Supprimer la section"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-500 dark:text-gray-400 italic">
                                                        Aucune section disponible
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

            {/* No results message */}
            {filteredFilieres.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p className="text-lg mb-2">Aucune filière trouvée</p>
                    <p className="text-sm">Essayez de modifier vos critères de recherche ou créez une nouvelle filière</p>
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
                            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-sm"
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
                        Page {currentPage} sur {totalPages} - {totalItems} filière(s)
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
                    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">
                            {modalType === 'add' 
                                ? entityType === 'filiere' ? 'Ajouter une Filière' : 'Ajouter une Section'
                                : entityType === 'filiere' ? 'Modifier la Filière' : 'Modifier la Section'
                            }
                        </h2>
                        <form onSubmit={entityType === 'filiere' ? handleFiliereSubmit : handleSectionSubmit} className="space-y-4">
                            {entityType === 'filiere' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nom de la Filière</label>
                                        <input
                                            type="text"
                                            value={filiereForm.data.nom_filiere}
                                            onChange={(e) => filiereForm.setData('nom_filiere', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                        />
                                        {filiereForm.errors.nom_filiere && (
                                            <div className="text-red-500 text-sm mt-1">{filiereForm.errors.nom_filiere}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Faculté</label>
                                        <select
                                            value={filiereForm.data.id_faculte}
                                            onChange={(e) => filiereForm.setData('id_faculte', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                        >
                                            <option value="">--Sélectionner une faculté--</option>
                                            {facultes.map((faculte) => (
                                                <option key={faculte.id_faculte} value={faculte.id_faculte}>
                                                    {faculte.nom_faculte}
                                                </option>
                                            ))}
                                        </select>
                                        {filiereForm.errors.id_faculte && (
                                            <div className="text-red-500 text-sm mt-1">{filiereForm.errors.id_faculte}</div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nom de la Section</label>
                                        <input
                                            type="text"
                                            value={sectionForm.data.nom_section}
                                            onChange={(e) => sectionForm.setData('nom_section', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                        />
                                        {sectionForm.errors.nom_section && (
                                            <div className="text-red-500 text-sm mt-1">{sectionForm.errors.nom_section}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Langue</label>
                                        <select
                                            value={sectionForm.data.langue}
                                            onChange={(e) => sectionForm.setData('langue', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                        >
                                            <option value="">--Sélectionner une langue--</option>
                                            <option value="FR">Français (FR)</option>
                                            <option value="EN">English (EN)</option>
                                            <option value="AR">العربية (AR)</option>
                                            <option value="ES">Español (ES)</option>
                                        </select>
                                        {sectionForm.errors.langue && (
                                            <div className="text-red-500 text-sm mt-1">{sectionForm.errors.langue}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Filière</label>
                                        <input
                                            type="text"
                                            value={selectedFiliere?.nom_filiere || ''}
                                            disabled
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-600"
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
                                    disabled={entityType === 'filiere' ? filiereForm.processing : sectionForm.processing}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
                                >
                                    {entityType === 'filiere' 
                                        ? (filiereForm.processing ? 'Enregistrement...' : modalType === 'add' ? 'Ajouter' : 'Sauvegarder')
                                        : (sectionForm.processing ? 'Enregistrement...' : modalType === 'add' ? 'Ajouter' : 'Sauvegarder')
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