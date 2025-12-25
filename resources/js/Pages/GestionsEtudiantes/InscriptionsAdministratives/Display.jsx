import React, { useState, useMemo, useCallback } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Search, Plus, Upload, Download, Trash2, X, FileSpreadsheet, Users, ChevronLeft, ChevronRight, Eye, Edit, Filter, Loader2, RefreshCw } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import axios from 'axios';
import debounce from 'lodash/debounce';

// Inertia props from controller
const Display = ({ 
  inscriptions: paginatedInscriptions = { data: [], links: [], current_page: 1, last_page: 1, per_page: 25, total: 0 },
  students = [],
  annees = [],
  niveaux = [],
  sections = [],
  filters: initialFilters = {},
  totalCount = 0
}) => {
  // Handle both paginated and non-paginated data for backwards compatibility
  const inscriptionsData = Array.isArray(paginatedInscriptions) ? paginatedInscriptions : (paginatedInscriptions.data || []);
  const pagination = Array.isArray(paginatedInscriptions) ? null : paginatedInscriptions;
  
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedInscriptions, setSelectedInscriptions] = useState([]);
  const [editingInscription, setEditingInscription] = useState(null);
  const [filterAnnee, setFilterAnnee] = useState(initialFilters.annee || '');
  const [filterNiveau, setFilterNiveau] = useState(initialFilters.niveau || '');
  const [filterSection, setFilterSection] = useState(initialFilters.section || '');
  const [filterStatut, setFilterStatut] = useState(initialFilters.statut || '');
  const [itemsPerPage, setItemsPerPage] = useState(initialFilters.per_page || 25);
  const [showFilters, setShowFilters] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  // Using useForm for better error handling
  const inscriptionForm = useForm({
    id_etudiant: '',
    id_annee: '',
    id_niveau: '',
    id_section: '',
    date_inscription: new Date().toISOString().split('T')[0],
    statut: 'Active',
    type_inscription: 'nouveau'
  });

  const editForm = useForm({
    id_etudiant: '',
    id_annee: '',
    id_niveau: '',
    id_section: '',
    date_inscription: '',
    statut: '',
    type_inscription: ''
  });

  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [backendErrors, setBackendErrors] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedImportAnnee, setSelectedImportAnnee] = useState('');
  const [selectedImportNiveau, setSelectedImportNiveau] = useState('');
  const [selectedImportSection, setSelectedImportSection] = useState('');
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
  const [importStatut, setImportStatut] = useState('Active');
  const [importType, setImportType] = useState('nouveau');

  // Backend filtering function with debounce
  const applyFilters = useCallback((params = {}) => {
    setIsFiltering(true);
    const filterParams = {
      search: params.search !== undefined ? params.search : searchTerm,
      annee: params.annee !== undefined ? params.annee : filterAnnee,
      niveau: params.niveau !== undefined ? params.niveau : filterNiveau,
      section: params.section !== undefined ? params.section : filterSection,
      statut: params.statut !== undefined ? params.statut : filterStatut,
      per_page: params.per_page !== undefined ? params.per_page : itemsPerPage,
    };

    router.get(route('inscriptions.administratives.index'), filterParams, {
      preserveState: true,
      preserveScroll: true,
      only: ['inscriptions', 'filters', 'totalCount'],
      onFinish: () => setIsFiltering(false),
    });
  }, [searchTerm, filterAnnee, filterNiveau, filterSection, filterStatut, itemsPerPage]);

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
      case 'annee':
        setFilterAnnee(value);
        applyFilters({ annee: value });
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
      only: ['inscriptions', 'filters', 'totalCount'],
      onFinish: () => setIsFiltering(false),
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterAnnee('');
    setFilterNiveau('');
    setFilterSection('');
    setFilterStatut('');
    setItemsPerPage(25);
    setIsFiltering(true);
    router.get(route('inscriptions.administratives.index'), { per_page: 25 }, {
      preserveState: true,
      preserveScroll: true,
      only: ['inscriptions', 'filters', 'totalCount'],
      onFinish: () => setIsFiltering(false),
    });
  };

  // Pagination info
  const currentPage = pagination?.current_page || 1;
  const lastPage = pagination?.last_page || 1;
  const total = pagination?.total || inscriptionsData.length;
  const from = pagination?.from || 1;
  const to = pagination?.to || inscriptionsData.length;

  // Submit single inscription
  const handleSubmit = (e) => {
    e.preventDefault();
    inscriptionForm.post('/inscriptions/administratives', {
      onSuccess: () => {
        setShowAddModal(false);
        inscriptionForm.reset();
        Swal.fire({
          icon: 'success',
          title: 'Inscription ajoutée',
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          // Redirect to the inscriptions page after success
          router.visit(route('inscriptions.administratives.index'));
        });
      },
      onError: (errors) => {
        console.error('Form errors:', errors);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Veuillez corriger les erreurs dans le formulaire'
        });
      }
    });
  };

  // Handle Excel file selection - only CNE is imported
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportFile(file);
    setBackendErrors([]); // Clear previous backend errors
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (data.length === 0) {
          toast.error('Le fichier Excel est vide', { icon: '📄', autoClose: 4000 });
          return;
        }

        // Validate and format data - only CNE is required
        const errors = [];
        const cneDuplicates = [];
        const cneList = data.map(row => row.cne ? row.cne.toString().trim().toUpperCase() : '');
        
        // Find duplicates in file
        const cneCounts = {};
        cneList.forEach(cne => {
          if (cne) cneCounts[cne] = (cneCounts[cne] || 0) + 1;
        });
        const duplicatesInFile = Object.keys(cneCounts).filter(cne => cneCounts[cne] > 1);

        const preview = data.map((row, index) => {
          const rowErrors = [];
          const rowNumber = index + 2; // Excel row number
          const cne = row.cne ? row.cne.toString().trim().toUpperCase() : '';
          
          // Check for CNE
          if (!cne) {
            rowErrors.push('CNE requis');
          } else {
            // Check for duplicates in file
            if (duplicatesInFile.includes(cne)) {
              rowErrors.push('CNE dupliqué dans le fichier');
            }
          }
          
          // Find student by CNE (case-insensitive)
          const student = students.find(s => s.cne?.toUpperCase() === cne);
          
          if (cne && !student) {
            rowErrors.push('Étudiant non trouvé dans la base de données');
          }

          if (rowErrors.length > 0) {
            errors.push({ 
              row: rowNumber, 
              cne: cne,
              errors: rowErrors,
              student: student
            });
          }

          return {
            cne: cne,
            student: student,
            rowNumber: rowNumber,
            hasError: rowErrors.length > 0,
            errors: rowErrors
          };
        });

        setImportPreview(preview);
        setImportErrors(errors);

        // Show summary toast
        const validCount = preview.filter(p => !p.hasError && p.student).length;
        const errorCount = errors.length;
        
        if (errorCount > 0) {
          if (validCount > 0) {
            toast.warning(
              `Fichier analysé: ${validCount} valide${validCount > 1 ? 's' : ''}, ${errorCount} avec erreurs`,
              { icon: '⚠️', autoClose: 5000 }
            );
          } else {
            toast.error(
              `Aucune inscription valide: ${errorCount} erreur${errorCount > 1 ? 's' : ''} détectée${errorCount > 1 ? 's' : ''}`,
              { icon: '❌', autoClose: 5000 }
            );
          }
        } else {
          toast.success(
            `Fichier validé: ${validCount} inscription${validCount > 1 ? 's' : ''} prête${validCount > 1 ? 's' : ''} à importer`,
            { icon: '✅', autoClose: 4000 }
          );
        }
      } catch (error) {
        console.error('Excel parsing error:', error);
        toast.error('Erreur lors de la lecture du fichier Excel', { icon: '📄', autoClose: 5000 });
      }
    };

    reader.readAsBinaryString(file);
  };

  // Submit bulk import
  const handleBulkImport = async () => {
    if (!selectedImportAnnee || !selectedImportNiveau || !selectedImportSection) {
      toast.error('Veuillez sélectionner une année, un niveau et une section pour l\'import.', { icon: '⚠️' });
      return;
    }

    // Filter valid inscriptions (students found and no errors)
    const validItems = importPreview.filter(item => item.student && !item.hasError);

    if (validItems.length === 0) {
      toast.error('Aucun étudiant valide trouvé pour l\'import', { icon: '❌' });
      return;
    }

    const inscriptionsToImport = validItems.map(item => ({
      id_etudiant: item.student.id_etudiant,
      id_annee: selectedImportAnnee,
      id_niveau: selectedImportNiveau,
      id_section: selectedImportSection,
      date_inscription: importDate,
      statut: importStatut,
      type_inscription: importType
    }));

    setIsImporting(true);
    setBackendErrors([]);

    try {
      const response = await axios.post('/inscriptions/administratives', 
        { inscriptions: inscriptionsToImport },
        {
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      );

      console.log('Import response:', response);
      const responseData = response.data;

      // Check for backend errors
      if (responseData.import_errors && responseData.import_errors.length > 0) {
        setBackendErrors(responseData.import_errors);
        
        if (responseData.created > 0) {
          toast.warning(
            `Import partiel: ${responseData.created} créée${responseData.created > 1 ? 's' : ''}, ${responseData.import_errors.length} erreur${responseData.import_errors.length > 1 ? 's' : ''}`,
            { icon: '⚠️', autoClose: 6000 }
          );
          router.reload({ only: ['inscriptions'] });
        } else {
          toast.error(
            `Import échoué: ${responseData.import_errors.length} erreur${responseData.import_errors.length > 1 ? 's' : ''}`,
            { icon: '❌', autoClose: 6000 }
          );
        }
      } else {
        // Success
        const createdCount = responseData.created || validItems.length;
        toast.success(
          `Import réussi: ${createdCount} inscription${createdCount > 1 ? 's' : ''} créée${createdCount > 1 ? 's' : ''}!`,
          { icon: '🎉', autoClose: 4000 }
        );
        
        // Reset and close modal
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        setImportErrors([]);
        setBackendErrors([]);
        setSelectedImportAnnee('');
        setSelectedImportNiveau('');
        setSelectedImportSection('');
        setImportDate(new Date().toISOString().split('T')[0]);
        setImportStatut('Active');
        setImportType('nouveau');
        
        router.reload({ only: ['inscriptions'] });
      }
    } catch (error) {
      console.error('Import error:', error);
      
      if (error.response) {
        const responseData = error.response.data;
        
        if (responseData.import_errors && responseData.import_errors.length > 0) {
          setBackendErrors(responseData.import_errors);
          toast.error(
            `${responseData.import_errors.length} erreur${responseData.import_errors.length > 1 ? 's' : ''} détectée${responseData.import_errors.length > 1 ? 's' : ''} par le serveur`,
            { icon: '❌', autoClose: 6000 }
          );
        } else if (error.response.status === 422 && responseData.errors) {
          const errorMessages = Object.values(responseData.errors).flat();
          toast.error(`Erreur de validation: ${errorMessages.join(', ')}`, { icon: '❌', autoClose: 6000 });
        } else {
          toast.error(`Erreur: ${responseData.message || 'Erreur inconnue'}`, { icon: '❌', autoClose: 6000 });
        }
      } else {
        toast.error(`Erreur de connexion: ${error.message}`, { icon: '❌', autoClose: 6000 });
      }
    } finally {
      setIsImporting(false);
    }
  };

  // Download error report
  const downloadErrorReport = () => {
    const allErrors = [...importErrors, ...backendErrors];
    if (allErrors.length === 0) return;

    const now = new Date();
    const timestamp = now.toLocaleString('fr-FR');
    const dateForFilename = now.toISOString().split('T')[0];
    const timeForFilename = now.toTimeString().split(' ')[0].replace(/:/g, '-');

    const totalRows = importPreview.length;
    const validCount = importPreview.filter(p => !p.hasError && p.student).length;
    const errorCount = allErrors.length;

    // Summary sheet
    const summaryData = [
      { 'Information': 'Rapport d\'erreurs - Import Inscriptions Administratives', 'Valeur': '' },
      { 'Information': '', 'Valeur': '' },
      { 'Information': 'Date et heure du rapport', 'Valeur': timestamp },
      { 'Information': 'Fichier source', 'Valeur': importFile?.name || 'Non spécifié' },
      { 'Information': '', 'Valeur': '' },
      { 'Information': '--- RÉSUMÉ ---', 'Valeur': '' },
      { 'Information': 'Total de lignes', 'Valeur': totalRows },
      { 'Information': 'Inscriptions valides', 'Valeur': validCount },
      { 'Information': 'Erreurs', 'Valeur': errorCount },
      { 'Information': '', 'Valeur': '' },
      { 'Information': '--- PARAMÈTRES D\'IMPORT ---', 'Valeur': '' },
      { 'Information': 'Année universitaire', 'Valeur': annees.find(a => a.id_annee == selectedImportAnnee)?.annee_univ || 'Non sélectionnée' },
      { 'Information': 'Niveau', 'Valeur': niveaux.find(n => n.id_niveau == selectedImportNiveau)?.nom_niveau || 'Non sélectionné' },
      { 'Information': 'Section', 'Valeur': sections.find(s => s.id_section == selectedImportSection)?.nom_section || 'Non sélectionnée' },
    ];

    // Error types count
    const errorTypeCounts = {};
    allErrors.forEach(error => {
      const errors = Array.isArray(error.errors) ? error.errors : [error.errors];
      errors.forEach(err => {
        errorTypeCounts[err] = (errorTypeCounts[err] || 0) + 1;
      });
    });

    summaryData.push({ 'Information': '', 'Valeur': '' });
    summaryData.push({ 'Information': '--- TYPES D\'ERREURS ---', 'Valeur': '' });
    Object.entries(errorTypeCounts).forEach(([errorType, count]) => {
      summaryData.push({ 'Information': errorType, 'Valeur': count });
    });

    // Detailed errors sheet
    const errorData = allErrors.map((error, index) => {
      const errors = Array.isArray(error.errors) ? error.errors : [error.errors];
      return {
        '#': index + 1,
        'Ligne Excel': error.row || 'N/A',
        'CNE': error.cne || '(vide)',
        'Étudiant': error.student ? `${error.student.nom} ${error.student.prenom}` : 'Non trouvé',
        'Nombre d\'erreurs': errors.length,
        'Erreur 1': errors[0] || '',
        'Erreur 2': errors[1] || '',
        'Erreur 3': errors[2] || '',
        'Toutes les erreurs': errors.join(' | ')
      };
    });

    const wb = XLSX.utils.book_new();
    
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

    const wsErrors = XLSX.utils.json_to_sheet(errorData);
    wsErrors['!cols'] = [
      { wch: 5 }, { wch: 10 }, { wch: 15 }, { wch: 25 },
      { wch: 15 }, { wch: 35 }, { wch: 35 }, { wch: 35 }, { wch: 60 }
    ];
    XLSX.utils.book_append_sheet(wb, wsErrors, 'Détails Erreurs');

    const fileName = `rapport_erreurs_inscriptions_${dateForFilename}_${timeForFilename}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Rapport téléchargé: ${errorCount} erreurs`, { icon: '📥', autoClose: 4000 });
  };

  // Download Excel template
  const downloadTemplate = () => {
    const template = [
      {
        cne: 'R123456789'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscriptions');
    XLSX.writeFile(wb, 'template_inscriptions.xlsx');
  };

  // Select/deselect inscriptions
  const toggleSelectInscription = (id) => {
    setSelectedInscriptions(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedInscriptions.length === inscriptionsData.length) {
      setSelectedInscriptions([]);
    } else {
      setSelectedInscriptions(inscriptionsData.map(i => i.id_inscription_admin));
    }
  };

  // Edit inscription
  const handleEdit = (inscription) => {
    setEditingInscription(inscription);
    editForm.setData({
      id_etudiant: inscription.id_etudiant,
      id_annee: inscription.id_annee,
      id_niveau: inscription.id_niveau,
      id_section: inscription.id_section,
      date_inscription: inscription.date_inscription,
      statut: inscription.statut,
      type_inscription: inscription.type_inscription
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    editForm.put(`/inscriptions/administratives/${editingInscription.id_inscription_admin}`, {
      onSuccess: () => {
        setShowEditModal(false);
        setEditingInscription(null);
        editForm.reset();
        Swal.fire({
          icon: 'success',
          title: 'Inscription modifiée',
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          router.visit(route('inscriptions.administratives.index'));
        });
      },
      onError: (errors) => {
        console.error('Form errors:', errors);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Veuillez corriger les erreurs dans le formulaire'
        });
      }
    });
  };

  // Delete inscription
  const handleDelete = (id) => {
    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: "Cette action est irréversible!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        router.delete(`/inscriptions/administratives/${id}`, {
          onSuccess: () => {
            Swal.fire('Supprimé!', 'L\'inscription a été supprimée.', 'success');
          },
          onError: () => {
            Swal.fire('Erreur!', 'Impossible de supprimer cette inscription.', 'error');
          }
        });
      }
    });
  };

  // Bulk delete
  const handleBulkDelete = () => {
    if (selectedInscriptions.length === 0) {
      Swal.fire('Attention', 'Veuillez sélectionner au moins une inscription', 'warning');
      return;
    }

    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: `Vous allez supprimer ${selectedInscriptions.length} inscription(s)`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        router.post('/inscriptions/administratives/bulk-destroy', { ids: selectedInscriptions }, {
          onSuccess: () => {
            setSelectedInscriptions([]);
            Swal.fire('Supprimé!', 'Les inscriptions ont été supprimées.', 'success');
          },
          onError: () => {
            Swal.fire('Erreur!', 'Une erreur est survenue lors de la suppression.', 'error');
          }
        });
      }
    });
  };

  // Export to Excel
  const handleExport = () => {
    const dataToExport = inscriptionsData.map(inscription => ({
      'ID': inscription.id_inscription_admin || '',
      'CNE': inscription.etudiant?.cne || '',
      'Nom': inscription.etudiant?.nom || '',
      'Prénom': inscription.etudiant?.prenom || '',
      'Email': inscription.etudiant?.mail_academique || '',
      'Année Universitaire': inscription.annee_universitaire?.annee_univ || '',
      'Niveau': inscription.niveau?.nom_niveau || '',
      'Section': inscription.section?.nom_section || '',
      'Filière': inscription.section?.filiere?.nom_filiere || '',
      'Date Inscription': inscription.date_inscription,
      'Statut': inscription.statut,
      'Type': inscription.type_inscription
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscriptions');
    XLSX.writeFile(wb, `inscriptions_administratives_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Clear filters - moved to earlier in the component

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="p-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 mb-6 transition-colors">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Inscriptions Administratives</h1>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {selectedInscriptions.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Supprimer ({selectedInscriptions.length})</span>
                </button>
              )}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exporter</span>
              </button>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Template</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Importer</span>
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

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par CNE, nom, prénom, email..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
              {isFiltering && (
                <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-4 h-4 animate-spin" />
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showFilters 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filtres</span>
              {(filterAnnee || filterNiveau || filterSection || filterStatut) && (
                <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {[filterAnnee, filterNiveau, filterSection, filterStatut].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Année</label>
                <select
                  value={filterAnnee}
                  onChange={(e) => handleFilterChange('annee', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Toutes</option>
                  {annees.map(annee => (
                    <option key={annee.id_annee} value={annee.id_annee}>{annee.annee_univ}</option>
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
                  <option value="">Tous</option>
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
                  <option value="">Toutes</option>
                  {sections.map(section => (
                    <option key={section.id_section} value={section.id_section}>
                      {section.filiere?.nom_filiere} ({section.nom_section})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statut</label>
                <select
                  value={filterStatut}
                  onChange={(e) => handleFilterChange('statut', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Inscriptions</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount || total}</div>
              </div>
              <Users className="w-10 h-10 text-blue-500 dark:text-blue-400 opacity-50" />
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
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Sélectionnées</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{selectedInscriptions.length}</div>
              </div>
              <FileSpreadsheet className="w-10 h-10 text-purple-500 dark:text-purple-400 opacity-50" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Page</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{currentPage}/{lastPage || 1}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={inscriptionsData.length > 0 && selectedInscriptions.length === inscriptionsData.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">CNE</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Étudiant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Année</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Niveau</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Section</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {inscriptionsData.map((inscription) => (
                  <tr key={inscription.id_inscription_admin} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedInscriptions.includes(inscription.id_inscription_admin)}
                        onChange={() => toggleSelectInscription(inscription.id_inscription_admin)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{inscription.etudiant?.cne}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {inscription.etudiant?.nom} {inscription.etudiant?.prenom}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{inscription.annee_universitaire?.annee_univ}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{inscription.niveau?.nom_niveau}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {inscription.section?.filiere?.nom_filiere} ({inscription.section?.nom_section})
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{inscription.date_inscription}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        inscription.statut === 'Active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                      }`}>
                        {inscription.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{inscription.type_inscription}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(inscription)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(inscription.id_inscription_admin)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {total === 0 ? (
                  'Aucun résultat'
                ) : total <= itemsPerPage ? (
                  `Affichage de tous les ${total} résultats`
                ) : (
                  `Affichage ${from} à ${to} sur ${total} résultats`
                )}
                {isFiltering && <span className="ml-2 text-blue-500">(chargement...)</span>}
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
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      } disabled:opacity-50`}
                    >
                      {link.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => goToPage(pagination.next_page_url)}
                  disabled={!pagination.next_page_url || isFiltering}
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Add Inscription Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ajouter une Inscription</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Étudiant *</label>
                    <select
                      name="id_etudiant"
                      value={inscriptionForm.data.id_etudiant}
                      onChange={(e) => inscriptionForm.setData('id_etudiant', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        inscriptionForm.errors.id_etudiant ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="">--Sélectionner un étudiant--</option>
                      {students.map(student => (
                        <option key={student.id_etudiant} value={student.id_etudiant}>
                          {student.cne} - {student.nom} {student.prenom}
                        </option>
                      ))}
                    </select>
                    {inscriptionForm.errors.id_etudiant && (
                      <div className="text-red-500 text-sm mt-1">{inscriptionForm.errors.id_etudiant}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Année Universitaire *</label>
                    <select
                      name="id_annee"
                      value={inscriptionForm.data.id_annee}
                      onChange={(e) => inscriptionForm.setData('id_annee', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        inscriptionForm.errors.id_annee ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="">--Sélectionner une année--</option>
                      {annees.map(annee => (
                        <option key={annee.id_annee} value={annee.id_annee}>
                          {annee.annee_univ}
                        </option>
                      ))}
                    </select>
                    {inscriptionForm.errors.id_annee && (
                      <div className="text-red-500 text-sm mt-1">{inscriptionForm.errors.id_annee}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Niveau *</label>
                    <select
                      name="id_niveau"
                      value={inscriptionForm.data.id_niveau}
                      onChange={(e) => inscriptionForm.setData('id_niveau', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        inscriptionForm.errors.id_niveau ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="">--Sélectionner un niveau--</option>
                      {niveaux.map(niveau => (
                        <option key={niveau.id_niveau} value={niveau.id_niveau}>
                          {niveau.nom_niveau} ({niveau.code_niveau})
                        </option>
                      ))}
                    </select>
                    {inscriptionForm.errors.id_niveau && (
                      <div className="text-red-500 text-sm mt-1">{inscriptionForm.errors.id_niveau}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Section *</label>
                    <select
                      name="id_section"
                      value={inscriptionForm.data.id_section}
                      onChange={(e) => inscriptionForm.setData('id_section', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        inscriptionForm.errors.id_section ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="">--Sélectionner une section--</option>
                      {sections.map(section => (
                        <option key={section.id_section} value={section.id_section}>
                          {section.filiere.nom_filiere} ({section.nom_section})
                        </option>
                      ))}
                    </select>
                    {inscriptionForm.errors.id_section && (
                      <div className="text-red-500 text-sm mt-1">{inscriptionForm.errors.id_section}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date d'inscription *</label>
                    <input
                      type="date"
                      name="date_inscription"
                      value={inscriptionForm.data.date_inscription}
                      onChange={(e) => inscriptionForm.setData('date_inscription', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        inscriptionForm.errors.date_inscription ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {inscriptionForm.errors.date_inscription && (
                      <div className="text-red-500 text-sm mt-1">{inscriptionForm.errors.date_inscription}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statut</label>
                    <select
                      name="statut"
                      value={inscriptionForm.data.statut}
                      onChange={(e) => inscriptionForm.setData('statut', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        inscriptionForm.errors.statut ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    {inscriptionForm.errors.statut && (
                      <div className="text-red-500 text-sm mt-1">{inscriptionForm.errors.statut}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type d'inscription</label>
                    <select
                      name="type_inscription"
                      value={inscriptionForm.data.type_inscription}
                      onChange={(e) => inscriptionForm.setData('type_inscription', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        inscriptionForm.errors.type_inscription ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="nouveau">Nouveau</option>
                      <option value="redoublant">Redoublant</option>
                      <option value="transfert">Transfert</option>
                    </select>
                    {inscriptionForm.errors.type_inscription && (
                      <div className="text-red-500 text-sm mt-1">{inscriptionForm.errors.type_inscription}</div>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={inscriptionForm.processing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
                  >
                    {inscriptionForm.processing ? 'Enregistrement...' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Inscription Modal */}
        {showEditModal && editingInscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Modifier l'Inscription</h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Étudiant *</label>
                    <select
                      name="id_etudiant"
                      value={editForm.data.id_etudiant}
                      onChange={(e) => editForm.setData('id_etudiant', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        editForm.errors.id_etudiant ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="">--Sélectionner un étudiant--</option>
                      {students.map(student => (
                        <option key={student.id_etudiant} value={student.id_etudiant}>
                          {student.cne} - {student.nom} {student.prenom}
                        </option>
                      ))}
                    </select>
                    {editForm.errors.id_etudiant && (
                      <div className="text-red-500 text-sm mt-1">{editForm.errors.id_etudiant}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Année Universitaire *</label>
                    <select
                      name="id_annee"
                      value={editForm.data.id_annee}
                      onChange={(e) => editForm.setData('id_annee', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        editForm.errors.id_annee ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="">--Sélectionner une année--</option>
                      {annees.map(annee => (
                        <option key={annee.id_annee} value={annee.id_annee}>
                          {annee.annee_univ}
                        </option>
                      ))}
                    </select>
                    {editForm.errors.id_annee && (
                      <div className="text-red-500 text-sm mt-1">{editForm.errors.id_annee}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Niveau *</label>
                    <select
                      name="id_niveau"
                      value={editForm.data.id_niveau}
                      onChange={(e) => editForm.setData('id_niveau', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        editForm.errors.id_niveau ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="">--Sélectionner un niveau--</option>
                      {niveaux.map(niveau => (
                        <option key={niveau.id_niveau} value={niveau.id_niveau}>
                          {niveau.nom_niveau} ({niveau.code_niveau})
                        </option>
                      ))}
                    </select>
                    {editForm.errors.id_niveau && (
                      <div className="text-red-500 text-sm mt-1">{editForm.errors.id_niveau}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Section *</label>
                    <select
                      name="id_section"
                      value={editForm.data.id_section}
                      onChange={(e) => editForm.setData('id_section', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        editForm.errors.id_section ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="">--Sélectionner une section--</option>
                      {sections.map(section => (
                        <option key={section.id_section} value={section.id_section}>
                          {section.filiere?.nom_filiere} ({section.nom_section})
                        </option>
                      ))}
                    </select>
                    {editForm.errors.id_section && (
                      <div className="text-red-500 text-sm mt-1">{editForm.errors.id_section}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date d'inscription *</label>
                    <input
                      type="date"
                      name="date_inscription"
                      value={editForm.data.date_inscription}
                      onChange={(e) => editForm.setData('date_inscription', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        editForm.errors.date_inscription ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {editForm.errors.date_inscription && (
                      <div className="text-red-500 text-sm mt-1">{editForm.errors.date_inscription}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statut</label>
                    <select
                      name="statut"
                      value={editForm.data.statut}
                      onChange={(e) => editForm.setData('statut', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        editForm.errors.statut ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    {editForm.errors.statut && (
                      <div className="text-red-500 text-sm mt-1">{editForm.errors.statut}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type d'inscription</label>
                    <select
                      name="type_inscription"
                      value={editForm.data.type_inscription}
                      onChange={(e) => editForm.setData('type_inscription', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        editForm.errors.type_inscription ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="nouveau">Nouveau</option>
                      <option value="redoublant">Redoublant</option>
                      <option value="transfert">Transfert</option>
                    </select>
                    {editForm.errors.type_inscription && (
                      <div className="text-red-500 text-sm mt-1">{editForm.errors.type_inscription}</div>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={editForm.processing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
                  >
                    {editForm.processing ? 'Enregistrement...' : 'Modifier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Import Excel Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Excel - Inscriptions</h2>
                <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sélectionner un fichier Excel (CNE uniquement)
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
                  />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Le fichier Excel doit contenir uniquement une colonne "cne". Les autres informations seront sélectionnées ci-dessous.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Année Universitaire *
                    </label>
                    <select
                      value={selectedImportAnnee}
                      onChange={(e) => setSelectedImportAnnee(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="">--Sélectionner une année--</option>
                      {annees.map(annee => (
                        <option key={annee.id_annee} value={annee.id_annee}>
                          {annee.annee_univ}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Niveau *
                    </label>
                    <select
                      value={selectedImportNiveau}
                      onChange={(e) => setSelectedImportNiveau(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="">--Sélectionner un niveau--</option>
                      {niveaux.map(niveau => (
                        <option key={niveau.id_niveau} value={niveau.id_niveau}>
                          {niveau.nom_niveau} ({niveau.code_niveau})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Section *
                    </label>
                    <select
                      value={selectedImportSection}
                      onChange={(e) => setSelectedImportSection(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="">--Sélectionner une section--</option>
                      {sections.map(section => (
                        <option key={section.id_section} value={section.id_section}>
                          {section.filiere.nom_filiere}({section.nom_section})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date d'inscription *
                    </label>
                    <input
                      type="date"
                      value={importDate}
                      onChange={(e) => setImportDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Statut
                    </label>
                    <select
                      value={importStatut}
                      onChange={(e) => setImportStatut(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type d'inscription
                    </label>
                    <select
                      value={importType}
                      onChange={(e) => setImportType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="nouveau">Nouveau</option>
                      <option value="redoublant">Redoublant</option>
                      <option value="transfert">Transfert</option>
                    </select>
                  </div>
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
                      <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {importPreview.filter(p => !p.hasError && p.student).length}
                      </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="text-red-800 dark:text-red-300 font-medium">Erreurs</div>
                      <div className="text-2xl font-bold text-red-900 dark:text-red-100">{importErrors.length}</div>
                    </div>
                  </div>
                )}

                {/* Frontend Errors Display */}
                {importErrors.length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-red-800 dark:text-red-300 font-medium">
                        Erreurs de validation - {importErrors.length} ligne{importErrors.length > 1 ? 's' : ''}
                      </h3>
                      <button
                        onClick={downloadErrorReport}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-1"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        Télécharger Rapport
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-red-100 dark:bg-red-900/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-red-800 dark:text-red-300">Ligne</th>
                            <th className="px-3 py-2 text-left text-red-800 dark:text-red-300">CNE</th>
                            <th className="px-3 py-2 text-left text-red-800 dark:text-red-300">Erreurs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-200 dark:divide-red-800">
                          {importErrors.map((error, i) => (
                            <tr key={i} className="text-red-700 dark:text-red-300">
                              <td className="px-3 py-2 font-medium">{error.row}</td>
                              <td className="px-3 py-2">{error.cne || '-'}</td>
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
                  </div>
                )}

                {/* Backend Errors Display */}
                {backendErrors.length > 0 && (
                  <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-orange-800 dark:text-orange-300 font-medium">
                        ⚠️ Erreurs serveur - {backendErrors.length} inscription{backendErrors.length > 1 ? 's' : ''} rejetée{backendErrors.length > 1 ? 's' : ''}
                      </h3>
                      <button
                        onClick={downloadErrorReport}
                        className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 flex items-center gap-1"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        Télécharger Rapport
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-orange-100 dark:bg-orange-900/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-orange-800 dark:text-orange-300">CNE</th>
                            <th className="px-3 py-2 text-left text-orange-800 dark:text-orange-300">Étudiant</th>
                            <th className="px-3 py-2 text-left text-orange-800 dark:text-orange-300">Erreurs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-200 dark:divide-orange-800">
                          {backendErrors.map((error, i) => {
                            const errors = Array.isArray(error.errors) ? error.errors : [error.errors];
                            return (
                              <tr key={i} className="text-orange-700 dark:text-orange-300">
                                <td className="px-3 py-2">{error.cne || '-'}</td>
                                <td className="px-3 py-2">{error.student_name || '-'}</td>
                                <td className="px-3 py-2">
                                  <div className="space-y-1">
                                    {errors.map((err, j) => (
                                      <div key={j} className="text-xs bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
                                        {err}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Preview Section with validation status */}
                {importPreview.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Aperçu ({importPreview.length} lignes - {importPreview.filter(p => !p.hasError && p.student).length} valides)
                    </h3>
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ligne</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CNE</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Étudiant</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Erreurs</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {importPreview.map((item, i) => (
                              <tr 
                                key={i}
                                className={item.hasError || !item.student
                                  ? 'bg-red-50 dark:bg-red-900/20'
                                  : 'bg-green-50 dark:bg-green-900/10'
                                }
                              >
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{item.rowNumber}</td>
                                <td className="px-4 py-2">
                                  {item.hasError || !item.student ? (
                                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                                      ✗ Invalide
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                      ✓ Valide
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{item.cne || '-'}</td>
                                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                  {item.student ? `${item.student.nom} ${item.student.prenom}` : 'Non trouvé'}
                                </td>
                                <td className="px-4 py-2">
                                  {item.errors && item.errors.length > 0 && (
                                    <div className="space-y-1">
                                      {item.errors.map((err, j) => (
                                        <div key={j} className="text-xs bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded text-red-700 dark:text-red-300">
                                          {err}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Annuler
                  </button>
                  {(() => {
                    const validCount = importPreview.filter(p => !p.hasError && p.student).length;
                    const hasValidRows = validCount > 0;
                    const hasErrors = importErrors.length > 0;
                    const allFieldsSelected = selectedImportAnnee && selectedImportNiveau && selectedImportSection;

                    if (importPreview.length === 0) {
                      return (
                        <button disabled className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed">
                          Sélectionnez un fichier Excel
                        </button>
                      );
                    }

                    if (!allFieldsSelected) {
                      return (
                        <button disabled className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed">
                          Sélectionnez année, niveau et section
                        </button>
                      );
                    }

                    if (!hasValidRows) {
                      return (
                        <button disabled className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed">
                          Aucune inscription valide
                        </button>
                      );
                    }

                    if (isImporting) {
                      return (
                        <button disabled className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Import en cours...
                        </button>
                      );
                    }

                    if (hasErrors && hasValidRows) {
                      return (
                        <button
                          onClick={handleBulkImport}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                        >
                          Importer seulement les {validCount} valides
                        </button>
                      );
                    }

                    return (
                      <button
                        onClick={handleBulkImport}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                      >
                        Importer {validCount} inscription{validCount > 1 ? 's' : ''}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Display;