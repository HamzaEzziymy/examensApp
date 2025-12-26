import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Search, Plus, Upload, Download, Edit, Trash2, X, Award, ChevronLeft, ChevronRight, Filter, RefreshCw } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import debounce from 'lodash/debounce';
import Swal from 'sweetalert2';

const CapitalisationDataTable = ({ 
  capitalisations: paginatedCapitalisations = { data: [], links: [], current_page: 1, last_page: 1, per_page: 25, total: 0 },
  inscriptionsAdmin = [],
  offres = [],
  niveaux = [],
  sections = [],
  filters: initialFilters = {},
  totalCount = 0
}) => {
  const capitalisationsData = Array.isArray(paginatedCapitalisations) ? paginatedCapitalisations : (paginatedCapitalisations.data || []);
  const pagination = Array.isArray(paginatedCapitalisations) ? null : paginatedCapitalisations;

  const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingCapitalisation, setEditingCapitalisation] = useState(null);
  const [selectedCapitalisations, setSelectedCapitalisations] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  
  const [filterOffre, setFilterOffre] = useState(initialFilters.offre || '');
  const [filterNiveau, setFilterNiveau] = useState(initialFilters.niveau || '');
  const [filterSection, setFilterSection] = useState(initialFilters.section || '');
  const [filterStatut, setFilterStatut] = useState(initialFilters.statut || '');
  const [itemsPerPage, setItemsPerPage] = useState(initialFilters.per_page || 25);

  // Using useForm for better error handling
  const capitalisationForm = useForm({
    id_inscription_admin: '',
    id_offre: '',
    note: '',
    date_capitalisation: new Date().toISOString().split('T')[0],
    date_expiration: ''
  });

  const editForm = useForm({
    id_inscription_admin: '',
    id_offre: '',
    note: '',
    date_capitalisation: '',
    date_expiration: ''
  });


  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [selectedImportOffre, setSelectedImportOffre] = useState('');
  const [importNote, setImportNote] = useState('');
  const [importDateCapitalisation, setImportDateCapitalisation] = useState(new Date().toISOString().split('T')[0]);
  const [importDateExpiration, setImportDateExpiration] = useState('');

  // Backend filtering function with debounce
  const applyFilters = useCallback((params = {}) => {
    setIsFiltering(true);
    const filterParams = {
      search: params.search !== undefined ? params.search : searchTerm,
      offre: params.offre !== undefined ? params.offre : filterOffre,
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
  }, [searchTerm, filterOffre, filterNiveau, filterSection, filterStatut, itemsPerPage]);

  const debouncedSearch = useMemo(() => debounce((value) => applyFilters({ search: value }), 400), [applyFilters]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleFilterChange = (filterName, value) => {
    if (filterName === 'offre') { setFilterOffre(value); applyFilters({ offre: value }); }
    else if (filterName === 'niveau') { setFilterNiveau(value); applyFilters({ niveau: value }); }
    else if (filterName === 'section') { setFilterSection(value); applyFilters({ section: value }); }
    else if (filterName === 'statut') { setFilterStatut(value); applyFilters({ statut: value }); }
  };

  const handlePerPageChange = (value) => { setItemsPerPage(value); applyFilters({ per_page: value }); };

  const goToPage = (url) => {
    if (!url) return;
    setIsFiltering(true);
    router.get(url, {}, { preserveState: true, preserveScroll: true, only: ['capitalisations', 'filters', 'totalCount'], onFinish: () => setIsFiltering(false) });
  };

  const clearFilters = () => {
    setSearchTerm(''); setFilterOffre(''); setFilterNiveau(''); setFilterSection(''); setFilterStatut(''); setItemsPerPage(25);
    setIsFiltering(true);
    router.get(route('inscriptions.capitalisations.index'), { per_page: 25 }, { preserveState: true, preserveScroll: true, only: ['capitalisations', 'filters', 'totalCount'], onFinish: () => setIsFiltering(false) });
  };

  const currentPage = pagination?.current_page || 1;
  const lastPage = pagination?.last_page || 1;
  const total = pagination?.total || capitalisationsData.length;
  const from = pagination?.from || 1;
  const to = pagination?.to || capitalisationsData.length;

  // Submit single capitalisation with validation
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!capitalisationForm.data.id_inscription_admin || !capitalisationForm.data.id_offre) {
      Swal.fire({
        icon: 'error',
        title: 'Champs requis',
        text: 'Veuillez sélectionner une inscription administrative et une offre de formation.'
      });
      return;
    }

    if (!capitalisationForm.data.date_capitalisation) {
      Swal.fire({
        icon: 'error',
        title: 'Champ requis',
        text: 'Veuillez saisir la date de capitalisation.'
      });
      return;
    }

    // Validate note if provided
    if (capitalisationForm.data.note && (isNaN(capitalisationForm.data.note) || capitalisationForm.data.note < 0 || capitalisationForm.data.note > 20)) {
      Swal.fire({
        icon: 'error',
        title: 'Note invalide',
        text: 'La note doit être comprise entre 0 et 20.'
      });
      return;
    }

    // Validate expiration date if provided
    if (capitalisationForm.data.date_expiration && capitalisationForm.data.date_capitalisation) {
      if (new Date(capitalisationForm.data.date_expiration) <= new Date(capitalisationForm.data.date_capitalisation)) {
        Swal.fire({
          icon: 'error',
          title: 'Date invalide',
          text: 'La date d\'expiration doit être postérieure à la date de capitalisation.'
        });
        return;
      }
    }
    
    capitalisationForm.post('/inscriptions/capitalisations', {
      onSuccess: () => {
        setShowAddModal(false);
        capitalisationForm.reset();
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Capitalisation ajoutée avec succès',
          showConfirmButton: false,
          timer: 1500
        });
      },
      onError: (errors) => {
        let errorMessage = 'Veuillez corriger les erreurs dans le formulaire';
        if (errors.error) errorMessage = errors.error;
        else if (errors.message) errorMessage = errors.message;
        else if (typeof errors === 'string') errorMessage = errors;
        else if (Object.keys(errors).length > 0) errorMessage = Object.values(errors).flat().join(', ');
        
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage
        });
      }
    });
  };


  // Handle edit click
  const handleEditClick = (cap) => {
    setEditingCapitalisation(cap);
    editForm.setData({
      id_inscription_admin: cap.id_inscription_admin || '',
      id_offre: cap.id_offre || '',
      note: cap.note || '',
      date_capitalisation: cap.date_capitalisation || '',
      date_expiration: cap.date_expiration || ''
    });
    setShowEditModal(true);
  };

  // Handle update with validation
  const handleUpdate = (e) => {
    e.preventDefault();
    
    if (!editForm.data.id_inscription_admin || !editForm.data.id_offre) {
      Swal.fire({
        icon: 'error',
        title: 'Champs requis',
        text: 'Veuillez sélectionner une inscription administrative et une offre de formation.'
      });
      return;
    }

    if (!editForm.data.date_capitalisation) {
      Swal.fire({
        icon: 'error',
        title: 'Champ requis',
        text: 'Veuillez saisir la date de capitalisation.'
      });
      return;
    }

    if (editForm.data.note && (isNaN(editForm.data.note) || editForm.data.note < 0 || editForm.data.note > 20)) {
      Swal.fire({
        icon: 'error',
        title: 'Note invalide',
        text: 'La note doit être comprise entre 0 et 20.'
      });
      return;
    }

    if (editForm.data.date_expiration && editForm.data.date_capitalisation) {
      if (new Date(editForm.data.date_expiration) <= new Date(editForm.data.date_capitalisation)) {
        Swal.fire({
          icon: 'error',
          title: 'Date invalide',
          text: 'La date d\'expiration doit être postérieure à la date de capitalisation.'
        });
        return;
      }
    }

    editForm.put(`/inscriptions/capitalisations/${editingCapitalisation.id_capitalisation}`, {
      onSuccess: () => {
        setShowEditModal(false);
        setEditingCapitalisation(null);
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Capitalisation mise à jour avec succès',
          showConfirmButton: false,
          timer: 1500
        });
      },
      onError: (errors) => {
        let errorMessage = 'Erreur lors de la mise à jour';
        if (errors.error) errorMessage = errors.error;
        else if (errors.message) errorMessage = errors.message;
        else if (typeof errors === 'string') errorMessage = errors;
        else if (Object.keys(errors).length > 0) errorMessage = Object.values(errors).flat().join(', ');
        
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage
        });
      }
    });
  };

  // Handle delete with confirmation
  const handleDelete = (id, force = false) => {
    const confirmTitle = force ? 'FORCE DELETE - Attention !' : 'Êtes-vous sûr ?';
    const confirmText = force 
      ? 'Vous allez supprimer cette capitalisation en ignorant les relations.'
      : 'Cette action est irréversible !';
    
    Swal.fire({
      title: confirmTitle,
      text: confirmText,
      icon: force ? 'error' : 'warning',
      showCancelButton: true,
      confirmButtonColor: force ? '#dc2626' : '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: force ? 'Oui, forcer !' : 'Oui, supprimer !',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (!result.isConfirmed) return;
      
      const deleteUrl = force ? `/inscriptions/capitalisations/${id}?force=1` : `/inscriptions/capitalisations/${id}`;
      
      router.delete(deleteUrl, {
        onSuccess: () => {
          Swal.fire('Supprimé !', 'La capitalisation a été supprimée.', 'success');
        },
        onError: (errors) => {
          const errorMessage = errors.error || Object.values(errors).flat().join(', ') || 'Erreur lors de la suppression';
          
          if (!force && errorMessage.includes('données liées')) {
            Swal.fire({
              title: 'Suppression impossible',
              text: errorMessage,
              icon: 'error',
              showCancelButton: true,
              confirmButtonColor: '#dc2626',
              confirmButtonText: 'Forcer la suppression',
              cancelButtonText: 'Annuler'
            }).then((forceResult) => {
              if (forceResult.isConfirmed) handleDelete(id, true);
            });
          } else {
            Swal.fire('Erreur !', errorMessage, 'error');
          }
        }
      });
    });
  };

  const toggleSelectCapitalisation = (id) => setSelectedCapitalisations(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedCapitalisations(selectedCapitalisations.length === capitalisationsData.length ? [] : capitalisationsData.map(s => s.id_capitalisation));

  // Bulk delete with confirmation
  const handleBulkDelete = () => {
    if (selectedCapitalisations.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Attention', text: 'Veuillez sélectionner au moins une capitalisation.' });
      return;
    }
    
    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: `Vous allez supprimer ${selectedCapitalisations.length} capitalisation(s). Cette action est irréversible !`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        router.post('/inscriptions/capitalisations/bulk-destroy', { ids: selectedCapitalisations }, {
          onSuccess: () => {
            setSelectedCapitalisations([]);
            Swal.fire('Supprimé !', 'Les capitalisations sélectionnées ont été supprimées.', 'success');
          },
          onError: (errors) => {
            Swal.fire('Erreur !', errors.error || 'Erreur lors de la suppression.', 'error');
          }
        });
      }
    });
  };


  // Download Excel template
  const downloadTemplate = () => {
    const template = [
      { cne: '12345678', note: '15.5', date_capitalisation: '2024-01-15', date_expiration: '2026-01-15' },
      { cne: '87654321', note: '18.0', date_capitalisation: '2024-02-01', date_expiration: '' }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Capitalisations');
    
    // Add instructions sheet
    const instructions = [
      ['INSTRUCTIONS POUR L\'IMPORT DES CAPITALISATIONS'],
      [''],
      ['COLONNES OBLIGATOIRES:'],
      ['• cne: Code National Étudiant (doit exister dans le système)'],
      [''],
      ['COLONNES OPTIONNELLES:'],
      ['• note: Note de capitalisation (entre 0 et 20)'],
      ['• date_capitalisation: Date de capitalisation (format: YYYY-MM-DD)'],
      ['• date_expiration: Date d\'expiration (format: YYYY-MM-DD)'],
      [''],
      ['NOTES:'],
      ['• L\'offre de formation sera sélectionnée dans le formulaire d\'import'],
      ['• La date de capitalisation par défaut est la date du jour'],
      ['• Les doublons seront automatiquement ignorés']
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');
    
    XLSX.writeFile(wb, 'template_capitalisations.xlsx');
  };

  // Handle Excel file selection with validation
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        if (data.length === 0) {
          Swal.fire({ icon: 'error', title: 'Fichier vide', text: 'Le fichier Excel ne contient aucune donnée.' });
          return;
        }

        const errors = [];
        const preview = data.map((row, index) => {
          const rowErrors = [];
          const rowNumber = index + 2;

          // Validate CNE
          if (!row.cne) {
            rowErrors.push('CNE requis');
          } else {
            const inscription = inscriptionsAdmin.find(ia => ia.etudiant?.cne === row.cne?.toString());
            if (!inscription) {
              rowErrors.push(`Étudiant avec CNE "${row.cne}" non trouvé`);
            }
          }

          // Validate note if provided
          if (row.note !== undefined && row.note !== '') {
            const note = parseFloat(row.note);
            if (isNaN(note) || note < 0 || note > 20) {
              rowErrors.push('Note invalide (doit être entre 0 et 20)');
            }
          }

          // Validate dates
          if (row.date_capitalisation && isNaN(Date.parse(row.date_capitalisation))) {
            rowErrors.push('Format de date de capitalisation invalide');
          }
          if (row.date_expiration && isNaN(Date.parse(row.date_expiration))) {
            rowErrors.push('Format de date d\'expiration invalide');
          }
          if (row.date_capitalisation && row.date_expiration) {
            if (new Date(row.date_expiration) <= new Date(row.date_capitalisation)) {
              rowErrors.push('Date d\'expiration doit être après la date de capitalisation');
            }
          }

          const capData = {
            cne: row.cne?.toString().trim() || '',
            note: row.note?.toString().trim() || '',
            date_capitalisation: row.date_capitalisation?.toString().trim() || '',
            date_expiration: row.date_expiration?.toString().trim() || '',
            inscription: inscriptionsAdmin.find(ia => ia.etudiant?.cne === row.cne?.toString())
          };

          if (rowErrors.length > 0) {
            errors.push({ row: rowNumber, errors: rowErrors, data: capData });
          }

          return capData;
        });

        setImportPreview(preview);
        setImportErrors(errors);

        if (errors.length > 0) {
          Swal.fire({
            icon: 'warning',
            title: 'Erreurs détectées',
            text: `${errors.length} erreur(s) sur ${data.length} lignes. Corrigez les erreurs avant d'importer.`
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Fichier valide',
            text: `${data.length} capitalisation(s) prête(s) à importer.`,
            showConfirmButton: false,
            timer: 1500
          });
        }
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Erreur', text: 'Erreur lors de la lecture du fichier Excel.' });
      }
    };
    reader.readAsBinaryString(file);
  };


  // Handle bulk import with validation
  const handleBulkImport = () => {
    if (!selectedImportOffre) {
      Swal.fire({ icon: 'error', title: 'Champ requis', text: 'Veuillez sélectionner une offre de formation.' });
      return;
    }

    const validCaps = importPreview.filter(cap => 
      cap.inscription && !importErrors.some(err => err.data?.cne === cap.cne)
    ).map(cap => ({
      id_inscription_admin: cap.inscription.id_inscription_admin,
      id_offre: selectedImportOffre,
      note: cap.note || importNote || null,
      date_capitalisation: cap.date_capitalisation || importDateCapitalisation,
      date_expiration: cap.date_expiration || importDateExpiration || null
    }));

    if (validCaps.length === 0) {
      Swal.fire({ icon: 'error', title: 'Aucune donnée valide', text: 'Aucune capitalisation valide à importer.' });
      return;
    }

    Swal.fire({
      title: 'Confirmer l\'import',
      text: `Vous allez importer ${validCaps.length} capitalisation(s).`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Importer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        router.post('/inscriptions/capitalisations', { capitalisations: validCaps }, {
          onSuccess: () => {
            setShowImportModal(false);
            setImportFile(null);
            setImportPreview([]);
            setImportErrors([]);
            setSelectedImportOffre('');
            Swal.fire({
              icon: 'success',
              title: 'Import réussi',
              text: `${validCaps.length} capitalisation(s) importée(s) avec succès.`,
              showConfirmButton: false,
              timer: 1500
            });
          },
          onError: (errors) => {
            Swal.fire({
              icon: 'error',
              title: 'Erreur d\'import',
              text: errors.error || 'Erreur lors de l\'import des capitalisations.'
            });
          }
        });
      }
    });
  };

  // Get status badge
  const getStatusBadge = (cap) => {
    if (!cap.date_expiration) return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Valide</span>;
    const exp = new Date(cap.date_expiration);
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (exp < now) return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Expirée</span>;
    if (exp <= thirtyDays) return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">Expire bientôt</span>;
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Valide</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Capitalisations</h1>
          </div>
          <div className="flex gap-3">
            {selectedCapitalisations.length > 0 && (
              <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                <Trash2 className="w-4 h-4" /> Supprimer ({selectedCapitalisations.length})
              </button>
            )}
            <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <Download className="w-4 h-4" /> Template
            </button>
            <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              <Upload className="w-4 h-4" /> Import Excel
            </button>
            <button onClick={() => { capitalisationForm.reset(); setShowAddModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Rechercher par CNE, nom, prénom, module..." value={searchTerm} onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            {isFiltering && <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-4 h-4 animate-spin" />}
          </div>
          <div className="flex gap-3">
            <select value={filterStatut} onChange={(e) => handleFilterChange('statut', e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">Tous les statuts</option>
              <option value="valide">Valide</option>
              <option value="expire_bientot">Expire bientôt</option>
              <option value="expiree">Expirée</option>
            </select>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>
              <Filter className="w-4 h-4" /> Plus de filtres
              {(filterOffre || filterNiveau || filterSection) && <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">{[filterOffre, filterNiveau, filterSection].filter(Boolean).length}</span>}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Offre Formation</label>
              <select value={filterOffre} onChange={(e) => handleFilterChange('offre', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg">
                <option value="">Toutes les offres</option>
                {offres.map(o => <option key={o.id_offre} value={o.id_offre}>{o.module?.nom_module} ({o.module?.code_module})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Niveau</label>
              <select value={filterNiveau} onChange={(e) => handleFilterChange('niveau', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg">
                <option value="">Tous les niveaux</option>
                {niveaux.map(n => <option key={n.id_niveau} value={n.id_niveau}>{n.nom_niveau}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Section</label>
              <select value={filterSection} onChange={(e) => handleFilterChange('section', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg">
                <option value="">Toutes les sections</option>
                {sections.map(s => <option key={s.id_section} value={s.id_section}>{s.filiere?.nom_filiere} ({s.nom_section})</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={clearFilters} className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center gap-2">
                <X className="w-4 h-4" /> Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount || total}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Résultats filtrés</div>
          <div className="text-2xl font-bold text-blue-600">{total}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Sélectionnées</div>
          <div className="text-2xl font-bold text-purple-600">{selectedCapitalisations.length}</div>
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
                  <input type="checkbox" checked={selectedCapitalisations.length === capitalisationsData.length && capitalisationsData.length > 0}
                    onChange={toggleSelectAll} className="rounded border-gray-300 dark:border-gray-600" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Étudiant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Module</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Section</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Niveau</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Note</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date Capitalisation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Expiration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {capitalisationsData.length > 0 ? capitalisationsData.map((cap) => {
                const etudiant = cap.inscription_administrative?.etudiant;
                const niveau = cap.inscription_administrative?.niveau;
                const section = cap.inscription_administrative?.section;
                const module = cap.offre_formation?.module;
                return (
                  <tr key={cap.id_capitalisation} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <input type="checkbox" checked={selectedCapitalisations.includes(cap.id_capitalisation)}
                        onChange={() => toggleSelectCapitalisation(cap.id_capitalisation)} className="rounded border-gray-300 dark:border-gray-600" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{etudiant?.nom} {etudiant?.prenom}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">CNE: {etudiant?.cne}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">{module?.nom_module}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{module?.code_module}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{section?.nom_section}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{niveau?.nom_niveau}</td>
                    <td className="px-6 py-4">
                      {cap.note ? (
                        <span className={`px-2 py-1 text-sm font-medium rounded ${parseFloat(cap.note) >= 10 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                          {cap.note}/20
                        </span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{cap.date_capitalisation ? new Date(cap.date_capitalisation).toLocaleDateString('fr-FR') : '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{cap.date_expiration ? new Date(cap.date_expiration).toLocaleDateString('fr-FR') : '-'}</td>
                    <td className="px-6 py-4">{getStatusBadge(cap)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditClick(cap)} className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cap.id_capitalisation)} className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="10" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    <Award className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p>Aucune capitalisation trouvée</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">Affichage {from} à {to} sur {total}</div>
            <div className="flex items-center gap-3">
              <select value={itemsPerPage} onChange={(e) => handlePerPageChange(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm">
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              {pagination && lastPage > 1 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => goToPage(pagination.prev_page_url)} disabled={!pagination.prev_page_url}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Page {currentPage} sur {lastPage}</span>
                  <button onClick={() => goToPage(pagination.next_page_url)} disabled={!pagination.next_page_url}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ajouter une Capitalisation</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Inscription Administrative *</label>
                <select value={capitalisationForm.data.id_inscription_admin} 
                  onChange={(e) => capitalisationForm.setData('id_inscription_admin', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 ${capitalisationForm.errors.id_inscription_admin ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
                  <option value="">Sélectionner un étudiant</option>
                  {inscriptionsAdmin.map(ia => (
                    <option key={ia.id_inscription_admin} value={ia.id_inscription_admin}>
                      {ia.etudiant?.cne} - {ia.etudiant?.nom} {ia.etudiant?.prenom}
                    </option>
                  ))}
                </select>
                {capitalisationForm.errors.id_inscription_admin && <p className="text-red-500 text-sm mt-1">{capitalisationForm.errors.id_inscription_admin}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Offre de Formation *</label>
                <select value={capitalisationForm.data.id_offre}
                  onChange={(e) => capitalisationForm.setData('id_offre', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 ${capitalisationForm.errors.id_offre ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
                  <option value="">Sélectionner une offre</option>
                  {offres.map(o => (
                    <option key={o.id_offre} value={o.id_offre}>{o.module?.nom_module} ({o.module?.code_module})</option>
                  ))}
                </select>
                {capitalisationForm.errors.id_offre && <p className="text-red-500 text-sm mt-1">{capitalisationForm.errors.id_offre}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note (0-20)</label>
                <input type="number" value={capitalisationForm.data.note}
                  onChange={(e) => capitalisationForm.setData('note', e.target.value)}
                  min="0" max="20" step="0.25"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 ${capitalisationForm.errors.note ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                {capitalisationForm.errors.note && <p className="text-red-500 text-sm mt-1">{capitalisationForm.errors.note}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Capitalisation *</label>
                  <input type="date" value={capitalisationForm.data.date_capitalisation}
                    onChange={(e) => capitalisationForm.setData('date_capitalisation', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 ${capitalisationForm.errors.date_capitalisation ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                  {capitalisationForm.errors.date_capitalisation && <p className="text-red-500 text-sm mt-1">{capitalisationForm.errors.date_capitalisation}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Expiration</label>
                  <input type="date" value={capitalisationForm.data.date_expiration}
                    onChange={(e) => capitalisationForm.setData('date_expiration', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 ${capitalisationForm.errors.date_expiration ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                  {capitalisationForm.errors.date_expiration && <p className="text-red-500 text-sm mt-1">{capitalisationForm.errors.date_expiration}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">Annuler</button>
                <button type="submit" disabled={capitalisationForm.processing} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {capitalisationForm.processing ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Modifier la Capitalisation</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Inscription Administrative *</label>
                <select value={editForm.data.id_inscription_admin}
                  onChange={(e) => editForm.setData('id_inscription_admin', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 ${editForm.errors.id_inscription_admin ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
                  <option value="">Sélectionner un étudiant</option>
                  {inscriptionsAdmin.map(ia => (
                    <option key={ia.id_inscription_admin} value={ia.id_inscription_admin}>
                      {ia.etudiant?.cne} - {ia.etudiant?.nom} {ia.etudiant?.prenom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Offre de Formation *</label>
                <select value={editForm.data.id_offre}
                  onChange={(e) => editForm.setData('id_offre', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 ${editForm.errors.id_offre ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
                  <option value="">Sélectionner une offre</option>
                  {offres.map(o => (
                    <option key={o.id_offre} value={o.id_offre}>{o.module?.nom_module} ({o.module?.code_module})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note (0-20)</label>
                <input type="number" value={editForm.data.note}
                  onChange={(e) => editForm.setData('note', e.target.value)}
                  min="0" max="20" step="0.25"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Capitalisation *</label>
                  <input type="date" value={editForm.data.date_capitalisation}
                    onChange={(e) => editForm.setData('date_capitalisation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Expiration</label>
                  <input type="date" value={editForm.data.date_expiration}
                    onChange={(e) => editForm.setData('date_expiration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">Annuler</button>
                <button type="submit" disabled={editForm.processing} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {editForm.processing ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Excel - Capitalisations</h2>
              <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); setImportErrors([]); setSelectedImportOffre(''); }}
                className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6">
              {/* Import Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Offre de Formation *</label>
                  <select value={selectedImportOffre} onChange={(e) => setSelectedImportOffre(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg">
                    <option value="">Sélectionner une offre</option>
                    {offres.map(o => (
                      <option key={o.id_offre} value={o.id_offre}>{o.module?.nom_module} ({o.module?.code_module})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note par défaut</label>
                  <input type="number" value={importNote} onChange={(e) => setImportNote(e.target.value)}
                    min="0" max="20" step="0.25" placeholder="Optionnel"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Capitalisation par défaut</label>
                  <input type="date" value={importDateCapitalisation} onChange={(e) => setImportDateCapitalisation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Expiration par défaut</label>
                  <input type="date" value={importDateExpiration} onChange={(e) => setImportDateExpiration(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg" />
                </div>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center mb-6">
                <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">{importFile ? importFile.name : 'Cliquez pour sélectionner un fichier Excel'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Format attendu: CNE, note (optionnel), date_capitalisation (optionnel), date_expiration (optionnel)</p>
                </label>
              </div>

              {/* Preview & Errors */}
              {importPreview.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {importPreview.length} ligne(s) trouvée(s), {importErrors.length} erreur(s)
                    </p>
                    <span className={`px-2 py-1 text-xs rounded-full ${importErrors.length === 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {importPreview.filter(p => p.inscription && !importErrors.some(e => e.data?.cne === p.cne)).length} valide(s)
                    </span>
                  </div>
                  
                  {importErrors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-4 max-h-40 overflow-y-auto">
                      <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">Erreurs détectées:</h4>
                      {importErrors.slice(0, 10).map((err, i) => (
                        <p key={i} className="text-sm text-red-600 dark:text-red-400">Ligne {err.row}: {err.errors.join(', ')}</p>
                      ))}
                      {importErrors.length > 10 && <p className="text-sm text-red-500 mt-2">... et {importErrors.length - 10} autres erreurs</p>}
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">CNE</th>
                          <th className="px-4 py-2 text-left">Étudiant</th>
                          <th className="px-4 py-2 text-left">Note</th>
                          <th className="px-4 py-2 text-left">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {importPreview.slice(0, 20).map((row, i) => {
                          const hasError = importErrors.some(e => e.data?.cne === row.cne);
                          return (
                            <tr key={i} className={hasError ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                              <td className="px-4 py-2">{row.cne}</td>
                              <td className="px-4 py-2">{row.inscription ? `${row.inscription.etudiant?.nom} ${row.inscription.etudiant?.prenom}` : '-'}</td>
                              <td className="px-4 py-2">{row.note || importNote || '-'}</td>
                              <td className="px-4 py-2">
                                {hasError ? (
                                  <span className="text-red-600 dark:text-red-400">Erreur</span>
                                ) : row.inscription ? (
                                  <span className="text-green-600 dark:text-green-400">Valide</span>
                                ) : (
                                  <span className="text-yellow-600 dark:text-yellow-400">Non trouvé</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); setImportErrors([]); setSelectedImportOffre(''); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">Annuler</button>
              <button onClick={handleBulkImport} 
                disabled={importPreview.length === 0 || !selectedImportOffre}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                Importer ({importPreview.filter(p => p.inscription && !importErrors.some(e => e.data?.cne === p.cne)).length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapitalisationDataTable;
