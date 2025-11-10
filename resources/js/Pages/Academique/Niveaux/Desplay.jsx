import React, { useState, useRef } from 'react';
import { usePage, useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function Display({ niveaux, filieres }) {
    console.log(filieres);
    const [modalOpen, setModalOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState({});
    const formRef = useRef();

    const {
        setData,
        data,
        post,
        put,
        delete: destroy,
        errors,
        processing,
        recentlySuccessful
    } = useForm({
        id_niveau: null,
        code_niveau: '',
        nom_niveau: '',
        id_filiere: '',
        semestre: '',
        credits_requis: '',
    });

    const toggleRow = (id_niveau) => {
        setExpandedRows(prev => ({
            ...prev,
            [id_niveau]: !prev[id_niveau]
        }));
    };

    const openEditModal = (niveau) => {
        setData({
            id_niveau: niveau.id_niveau,
            code_niveau: niveau.code_niveau,
            nom_niveau: niveau.nom_niveau,
            id_filiere: niveau.id_filiere || '',
            semestre: niveau.semestre,
            credits_requis: niveau.credits_requis,
        });
        setModalOpen(true);
        console.log(niveau);
    };

    const closeModal = () => {
        setModalOpen(false);
        setData({
            id_niveau: null,
            code_niveau: '',
            nom_niveau: '',
            id_filiere: '',
            semestre: '',
            credits_requis: '',
        });
    };

    const handleDelete = (id_niveau) => {
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
                destroy(route('academique.niveaux.destroy', id_niveau), {
                    onSuccess: () => {
                        Swal.fire('Supprimé !', 'Le niveau a été supprimé.', 'success');
                    },
                    onError: () => {
                        Swal.fire('Erreur', 'Une erreur est survenue.', 'error');
                    }
                });
            }
        });
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        put(route('academique.niveaux.update', data.id_niveau), {
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
                Swal.fire({
                    icon: "success",
                    title: "Modifié avec succès",
                    showConfirmButton: false,
                    timer: 1500
                });
            }
        });
    };

    return (
        <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-6 rounded-md">
            <div className="border-b border-gray-300 dark:border-gray-700 pb-4 mb-6">
                <h2 className="text-2xl font-semibold flex items-center">
                    Niveaux
                </h2>
            </div>

            <div className="overflow-x-auto rounded shadow border dark:border-gray-700">
                <table className="min-w-full table-auto">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-2 text-left w-12"></th>
                            <th className="px-4 py-2 text-left">Code</th>
                            <th className="px-4 py-2 text-left">Nom du Niveau</th>
                            <th className="px-4 py-2 text-left">Filière</th>
                            <th className="px-4 py-2 text-left">Semestre</th>
                            <th className="px-4 py-2 text-left">Crédits Requis</th>
                            <th className="px-4 py-2 text-left">Modules</th>
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
                                        >
                                            {expandedRows[niveau.id_niveau] ? (
                                                <ChevronUp size={20} />
                                            ) : (
                                                <ChevronDown size={20} />
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-4 py-2 font-medium">{niveau.code_niveau}</td>
                                    <td className="px-4 py-2">{niveau.nom_niveau}</td>
                                    <td className="px-4 py-2">{niveau.filiere?.nom_filiere || 'N/A'}</td>
                                    <td className="px-4 py-2">{niveau.semestre}</td>
                                    <td className="px-4 py-2">{niveau.credits_requis}</td>
                                    <td className="px-4 py-2">
                                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm">
                                            {niveau.modules_count || 0}
                                        </span>
                                    </td>
                                    <td className="flex px-4 py-2 space-x-2">
                                        <button
                                            className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
                                            onClick={() => openEditModal(niveau)}
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                                            onClick={() => handleDelete(niveau.id_niveau)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                                
                                {expandedRows[niveau.id_niveau] && (
                                    <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                        <td colSpan="9" className="px-4 py-4">
                                            <div className="ml-8">
                                                <h3 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-400">
                                                    Semestres
                                                </h3>
                                                {niveau.semestres && niveau.semestres.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {niveau.semestres.map((semestre) => (
                                                            <div 
                                                                key={semestre.id_semestre}
                                                                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                                                            >
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                                                                        {semestre.nom_semestre} ({semestre.code_semestre})
                                                                    </h4>
                                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                        {semestre.modules?.length || 0} modules
                                                                    </span>
                                                                </div>
                                                                
                                                                {semestre.modules && semestre.modules.length > 0 && (
                                                                    <div className="mt-3">
                                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Modules:</p>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                            {semestre.modules.map((module, idx) => (
                                                                                <div 
                                                                                    key={idx}
                                                                                    className="text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 px-3 py-2 rounded"
                                                                                >
                                                                                    <span className="font-medium">{module.code_module}</span>
                                                                                    {module.nom_module && ` - ${module.nom_module}`}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
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

            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Modifier Niveau</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm">Code Niveau</label>
                                <input
                                    type="text"
                                    value={data.code_niveau}
                                    onChange={(e) => setData('code_niveau', e.target.value)}
                                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                                {errors.code_niveau && <div className="text-red-500 text-sm">{errors.code_niveau}</div>}
                            </div>
                            <div>
                                <label className="block text-sm">Nom du Niveau</label>
                                <input
                                    type="text"
                                    value={data.nom_niveau}
                                    onChange={(e) => setData('nom_niveau', e.target.value)}
                                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                                {errors.nom_niveau && <div className="text-red-500 text-sm">{errors.nom_niveau}</div>}
                            </div>
                            <div>
                                <label className="block text-sm">Filière</label>
                                <select
                                    value={data.id_filiere}
                                    onChange={(e) => setData('id_filiere', e.target.value)}
                                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">Sélectionner une filière</option>
                                    {filieres.map((filiere) => (
                                        <option key={filiere.id_filiere} value={filiere.id_filiere}>
                                            {filiere.nom_filiere}
                                        </option>
                                    ))}
                                </select>
                                {errors.id_filiere && <div className="text-red-500 text-sm">{errors.id_filiere}</div>}
                            </div>
                            <div>
                                <label className="block text-sm">Semestre</label>
                                <input
                                    type="number"
                                    value={data.semestre}
                                    onChange={(e) => setData('semestre', e.target.value)}
                                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="e.g., 1 pour L1, 2 pour L2"
                                />
                                {errors.semestre && <div className="text-red-500 text-sm">{errors.semestre}</div>}
                            </div>
                            <div>
                                <label className="block text-sm">Crédits Requis</label>
                                <input
                                    type="number"
                                    value={data.credits_requis}
                                    onChange={(e) => setData('credits_requis', e.target.value)}
                                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                                {errors.credits_requis && <div className="text-red-500 text-sm">{errors.credits_requis}</div>}
                            </div>
                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUpdate}
                                    disabled={processing}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
                                >
                                    Sauvegarder
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}