import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Pencil, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

export default function Display({ niveaux }) {
    const [expandedRows, setExpandedRows] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState(''); // 'add' or 'edit'
    const [entityType, setEntityType] = useState(''); // 'niveau' or 'semestre'
    const [selectedNiveau, setSelectedNiveau] = useState(null);

    const semestreForm = useForm({
        id_semestre: null,
        nom_semestre: '',
        code_semestre: '',
        ordre: '',
        id_niveau: ''
    });

    const niveauForm = useForm({
        id_niveau: null,
        nom_niveau: '',
        code_niveau: '',
        ordre: ''
    });

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const openAddSemestreModal = (niveau) => {
        setSelectedNiveau(niveau);
        setModalType('add');
        setEntityType('semestre');
        semestreForm.setData({
            id_semestre: null,
            nom_semestre: '',
            code_semestre: '',
            ordre: '',
            id_niveau: niveau.id_niveau
        });
        setModalOpen(true);
    };

    const openEditSemestreModal = (semestre, niveau) => {
        setSelectedNiveau(niveau);
        setModalType('edit');
        setEntityType('semestre');
        semestreForm.setData({
            id_semestre: semestre.id_semestre,
            nom_semestre: semestre.nom_semestre,
            code_semestre: semestre.code_semestre,
            ordre: semestre.ordre,
            id_niveau: semestre.id_niveau
        });
        setModalOpen(true);
    };

    const openAddNiveauModal = () => {
        setModalType('add');
        setEntityType('niveau');
        niveauForm.setData({
            id_niveau: null,
            nom_niveau: '',
            code_niveau: '',
            ordre: ''
        });
        setModalOpen(true);
    };

    const openEditNiveauModal = (niveau) => {
        setModalType('edit');
        setEntityType('niveau');
        niveauForm.setData({
            id_niveau: niveau.id_niveau,
            nom_niveau: niveau.nom_niveau,
            code_niveau: niveau.code_niveau,
            ordre: niveau.ordre
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setModalType('');
        setEntityType('');
        setSelectedNiveau(null);
        semestreForm.reset();
        niveauForm.reset();
    };

    const handleSemestreSubmit = (e) => {
        e.preventDefault();
        const action = modalType === 'add' 
            ? semestreForm.post(route('academique.semestres.store'), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Semestre ajouté',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            })
            : semestreForm.put(route('academique.semestres.update', semestreForm.data.id_semestre), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Semestre modifié',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            });
    };

    const handleNiveauSubmit = (e) => {
        e.preventDefault();
        const action = modalType === 'add' 
            ? niveauForm.post(route('academique.niveaux.store'), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Niveau ajouté',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            })
            : niveauForm.put(route('academique.niveaux.update', niveauForm.data.id_niveau), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Niveau modifié',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            });
    };

    const handleSemestreDelete = (semestre) => {
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
                semestreForm.delete(route('academique.semestres.destroy', semestre.id_semestre), {
                    onSuccess: () => {
                        Swal.fire('Supprimé !', 'Le semestre a été supprimé.', 'success');
                    }
                });
            }
        });
    };

    const handleNiveauDelete = (niveau) => {
        Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: "Cette action supprimera également tous les semestres associés !",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Oui, supprimer !',
            cancelButtonText: 'Annuler'
        }).then((result) => {
            if (result.isConfirmed) {
                niveauForm.delete(route('academique.niveaux.destroy', niveau.id_niveau), {
                    onSuccess: () => {
                        Swal.fire('Supprimé !', 'Le niveau a été supprimé.', 'success');
                    }
                });
            }
        });
    };

    return (
        <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-6 rounded-md">
            <div className="flex justify-between items-center border-b border-gray-300 dark:border-gray-700 pb-4 mb-6">
                <h2 className="text-2xl font-semibold">Niveaux et Semestres</h2>
                <button
                    onClick={openAddNiveauModal}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                    aria-label="Ajouter un niveau"
                >
                    <Plus size={18} />
                    <span>Ajouter Niveau</span>
                </button>
            </div>

            <div className="overflow-x-auto rounded shadow border dark:border-gray-700">
                <table className="min-w-full table-auto">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-2 text-left w-12"></th>
                            <th className="px-4 py-2 text-left">Code</th>
                            <th className="px-4 py-2 text-left">Nom du Niveau</th>
                            <th className="px-4 py-2 text-left">Ordre</th>
                            <th className="px-4 py-2 text-left">Semestres</th>
                            <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {niveaux.map((niveau) => (
                            <React.Fragment key={niveau.id_niveau}>
                                <tr className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-2">
                                        <button
                                            onClick={() => toggleRow(niveau.id_niveau)}
                                            className="text-blue-500 hover:text-blue-700"
                                            aria-label="Toggle semestres"
                                        >
                                            {expandedRows[niveau.id_niveau] ? 
                                                <ChevronUp size={20} /> : 
                                                <ChevronDown size={20} />
                                            }
                                        </button>
                                    </td>
                                    <td className="px-4 py-2 font-medium">
                                        {niveau.code_niveau}
                                    </td>
                                    <td className="px-4 py-2 font-medium">{niveau.nom_niveau}</td>
                                    <td className="px-4 py-2">
                                        <span className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-sm">
                                            {niveau.ordre}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm">
                                            {niveau.semestres?.length || 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openAddSemestreModal(niveau)}
                                                className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded"
                                                aria-label="Ajouter un semestre"
                                            >
                                                <Plus size={16} />
                                                <span className="text-sm">Semestre</span>
                                            </button>
                                            <button
                                                onClick={() => openEditNiveauModal(niveau)}
                                                className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
                                                aria-label="Modifier le niveau"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleNiveauDelete(niveau)}
                                                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                                                aria-label="Supprimer le niveau"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                {expandedRows[niveau.id_niveau] && (
                                    <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                        <td colSpan="6" className="px-4 py-4">
                                            <div className="ml-8">
                                                <h3 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-400">
                                                    Semestres:
                                                </h3>
                                                {niveau.semestres && niveau.semestres.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {niveau.semestres.map((semestre) => (
                                                            <div
                                                                key={semestre.id_semestre}
                                                                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div>
                                                                        <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                                                                            {semestre.nom_semestre}
                                                                        </span>
                                                                        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                                                            {semestre.code_semestre}
                                                                        </span>
                                                                    </div>
                                                                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-xs font-medium">
                                                                        Ordre: {semestre.ordre}
                                                                    </span>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => openEditSemestreModal(semestre, niveau)}
                                                                        className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
                                                                        aria-label="Modifier le semestre"
                                                                    >
                                                                        <Pencil size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleSemestreDelete(semestre)}
                                                                        className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                                                                        aria-label="Supprimer le semestre"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-500 dark:text-gray-400 italic">
                                                        Aucun semestre disponible
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
                                ? entityType === 'niveau' ? 'Ajouter un Niveau' : 'Ajouter un Semestre'
                                : entityType === 'niveau' ? 'Modifier le Niveau' : 'Modifier le Semestre'
                            }
                        </h2>
                        <form onSubmit={entityType === 'niveau' ? handleNiveauSubmit : handleSemestreSubmit} className="space-y-4">
                            {entityType === 'niveau' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nom du Niveau</label>
                                        <input
                                            type="text"
                                            value={niveauForm.data.nom_niveau}
                                            onChange={(e) => niveauForm.setData('nom_niveau', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                        />
                                        {niveauForm.errors.nom_niveau && (
                                            <div className="text-red-500 text-sm mt-1">{niveauForm.errors.nom_niveau}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Code du Niveau</label>
                                        <input
                                            type="text"
                                            value={niveauForm.data.code_niveau}
                                            onChange={(e) => niveauForm.setData('code_niveau', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 font-mono"
                                            required
                                        />
                                        {niveauForm.errors.code_niveau && (
                                            <div className="text-red-500 text-sm mt-1">{niveauForm.errors.code_niveau}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Ordre</label>
                                        <input
                                            type="number"
                                            value={niveauForm.data.ordre}
                                            onChange={(e) => niveauForm.setData('ordre', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                            min="1"
                                        />
                                        {niveauForm.errors.ordre && (
                                            <div className="text-red-500 text-sm mt-1">{niveauForm.errors.ordre}</div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nom du Semestre</label>
                                        <input
                                            type="text"
                                            value={semestreForm.data.nom_semestre}
                                            onChange={(e) => semestreForm.setData('nom_semestre', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                        />
                                        {semestreForm.errors.nom_semestre && (
                                            <div className="text-red-500 text-sm mt-1">{semestreForm.errors.nom_semestre}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Code du Semestre</label>
                                        <input
                                            type="text"
                                            value={semestreForm.data.code_semestre}
                                            onChange={(e) => semestreForm.setData('code_semestre', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 font-mono"
                                            required
                                        />
                                        {semestreForm.errors.code_semestre && (
                                            <div className="text-red-500 text-sm mt-1">{semestreForm.errors.code_semestre}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Ordre</label>
                                        <input
                                            type="number"
                                            value={semestreForm.data.ordre}
                                            onChange={(e) => semestreForm.setData('ordre', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                            min="1"
                                        />
                                        {semestreForm.errors.ordre && (
                                            <div className="text-red-500 text-sm mt-1">{semestreForm.errors.ordre}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Niveau</label>
                                        <input
                                            type="text"
                                            value={selectedNiveau?.nom_niveau || ''}
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
                                    disabled={entityType === 'niveau' ? niveauForm.processing : semestreForm.processing}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
                                >
                                    {entityType === 'niveau' 
                                        ? (niveauForm.processing ? 'Enregistrement...' : modalType === 'add' ? 'Ajouter' : 'Sauvegarder')
                                        : (semestreForm.processing ? 'Enregistrement...' : modalType === 'add' ? 'Ajouter' : 'Sauvegarder')
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