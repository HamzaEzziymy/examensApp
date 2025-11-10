import React, { useState, useRef } from 'react';
import { usePage, useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Pencil, Trash2 } from 'lucide-react';

export default function Display({ filieres, anneesUniv }) {
    const [modalOpen, setModalOpen] = useState(false);
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
        id_filiere: null,
        nom_filiere: '',
        code_filiere: '',
        id_annee: '',
    });

    const openEditModal = (filiere) => {
        setData({
            id_filiere: filiere.id_filiere,
            nom_filiere: filiere.nom_filiere,
            code_filiere: filiere.code_filiere,
            id_annee: filiere.id_annee || '',
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setData({
            id_filiere: null,
            nom_filiere: '',
            code_filiere: '',
            id_annee: '',
        });
    };

    const handleDelete = (id_filiere) => {
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
                destroy(route('academique.filieres.destroy', id_filiere), {
                    onSuccess: () => {
                        Swal.fire('Supprimé !', 'La filière a été supprimée.', 'success');
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
        put(route('academique.filieres.update', data.id_filiere), {
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

    const getAnneeLabel = (id_annee) => {
        const annee = anneesUniv.find(a => a.id_annee === id_annee);
        return annee ? annee.annee_univ : 'N/A';
    };

    return (
        <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-6 rounded-md">
            <div className="border-b border-gray-300 dark:border-gray-700 pb-4 mb-6">
                <h2 className="text-2xl font-semibold flex items-center">
                    Filières
                </h2>
            </div>

            <div className="overflow-x-auto rounded shadow border dark:border-gray-700">
                <table className="min-w-full table-auto">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-2 text-left">Nom de la Filière</th>
                            <th className="px-4 py-2 text-left">Code</th>
                            <th className="px-4 py-2 text-left">Année Universitaire</th>
                            <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filieres.map((filiere, index) => (
                            <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-2">{filiere.nom_filiere}</td>
                                <td className="px-4 py-2">{filiere.code_filiere || 'N/A'}</td>
                                <td className="px-4 py-2">{getAnneeLabel(filiere.id_annee)}</td>
                                <td className="flex px-4 py-2 space-x-2">
                                    <button
                                        className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
                                        onClick={() => openEditModal(filiere)}
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                                        onClick={() => handleDelete(filiere.id_filiere)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Modifier Filière</h2>
                        <form onSubmit={handleUpdate} className="space-y-4" ref={formRef}>
                            <div>
                                <label className="block text-sm">Nom de la Filière</label>
                                <input
                                    type="text"
                                    value={data.nom_filiere}
                                    onChange={(e) => setData('nom_filiere', e.target.value)}
                                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                                {errors.nom_filiere && <div className="text-red-500 text-sm">{errors.nom_filiere}</div>}
                            </div>
                            <div>
                                <label className="block text-sm">Code Filière</label>
                                <input
                                    value={data.code_filiere}
                                    onChange={(e) => setData('code_filiere', e.target.value)}
                                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                                {errors.code_filiere && <div className="text-red-500 text-sm">{errors.code_filiere}</div>}
                            </div>
                            <div>
                                <label className="block text-sm">Année Universitaire</label>
                                <select
                                    value={data.id_annee}
                                    onChange={(e) => setData('id_annee', e.target.value)}
                                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">Sélectionner une année</option>
                                    {anneesUniv.map((annee) => (
                                        <option key={annee.id_annee} value={annee.id_annee}>
                                            {annee.annee_univ}
                                        </option>
                                    ))}
                                </select>
                                {errors.id_annee && <div className="text-red-500 text-sm">{errors.id_annee}</div>}
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
                                >
                                    Sauvegarder
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}