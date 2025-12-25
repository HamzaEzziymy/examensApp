import React, { useState, useMemo, useCallback } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Search, Plus, Edit, Trash2, X, Calendar, User, GraduationCap, Building, Users, ChevronLeft, ChevronRight, Upload, FileSpreadsheet, Download, Filter, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import debounce from 'lodash/debounce';

const StagesDisplay = ({ 
    stages: paginatedStages = { data: [], links: [], current_page: 1, last_page: 1, per_page: 25, total: 0 }, 
    inscriptionsPedagogiques = [], 
    modules = [], 
    enseignants = [],
    niveaux = [],
    sections = [],
    filters: initialFilters = {},
    totalCount = 0
}) => {
    // Handle both paginated and non-paginated data for backwards compatibility
    const stagesData = Array.isArray(paginatedStages) ? paginatedStages : (paginatedStages.data || []);
    const pagination = Array.isArray(paginatedStages) ? null : paginatedStages;

    const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [isFiltering, setIsFiltering] = useState(false);
    const [editingStage, setEditingStage] = useState(null);
    const [selectedStages, setSelectedStages] = useState([]);
    
    // Filter states
    const [filterStatut, setFilterStatut] = useState(initialFilters.statut || '');
    const [filterNiveau, setFilterNiveau] = useState(initialFilters.niveau || '');
    const [filterSection, setFilterSection] = useState(initialFilters.section || '');
    const [itemsPerPage, setItemsPerPage] = useState(initialFilters.per_page || 25);

    // Import state
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState([]);
    const [importErrors, setImportErrors] = useState([]);

    // Backend filtering function
    const applyFilters = useCallback((params = {}) => {
        setIsFiltering(true);
        const filterParams = {
            search: params.search !== undefined ? params.search : searchTerm,
            statut: params.statut !== undefined ? params.statut : filterStatut,
            niveau: params.niveau !== undefined ? params.niveau : filterNiveau,
            section: params.section !== undefined ? params.section : filterSection,
            per_page: params.per_page !== undefined ? params.per_page : itemsPerPage,
        };

        router.get(route('inscriptions.stages.index'), filterParams, {
            preserveState: true,
            preserveScroll: true,
            only: ['stages', 'filters', 'totalCount'],
            onFinish: () => setIsFiltering(false),
        });
    }, [searchTerm, filterStatut, filterNiveau, filterSection, itemsPerPage]);

    // Debounced search
    const debouncedSearch = useMemo(
        () => debounce((value) => applyFilters({ search: value }), 400),
        [applyFilters]
    );

    // Handle search input change
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        debouncedSearch(value);
    };

    // Handle filter changes
    const handleFilterChange = (filterName, value) => {
        switch (filterName) {
            case 'statut':
                setFilterStatut(value);
                applyFilters({ statut: value });
                break;
            case 'niveau':
                setFilterNiveau(value);
                applyFilters({ niveau: value });
                break;
            case 'section':
                setFilterSection(value);
                applyFilters({ section: value });
                break;
        }
    };

    // Handle items per page change
    const handlePerPageChange = (value) => {
        setItemsPerPage(value);
        applyFilters({ per_page: value });
    };

    // Handle pagination
    const goToPage = (url) => {
        if (!url) return;
        setIsFiltering(true);
        router.get(url, {}, {
            preserveState: true,
            preserveScroll: true,
            only: ['stages', 'filters', 'totalCount'],
            onFinish: () => setIsFiltering(false),
        });
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchTerm('');
        setFilterStatut('');
        setFilterNiveau('');
        setFilterSection('');
        setItemsPerPage(25);
        setIsFiltering(true);
        router.get(route('inscriptions.stages.index'), { per_page: 25 }, {
            preserveState: true,
            preserveScroll: true,
            only: ['stages', 'filters', 'totalCount'],
            onFinish: () => setIsFiltering(false),
        });
    };

    // Pagination info
    const currentPage = pagination?.current_page || 1;
    const lastPage = pagination?.last_page || 1;
    const total = pagination?.total || stagesData.length;
    const from = pagination?.from || 1;
    const to = pagination?.to || stagesData.length;

    // Form for adding new stage
    const addForm = useForm({
        id_inscription_pedagogique: '',
        id_module: '',
        nom_hopital: '',
        service: '',
        date_debut: '',
        date_fin: '',
        encadrant_hopital: '',
        encadrant_faculte: '',
        note_stage: '',
        rapport_stage: '',
    });

    // Form for editing stage
    const editForm = useForm({
        id_inscription_pedagogique: '',
        id_module: '',
        nom_hopital: '',
        service: '',
        date_debut: '',
        date_fin: '',
        encadrant_hopital: '',
        encadrant_faculte: '',
        note_stage: '',
        rapport_stage: '',
    });

    // Handle add stage
    const handleAddSubmit = (e) => {
        e.preventDefault();
        addForm.post(route('inscriptions.stages.store'), {
            onSuccess: () => {
                setShowAddModal(false);
                addForm.reset();
                router.reload({ only: ['stages'] });
                Swal.fire({
                    icon: 'success',
                    title: 'Succès',
                    text: 'Stage créé avec succès',
                    showConfirmButton: false,
                    timer: 1500
                });
            },
            onError: (errors) => {
                console.log('Add errors:', errors);
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

    // Handle edit stage
    const handleEditClick = (stage) => {
        setEditingStage(stage);
        editForm.setData({
            id_inscription_pedagogique: stage.id_inscription_pedagogique || '',
            id_module: stage.id_module || '',
            nom_hopital: stage.nom_hopital || '',
            service: stage.service || '',
            date_debut: stage.date_debut || '',
            date_fin: stage.date_fin || '',
            encadrant_hopital: stage.encadrant_hopital || '',
            encadrant_faculte: stage.encadrant_faculte || '',
            note_stage: stage.note_stage || '',
            rapport_stage: stage.rapport_stage || '',
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        editForm.put(route('inscriptions.stages.update', editingStage.id_stage), {
            onSuccess: () => {
                setShowEditModal(false);
                setEditingStage(null);
                router.reload({ only: ['stages'] });
                Swal.fire({
                    icon: 'success',
                    title: 'Succès',
                    text: 'Stage mis à jour avec succès',
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

    // Handle delete stage
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
                router.delete(route('inscriptions.stages.destroy', id), {
                    onSuccess: () => {
                        router.reload({ only: ['stages'] });
                        Swal.fire(
                            'Supprimé !',
                            'Le stage a été supprimé.',
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
        if (selectedStages.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Attention',
                text: 'Veuillez sélectionner au moins un stage à supprimer.'
            });
            return;
        }

        Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: `Vous allez supprimer ${selectedStages.length} stage(s). Cette action est irréversible !`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Oui, supprimer !',
            cancelButtonText: 'Annuler'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('inscriptions.stages.bulk-destroy'), {
                    ids: selectedStages
                }, {
                    onSuccess: () => {
                        setSelectedStages([]);
                        router.reload({ only: ['stages'] });
                        Swal.fire(
                            'Supprimé !',
                            'Les stages sélectionnés ont été supprimés.',
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

    // Select/deselect stages
    const toggleSelectStage = (id) => {
        setSelectedStages(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedStages.length === stagesData.length) {
            setSelectedStages([]);
        } else {
            setSelectedStages(stagesData.map(s => s.id_stage));
        }
    };

    // Stats calculations (based on current page data)
    const stats = useMemo(() => {
        const enCours = stagesData.filter(s => {
            const now = new Date();
            const debut = new Date(s.date_debut);
            const fin = new Date(s.date_fin);
            return debut <= now && now <= fin;
        }).length;
        const termines = stagesData.filter(s => new Date(s.date_fin) < new Date()).length;
        const avecNote = stagesData.filter(s => s.note_stage !== null && s.note_stage !== '').length;
        
        return { enCours, termines, avecNote };
    }, [stagesData]);

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    // Get stage status
    const getStageStatus = (stage) => {
        const now = new Date();
        const debut = new Date(stage.date_debut);
        const fin = new Date(stage.date_fin);
        
        if (now < debut) return { status: 'À venir', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' };
        if (now > fin) return { status: 'Terminé', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' };
        return { status: 'En cours', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' };
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
                    
                    // Expected columns: CNE, Nom_Hopital, Service, Date_Debut, Date_Fin, Encadrant_Hopital, Note_Stage
                    const cne = row.CNE || row.cne || '';
                    const nomHopital = row.Nom_Hopital || row.nom_hopital || row['Nom Hopital'] || '';
                    const service = row.Service || row.service || '';
                    const dateDebut = row.Date_Debut || row.date_debut || row['Date Debut'] || '';
                    const dateFin = row.Date_Fin || row.date_fin || row['Date Fin'] || '';
                    const encadrantHopital = row.Encadrant_Hopital || row.encadrant_hopital || row['Encadrant Hopital'] || '';
                    const noteStage = row.Note_Stage || row.note_stage || row['Note Stage'] || '';

                    // Find student by CNE
                    const inscription = inscriptionsPedagogiques.find(insc => 
                        insc.inscriptionAdministrative?.etudiant?.cne === cne
                    );

                    if (!cne) {
                        errors.push(`Ligne ${rowNumber}: CNE manquant`);
                    } else if (!inscription) {
                        errors.push(`Ligne ${rowNumber}: Étudiant avec CNE "${cne}" non trouvé`);
                    }

                    if (!nomHopital) {
                        errors.push(`Ligne ${rowNumber}: Nom d'hôpital manquant`);
                    }

                    if (!dateDebut) {
                        errors.push(`Ligne ${rowNumber}: Date de début manquante`);
                    }

                    if (!dateFin) {
                        errors.push(`Ligne ${rowNumber}: Date de fin manquante`);
                    }

                    // Validate date format and logic
                    if (dateDebut && dateFin) {
                        const debut = new Date(dateDebut);
                        const fin = new Date(dateFin);
                        if (isNaN(debut.getTime()) || isNaN(fin.getTime())) {
                            errors.push(`Ligne ${rowNumber}: Format de date invalide`);
                        } else if (debut >= fin) {
                            errors.push(`Ligne ${rowNumber}: La date de fin doit être après la date de début`);
                        }
                    }

                    // Validate note if provided
                    if (noteStage && (isNaN(noteStage) || noteStage < 0 || noteStage > 20)) {
                        errors.push(`Ligne ${rowNumber}: Note invalide (doit être entre 0 et 20)`);
                    }

                    preview.push({
                        rowNumber,
                        cne,
                        inscription,
                        nomHopital,
                        service,
                        dateDebut,
                        dateFin,
                        encadrantHopital,
                        noteStage,
                        hasErrors: !inscription || !nomHopital || !dateDebut || !dateFin
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

    // Download Excel template
    const downloadTemplate = () => {
        const template = [
            {
                'CNE': '12345678',
                'Nom_Hopital': 'CHU Hassan II',
                'Service': 'Cardiologie',
                'Date_Debut': '2024-01-15',
                'Date_Fin': '2024-02-15',
                'Encadrant_Hopital': 'Dr. Ahmed Benali',
                'Note_Stage': '16.5'
            },
            {
                'CNE': '87654321',
                'Nom_Hopital': 'Hôpital Ibn Sina',
                'Service': 'Neurologie',
                'Date_Debut': '2024-02-01',
                'Date_Fin': '2024-03-01',
                'Encadrant_Hopital': 'Dr. Fatima Zahra',
                'Note_Stage': '18.0'
            },
            {
                'CNE': '11223344',
                'Nom_Hopital': 'Hôpital Militaire',
                'Service': 'Orthopédie',
                'Date_Debut': '2024-03-01',
                'Date_Fin': '2024-04-01',
                'Encadrant_Hopital': 'Dr. Mohamed Alami',
                'Note_Stage': ''
            }
        ];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        
        // Add instructions
        const instructions = [
            ['INSTRUCTIONS POUR L\'IMPORT DES STAGES'],
            [''],
            ['COLONNES OBLIGATOIRES:'],
            ['• CNE: Code National Étudiant (doit exister dans le système)'],
            ['• Nom_Hopital: Nom de l\'hôpital où se déroule le stage'],
            ['• Date_Debut: Date de début du stage (format: YYYY-MM-DD)'],
            ['• Date_Fin: Date de fin du stage (format: YYYY-MM-DD)'],
            [''],
            ['COLONNES OPTIONNELLES:'],
            ['• Service: Service hospitalier (ex: Cardiologie, Neurologie)'],
            ['• Encadrant_Hopital: Nom de l\'encadrant à l\'hôpital'],
            ['• Note_Stage: Note du stage (entre 0 et 20)'],
            [''],
            ['RÈGLES IMPORTANTES:'],
            ['• Les dates doivent être au format YYYY-MM-DD (ex: 2024-01-15)'],
            ['• La date de fin doit être postérieure à la date de début'],
            ['• Le CNE doit correspondre à un étudiant inscrit pédagogiquement'],
            ['• La note doit être comprise entre 0 et 20 (optionnelle)'],
            ['• Les doublons seront automatiquement ignorés'],
            [''],
            ['EXEMPLE DE DONNÉES VALIDES:'],
            ['CNE: 12345678'],
            ['Nom_Hopital: CHU Hassan II'],
            ['Service: Cardiologie'],
            ['Date_Debut: 2024-01-15'],
            ['Date_Fin: 2024-02-15'],
            ['Encadrant_Hopital: Dr. Ahmed Benali'],
            ['Note_Stage: 16.5']
        ];
        
        const ws2 = XLSX.utils.aoa_to_sheet(instructions);
        XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');
        
        XLSX.writeFile(wb, 'template_stages.xlsx');
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

        const stagesToImport = importPreview
            .filter(item => item.inscription && !item.hasErrors)
            .map(item => ({
                id_inscription_pedagogique: item.inscription.id_inscription_pedagogique,
                nom_hopital: item.nomHopital,
                service: item.service || null,
                date_debut: item.dateDebut,
                date_fin: item.dateFin,
                encadrant_hopital: item.encadrantHopital || null,
                note_stage: item.noteStage || null,
            }));

        if (stagesToImport.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Aucun stage valide',
                text: 'Aucun stage valide trouvé pour l\'import'
            });
            return;
        }

        router.post(route('inscriptions.stages.store'), { stages: stagesToImport }, {
            onSuccess: () => {
                setShowImportModal(false);
                setImportFile(null);
                setImportPreview([]);
                setImportErrors([]);
                router.reload({ only: ['stages'] });
                Swal.fire({
                    icon: 'success',
                    title: 'Import réussi',
                    text: `${stagesToImport.length} stages ont été importés avec succès`,
                    showConfirmButton: false,
                    timer: 1500
                });
            },
            onError: (errors) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Erreur d\'import',
                    text: errors.error || 'Erreur lors de l\'import des stages'
                });
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
                            <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Stages</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Gérer les stages des étudiants</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            {selectedStages.length > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Supprimer ({selectedStages.length})</span>
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
                                placeholder="Rechercher par hôpital, service, étudiant, encadrant..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                            />
                            {isFiltering && (
                                <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-4 h-4 animate-spin" />
                            )}
                        </div>
                        <div className="flex gap-3">
                            <select
                                value={filterStatut}
                                onChange={(e) => handleFilterChange('statut', e.target.value)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">Tous les statuts</option>
                                <option value="en_cours">En cours</option>
                                <option value="termine">Terminé</option>
                                <option value="a_venir">À venir</option>
                            </select>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                    showFilters 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                <Filter className="w-4 h-4" />
                                <span>Plus de filtres</span>
                                {(filterNiveau || filterSection) && (
                                    <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                        {[filterNiveau, filterSection].filter(Boolean).length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Extended Filters */}
                    {showFilters && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Niveau</label>
                                <select
                                    value={filterNiveau}
                                    onChange={(e) => handleFilterChange('niveau', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Tous les niveaux</option>
                                    {niveaux.map(niveau => (
                                        <option key={niveau.id_niveau} value={niveau.id_niveau}>{niveau.nom_niveau}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Section</label>
                                <select
                                    value={filterSection}
                                    onChange={(e) => handleFilterChange('section', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Toutes les sections</option>
                                    {sections.map(section => (
                                        <option key={section.id_section} value={section.id_section}>
                                            {section.filiere?.nom_filiere} ({section.nom_section})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                                <button
                                    onClick={clearFilters}
                                    className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                >
                                    <X className="w-4 h-4" />
                                    Réinitialiser les filtres
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Stages</div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount || total}</div>
                            </div>
                            <GraduationCap className="w-10 h-10 text-blue-500 dark:text-blue-400 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Résultats filtrés</div>
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{total}</div>
                            </div>
                            <Search className="w-10 h-10 text-blue-500 dark:text-blue-400 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">En Cours (page)</div>
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.enCours}</div>
                            </div>
                            <Calendar className="w-10 h-10 text-green-500 dark:text-green-400 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Terminés (page)</div>
                                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.termines}</div>
                            </div>
                            <Building className="w-10 h-10 text-gray-500 dark:text-gray-400 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Avec Note (page)</div>
                                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.avecNote}</div>
                            </div>
                            <Users className="w-10 h-10 text-purple-500 dark:text-purple-400 opacity-50" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Page</div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{currentPage}/{lastPage || 1}</div>
                            </div>
                            <ChevronRight className="w-10 h-10 text-gray-500 dark:text-gray-400 opacity-50" />
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
                                            checked={stagesData.length > 0 && selectedStages.length === stagesData.length}
                                            onChange={toggleSelectAll}
                                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Étudiant</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hôpital & Service</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Période</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Encadrants</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {stagesData.length > 0 ? (
                                    stagesData.map((stage) => {
                                        const stageStatus = getStageStatus(stage);
                                        return (
                                            <tr key={stage.id_stage} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStages.includes(stage.id_stage)}
                                                        onChange={() => toggleSelectStage(stage.id_stage)}
                                                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {stage.inscriptionPedagogique?.inscriptionAdministrative?.etudiant?.nom} {stage.inscriptionPedagogique?.inscriptionAdministrative?.etudiant?.prenom}
                                                    </div>
                                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                                        CNE: {stage.inscriptionPedagogique?.inscriptionAdministrative?.etudiant?.cne}
                                                    </div>
                                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                                        {stage.inscriptionPedagogique?.inscriptionAdministrative?.section?.filiere?.nom_filiere}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {stage.nom_hopital}
                                                    </div>
                                                    {stage.service && (
                                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                                            Service: {stage.service}
                                                        </div>
                                                    )}
                                                    {stage.module && (
                                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                                            Module: {stage.module.nom_module}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 dark:text-gray-100">
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3 text-gray-400" />
                                                            {formatDate(stage.date_debut)}
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <Calendar className="w-3 h-3 text-gray-400" />
                                                            {formatDate(stage.date_fin)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 dark:text-gray-100">
                                                        {stage.encadrant_hopital && (
                                                            <div className="flex items-center gap-1">
                                                                <Building className="w-3 h-3 text-gray-400" />
                                                                <span className="text-xs">{stage.encadrant_hopital}</span>
                                                            </div>
                                                        )}
                                                        {stage.encadrantFaculte && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <User className="w-3 h-3 text-gray-400" />
                                                                <span className="text-xs">{stage.encadrantFaculte.nom} {stage.encadrantFaculte.prenom}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stageStatus.color}`}>
                                                            {stageStatus.status}
                                                        </span>
                                                        {stage.note_stage && (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                                Note: {stage.note_stage}/20
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEditClick(stage)}
                                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1"
                                                            title="Modifier"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(stage.id_stage)}
                                                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                            <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                            <p>Aucun stage trouvé</p>
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
                                Affichage {from} à {to} sur {total} stages
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Afficher:</span>
                                <div className="flex gap-2">
                                    <select
                                        className="px-8 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                        value={itemsPerPage}
                                        onChange={(e) => handlePerPageChange(parseInt(e.target.value))}
                                    >
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {pagination && lastPage > 1 && (
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={() => goToPage(pagination.prev_page_url)}
                                    disabled={!pagination.prev_page_url}
                                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600 dark:text-gray-400 min-w-fit">
                                    Page {currentPage} sur {lastPage}
                                </span>
                                <button
                                    onClick={() => goToPage(pagination.next_page_url)}
                                    disabled={!pagination.next_page_url}
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ajouter un Stage</h2>
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
                                {/* Inscription Pédagogique */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Étudiant (Inscription Pédagogique) *
                                    </label>
                                    <select
                                        value={addForm.data.id_inscription_pedagogique}
                                        onChange={(e) => addForm.setData('id_inscription_pedagogique', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            addForm.errors.id_inscription_pedagogique ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    >
                                        <option value="">Sélectionner un étudiant</option>
                                        {inscriptionsPedagogiques.map((inscription) => (
                                            <option key={inscription.id_inscription_pedagogique} value={inscription.id_inscription_pedagogique}>
                                                {inscription.inscriptionAdministrative?.etudiant?.nom} {inscription.inscriptionAdministrative?.etudiant?.prenom} 
                                                ({inscription.inscriptionAdministrative?.etudiant?.cne}) - 
                                                {inscription.inscriptionAdministrative?.section?.filiere?.nom_filiere}
                                            </option>
                                        ))}
                                    </select>
                                    {addForm.errors.id_inscription_pedagogique && (
                                        <p className="mt-1 text-sm text-red-600">{addForm.errors.id_inscription_pedagogique}</p>
                                    )}
                                </div>

                                {/* Module */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Module
                                    </label>
                                    <select
                                        value={addForm.data.id_module}
                                        onChange={(e) => addForm.setData('id_module', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        <option value="">Sélectionner un module</option>
                                        {modules.map((module) => (
                                            <option key={module.id_module} value={module.id_module}>
                                                {module.nom_module} ({module.code_module})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Nom Hôpital */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nom de l'Hôpital *
                                    </label>
                                    <input
                                        type="text"
                                        value={addForm.data.nom_hopital}
                                        onChange={(e) => addForm.setData('nom_hopital', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            addForm.errors.nom_hopital ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                        placeholder="Ex: CHU Hassan II"
                                    />
                                    {addForm.errors.nom_hopital && (
                                        <p className="mt-1 text-sm text-red-600">{addForm.errors.nom_hopital}</p>
                                    )}
                                </div>

                                {/* Service */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Service
                                    </label>
                                    <input
                                        type="text"
                                        value={addForm.data.service}
                                        onChange={(e) => addForm.setData('service', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="Ex: Cardiologie"
                                    />
                                </div>

                                {/* Date Début */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Date de Début *
                                    </label>
                                    <input
                                        type="date"
                                        value={addForm.data.date_debut}
                                        onChange={(e) => addForm.setData('date_debut', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            addForm.errors.date_debut ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    />
                                    {addForm.errors.date_debut && (
                                        <p className="mt-1 text-sm text-red-600">{addForm.errors.date_debut}</p>
                                    )}
                                </div>

                                {/* Date Fin */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Date de Fin *
                                    </label>
                                    <input
                                        type="date"
                                        value={addForm.data.date_fin}
                                        onChange={(e) => addForm.setData('date_fin', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            addForm.errors.date_fin ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    />
                                    {addForm.errors.date_fin && (
                                        <p className="mt-1 text-sm text-red-600">{addForm.errors.date_fin}</p>
                                    )}
                                </div>

                                {/* Encadrant Hôpital */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Encadrant Hôpital
                                    </label>
                                    <input
                                        type="text"
                                        value={addForm.data.encadrant_hopital}
                                        onChange={(e) => addForm.setData('encadrant_hopital', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="Ex: Dr. Ahmed Benali"
                                    />
                                </div>

                                {/* Encadrant Faculté */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Encadrant Faculté
                                    </label>
                                    <select
                                        value={addForm.data.encadrant_faculte}
                                        onChange={(e) => addForm.setData('encadrant_faculte', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        <option value="">Sélectionner un enseignant</option>
                                        {enseignants.map((enseignant) => (
                                            <option key={enseignant.id_enseignant} value={enseignant.id_enseignant}>
                                                {enseignant.nom} {enseignant.prenom}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Note Stage */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Note du Stage (/20)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="20"
                                        value={addForm.data.note_stage}
                                        onChange={(e) => addForm.setData('note_stage', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            addForm.errors.note_stage ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                        placeholder="Ex: 15.5"
                                    />
                                    {addForm.errors.note_stage && (
                                        <p className="mt-1 text-sm text-red-600">{addForm.errors.note_stage}</p>
                                    )}
                                </div>

                                {/* Rapport Stage */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Rapport de Stage
                                    </label>
                                    <input
                                        type="text"
                                        value={addForm.data.rapport_stage}
                                        onChange={(e) => addForm.setData('rapport_stage', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="Lien ou nom du fichier rapport"
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
            {showEditModal && editingStage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Modifier le Stage</h2>
                            <button 
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingStage(null);
                                    editForm.reset();
                                }} 
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Same form fields as Add Modal but with editForm */}
                                {/* Inscription Pédagogique */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Étudiant (Inscription Pédagogique) *
                                    </label>
                                    <select
                                        value={editForm.data.id_inscription_pedagogique}
                                        onChange={(e) => editForm.setData('id_inscription_pedagogique', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            editForm.errors.id_inscription_pedagogique ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    >
                                        <option value="">Sélectionner un étudiant</option>
                                        {inscriptionsPedagogiques.map((inscription) => (
                                            <option key={inscription.id_inscription_pedagogique} value={inscription.id_inscription_pedagogique}>
                                                {inscription.inscriptionAdministrative?.etudiant?.nom} {inscription.inscriptionAdministrative?.etudiant?.prenom} 
                                                ({inscription.inscriptionAdministrative?.etudiant?.cne}) - 
                                                {inscription.inscriptionAdministrative?.section?.filiere?.nom_filiere}
                                            </option>
                                        ))}
                                    </select>
                                    {editForm.errors.id_inscription_pedagogique && (
                                        <p className="mt-1 text-sm text-red-600">{editForm.errors.id_inscription_pedagogique}</p>
                                    )}
                                </div>

                                {/* Module */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Module
                                    </label>
                                    <select
                                        value={editForm.data.id_module}
                                        onChange={(e) => editForm.setData('id_module', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        <option value="">Sélectionner un module</option>
                                        {modules.map((module) => (
                                            <option key={module.id_module} value={module.id_module}>
                                                {module.nom_module} ({module.code_module})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Nom Hôpital */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nom de l'Hôpital *
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.data.nom_hopital}
                                        onChange={(e) => editForm.setData('nom_hopital', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            editForm.errors.nom_hopital ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    />
                                    {editForm.errors.nom_hopital && (
                                        <p className="mt-1 text-sm text-red-600">{editForm.errors.nom_hopital}</p>
                                    )}
                                </div>

                                {/* Service */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Service
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.data.service}
                                        onChange={(e) => editForm.setData('service', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                </div>

                                {/* Date Début */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Date de Début *
                                    </label>
                                    <input
                                        type="date"
                                        value={editForm.data.date_debut}
                                        onChange={(e) => editForm.setData('date_debut', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            editForm.errors.date_debut ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    />
                                    {editForm.errors.date_debut && (
                                        <p className="mt-1 text-sm text-red-600">{editForm.errors.date_debut}</p>
                                    )}
                                </div>

                                {/* Date Fin */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Date de Fin *
                                    </label>
                                    <input
                                        type="date"
                                        value={editForm.data.date_fin}
                                        onChange={(e) => editForm.setData('date_fin', e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            editForm.errors.date_fin ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    />
                                    {editForm.errors.date_fin && (
                                        <p className="mt-1 text-sm text-red-600">{editForm.errors.date_fin}</p>
                                    )}
                                </div>

                                {/* Encadrant Hôpital */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Encadrant Hôpital
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.data.encadrant_hopital}
                                        onChange={(e) => editForm.setData('encadrant_hopital', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                </div>

                                {/* Encadrant Faculté */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Encadrant Faculté
                                    </label>
                                    <select
                                        value={editForm.data.encadrant_faculte}
                                        onChange={(e) => editForm.setData('encadrant_faculte', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        <option value="">Sélectionner un enseignant</option>
                                        {enseignants.map((enseignant) => (
                                            <option key={enseignant.id_enseignant} value={enseignant.id_enseignant}>
                                                {enseignant.nom} {enseignant.prenom}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Note Stage */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Note du Stage (/20)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="20"
                                        value={editForm.data.note_stage}
                                        onChange={(e) => editForm.setData('note_stage', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                                            editForm.errors.note_stage ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    />
                                    {editForm.errors.note_stage && (
                                        <p className="mt-1 text-sm text-red-600">{editForm.errors.note_stage}</p>
                                    )}
                                </div>

                                {/* Rapport Stage */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Rapport de Stage
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.data.rapport_stage}
                                        onChange={(e) => editForm.setData('rapport_stage', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingStage(null);
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
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Excel - Stages</h2>
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
                                        <li><strong>CNE:</strong> Code National Étudiant</li>
                                        <li><strong>Nom_Hopital:</strong> Nom de l'hôpital</li>
                                        <li><strong>Date_Debut:</strong> Date de début (YYYY-MM-DD)</li>
                                        <li><strong>Date_Fin:</strong> Date de fin (YYYY-MM-DD)</li>
                                    </ul>
                                    <p><strong>Colonnes optionnelles:</strong></p>
                                    <ul className="list-disc list-inside ml-4 space-y-1">
                                        <li><strong>Service:</strong> Service hospitalier</li>
                                        <li><strong>Encadrant_Hopital:</strong> Nom de l'encadrant</li>
                                        <li><strong>Note_Stage:</strong> Note sur 20</li>
                                    </ul>
                                    <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                                        💡 <strong>Conseil:</strong> Téléchargez le template ci-dessus pour un exemple complet avec instructions détaillées.
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
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CNE</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Étudiant</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hôpital</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Service</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Période</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {importPreview.slice(0, 20).map((item, index) => (
                                                    <tr key={index} className={`${item.hasErrors ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-800'}`}>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.rowNumber}</td>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.cne}</td>
                                                        <td className="px-3 py-2">
                                                            {item.inscription ? (
                                                                <div>
                                                                    <div className="text-gray-900 dark:text-gray-100">
                                                                        {item.inscription.inscriptionAdministrative?.etudiant?.nom} {item.inscription.inscriptionAdministrative?.etudiant?.prenom}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                        {item.inscription.inscriptionAdministrative?.section?.filiere?.nom_filiere}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-red-600 dark:text-red-400">Non trouvé</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.nomHopital}</td>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.service || '-'}</td>
                                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                                                            {item.dateDebut && item.dateFin ? (
                                                                <div className="text-xs">
                                                                    <div>{new Date(item.dateDebut).toLocaleDateString('fr-FR')}</div>
                                                                    <div>{new Date(item.dateFin).toLocaleDateString('fr-FR')}</div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-red-600 dark:text-red-400">Dates manquantes</span>
                                                            )}
                                                        </td>
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

export default StagesDisplay;