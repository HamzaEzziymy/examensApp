import React from 'react';
import { Edit, Trash2, Building, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

const SortIcon = ({ col, sortKey, sortDir }) => (
    <span className="inline-flex flex-col ml-1 align-middle leading-none">
        <span className={`text-[10px] ${sortKey === col && sortDir === 'asc' ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`}>▲</span>
        <span className={`text-[10px] ${sortKey === col && sortDir === 'desc' ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`}>▼</span>
    </span>
);

const TableSection = ({ 
    paginatedSalles, 
    selectedSalles, 
    toggleSelectSalle, 
    toggleSelectAll, 
    handleEditClick, 
    handleDelete,
    filteredSalles,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    setCurrentPage,
    totalPages,
    sortKey,
    sortDir,
    onSort,
}) => {
    const thClass = "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors";
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                        <tr>
                            <th className="px-6 py-3 text-left w-12">
                                <input
                                    type="checkbox"
                                    checked={paginatedSalles.length > 0 && selectedSalles.length === paginatedSalles.length}
                                    onChange={toggleSelectAll}
                                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                                />
                            </th>
                            <th className={thClass} onClick={() => onSort('nom_salle')}>
                                Salle <SortIcon col="nom_salle" sortKey={sortKey} sortDir={sortDir} />
                            </th>
                            <th className={thClass} onClick={() => onSort('batiment')}>
                                Bâtiment <SortIcon col="batiment" sortKey={sortKey} sortDir={sortDir} />
                            </th>
                            <th className={thClass} onClick={() => onSort('capacite')}>
                                Capacité <SortIcon col="capacite" sortKey={sortKey} sortDir={sortDir} />
                            </th>
                            <th className={thClass} onClick={() => onSort('est_disponible')}>
                                Statut <SortIcon col="est_disponible" sortKey={sortKey} sortDir={sortDir} />
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {paginatedSalles.length > 0 ? (
                            paginatedSalles.map((salle) => (
                                <tr key={salle.id_salle} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedSalles.includes(salle.id_salle)}
                                            onChange={() => toggleSelectSalle(salle.id_salle)}
                                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {salle.nom_salle}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                            Code: {salle.code_salle}
                                        </div>
                                        {salle.specificites && (
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                {salle.specificites}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 dark:text-gray-100">
                                            {salle.batiment || 'Non spécifié'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 dark:text-gray-100">
                                            <div className="font-medium">{salle.capacite} places</div>
                                            {salle.capacite_examens && (
                                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                                    Examens: {salle.capacite_examens}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            salle.est_disponible 
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                        }`}>
                                            {salle.est_disponible ? (
                                                <>
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Disponible
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-3 h-3 mr-1" />
                                                    Non disponible
                                                </>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEditClick(salle)}
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1"
                                                title="Modifier"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(salle.id_salle)}
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
                                    <Building className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                    <p>Aucune salle trouvée</p>
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
                        {itemsPerPage >= filteredSalles.length ? (
                            `Affichage de toutes les ${filteredSalles.length} salles`
                        ) : (
                            `Affichage ${((currentPage - 1) * itemsPerPage) + 1} à ${Math.min(currentPage * itemsPerPage, filteredSalles.length)} sur ${filteredSalles.length} salles`
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
                                    setItemsPerPage(filteredSalles.length);
                                    setCurrentPage(1);
                                }}
                                className={`px-3 py-1 border rounded-lg text-sm transition ${
                                    itemsPerPage >= filteredSalles.length
                                        ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500'
                                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                Tout
                            </button>
                        </div>
                    </div>
                </div>

                {itemsPerPage < filteredSalles.length && totalPages > 1 && (
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
