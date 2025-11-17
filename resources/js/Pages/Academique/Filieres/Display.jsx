import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Pencil, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

export default function SectionsDisplay({ filieres, facultes }) {
    const [expandedRows, setExpandedRows] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState(''); // 'add' or 'edit'
    const [entityType, setEntityType] = useState(''); // 'filiere' or 'section'
    const [selectedFiliere, setSelectedFiliere] = useState(null);

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
            ? sectionForm.post(route('academique.sections.store'),{
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
            : sectionForm.put(route('academique.sections.update', sectionForm.data.id_section),{
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
            ? filiereForm.post(route('academique.filieres.store'),{
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
            : filiereForm.put(route('academique.filieres.update', filiereForm.data.id_filiere),{
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

    return (
        <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-6 rounded-md">
            <div className="flex justify-between items-center border-b border-gray-300 dark:border-gray-700 pb-4 mb-6">
                <h2 className="text-2xl font-semibold">Filières et Sections</h2>
                <button
                    onClick={openAddFiliereModal}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                    aria-label="Ajouter une filière"
                >
                    <Plus size={18} />
                    <span>Ajouter Filière</span>
                </button>
            </div>

            <div className="overflow-x-auto rounded shadow border dark:border-gray-700">
                <table className="min-w-full table-auto">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-2 text-left w-12"></th>
                            <th className="px-4 py-2 text-left">Nom de la Filière</th>
                            <th className="px-4 py-2 text-left">Sections</th>
                            <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filieres.map((filiere) => (
                            <React.Fragment key={filiere.id_filiere}>
                                <tr className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-2">
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
                                    <td className="px-4 py-2 font-medium">{filiere.nom_filiere}</td>
                                    <td className="px-4 py-2">
                                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm">
                                            {filiere.sections?.length || 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
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
                                        <td colSpan="4" className="px-4 py-4">
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