import React, { useState, useRef } from 'react';
import { usePage, useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Pencil, Trash2 } from 'lucide-react';


export default function Desplay({ anneesUniv }) {

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
        id_annee: null,
        annee_univ: '',
        date_debut: '',
        date_cloture: '',
        est_active: false,
    });

    const openEditModal = (annee) => {
        setData({
            id_annee: annee.id_annee,
            annee_univ: annee.annee_univ,
            date_debut: annee.date_debut,
            date_cloture: annee.date_cloture,
            est_active: annee.est_active,
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setData({
            id_annee: null,
            annee_univ: '',
            date_debut: '',
            date_cloture: '',
            est_active: false,
        });
    };

    const handleDelete = (id_annee) => {
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
                destroy(route('academique.annees-universitaires.destroy', id_annee), {
                    onSuccess: () => {
                        Swal.fire('Supprimé !', 'L\'année universitaire a été supprimée.', 'success');
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
        put(route('academique.annees-universitaires.update', data.id_annee), {
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
                Swal.fire({
                    icon: "success",
                    title: "modifier avec succès",
                    showConfirmButton: false,
                    timer: 1500
                });
            }
        });
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-6 rounded-md">
            <div className="border-b border-gray-300 dark:border-gray-700 pb-4 mb-6">
                    <h2 className="text-2xl font-semibold flex items-center">
                      Années Universitaires
                    </h2>
                  </div>

            <div className="overflow-x-auto rounded shadow border dark:border-gray-700">
                <table className="min-w-full table-auto">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-2 text-left">Année</th>
                            <th className="px-4 py-2 text-left">Début</th>
                            <th className="px-4 py-2 text-left">Fin</th>
                            <th className="px-4 py-2 text-left">Active</th>
                            <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {anneesUniv.map((annee, index) => (
                            <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-2">{annee.annee_univ}</td>
                                <td className="px-4 py-2">{annee.date_debut}</td>
                                <td className="px-4 py-2">{annee.date_cloture}</td>
                                <td className="px-4 py-2">
                                    {annee.est_active ? (
                                        <span className="text-green-500 font-semibold">Oui</span>
                                    ) : (
                                        <span className="text-gray-500">Non</span>
                                    )}
                                </td>
                                <td className="flex px-4 py-2 space-x-2">
                                    <button
                                        className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
                                        onClick={() => openEditModal(annee)}
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                                        onClick={() => handleDelete(annee.id_annee)}
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
                        <h2 className="text-xl font-bold mb-4">Modifier Année Universitaire</h2>
                        <form onSubmit={handleUpdate} className="space-y-4" ref={formRef}>
                            <div>
                                <label className="block text-sm">Année</label>
                                <input
                                    type="text"
                                    value={data.annee_univ}
                                    onChange={(e) => setData('annee_univ', e.target.value)}
                                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                                {errors.annee_univ && <div className="text-red-500 text-sm">{errors.annee_univ}</div>}
                            </div>
                            <div>
                                <label className="block text-sm">Date de Début</label>
                                <input
                                    type="date"
                                    value={data.date_debut}
                                    onChange={(e) => setData('date_debut', e.target.value)}
                                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                                {errors.date_debut && <div className="text-red-500 text-sm">{errors.date_debut}</div>}
                            </div>
                            <div>
                                <label className="block text-sm">Date de Fin</label>
                                <input
                                    type="date"
                                    value={data.date_cloture}
                                    onChange={(e) => setData('date_cloture', e.target.value)}
                                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                                {errors.date_cloture && <div className="text-red-500 text-sm">{errors.date_cloture}</div>}
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={data.est_active}
                                    onChange={(e) => setData('est_active', e.target.checked)}
                                    className="mr-2"
                                    id="est_active"
                                />
                                <label htmlFor="est_active">Activer cette année</label>
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