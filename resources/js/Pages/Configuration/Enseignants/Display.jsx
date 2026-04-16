import React, { useState, useMemo } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Search, Plus, Edit, Trash2, X, User, GraduationCap, Users, ChevronLeft, ChevronRight, Upload, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import TableSection from './TableSection';

const EnseignantsDisplay = ({ enseignants = [], availableUsers = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingEnseignant, setEditingEnseignant] = useState(null);
    const [selectedEnseignants, setSelectedEnseignants] = useState([]);
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

    // Form for adding new enseignant
    const addForm = useForm({
        id_utilisateur: '',
        matricule: '',
        nom: '',
        prenom: '',
        email: '',
        grade: '',
        departement: '',
        chemin_signature_scan: '',
    });

    // Form for editing enseignant
    const editForm = useForm({
        id_utilisateur: '',
        matricule: '',
        nom: '',
        prenom: '',
        email: '',
        grade: '',
        departement: '',
        chemin_signature_scan: '',
    });

    // Filter and search enseignants
    const filteredEnseignants = useMemo(() => {
        let filtered = enseignants;
        
        if (searchTerm) {
            filtered = filtered.filter(enseignant => 
                enseignant.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                enseignant.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                enseignant.matricule?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                enseignant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                enseignant.grade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                enseignant.departement?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [enseignants, searchTerm]);

    const sortedEnseignants = useMemo(() => {
        if (!sortKey) return filteredEnseignants;
        return [...filteredEnseignants].sort((a, b) => {
            const aVal = a[sortKey] ?? '';
            const bVal = b[sortKey] ?? '';
            const cmp = typeof aVal === 'number'
                ? aVal - bVal
                : String(aVal).localeCompare(String(bVal));
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filteredEnseignants, sortKey, sortDir]);
    // Pagination
    const totalPages = Math.ceil(sortedEnseignants.length / itemsPerPage);
    const paginatedEnseignants = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedEnseignants.slice(start, start + itemsPerPage);
    }, [sortedEnseignants, currentPage, itemsPerPage]);

    // Download Excel template
    const downloadTemplate = () => {
        const template = [
            {
                'Matricule': 'ENS001',
                'Nom': 'Benali',
                'Prenom': 'Ahmed',
                'Email': 'ahmed.benali@faculte.ma',
                'Grade': 'Professeur',
                'Departement': 'Médecine Interne'
            },
            {
                'Matricule': 'ENS002',
                'Nom': 'Alami',
                'Prenom': 'Fatima',
                'Email': 'fatima.alami@faculte.ma',
                'Grade': 'Professeur Agrégé',
                'Departement': 'Cardiologie'
            },
            {
                'Matricule': 'ENS003',
                'Nom': 'Tazi',
                'Prenom': 'Mohamed',
                'Email': 'mohamed.tazi@faculte.ma',
                'Grade': 'Maître Assistant',
                'Departement': 'Neurologie'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        
        // Add instructions
        const instructions = [
            ['INSTRUCTIONS POUR L\'IMPORT DES ENSEIGNANTS'],
            [''],
            ['COLONNES OBLIGATOIRES:'],
            ['• Matricule: Matricule unique de l\'enseignant'],
            ['• Nom: Nom de famille de l\'enseignant'],
            ['• Prenom: Prénom de l\'enseignant'],
            ['• Email: Adresse email unique'],
            [''],
            ['COLONNES OPTIONNELLES:'],
            ['• Grade: Grade académique (ex: Professeur, Professeur Agrégé)'],
            ['• Departement: Département ou spécialité'],
            [''],
            ['RÈGLES IMPORTANTES:'],
            ['• Le matricule doit être unique'],
            ['• L\'email doit être valide et unique'],
            ['• Les doublons seront automatiquement ignorés'],
            [''],
            ['EXEMPLE DE DONNÉES VALIDES:'],
            ['Matricule: ENS001'],
            ['Nom: Benali'],
            ['Prenom: Ahmed'],
            ['Email: ahmed.benali@faculte.ma'],
            ['Grade: Professeur'],
            ['Departement: Médecine Interne']
        ];
        
        const ws2 = XLSX.utils.aoa_to_sheet(instructions);
        XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');
        
        XLSX.writeFile(wb, 'template_enseignants.xlsx');
    };
    // Handle Excel file selection for import
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImportFile(file);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                const preview = [];
                const errors = [];

                jsonData.forEach((row, index) => {
                    const rowNumber = index + 2; // Excel row number (starting from 2)
                    
                    const matricule = row.Matricule || row.matricule || '';
                    const nom = row.Nom || row.nom || '';
                    const prenom = row.Prenom || row.prenom || '';
                    const email = row.Email || row.email || '';
                    const grade = row.Grade || row.grade || '';
                    const departement = row.Departement || row.departement || '';

                    // Validation
                    if (!matricule) {
                        errors.push(`Ligne ${rowNumber}: Matricule manquant`);
                    } else if (enseignants.find(e => e.matricule === matricule)) {
                        errors.push(`Ligne ${rowNumber}: Matricule "${matricule}" existe déjà`);
                    }

                    if (!nom) {
                        errors.push(`Ligne ${rowNumber}: Nom manquant`);
                    }

                    if (!prenom) {
                        errors.push(`Ligne ${rowNumber}: Prénom manquant`);
                    }

                    if (!email) {
                        errors.push(`Ligne ${rowNumber}: Email manquant`);
                    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        errors.push(`Ligne ${rowNumber}: Email invalide`);
                    } else if (enseignants.find(e => e.email === email)) {
                        errors.push(`Ligne ${rowNumber}: Email "${email}" existe déjà`);
                    }

                    preview.push({
                        rowNumber,
                        matricule,
                        nom,
                        prenom,
                        email,
                        grade,
                        departement,
                        hasErrors: !matricule || !nom || !prenom || !email || 
                                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
                                  enseignants.find(e => e.matricule === matricule || e.email === email)
                    });
                });

                setImportPreview(preview);
                setImportErrors(errors);

            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erreur',
                    text: 'Erreur lors de la lecture du fichier Excel'
                });
            }
        };

        reader.readAsArrayBuffer(file);
    };
    // Submit bulk import
    const handleBulkImport = () => {
        if (importErrors.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Erreurs détectées',
                text: 'Veuillez corriger les erreurs avant d\'importer'
            });
            return;
        }

        const enseignantsToImport = importPreview
            .filter(item => !item.hasErrors)
            .map(item => ({
                matricule: item.matricule,
                nom: item.nom,
                prenom: item.prenom,
                email: item.email,
                grade: item.grade || null,
                departement: item.departement || null,
            }));

        if (enseignantsToImport.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Aucun enseignant valide',
                text: 'Aucun enseignant valide trouvé pour l\'import'
            });
            return;
        }

        router.post(route('configuration.enseignants.store'), { enseignants: enseignantsToImport }, {
            onSuccess: () => {
                setShowImportModal(false);
                setImportFile(null);
                setImportPreview([]);
                setImportErrors([]);
                router.reload({ only: ['enseignants'] });
                Swal.fire({
                    icon: 'success',
                    title: 'Import réussi',
                    text: `${enseignantsToImport.length} enseignants ont été importés avec succès`,
                    showConfirmButton: false,
                    timer: 1500
                });
            },
            onError: (errors) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Erreur d\'import',
                    text: errors.error || 'Erreur lors de l\'import des enseignants'
                });
            }
        });
    };

    // Handle add enseignant
    const handleAddSubmit = (e) => {
        e.preventDefault();
        addForm.post(route('configuration.enseignants.store'), {
            onSuccess: () => {
                setShowAddModal(false);
                addForm.reset();
                router.reload({ only: ['enseignants'] });
                Swal.fire({
                    icon: 'success',
                    title: 'Succès',
                    text: 'Enseignant créé avec succès',
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
    // Handle edit enseignant
    const handleEditClick = (enseignant) => {
        setEditingEnseignant(enseignant);
        editForm.setData({
            id_utilisateur: enseignant.id_utilisateur || '',
            matricule: enseignant.matricule || '',
            nom: enseignant.nom || '',
            prenom: enseignant.prenom || '',
            email: enseignant.email || '',
            grade: enseignant.grade || '',
            departement: enseignant.departement || '',
            chemin_signature_scan: enseignant.chemin_signature_scan || '',
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        editForm.put(route('configuration.enseignants.update', editingEnseignant.id_enseignant), {
            onSuccess: () => {
                setShowEditModal(false);
                setEditingEnseignant(null);
                router.reload({ only: ['enseignants'] });
                Swal.fire({
                    icon: 'success',
                    title: 'Succès',
                    text: 'Enseignant mis à jour avec succès',
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

    // Handle delete enseignant
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
                router.delete(route('configuration.enseignants.destroy', id), {
                    onSuccess: () => {
                        router.reload({ only: ['enseignants'] });
                        Swal.fire(
                            'Supprimé !',
                            'L\'enseignant a été supprimé.',
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
        if (selectedEnseignants.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Attention',
                text: 'Veuillez sélectionner au moins un enseignant à supprimer.'
            });
            return;
        }

        Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: `Vous allez supprimer ${selectedEnseignants.length} enseignant(s). Cette action est irréversible !`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Oui, supprimer !',
            cancelButtonText: 'Annuler'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('configuration.enseignants.bulk-destroy'), {
                    ids: selectedEnseignants
                }, {
                    onSuccess: () => {
                        setSelectedEnseignants([]);
                        router.reload({ only: ['enseignants'] });
                        Swal.fire(
                            'Supprimé !',
                            'Les enseignants sélectionnés ont été supprimés.',
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

    // Select/deselect enseignants
    const toggleSelectEnseignant = (id) => {
        setSelectedEnseignants(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedEnseignants.length === paginatedEnseignants.length) {
            setSelectedEnseignants([]);
        } else {
            setSelectedEnseignants(paginatedEnseignants.map(e => e.id_enseignant));
        }
    };

    // Stats calculations
    const stats = useMemo(() => {
        const total = enseignants.length;
        const withUser = enseignants.filter(e => e.id_utilisateur !== null).length;
        const withGrade = enseignants.filter(e => e.grade !== null && e.grade !== '').length;
        const withDepartement = enseignants.filter(e => e.departement !== null && e.departement !== '').length;
        
        return { total, withUser, withGrade, withDepartement };
    }, [enseignants]);
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <div className="p-4">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 transition-colors">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                        <div className="flex items-center gap-3">
                            <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Enseignants</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Gérer les enseignants et leur profil</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            {selectedEnseignants.length > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Supprimer ({selectedEnseignants.length})</span>
                                </button>
                            )}
                            <button
                                onClick={downloadTemplate}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Template</span>
                            </button>
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-lg transition-colors"
                            >
                                <Upload className="w-4 h-4" />
                                <span className="hidden sm:inline">Import Excel</span>
                            </button>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Ajouter</span>
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Rechercher par nom, prénom, matricule, email, grade..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Enseignants</div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                            </div>
                            <GraduationCap className="w-10 h-10 text-blue-500 dark:text-blue-400 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Avec Compte</div>
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.withUser}</div>
                            </div>
                            <User className="w-10 h-10 text-green-500 dark:text-green-400 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Avec Grade</div>
                                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.withGrade}</div>
                            </div>
                            <Users className="w-10 h-10 text-purple-500 dark:text-purple-400 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Avec Département</div>
                                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.withDepartement}</div>
                            </div>
                            <Users className="w-10 h-10 text-orange-500 dark:text-orange-400 opacity-50" />
                        </div>
                    </div>
                </div>
                {/* Table */}
                <TableSection
                    paginatedEnseignants={paginatedEnseignants}
                    selectedEnseignants={selectedEnseignants}
                    toggleSelectEnseignant={toggleSelectEnseignant}
                    toggleSelectAll={toggleSelectAll}
                    handleEditClick={handleEditClick}
                    handleDelete={handleDelete}
                    filteredEnseignants={filteredEnseignants}
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
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ajouter un Enseignant</h2>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Utilisateur */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Compte Utilisateur (Optionnel)
                                    </label>
                                    <select
                                        value={addForm.data.id_utilisateur}
                                        onChange={(e) => addForm.setData('id_utilisateur', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        <option value="">Aucun compte lié</option>
                                        {availableUsers.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Matricule */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Matricule *
                                    </label>
                                    <input
                                        type="text"
                                        value={addForm.data.matricule}
                                        onChange={(e) => addForm.setData('matricule', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            addForm.errors.matricule ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                        placeholder="Ex: ENS001"
                                    />
                                    {addForm.errors.matricule && (
                                        <p className="mt-1 text-sm text-red-600">{addForm.errors.matricule}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={addForm.data.email}
                                        onChange={(e) => addForm.setData('email', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            addForm.errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                        placeholder="Ex: ahmed.benali@faculte.ma"
                                    />
                                    {addForm.errors.email && (
                                        <p className="mt-1 text-sm text-red-600">{addForm.errors.email}</p>
                                    )}
                                </div>

                                {/* Nom */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nom *
                                    </label>
                                    <input
                                        type="text"
                                        value={addForm.data.nom}
                                        onChange={(e) => addForm.setData('nom', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            addForm.errors.nom ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                        placeholder="Ex: Benali"
                                    />
                                    {addForm.errors.nom && (
                                        <p className="mt-1 text-sm text-red-600">{addForm.errors.nom}</p>
                                    )}
                                </div>

                                {/* Prénom */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Prénom *
                                    </label>
                                    <input
                                        type="text"
                                        value={addForm.data.prenom}
                                        onChange={(e) => addForm.setData('prenom', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            addForm.errors.prenom ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                        placeholder="Ex: Ahmed"
                                    />
                                    {addForm.errors.prenom && (
                                        <p className="mt-1 text-sm text-red-600">{addForm.errors.prenom}</p>
                                    )}
                                </div>

                                {/* Grade */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Grade
                                    </label>
                                    <input
                                        type="text"
                                        value={addForm.data.grade}
                                        onChange={(e) => addForm.setData('grade', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="Ex: Professeur"
                                    />
                                </div>

                                {/* Département */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Département
                                    </label>
                                    <input
                                        type="text"
                                        value={addForm.data.departement}
                                        onChange={(e) => addForm.setData('departement', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="Ex: Médecine Interne"
                                    />
                                </div>

                                {/* Signature */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Chemin Signature Numérisée
                                    </label>
                                    <input
                                        type="text"
                                        value={addForm.data.chemin_signature_scan}
                                        onChange={(e) => addForm.setData('chemin_signature_scan', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="Ex: /storage/signatures/benali_signature.png"
                                    />
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
            {showEditModal && editingEnseignant && (
                <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Modifier l'Enseignant</h2>
                            <button 
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingEnseignant(null);
                                    editForm.reset();
                                }} 
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Utilisateur */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Compte Utilisateur (Optionnel)
                                    </label>
                                    <select
                                        value={editForm.data.id_utilisateur}
                                        onChange={(e) => editForm.setData('id_utilisateur', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        <option value="">Aucun compte lié</option>
                                        {availableUsers.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Matricule */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Matricule *
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.data.matricule}
                                        onChange={(e) => editForm.setData('matricule', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            editForm.errors.matricule ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    />
                                    {editForm.errors.matricule && (
                                        <p className="mt-1 text-sm text-red-600">{editForm.errors.matricule}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={editForm.data.email}
                                        onChange={(e) => editForm.setData('email', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            editForm.errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    />
                                    {editForm.errors.email && (
                                        <p className="mt-1 text-sm text-red-600">{editForm.errors.email}</p>
                                    )}
                                </div>

                                {/* Nom */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nom *
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.data.nom}
                                        onChange={(e) => editForm.setData('nom', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            editForm.errors.nom ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    />
                                    {editForm.errors.nom && (
                                        <p className="mt-1 text-sm text-red-600">{editForm.errors.nom}</p>
                                    )}
                                </div>

                                {/* Prénom */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Prénom *
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.data.prenom}
                                        onChange={(e) => editForm.setData('prenom', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            editForm.errors.prenom ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    />
                                    {editForm.errors.prenom && (
                                        <p className="mt-1 text-sm text-red-600">{editForm.errors.prenom}</p>
                                    )}
                                </div>

                                {/* Grade */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Grade
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.data.grade}
                                        onChange={(e) => editForm.setData('grade', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                </div>

                                {/* Département */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Département
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.data.departement}
                                        onChange={(e) => editForm.setData('departement', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                </div>

                                {/* Signature */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Chemin Signature Numérisée
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.data.chemin_signature_scan}
                                        onChange={(e) => editForm.setData('chemin_signature_scan', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingEnseignant(null);
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

            {/* Import Excel Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Excel - Enseignants</h2>
                            <button 
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportFile(null);
                                    setImportPreview([]);
                                    setImportErrors([]);
                                }} 
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Instructions */}
                            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Format Excel requis:</h3>
                                    <button
                                        onClick={downloadTemplate}
                                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
                                    >
                                        <Download className="w-3 h-3" />
                                        Télécharger Template
                                    </button>
                                </div>
                                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                    <p><strong>Colonnes obligatoires:</strong></p>
                                    <ul className="list-disc list-inside ml-4 space-y-1">
                                        <li><strong>Matricule:</strong> Matricule unique de l'enseignant</li>
                                        <li><strong>Nom:</strong> Nom de famille</li>
                                        <li><strong>Prenom:</strong> Prénom</li>
                                        <li><strong>Email:</strong> Adresse email unique</li>
                                    </ul>
                                    <p><strong>Colonnes optionnelles:</strong></p>
                                    <ul className="list-disc list-inside ml-4 space-y-1">
                                        <li><strong>Grade:</strong> Grade académique</li>
                                        <li><strong>Departement:</strong> Département ou spécialité</li>
                                    </ul>
                                    <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                                        💡 <strong>Conseil:</strong> Téléchargez le template ci-dessus pour un exemple complet.
                                    </p>
                                </div>
                            </div>

                            {/* File Upload */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Sélectionner le fichier Excel
                                </label>
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <FileSpreadsheet className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="font-semibold">Cliquer pour télécharger</span> ou glisser-déposer
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Excel (.xlsx, .xls)</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".xlsx,.xls"
                                            onChange={handleFileSelect}
                                        />
                                    </label>
                                </div>
                                {importFile && (
                                    <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                                        Fichier sélectionné: {importFile.name}
                                    </p>
                                )}
                            </div>

                            {/* Errors */}
                            {importErrors.length > 0 && (
                                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <h3 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                                        Erreurs détectées ({importErrors.length}):
                                    </h3>
                                    <div className="max-h-32 overflow-y-auto">
                                        {importErrors.slice(0, 10).map((error, index) => (
                                            <p key={index} className="text-sm text-red-800 dark:text-red-200">
                                                • {error}
                                            </p>
                                        ))}
                                        {importErrors.length > 10 && (
                                            <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                                                ... et {importErrors.length - 10} autres erreurs
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Preview */}
                            {importPreview.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                        Aperçu des données ({importPreview.length} lignes)
                                    </h3>
                                    <div className="overflow-x-auto max-h-64 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ligne</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Matricule</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nom</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prénom</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Grade</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {importPreview.slice(0, 20).map((item, index) => (
                                                    <tr key={index} className={`${item.hasErrors ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-800'}`}>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.rowNumber}</td>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.matricule}</td>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.nom}</td>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.prenom}</td>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.email}</td>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.grade || '-'}</td>
                                                        <td className="px-3 py-2">
                                                            {item.hasErrors ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                                    Erreur
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                                    Valide
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {importPreview.length > 20 && (
                                            <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                                                ... et {importPreview.length - 20} autres lignes
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Summary */}
                            {importPreview.length > 0 && (
                                <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {importPreview.length}
                                        </div>
                                        <div className="text-sm text-blue-800 dark:text-blue-200">Total lignes</div>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            {importPreview.filter(item => !item.hasErrors).length}
                                        </div>
                                        <div className="text-sm text-green-800 dark:text-green-200">Valides</div>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                            {importPreview.filter(item => item.hasErrors).length}
                                        </div>
                                        <div className="text-sm text-red-800 dark:text-red-200">Erreurs</div>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowImportModal(false);
                                        setImportFile(null);
                                        setImportPreview([]);
                                        setImportErrors([]);
                                    }}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleBulkImport}
                                    disabled={importPreview.length === 0 || importErrors.length > 0 || importPreview.filter(item => !item.hasErrors).length === 0}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Importer {importPreview.filter(item => !item.hasErrors).length > 0 && `(${importPreview.filter(item => !item.hasErrors).length})`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnseignantsDisplay;