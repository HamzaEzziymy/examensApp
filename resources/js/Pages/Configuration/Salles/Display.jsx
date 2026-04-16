import React, { useState, useMemo } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Search, Plus, Trash2, X, Building, CheckCircle, XCircle, Upload, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import TableSection from './TableSection';

function Display({ salles = [] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDisponible, setFilterDisponible] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingSalle, setEditingSalle] = useState(null);
    const [selectedSalles, setSelectedSalles] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState([]);
    const [importErrors, setImportErrors] = useState([]);
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
        setCurrentPage(1);
    };

    const addForm = useForm({
        code_salle: '',
        nom_salle: '',
        capacite: '',
        capacite_examens: '',
        batiment: '',
        est_disponible: true,
        specificites: '',
    });

    const editForm = useForm({
        code_salle: '',
        nom_salle: '',
        capacite: '',
        capacite_examens: '',
        batiment: '',
        est_disponible: true,
        specificites: '',
    });

    const filteredSalles = useMemo(() => {
        let filtered = salles;
        if (searchTerm) {
            filtered = filtered.filter(s =>
                s.nom_salle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.code_salle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.batiment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.specificites?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (filterDisponible !== 'all') {
            filtered = filtered.filter(s => s.est_disponible === (filterDisponible === 'true'));
        }
        if (sortKey) {
            filtered = [...filtered].sort((a, b) => {
                const aVal = a[sortKey] ?? '';
                const bVal = b[sortKey] ?? '';
                const cmp = typeof aVal === 'number'
                    ? aVal - bVal
                    : String(aVal).localeCompare(String(bVal));
                return sortDir === 'asc' ? cmp : -cmp;
            });
        }
        return filtered;
    }, [salles, searchTerm, filterDisponible, sortKey, sortDir]);

    const totalPages = Math.ceil(filteredSalles.length / itemsPerPage);
    const paginatedSalles = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredSalles.slice(start, start + itemsPerPage);
    }, [filteredSalles, currentPage, itemsPerPage]);

    const stats = useMemo(() => ({
        total: salles.length,
        disponibles: salles.filter(s => s.est_disponible).length,
        indisponibles: salles.filter(s => !s.est_disponible).length,
        totalCapacite: salles.reduce((sum, s) => sum + (s.capacite || 0), 0),
    }), [salles]);

    // --- Add ---
    const handleAddSubmit = (e) => {
        e.preventDefault();
        addForm.post(route('configuration.salles.store'), {
            onSuccess: () => {
                setShowAddModal(false);
                addForm.reset();
                router.reload({ only: ['salles'] });
                Swal.fire({ icon: 'success', title: 'Succès', text: 'Salle créée avec succès', showConfirmButton: false, timer: 1500 });
            },
            onError: (errors) => {
                Swal.fire({ icon: 'error', title: 'Erreur', text: errors.error || Object.values(errors).flat().join(', ') });
            }
        });
    };

    // --- Edit ---
    const handleEditClick = (salle) => {
        setEditingSalle(salle);
        editForm.setData({
            code_salle: salle.code_salle || '',
            nom_salle: salle.nom_salle || '',
            capacite: salle.capacite || '',
            capacite_examens: salle.capacite_examens || '',
            batiment: salle.batiment || '',
            est_disponible: salle.est_disponible ?? true,
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
                Swal.fire({ icon: 'success', title: 'Succès', text: 'Salle mise à jour avec succès', showConfirmButton: false, timer: 1500 });
            },
            onError: (errors) => {
                Swal.fire({ icon: 'error', title: 'Erreur', text: errors.error || Object.values(errors).flat().join(', ') });
            }
        });
    };

    // --- Delete ---
    const handleDelete = (id) => {
        Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: 'Cette action est irréversible !',
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
                        Swal.fire({ icon: 'success', title: 'Supprimé !', text: 'Salle supprimée avec succès.', showConfirmButton: false, timer: 1500 });
                    },
                    onError: (errors) => {
                        Swal.fire({ icon: 'error', title: 'Erreur', text: errors.error || 'Erreur lors de la suppression.' });
                    }
                });
            }
        });
    };

    // --- Bulk Delete ---
    const handleBulkDelete = () => {
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
                router.post(route('configuration.salles.bulk-destroy'), { ids: selectedSalles }, {
                    onSuccess: () => {
                        setSelectedSalles([]);
                        router.reload({ only: ['salles'] });
                        Swal.fire({ icon: 'success', title: 'Supprimé !', text: 'Les salles sélectionnées ont été supprimées.', showConfirmButton: false, timer: 1500 });
                    },
                    onError: (errors) => {
                        Swal.fire({ icon: 'error', title: 'Erreur', text: errors.error || 'Erreur lors de la suppression.' });
                    }
                });
            }
        });
    };

    // --- Select ---
    const toggleSelectSalle = (id) => {
        setSelectedSalles(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedSalles.length === paginatedSalles.length) {
            setSelectedSalles([]);
        } else {
            setSelectedSalles(paginatedSalles.map(s => s.id_salle));
        }
    };

    // --- Excel Import ---
    const downloadTemplate = () => {
        const template = [
            { 'Code Salle': 'A101', 'Nom Salle': 'Amphi A', 'Capacite': 200, 'Capacite Examens': 150, 'Batiment': 'Bâtiment A', 'Disponible (1/0)': 1, 'Specificites': '' },
            { 'Code Salle': 'B201', 'Nom Salle': 'Salle B201', 'Capacite': 50, 'Capacite Examens': 40, 'Batiment': 'Bâtiment B', 'Disponible (1/0)': 1, 'Specificites': 'Informatique' },
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Salles');
        XLSX.writeFile(wb, 'template_salles.xlsx');
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = new Uint8Array(ev.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                const preview = [];
                const errors = [];
                jsonData.forEach((row, index) => {
                    const rowNumber = index + 2;
                    const code_salle = String(row['Code Salle'] || row['code_salle'] || '').trim();
                    const nom_salle = String(row['Nom Salle'] || row['nom_salle'] || '').trim();
                    const capacite = parseInt(row['Capacite'] || row['capacite'] || 0);
                    const capacite_examens = parseInt(row['Capacite Examens'] || row['capacite_examens'] || 0) || null;
                    const batiment = String(row['Batiment'] || row['batiment'] || '').trim() || null;
                    const est_disponible = parseInt(row['Disponible (1/0)'] ?? 1) === 1;
                    const specificites = String(row['Specificites'] || row['specificites'] || '').trim() || null;

                    if (!code_salle) errors.push(`Ligne ${rowNumber}: Code salle manquant`);
                    else if (salles.find(s => s.code_salle === code_salle)) errors.push(`Ligne ${rowNumber}: Code "${code_salle}" existe déjà`);
                    if (!nom_salle) errors.push(`Ligne ${rowNumber}: Nom salle manquant`);
                    if (!capacite || capacite < 1) errors.push(`Ligne ${rowNumber}: Capacité invalide`);

                    preview.push({
                        rowNumber, code_salle, nom_salle, capacite, capacite_examens, batiment, est_disponible, specificites,
                        hasErrors: !code_salle || !nom_salle || !capacite || capacite < 1 || !!salles.find(s => s.code_salle === code_salle)
                    });
                });
                setImportPreview(preview);
                setImportErrors(errors);
            } catch {
                Swal.fire({ icon: 'error', title: 'Erreur', text: 'Erreur lors de la lecture du fichier Excel' });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleBulkImport = () => {
        if (importErrors.length > 0) {
            Swal.fire({ icon: 'warning', title: 'Erreurs détectées', text: 'Veuillez corriger les erreurs avant d\'importer' });
            return;
        }
        const toImport = importPreview.filter(i => !i.hasErrors).map(({ rowNumber, hasErrors, ...rest }) => rest);
        if (toImport.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Aucune salle valide', text: 'Aucune salle valide trouvée pour l\'import' });
            return;
        }
        router.post(route('configuration.salles.store'), { salles: toImport }, {
            onSuccess: () => {
                setShowImportModal(false);
                setImportFile(null);
                setImportPreview([]);
                setImportErrors([]);
                router.reload({ only: ['salles'] });
                Swal.fire({ icon: 'success', title: 'Import réussi', text: `${toImport.length} salles importées avec succès`, showConfirmButton: false, timer: 1500 });
            },
            onError: (errors) => {
                Swal.fire({ icon: 'error', title: 'Erreur d\'import', text: errors.error || 'Erreur lors de l\'import' });
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <div className="p-4">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 transition-colors">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                        <div className="flex items-center gap-3">
                            <Building className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Salles</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Gérer les salles et leur disponibilité</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            {selectedSalles.length > 0 && (
                                <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Supprimer ({selectedSalles.length})</span>
                                </button>
                            )}
                            <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Template</span>
                            </button>
                            <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                                <Upload className="w-4 h-4" />
                                <span className="hidden sm:inline">Import Excel</span>
                            </button>
                            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Ajouter</span>
                            </button>
                        </div>
                    </div>

                </div>
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.disponibles}</div>
                            </div>
                            <CheckCircle className="w-10 h-10 text-green-500 dark:text-green-400 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Indisponibles</div>
                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.indisponibles}</div>
                            </div>
                            <XCircle className="w-10 h-10 text-red-500 dark:text-red-400 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Capacité Totale</div>
                                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalCapacite}</div>
                            </div>
                            <Building className="w-10 h-10 text-purple-500 dark:text-purple-400 opacity-50" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 transition-colors">
                    {/* Search & Filter */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Rechercher par nom, code, bâtiment..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <select
                            value={filterDisponible}
                            onChange={(e) => { setFilterDisponible(e.target.value); setCurrentPage(1); }}
                            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="true">Disponibles</option>
                            <option value="false">Indisponibles</option>
                        </select>
                    </div>
                </div>

                <TableSection
                    paginatedSalles={paginatedSalles}
                    selectedSalles={selectedSalles}
                    toggleSelectSalle={toggleSelectSalle}
                    toggleSelectAll={toggleSelectAll}
                    handleEditClick={handleEditClick}
                    handleDelete={handleDelete}
                    filteredSalles={filteredSalles}
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={setItemsPerPage}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    totalPages={totalPages}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                />
            </div>


            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ajouter une Salle</h2>
                            <button onClick={() => { setShowAddModal(false); addForm.reset(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code salle *</label>
                                    <input type="text" value={addForm.data.code_salle} onChange={e => addForm.setData('code_salle', e.target.value)} required placeholder="Ex: A101"
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${addForm.errors.code_salle ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                    {addForm.errors.code_salle && <p className="mt-1 text-sm text-red-600">{addForm.errors.code_salle}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom salle *</label>
                                    <input type="text" value={addForm.data.nom_salle} onChange={e => addForm.setData('nom_salle', e.target.value)} required placeholder="Ex: Amphi A"
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${addForm.errors.nom_salle ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                    {addForm.errors.nom_salle && <p className="mt-1 text-sm text-red-600">{addForm.errors.nom_salle}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Capacité *</label>
                                    <input type="number" min="1" max="1000" value={addForm.data.capacite} onChange={e => addForm.setData('capacite', e.target.value)} required placeholder="Ex: 100"
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${addForm.errors.capacite ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                    {addForm.errors.capacite && <p className="mt-1 text-sm text-red-600">{addForm.errors.capacite}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Capacité examens</label>
                                    <input type="number" min="1" max="1000" value={addForm.data.capacite_examens} onChange={e => addForm.setData('capacite_examens', e.target.value)} placeholder="Ex: 80"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bâtiment</label>
                                    <input type="text" value={addForm.data.batiment} onChange={e => addForm.setData('batiment', e.target.value)} placeholder="Ex: Bâtiment A"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                </div>
                                <div className="flex items-center gap-3 pt-6">
                                    <input type="checkbox" id="add_disponible" checked={addForm.data.est_disponible} onChange={e => addForm.setData('est_disponible', e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
                                    <label htmlFor="add_disponible" className="text-sm font-medium text-gray-700 dark:text-gray-300">Disponible</label>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Spécificités</label>
                                    <textarea value={addForm.data.specificites} onChange={e => addForm.setData('specificites', e.target.value)} rows={3} placeholder="Ex: Salle informatique, projecteur, climatisée..."
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => { setShowAddModal(false); addForm.reset(); }}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                                    Annuler
                                </button>
                                <button type="submit" disabled={addForm.processing}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">
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
                            <button onClick={() => { setShowEditModal(false); setEditingSalle(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code salle *</label>
                                    <input type="text" value={editForm.data.code_salle} onChange={e => editForm.setData('code_salle', e.target.value)} required placeholder="Ex: A101"
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${editForm.errors.code_salle ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                    {editForm.errors.code_salle && <p className="mt-1 text-sm text-red-600">{editForm.errors.code_salle}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom salle *</label>
                                    <input type="text" value={editForm.data.nom_salle} onChange={e => editForm.setData('nom_salle', e.target.value)} required placeholder="Ex: Amphi A"
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${editForm.errors.nom_salle ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                    {editForm.errors.nom_salle && <p className="mt-1 text-sm text-red-600">{editForm.errors.nom_salle}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Capacité *</label>
                                    <input type="number" min="1" max="1000" value={editForm.data.capacite} onChange={e => editForm.setData('capacite', e.target.value)} required placeholder="Ex: 100"
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${editForm.errors.capacite ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                    {editForm.errors.capacite && <p className="mt-1 text-sm text-red-600">{editForm.errors.capacite}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Capacité examens</label>
                                    <input type="number" min="1" max="1000" value={editForm.data.capacite_examens} onChange={e => editForm.setData('capacite_examens', e.target.value)} placeholder="Ex: 80"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bâtiment</label>
                                    <input type="text" value={editForm.data.batiment} onChange={e => editForm.setData('batiment', e.target.value)} placeholder="Ex: Bâtiment A"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                </div>
                                <div className="flex items-center gap-3 pt-6">
                                    <input type="checkbox" id="edit_disponible" checked={editForm.data.est_disponible} onChange={e => editForm.setData('est_disponible', e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
                                    <label htmlFor="edit_disponible" className="text-sm font-medium text-gray-700 dark:text-gray-300">Disponible</label>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Spécificités</label>
                                    <textarea value={editForm.data.specificites} onChange={e => editForm.setData('specificites', e.target.value)} rows={3} placeholder="Ex: Salle informatique, projecteur, climatisée..."
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => { setShowEditModal(false); setEditingSalle(null); }}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                                    Annuler
                                </button>
                                <button type="submit" disabled={editForm.processing}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">
                                    {editForm.processing ? 'Mise à jour...' : 'Mettre à jour'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Import Excel</h2>
                            <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); setImportErrors([]); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                                <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Sélectionnez un fichier Excel (.xlsx, .xls)</p>
                                <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" id="import-file" />
                                <label htmlFor="import-file" className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
                                    Choisir un fichier
                                </label>
                                {importFile && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{importFile.name}</p>}
                            </div>

                            {importErrors.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Erreurs détectées :</p>
                                    <ul className="text-xs text-red-700 dark:text-red-400 space-y-1 max-h-32 overflow-y-auto">
                                        {importErrors.map((err, i) => <li key={i}>• {err}</li>)}
                                    </ul>
                                </div>
                            )}

                            {importPreview.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Aperçu : {importPreview.filter(i => !i.hasErrors).length} salle(s) valide(s) sur {importPreview.length}
                                    </p>
                                    <div className="overflow-x-auto max-h-48 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Code</th>
                                                    <th className="px-3 py-2 text-left">Nom</th>
                                                    <th className="px-3 py-2 text-left">Capacité</th>
                                                    <th className="px-3 py-2 text-left">Bâtiment</th>
                                                    <th className="px-3 py-2 text-left">Statut</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {importPreview.map((row) => (
                                                    <tr key={row.rowNumber} className={row.hasErrors ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{row.code_salle}</td>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{row.nom_salle}</td>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{row.capacite}</td>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{row.batiment || '-'}</td>
                                                        <td className="px-3 py-2">
                                                            {row.hasErrors
                                                                ? <XCircle className="w-4 h-4 text-red-500" />
                                                                : <CheckCircle className="w-4 h-4 text-green-500" />}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); setImportErrors([]); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Annuler</button>
                                <button onClick={handleBulkImport} disabled={!importFile || importPreview.length === 0} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm disabled:opacity-50">
                                    Importer ({importPreview.filter(i => !i.hasErrors).length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Display;
