import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Search, Plus, Upload, Download, Edit, Trash2, X, FileSpreadsheet, Award, ChevronLeft, ChevronRight, Eye, Calendar, Filter, RefreshCw } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import debounce from 'lodash/debounce';

const CapitalisationDataTable = ({ 
  capitalisations: paginatedCapitalisations = { data: [], links: [], current_page: 1, last_page: 1, per_page: 25, total: 0 },
  inscriptionsPedagogiques = [],
  modules = [],
  niveaux = [],
  sections = [],
  filters: initialFilters = {},
  totalCount = 0
}) => {
  // Handle both paginated and non-paginated data for backwards compatibility
  const capitalisationsData = Array.isArray(paginatedCapitalisations) ? paginatedCapitalisations : (paginatedCapitalisations.data || []);
  const pagination = Array.isArray(paginatedCapitalisations) ? null : paginatedCapitalisations;

  const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCapitalisations, setSelectedCapitalisations] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  
  // Filter states
  const [filterModule, setFilterModule] = useState(initialFilters.module || '');
  const [filterNiveau, setFilterNiveau] = useState(initialFilters.niveau || '');
  const [filterSection, setFilterSection] = useState(initialFilters.section || '');
  const [filterStatut, setFilterStatut] = useState(initialFilters.statut || '');
  const [itemsPerPage, setItemsPerPage] = useState(initialFilters.per_page || 25);

  // Form state for adding capitalisation
  const [formData, setFormData] = useState({
    id_inscription_pedagogique: '',
    id_module: '',
    date_capitalisation: '',
    date_expiration: ''
  });

  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);

  // Server flash messages and import errors
  const { flash } = usePage().props;
  const serverImportErrors = useMemo(() => {
    const raw = flash?.import_errors;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (raw.error) return [raw.error];
    if (raw.errors && Array.isArray(raw.errors)) return raw.errors;
    return [raw];
  }, [flash?.import_errors]);

  useEffect(() => {
    if (flash?.success) {
      toast.success(flash.success);
    }
    if (flash?.import_partial) {
      toast.info(flash.import_partial);
    }
    if (flash?.import_errors && flash.import_errors.length > 0) {
      toast.error(`${flash.import_errors.length} capitalisations avec erreurs de validation`);
    }
  }, [flash?.success, flash?.import_partial, flash?.import_errors]);

  // Backend filtering function with debounce
  const applyFilters = useCallback((params = {}) => {
    setIsFiltering(true);
    const filterParams = {
      search: params.search !== undefined ? params.search : searchTerm,
      module: params.module !== undefined ? params.module : filterModule,
      niveau: params.niveau !== undefined ? params.niveau : filterNiveau,
      section: params.section !== undefined ? params.section : filterSection,
      statut: params.statut !== undefined ? params.statut : filterStatut,
      per_page: params.per_page !== undefined ? params.per_page : itemsPerPage,
    };

    router.get(route('inscriptions.capitalisations.index'), filterParams, {
      preserveState: true,
      preserveScroll: true,
      only: ['capitalisations', 'filters', 'totalCount'],
      onFinish: () => setIsFiltering(false),
    });
  }, [searchTerm, filterModule, filterNiveau, filterSection, filterStatut, itemsPerPage]);

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
      case 'module':
        setFilterModule(value);
        applyFilters({ module: value });
        break;
      case 'niveau':
        setFilterNiveau(value);
        applyFilters({ niveau: value });
        break;
      case 'section':
        setFilterSection(value);
        applyFilters({ section: value });
        break;
      case 'statut':
        setFilterStatut(value);
        applyFilters({ statut: value });
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
      only: ['capitalisations', 'filters', 'totalCount'],
      onFinish: () => setIsFiltering(false),
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterModule('');
    setFilterNiveau('');
    setFilterSection('');
    setFilterStatut('');
    setItemsPerPage(25);
    setIsFiltering(true);
    router.get(route('inscriptions.capitalisations.index'), { per_page: 25 }, {
      preserveState: true,
      preserveScroll: true,
      only: ['capitalisations', 'filters', 'totalCount'],
      onFinish: () => setIsFiltering(false),
    });
  };

  // Pagination info
  const currentPage = pagination?.current_page || 1;
  const lastPage = pagination?.last_page || 1;
  const total = pagination?.total || capitalisationsData.length;
  const from = pagination?.from || 1;
  const to = pagination?.to || capitalisationsData.length;

  // Handle form input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit single capitalisation
  const handleSubmit = () => {
    console.log('=== DEBUGGING CAPITALISATION CREATION ===');
    console.log('Form data being sent:', formData);
    
    router.post('/inscriptions/capitalisations', formData, {
      onSuccess: (response) => {
        console.log('✅ Capitalisation creation successful:', response);
        setShowAddModal(false);
        setFormData({
          id_inscription_pedagogique: '',
          id_module: '',
          date_capitalisation: '',
          date_expiration: ''
        });
        setFormErrors({});
        router.reload({ only: ['capitalisations'] });
      },
      onError: (errors) => {
        console.log('❌ Capitalisation creation failed with errors:', errors);
        setFormErrors(errors || {});
        
        if (errors) {
          const errorMessages = Object.values(errors).flat().join(', ');
          toast.error(`Erreur de validation: ${errorMessages}`);
        }
      }
    });
  };

  // Validation functions
  const validateDate = (date) => {
    return date && !isNaN(Date.parse(date));
  };

  // Check for duplicates in current data
  const checkDuplicates = (data, field1, field2) => {
    const combinations = data.map(row => `${row[field1]}_${row[field2]}`).filter(val => val !== '_');
    const duplicates = combinations.filter((val, index) => combinations.indexOf(val) !== index);
    return [...new Set(duplicates)];
  };

  // Check for duplicates against existing capitalisations
  const checkExistingDuplicates = (data) => {
    const existingCombinations = capitalisations.map(cap => 
      `${cap.id_inscription_pedagogique}_${cap.id_module}`
    );
    const newCombinations = data.map(row => 
      `${row.id_inscription_pedagogique}_${row.id_module}`
    ).filter(val => val !== '_');
    return newCombinations.filter(val => existingCombinations.includes(val));
  };

  // Handle Excel file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (data.length === 0) {
          toast.error('Le fichier Excel est vide');
          return;
        }

        // Comprehensive validation
        const errors = [];
        const validRows = [];
        const invalidRows = [];

        // Check for duplicates in the file
        const duplicatesInFile = checkDuplicates(data, 'id_inscription_pedagogique', 'id_module');
        
        // Check for duplicates against existing capitalisations
        const existingDuplicates = checkExistingDuplicates(data);

        const preview = data.map((row, index) => {
          const rowErrors = [];
          const rowNumber = index + 2; // Excel row number (starting from 2)

          // 1. Inscription Pédagogique Validation (Required)
          if (!row.id_inscription_pedagogique || row.id_inscription_pedagogique.toString().trim() === '') {
            rowErrors.push('ID inscription pédagogique requis');
          } else {
            const inscriptionId = row.id_inscription_pedagogique.toString().trim();
            const inscriptionExists = inscriptionsPedagogiques.some(ip => 
              ip.id_inscription_pedagogique.toString() === inscriptionId
            );
            if (!inscriptionExists) {
              rowErrors.push('Inscription pédagogique inexistante');
            }
          }

          // 2. Module Validation (Required)
          if (!row.id_module || row.id_module.toString().trim() === '') {
            rowErrors.push('ID module requis');
          } else {
            const moduleId = row.id_module.toString().trim();
            const moduleExists = modules.some(m => m.id_module.toString() === moduleId);
            if (!moduleExists) {
              rowErrors.push('Module inexistant');
            }
          }

          // 3. Date Capitalisation Validation (Required)
          if (!row.date_capitalisation || row.date_capitalisation.toString().trim() === '') {
            rowErrors.push('Date de capitalisation requise');
          } else if (!validateDate(row.date_capitalisation)) {
            rowErrors.push('Format de date de capitalisation invalide');
          }

          // 4. Date Expiration Validation (Optional)
          if (row.date_expiration && row.date_expiration.toString().trim() !== '') {
            if (!validateDate(row.date_expiration)) {
              rowErrors.push('Format de date d\'expiration invalide');
            } else if (new Date(row.date_expiration) <= new Date(row.date_capitalisation)) {
              rowErrors.push('Date d\'expiration doit être après la date de capitalisation');
            }
          }

          // 5. Check for duplicates
          const combination = `${row.id_inscription_pedagogique}_${row.id_module}`;
          if (duplicatesInFile.includes(combination)) {
            rowErrors.push('Combinaison inscription/module dupliquée dans le fichier');
          }
          if (existingDuplicates.includes(combination)) {
            rowErrors.push('Capitalisation existe déjà dans la base de données');
          }

          const capitalisationData = {
            id_inscription_pedagogique: row.id_inscription_pedagogique ? row.id_inscription_pedagogique.toString().trim() : '',
            id_module: row.id_module ? row.id_module.toString().trim() : '',
            date_capitalisation: row.date_capitalisation ? row.date_capitalisation.toString().trim() : '',
            date_expiration: row.date_expiration ? row.date_expiration.toString().trim() : ''
          };

          if (rowErrors.length > 0) {
            errors.push({ 
              row: rowNumber, 
              errors: rowErrors,
              data: capitalisationData
            });
            invalidRows.push(capitalisationData);
          } else {
            validRows.push(capitalisationData);
          }

          return capitalisationData;
        });

        setImportPreview(preview);
        setImportErrors(errors);

        // Show summary
        if (errors.length > 0) {
          toast.error(`${errors.length} erreurs détectées sur ${data.length} lignes`);
        } else {
          toast.success(`${data.length} capitalisations valides prêtes à importer`);
        }

      } catch (error) {
        console.error('Excel parsing error:', error);
        toast.error('Erreur lors de la lecture du fichier Excel. Vérifiez le format du fichier.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Submit bulk import
  const handleBulkImport = () => {
    // Filter out capitalisations with errors - only send valid ones
    const validCapitalisations = importPreview.filter(capitalisation => {
      return !importErrors.some(error => 
        error.data && 
        error.data.id_inscription_pedagogique === capitalisation.id_inscription_pedagogique &&
        error.data.id_module === capitalisation.id_module
      );
    });

    console.log('Frontend validation errors:', importErrors);
    console.log('Sending valid capitalisations payload:', validCapitalisations);
    console.log('Total capitalisations in preview:', importPreview.length);
    console.log('Valid capitalisations to send:', validCapitalisations.length);

    if (validCapitalisations.length === 0) {
      toast.error('Aucune capitalisation valide à importer');
      return;
    }

    router.post('/inscriptions/capitalisations', { capitalisations: validCapitalisations }, {
      onSuccess: (response) => {
        console.log('✅ Bulk import successful:', response);
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        setImportErrors([]);
        router.reload({ only: ['capitalisations'] });
      },
      onError: (errors) => {
        console.error('Import error:', errors);
        toast.error('Erreur lors de l\'import: ' + JSON.stringify(errors));
      }
    });
  };

  // Download error report
  const downloadErrorReport = () => {
    if (importErrors.length === 0) return;

    const errorData = importErrors.map(error => ({
      'Ligne Excel': error.row,
      'ID Inscription Pédagogique': error.data?.id_inscription_pedagogique || '',
      'ID Module': error.data?.id_module || '',
      'Date Capitalisation': error.data?.date_capitalisation || '',
      'Date Expiration': error.data?.date_expiration || '',
      'Erreurs': error.errors.join(' | '),
      'Date du Rapport': new Date().toLocaleString('fr-FR')
    }));

    const ws = XLSX.utils.json_to_sheet(errorData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Erreurs Import');
    const fileName = `rapport_erreurs_capitalisations_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Rapport d\'erreurs téléchargé');
  };

  // Download Excel template
  const downloadTemplate = () => {
    const template = [
      {
        id_inscription_pedagogique: '1',
        id_module: '1',
        date_capitalisation: '2024-01-15',
        date_expiration: '2026-01-15'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Capitalisations');
    XLSX.writeFile(wb, 'template_capitalisations.xlsx');
  };

  // Delete capitalisation
  const handleDelete = (id) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette capitalisation ?')) {
      router.delete(`/inscriptions/capitalisations/${id}`);
    }
  };

  // Select/deselect capitalisations
  const toggleSelectCapitalisation = (id) => {
    setSelectedCapitalisations(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCapitalisations.length === capitalisationsData.length) {
      setSelectedCapitalisations([]);
    } else {
      setSelectedCapitalisations(capitalisationsData.map(s => s.id_capitalisation));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mx-auto">
        <ToastContainer position="top-right" autoClose={3000} />
        
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Capitalisations</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Download className="w-4 h-4" />
                Télécharger Template
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <Upload className="w-4 h-4" />
                Import Excel
              </button>
              <button
                onClick={() => { setFormErrors({}); setShowAddModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Ajouter Capitalisation
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par CNE, nom, prénom, email, module, section, filière, niveau, année..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                <option value="valide">Valide</option>
                <option value="expire_bientot">Expire bientôt</option>
                <option value="expiree">Expirée</option>
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
                {(filterModule || filterNiveau || filterSection) && (
                  <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {[filterModule, filterNiveau, filterSection].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Module</label>
                <select
                  value={filterModule}
                  onChange={(e) => handleFilterChange('module', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous les modules</option>
                  {modules.map(module => (
                    <option key={module.id_module} value={module.id_module}>
                      {module.nom_module} ({module.code_module})
                    </option>
                  ))}
                </select>
              </div>
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
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Réinitialiser les filtres
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Server Import Errors Banner */}
        {serverImportErrors.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h3 className="text-yellow-800 dark:text-yellow-300 font-medium mb-2">Erreurs d\'import depuis le serveur:</h3>
            <div className="space-y-1 text-sm text-yellow-800 dark:text-yellow-300">
              {serverImportErrors.slice(0, 50).map((err, i) => (
                <div key={i}>
                  Ligne {err.row}: {Array.isArray(err.errors) ? err.errors.join(', ') : err.errors}
                </div>
              ))}
              {serverImportErrors.length > 50 && (
                <div className="text-yellow-700 dark:text-yellow-400">... et {serverImportErrors.length - 50} autres</div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Capitalisations</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount || total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Résultats filtrés</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Valides (page)</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {capitalisationsData.filter(cap => !cap.date_expiration || new Date(cap.date_expiration) > new Date()).length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Expirées (page)</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {capitalisationsData.filter(cap => cap.date_expiration && new Date(cap.date_expiration) < new Date()).length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Sélectionnées</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{selectedCapitalisations.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Page</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{currentPage}/{lastPage || 1}</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCapitalisations.length === capitalisationsData.length && capitalisationsData.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Étudiant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Module</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Section</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Niveau</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Année Universitaire</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date Capitalisation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date Expiration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {capitalisationsData.map((capitalisation) => {
                  const etudiant = capitalisation.inscription_pedagogique?.inscription_administrative?.etudiant;
                  const niveau = capitalisation.inscription_pedagogique?.inscription_administrative?.niveau;
                  const section = capitalisation.inscription_pedagogique?.inscription_administrative?.section;
                  const anneeUniversitaire = capitalisation.inscription_pedagogique?.inscription_administrative?.annee_universitaire;
                  const module = capitalisation.module;
                  
                  // Calculate status based on expiration date
                  const isExpired = capitalisation.date_expiration && new Date(capitalisation.date_expiration) < new Date();
                  const isExpiringSoon = capitalisation.date_expiration && 
                    new Date(capitalisation.date_expiration) > new Date() && 
                    new Date(capitalisation.date_expiration) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
                  
                  return (
                    <tr key={capitalisation.id_capitalisation} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCapitalisations.includes(capitalisation.id_capitalisation)}
                          onChange={() => toggleSelectCapitalisation(capitalisation.id_capitalisation)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div>
                          <div className="font-medium">{etudiant?.nom} {etudiant?.prenom}</div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs">{etudiant?.cne}</div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs">{etudiant?.mail_academique}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div>
                          <div className="font-medium">{module?.nom_module}</div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs">
                            {module?.code_module} • {module?.credits} crédits
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs">
                            {module?.type_module}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        <div>
                          <div className="font-medium">{section?.nom_section}</div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs">
                            {section?.filiere?.nom_filiere}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        <div>
                          <div className="font-medium">{niveau?.nom_niveau}</div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs">
                            Ordre: {niveau?.ordre}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {anneeUniversitaire?.annee_univ}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        <div>
                          <div className="font-medium">
                            {new Date(capitalisation.date_capitalisation).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs">
                            {new Date(capitalisation.date_capitalisation).toLocaleDateString('fr-FR', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {capitalisation.date_expiration ? (
                          <div>
                            <div className="font-medium">
                              {new Date(capitalisation.date_expiration).toLocaleDateString('fr-FR')}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 text-xs">
                              {Math.ceil((new Date(capitalisation.date_expiration) - new Date()) / (1000 * 60 * 60 * 24))} jours restants
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">Pas d'expiration</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {isExpired ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                            Expirée
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                            Expire bientôt
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            Valide
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {/* Add view functionality */}}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => {/* Add edit functionality */}}
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleDelete(capitalisation.id_capitalisation)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {total === 0 ? (
                  'Aucun résultat'
                ) : total <= itemsPerPage ? (
                  `Affichage de toutes les ${total} capitalisations`
                ) : (
                  `Affichage ${from} à ${to} sur ${total} capitalisations`
                )}
                {isFiltering && <span className="ml-2 text-blue-500">(chargement...)</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Afficher par page:</span>
                <div className="flex gap-2">
                  <select
                    className="px-8 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={itemsPerPage}
                    onChange={(e) => handlePerPageChange(parseInt(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                  </select>
                </div>
              </div>
            </div>

            {pagination && lastPage > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => goToPage(pagination.prev_page_url)}
                  disabled={!pagination.prev_page_url || isFiltering}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 min-w-fit">
                  Page {currentPage} sur {lastPage}
                </span>
                {pagination.links && pagination.links.slice(1, -1).map((link, i) => {
                  if (link.label === '...') {
                    return <span key={i} className="px-2 text-gray-400">...</span>;
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => goToPage(link.url)}
                      disabled={!link.url || isFiltering}
                      className={`px-3 py-1 border rounded-lg text-sm ${
                        link.active
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      } disabled:opacity-50`}
                    >
                      {link.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => goToPage(pagination.next_page_url)}
                  disabled={!pagination.next_page_url || isFiltering}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Add Capitalisation Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ajouter une Capitalisation</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                {/* General Error Display */}
                {Object.keys(formErrors).length > 0 && (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h3 className="text-red-800 dark:text-red-300 font-medium mb-2">Erreurs de validation:</h3>
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      {Object.entries(formErrors).map(([field, errors]) => (
                        <li key={field}>
                          <strong>{field}:</strong> {Array.isArray(errors) ? errors.join(', ') : errors}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Inscription Pédagogique *</label>
                    <select
                      name="id_inscription_pedagogique"
                      value={formData.id_inscription_pedagogique}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${formErrors.id_inscription_pedagogique ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    >
                      <option value="">--Sélectionner une inscription pédagogique--</option>
                      {inscriptionsPedagogiques.map(inscription => {
                        const etudiant = inscription.inscription_administrative?.etudiant;
                        const module = inscription.offre_formation?.module;
                        return (
                          <option key={inscription.id_inscription_pedagogique} value={inscription.id_inscription_pedagogique}>
                            {etudiant?.nom} {etudiant?.prenom} ({etudiant?.cne}) - {module?.nom_module}
                          </option>
                        );
                      })}
                    </select>
                    {formErrors.id_inscription_pedagogique && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.id_inscription_pedagogique}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Module *</label>
                    <select
                      name="id_module"
                      value={formData.id_module}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${formErrors.id_module ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    >
                      <option value="">--Sélectionner un module--</option>
                      {modules.map(module => (
                        <option key={module.id_module} value={module.id_module}>
                          {module.nom_module}
                        </option>
                      ))}
                    </select>
                    {formErrors.id_module && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.id_module}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date de Capitalisation *</label>
                    <input
                      type="date"
                      name="date_capitalisation"
                      value={formData.date_capitalisation}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${formErrors.date_capitalisation ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    />
                    {formErrors.date_capitalisation && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.date_capitalisation}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date d'Expiration</label>
                    <input
                      type="date"
                      name="date_expiration"
                      value={formData.date_expiration}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${formErrors.date_expiration ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    />
                    {formErrors.date_expiration && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.date_expiration}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Import Excel Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Excel - Capitalisations</h2>
                <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sélectionner un fichier Excel
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Colonnes requises: id_inscription_pedagogique, id_module, date_capitalisation<br/>
                    Colonne optionnelle: date_expiration
                  </p>
                </div>

                {/* Validation Summary */}
                {importPreview.length > 0 && (
                  <div className="mb-6 grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-blue-800 dark:text-blue-300 font-medium">Total</div>
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{importPreview.length}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-green-800 dark:text-green-300 font-medium">Valides</div>
                      <div className="text-2xl font-bold text-green-900 dark:text-green-100">{importPreview.length - importErrors.length}</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="text-red-800 dark:text-red-300 font-medium">Erreurs</div>
                      <div className="text-2xl font-bold text-red-900 dark:text-red-100">{importErrors.length}</div>
                    </div>
                  </div>
                )}

                {/* Detailed Error Display */}
                {importErrors.length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-red-800 dark:text-red-300 font-medium">
                        Erreurs de validation - {importErrors.length} capitalisations
                      </h3>
                      <button
                        onClick={downloadErrorReport}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-1"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        Télécharger Rapport
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-red-100 dark:bg-red-900/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-red-800 dark:text-red-300">Ligne</th>
                            <th className="px-3 py-2 text-left text-red-800 dark:text-red-300">ID Inscription</th>
                            <th className="px-3 py-2 text-left text-red-800 dark:text-red-300">ID Module</th>
                            <th className="px-3 py-2 text-left text-red-800 dark:text-red-300">Erreurs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-200 dark:divide-red-800">
                          {importErrors.map((error, i) => (
                            <tr key={i} className="text-red-700 dark:text-red-300">
                              <td className="px-3 py-2 font-medium">{error.row}</td>
                              <td className="px-3 py-2">{error.data?.id_inscription_pedagogique || '-'}</td>
                              <td className="px-3 py-2">{error.data?.id_module || '-'}</td>
                              <td className="px-3 py-2">
                                <div className="space-y-1">
                                  {error.errors.map((err, j) => (
                                    <div key={j} className="text-xs bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                                      {err}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 text-xs text-red-600 dark:text-red-400">
                      Corrigez les erreurs dans votre fichier Excel et réimportez-le. Seules les capitalisations valides seront importées.
                    </div>
                  </div>
                )}

                {/* Preview Section - Only show valid capitalisations */}
                {importPreview.length > 0 && importErrors.length < importPreview.length && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Aperçu des capitalisations valides ({importPreview.length - importErrors.length} capitalisations)
                    </h3>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Statut</th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">ID Inscription</th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">ID Module</th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Date Capitalisation</th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Date Expiration</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {importPreview.slice(0, 15).map((capitalisation, i) => {
                              const hasError = importErrors.some(error => error.data && 
                                error.data.id_inscription_pedagogique === capitalisation.id_inscription_pedagogique &&
                                error.data.id_module === capitalisation.id_module
                              );
                              
                              if (hasError) return null; // Don't show capitalisations with errors in preview
                              
                              return (
                                <tr key={i} className="text-gray-900 dark:text-white">
                                  <td className="px-4 py-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                      ✓ Valide
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 font-medium">{capitalisation.id_inscription_pedagogique}</td>
                                  <td className="px-4 py-2">{capitalisation.id_module}</td>
                                  <td className="px-4 py-2">{capitalisation.date_capitalisation}</td>
                                  <td className="px-4 py-2">{capitalisation.date_expiration || '-'}</td>
                                </tr>
                              );
                            }).filter(Boolean)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {(importPreview.length - importErrors.length) > 15 && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        ... et {(importPreview.length - importErrors.length) - 15} autres capitalisations valides
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    Annuler
                  </button>
                  {importErrors.length > 0 && importPreview.length > importErrors.length ? (
                    <button
                      onClick={handleBulkImport}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      Importer seulement les {importPreview.length - importErrors.length} capitalisations valides
                    </button>
                  ) : importErrors.length === 0 && importPreview.length > 0 ? (
                    <button
                      onClick={handleBulkImport}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Importer {importPreview.length} capitalisations
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
                    >
                      {importPreview.length === 0 ? 'Aucune capitalisation à importer' : 'Corrigez les erreurs pour importer'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CapitalisationDataTable;