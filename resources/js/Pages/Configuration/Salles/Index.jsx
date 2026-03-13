import React, { useState, useMemo, useEffect } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Search, Plus, Edit, Trash2, X, Building, Users, CheckCircle, XCircle, Filter, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Swal from 'sweetalert2';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

const SallesIndex = ({ salles: initialSalles = [] }) => {
  const [salles, setSalles] = useState(initialSalles);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSalle, setEditingSalle] = useState(null);
  const [selectedSalles, setSelectedSalles] = useState([]);
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Sync local state with props when data changes
  useEffect(() => {
    setSalles(initialSalles);
  }, [initialSalles]);

  // Form for adding new salle
  const addForm = useForm({
    code_salle: '',
    nom_salle: '',
    capacite: '',
    capacite_examens: '',
    batiment: '',
    est_disponible: true,
    specificites: '',
  });

  // Form for editing salle
  const editForm = useForm({
    code_salle: '',
    nom_salle: '',
    capacite: '',
    capacite_examens: '',
    batiment: '',
    est_disponible: true,
    specificites: '',
  });

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Filter and search salles
  const filteredSalles = useMemo(() => {
    let filtered = [...salles];
    
    // Apply search term
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(salle => 
        (salle.code_salle && salle.code_salle.toLowerCase().includes(searchLower)) ||
        (salle.nom_salle && salle.nom_salle.toLowerCase().includes(searchLower)) ||
        (salle.batiment && salle.batiment.toLowerCase().includes(searchLower))
      );
    }

    // Apply availability filter
    if (availabilityFilter !== 'all') {
      const isAvailable = availabilityFilter === 'available';
      filtered = filtered.filter(salle => {
        // Handle different data types (boolean, string, number)
        const disponible = salle.est_disponible;
        const isDisponible = disponible === true || disponible === 1 || disponible === '1' || disponible === 'true';
        return isAvailable ? isDisponible : !isDisponible;
      });
    }

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        // Handle null/undefined values
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';

        // Handle numeric comparison for specific fields
        if (sortField === 'capacite' || sortField === 'capacite_examens') {
          aVal = parseInt(aVal) || 0;
          bVal = parseInt(bVal) || 0;
        }
        // Handle code field - try to extract numeric part for natural sorting
        else if (sortField === 'code_salle') {
          const aNum = parseInt(aVal.toString().replace(/\D/g, '')) || 0;
          const bNum = parseInt(bVal.toString().replace(/\D/g, '')) || 0;
          
          // If both have numeric parts, compare numerically
          if (aNum !== 0 || bNum !== 0) {
            if (aNum !== bNum) {
              return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
            }
          }
          // Otherwise fall through to string comparison
          aVal = aVal.toString().toLowerCase();
          bVal = bVal.toString().toLowerCase();
        }
        // Handle boolean comparison for status
        else if (sortField === 'est_disponible') {
          aVal = aVal ? 1 : 0;
          bVal = bVal ? 1 : 0;
        }
        // String comparison for other fields
        else {
          if (typeof aVal === 'string') aVal = aVal.toLowerCase();
          if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [salles, searchTerm, availabilityFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredSalles.length / itemsPerPage);
  const paginatedSalles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSalles.slice(start, start + itemsPerPage);
  }, [filteredSalles, currentPage, itemsPerPage]);

  // Handle add salle
  const handleAddSubmit = (e) => {
    e.preventDefault();
    addForm.post(route('configuration.salles.store'), {
      onSuccess: () => {
        setShowAddModal(false);
        addForm.reset();
        router.reload({ only: ['salles'] });
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Salle créée avec succès',
          showConfirmButton: false,
          timer: 1500
        });
      },
      onError: (errors) => {
        let errorMessage = 'Veuillez corriger les erreurs dans le formulaire';
        
        if (errors.error) {
          errorMessage = errors.error;
        } else if (Object.keys(errors).length > 0) {
          errorMessage = Object.values(errors).flat().join(', ');
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage
        });
      }
    });
  };

  // Handle edit salle
  const handleEditClick = (salle) => {
    setEditingSalle(salle);
    editForm.setData({
      code_salle: salle.code_salle,
      nom_salle: salle.nom_salle,
      capacite: salle.capacite,
      capacite_examens: salle.capacite_examens || '',
      batiment: salle.batiment || '',
      est_disponible: salle.est_disponible,
      specificites: salle.specificites || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    editForm.put(route('configuration.salles.update', editingSalle.id_salle), {
      onSuccess: () => {
        setShowEditModal(false);
        setEditingSalle(null);
        router.reload({ only: ['salles'] });
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Salle mise à jour avec succès',
          showConfirmButton: false,
          timer: 1500
        });
      },
      onError: (errors) => {
        console.log('Edit errors:', errors);
        let errorMessage = 'Erreur lors de la mise à jour';
        
        if (errors.error) {
          errorMessage = errors.error;
        } else if (Object.keys(errors).length > 0) {
          errorMessage = Object.values(errors).flat().join(', ');
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage
        });
      }
    });
  };

  // Handle delete salle
  const handleDelete = (id) => {
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
        router.delete(route('configuration.salles.destroy', id), {
          onSuccess: () => {
            router.reload({ only: ['salles'] });
            Swal.fire(
              'Supprimé !',
              'La salle a été supprimée.',
              'success'
            );
          },
          onError: (errors) => {
            Swal.fire(
              'Erreur !',
              errors.error || 'Erreur lors de la suppression.',
              'error'
            );
          }
        });
      }
    });
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedSalles.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Attention',
        text: 'Veuillez sélectionner au moins une salle à supprimer.'
      });
      return;
    }

    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: `Vous allez supprimer ${selectedSalles.length} salle(s). Cette action est irréversible !`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        router.post(route('configuration.salles.bulk-destroy'), {
          ids: selectedSalles
        }, {
          onSuccess: () => {
            setSelectedSalles([]);
            router.reload({ only: ['salles'] });
            Swal.fire(
              'Supprimé !',
              'Les salles sélectionnées ont été supprimées.',
              'success'
            );
          },
          onError: (errors) => {
            Swal.fire(
              'Erreur !',
              errors.error || 'Erreur lors de la suppression.',
              'error'
            );
          }
        });
      }
    });
  };

  // Select/deselect salles
  const toggleSelectSalle = (id) => {
    setSelectedSalles(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSalles.length === paginatedSalles.length) {
      setSelectedSalles([]);
    } else {
      setSelectedSalles(paginatedSalles.map(s => s.id_salle));
    }
  };

  // Helper function to render sort icon
  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-40" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1" /> 
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Stats calculations
  const stats = useMemo(() => {
    const total = salles.length;
    const available = salles.filter(s => s.est_disponible).length;
    const unavailable = total - available;
    const totalCapacity = salles.reduce((sum, s) => sum + (parseInt(s.capacite) || 0), 0);
    const totalExamCapacity = salles.reduce((sum, s) => sum + (parseInt(s.capacite_examens) || 0), 0);
    
    return { total, available, unavailable, totalCapacity, totalExamCapacity };
  }, [salles]);

  return (
    <AuthenticatedLayout
      header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Gestion des Salles</h2>}
    >
      <Head title="Salles" />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="p-4">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 transition-colors">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <Building className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Salles</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Gérer les salles de cours et d'examens</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {selectedSalles.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Supprimer ({selectedSalles.length})</span>
                  </button>
                )}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Ajouter</span>
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher par code, nom ou bâtiment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>
              
              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                  <select
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    className="pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="all">Toutes les salles</option>
                    <option value="available">Disponibles</option>
                    <option value="unavailable">Non disponibles</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Salles</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                </div>
                <Building className="w-10 h-10 text-blue-500 dark:text-blue-400 opacity-50" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Disponibles</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.available}</div>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500 dark:text-green-400 opacity-50" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Non disponibles</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.unavailable}</div>
                </div>
                <XCircle className="w-10 h-10 text-red-500 dark:text-red-400 opacity-50" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Capacité Totale</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalCapacity}</div>
                </div>
                <Users className="w-10 h-10 text-purple-500 dark:text-purple-400 opacity-50" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Capacité Examens</div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.totalExamCapacity}</div>
                </div>
                <Users className="w-10 h-10 text-orange-500 dark:text-orange-400 opacity-50" />
              </div>
            </div>
          </div>

          {/* Table */}
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
                    <th 
                      onClick={() => handleSort('code_salle')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors"
                    >
                      <div className="flex items-center">
                        Code
                        {renderSortIcon('code_salle')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('nom_salle')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors"
                    >
                      <div className="flex items-center">
                        Nom
                        {renderSortIcon('nom_salle')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('batiment')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors"
                    >
                      <div className="flex items-center">
                        Bâtiment
                        {renderSortIcon('batiment')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('capacite')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors"
                    >
                      <div className="flex items-center">
                        Capacité
                        {renderSortIcon('capacite')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('est_disponible')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors"
                    >
                      <div className="flex items-center">
                        Statut
                        {renderSortIcon('est_disponible')}
                      </div>
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
                            {salle.code_salle}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {salle.nom_salle}
                          </div>
                          {salle.specificites && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
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
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span>{salle.capacite}</span>
                            </div>
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
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
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
                      className="px-8 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(parseInt(e.target.value));
                        setCurrentPage(1);
                      }}
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
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ajouter une Salle</h2>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    addForm.reset();
                  }} 
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddSubmit} className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Code Salle *
                      </label>
                      <input
                        type="text"
                        value={addForm.data.code_salle}
                        onChange={(e) => addForm.setData('code_salle', e.target.value)}
                        required
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                          addForm.errors.code_salle ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Ex: A101"
                      />
                      {addForm.errors.code_salle && (
                        <p className="mt-1 text-sm text-red-600">{addForm.errors.code_salle}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nom de la Salle *
                      </label>
                      <input
                        type="text"
                        value={addForm.data.nom_salle}
                        onChange={(e) => addForm.setData('nom_salle', e.target.value)}
                        required
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                          addForm.errors.nom_salle ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Ex: Salle de cours A101"
                      />
                      {addForm.errors.nom_salle && (
                        <p className="mt-1 text-sm text-red-600">{addForm.errors.nom_salle}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Capacité *
                      </label>
                      <input
                        type="number"
                        value={addForm.data.capacite}
                        onChange={(e) => addForm.setData('capacite', e.target.value)}
                        required
                        min="1"
                        max="1000"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                          addForm.errors.capacite ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="50"
                      />
                      {addForm.errors.capacite && (
                        <p className="mt-1 text-sm text-red-600">{addForm.errors.capacite}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Capacité Examens
                      </label>
                      <input
                        type="number"
                        value={addForm.data.capacite_examens}
                        onChange={(e) => addForm.setData('capacite_examens', e.target.value)}
                        min="1"
                        max="1000"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="30"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bâtiment
                      </label>
                      <input
                        type="text"
                        value={addForm.data.batiment}
                        onChange={(e) => addForm.setData('batiment', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Ex: Bâtiment A"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Spécificités
                    </label>
                    <textarea
                      value={addForm.data.specificites}
                      onChange={(e) => addForm.setData('specificites', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Ex: Équipée d'un projecteur, climatisée..."
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="est_disponible_add"
                      checked={addForm.data.est_disponible}
                      onChange={(e) => addForm.setData('est_disponible', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <label htmlFor="est_disponible_add" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Salle disponible
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      addForm.reset();
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={addForm.processing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
                  >
                    {addForm.processing ? 'Création...' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingSalle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Modifier la Salle</h2>
                <button 
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSalle(null);
                    editForm.reset();
                  }} 
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Code Salle *
                      </label>
                      <input
                        type="text"
                        value={editForm.data.code_salle}
                        onChange={(e) => editForm.setData('code_salle', e.target.value)}
                        required
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                          editForm.errors.code_salle ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {editForm.errors.code_salle && (
                        <p className="mt-1 text-sm text-red-600">{editForm.errors.code_salle}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nom de la Salle *
                      </label>
                      <input
                        type="text"
                        value={editForm.data.nom_salle}
                        onChange={(e) => editForm.setData('nom_salle', e.target.value)}
                        required
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                          editForm.errors.nom_salle ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {editForm.errors.nom_salle && (
                        <p className="mt-1 text-sm text-red-600">{editForm.errors.nom_salle}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Capacité *
                      </label>
                      <input
                        type="number"
                        value={editForm.data.capacite}
                        onChange={(e) => editForm.setData('capacite', e.target.value)}
                        required
                        min="1"
                        max="1000"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                          editForm.errors.capacite ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {editForm.errors.capacite && (
                        <p className="mt-1 text-sm text-red-600">{editForm.errors.capacite}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Capacité Examens
                      </label>
                      <input
                        type="number"
                        value={editForm.data.capacite_examens}
                        onChange={(e) => editForm.setData('capacite_examens', e.target.value)}
                        min="1"
                        max="1000"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bâtiment
                      </label>
                      <input
                        type="text"
                        value={editForm.data.batiment}
                        onChange={(e) => editForm.setData('batiment', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Spécificités
                    </label>
                    <textarea
                      value={editForm.data.specificites}
                      onChange={(e) => editForm.setData('specificites', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="est_disponible_edit"
                      checked={editForm.data.est_disponible}
                      onChange={(e) => editForm.setData('est_disponible', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <label htmlFor="est_disponible_edit" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Salle disponible
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingSalle(null);
                      editForm.reset();
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={editForm.processing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
                  >
                    {editForm.processing ? 'Mise à jour...' : 'Mettre à jour'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default SallesIndex;