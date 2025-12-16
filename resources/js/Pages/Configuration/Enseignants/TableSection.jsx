import React from 'react';
import { Edit, Trash2, User, ChevronLeft, ChevronRight } from 'lucide-react';

const TableSection = ({ 
    paginatedEnseignants, 
    selectedEnseignants, 
    toggleSelectEnseignant, 
    toggleSelectAll, 
    handleEditClick, 
    handleDelete,
    filteredEnseignants,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    setCurrentPage,
    totalPages
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                        <tr>
                            <th className="px-6 py-3 text-left w-12">
                                <input
                                    type="checkbox"
                                    checked={paginatedEnseignants.length > 0 && selectedEnseignants.length === paginatedEnseignants.length}
                                    onChange={toggleSelectAll}
                                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Enseignant</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Grade & Département</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Compte</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {paginatedEnseignants.length > 0 ? (
                            paginatedEnseignants.map((enseignant) => (
                                <tr key={enseignant.id_enseignant} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedEnseignants.includes(enseignant.id_enseignant)}
                                            onChange={() => toggleSelectEnseignant(enseignant.id_enseignant)}
                                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {enseignant.nom} {enseignant.prenom}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                            Matricule: {enseignant.matricule}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 dark:text-gray-100">
                                            {enseignant.email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 dark:text-gray-100">
                                            {enseignant.grade && (
                                                <div className="font-medium">{enseignant.grade}</div>
                                            )}
                                            {enseignant.departement && (
                                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                                    {enseignant.departement}
                                                </div>
                                            )}
                                            {!enseignant.grade && !enseignant.departement && (
                                                <span className="text-gray-400 dark:text-gray-500 text-xs">Non spécifié</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {enseignant.user ? (
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-green-500" />
                                                <span className="text-sm text-green-600 dark:text-green-400">
                                                    {enseignant.user.name}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 dark:text-gray-500">Aucun compte</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEditClick(enseignant)}
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1"
                                                title="Modifier"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(enseignant.id_enseignant)}
                                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                    <User className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                    <p>Aucun enseignant trouvé</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {itemsPerPage >= filteredEnseignants.length ? (
                            `Affichage de tous les ${filteredEnseignants.length} enseignants`
                        ) : (
                            `Affichage ${((currentPage - 1) * itemsPerPage) + 1} à ${Math.min(currentPage * itemsPerPage, filteredEnseignants.length)} sur ${filteredEnseignants.length} enseignants`
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Afficher:</span>
                        <div className="flex gap-2">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(parseInt(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <button
                                onClick={() => {
                                    setItemsPerPage(filteredEnseignants.length);
                                    setCurrentPage(1);
                                }}
                                className={`px-3 py-1 border rounded-lg text-sm transition ${
                                    itemsPerPage >= filteredEnseignants.length
                                        ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500'
                                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                Tout
                            </button>
                        </div>
                    </div>
                </div>

                {itemsPerPage < filteredEnseignants.length && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-400 min-w-fit">
                            Page {currentPage} sur {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TableSection;