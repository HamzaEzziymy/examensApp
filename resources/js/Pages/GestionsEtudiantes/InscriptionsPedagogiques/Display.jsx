import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Search, Plus, Upload, Download, X, FileSpreadsheet, BookOpen, ChevronLeft, ChevronRight, Eye, Edit, Trash2, Filter, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import debounce from 'lodash/debounce';

const InscriptionPedagogiqueDataTable = ({ 
  inscriptions_pedagogiques: paginatedInscriptions = { data: [], links: [], current_page: 1, last_page: 1, per_page: 25, total: 0 },
  inscriptions_administratives = [],
  offres_formation = [],
  etudiants = [],
  modules = [],
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedInscriptions, setSelectedInscriptions] = useState([]);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState(initialFilters.type || '');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState(initialFilters.module || '');
  const [selectedNiveauFilter, setSelectedNiveauFilter] = useState(initialFilters.niveau || '');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState(initialFilters.section || '');
  const [selectedSemestreFilter, setSelectedSemestreFilter] = useState(initialFilters.semestre || '');
  const [itemsPerPage, setItemsPerPage] = useState(initialFilters.per_page || 25);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInscription, setEditingInscription] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [adminInscriptionSearch, setAdminInscriptionSearch] = useState('');
  const [adminInscriptionSearchEdit, setAdminInscriptionSearchEdit] = useState('');
  const [offreFormationSearch, setOffreFormationSearch] = useState('');
  const [offreFormationSearchEdit, setOffreFormationSearchEdit] = useState('');
  const [showAdminInscriptionDropdown, setShowAdminInscriptionDropdown] = useState(false);
  const [showAdminInscriptionDropdownEdit, setShowAdminInscriptionDropdownEdit] = useState(false);
  const [showOffreFormationDropdown, setShowOffreFormationDropdown] = useState(false);
  const [showOffreFormationDropdownEdit, setShowOffreFormationDropdownEdit] = useState(false);

  // Using useForm for better error handling
  const inscriptionForm = useForm({
    id_inscription_admin: '',
    id_offre: '',
    type_inscription: 'Normal',
    credits_acquis: 0
  });

  const editForm = useForm({
    id_inscription_admin: '',
    id_offre: '',
    type_inscription: 'Normal',
    credits_acquis: 0
  });

  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [selectedImportOffre, setSelectedImportOffre] = useState('');

  const [importType, setImportType] = useState('Normal');
  const [importCredits, setImportCredits] = useState(0);

  // Bulk update state
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkUpdateFile, setBulkUpdateFile] = useState(null);
  const [bulkUpdatePreview, setBulkUpdatePreview] = useState([]);
  const [bulkUpdateErrors, setBulkUpdateErrors] = useState([]);
  const [bulkUpdateFields, setBulkUpdateFields] = useState({ type_inscription: '', credits_acquis: '' });

  // Backend filtering function with debounce
  const applyFilters = useCallback((params = {}) => {
    setIsFiltering(true);
    const filterParams = {
      search: params.search !== undefined ? params.search : searchTerm,
      type: params.type !== undefined ? params.type : selectedTypeFilter,
      module: params.module !== undefined ? params.module : selectedModuleFilter,
      niveau: params.niveau !== undefined ? params.niveau : selectedNiveauFilter,
      section: params.section !== undefined ? params.section : selectedSectionFilter,
      semestre: params.semestre !== undefined ? params.semestre : selectedSemestreFilter,
      per_page: params.per_page !== undefined ? params.per_page : itemsPerPage,
    };

    router.get(route('inscriptions.pedagogiques.index'), filterParams, {
      preserveState: true,
      preserveScroll: true,
      only: ['inscriptions_pedagogiques', 'filters', 'totalCount'],
      onFinish: () => setIsFiltering(false),
    });
  }, [searchTerm, selectedTypeFilter, selectedModuleFilter, selectedNiveauFilter, selectedSectionFilter, selectedSemestreFilter, itemsPerPage]);

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
      case 'type':
        setSelectedTypeFilter(value);
        applyFilters({ type: value });
        break;
      case 'module':
        setSelectedModuleFilter(value);
        applyFilters({ module: value });
        break;
      case 'niveau':
        setSelectedNiveauFilter(value);
        setSelectedSemestreFilter('');
        setSelectedModuleFilter('');
        applyFilters({ niveau: value, semestre: '', module: '' });
        break;
      case 'section':
        setSelectedSectionFilter(value);
        applyFilters({ section: value });
        break;
      case 'semestre':
        setSelectedSemestreFilter(value);
        applyFilters({ semestre: value });
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
      only: ['inscriptions_pedagogiques', 'filters', 'totalCount'],
      onFinish: () => setIsFiltering(false),
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTypeFilter('');
    setSelectedModuleFilter('');
    setSelectedNiveauFilter('');
    setSelectedSectionFilter('');
    setSelectedSemestreFilter('');
    setItemsPerPage(25);
    setIsFiltering(true);
    router.get(route('inscriptions.pedagogiques.index'), { per_page: 25 }, {
      preserveState: true,
      preserveScroll: true,
      only: ['inscriptions_pedagogiques', 'filters', 'totalCount'],
      onFinish: () => setIsFiltering(false),
    });
  };

  // Filter inscriptions administratives based on search
  const filteredAdminInscriptions = useMemo(() => {
    if (!adminInscriptionSearch.trim()) return inscriptions_administratives;
    
    const searchLower = adminInscriptionSearch.toLowerCase().trim();
    return inscriptions_administratives.filter(insc => 
      (insc.etudiant?.cne && insc.etudiant.cne.toLowerCase().includes(searchLower)) ||
      (insc.etudiant?.nom && insc.etudiant.nom.toLowerCase().includes(searchLower)) ||
      (insc.etudiant?.prenom && insc.etudiant.prenom.toLowerCase().includes(searchLower)) ||
      (insc.id_inscription_admin && insc.id_inscription_admin.toString().includes(searchLower))
    );
  }, [adminInscriptionSearch, inscriptions_administratives]);

  // Filter inscriptions administratives for edit form
  const filteredAdminInscriptionsEdit = useMemo(() => {
    if (!adminInscriptionSearchEdit.trim()) return inscriptions_administratives;
    
    const searchLower = adminInscriptionSearchEdit.toLowerCase().trim();
    return inscriptions_administratives.filter(insc => 
      (insc.etudiant?.cne && insc.etudiant.cne.toLowerCase().includes(searchLower)) ||
      (insc.etudiant?.nom && insc.etudiant.nom.toLowerCase().includes(searchLower)) ||
      (insc.etudiant?.prenom && insc.etudiant.prenom.toLowerCase().includes(searchLower)) ||
      (insc.id_inscription_admin && insc.id_inscription_admin.toString().includes(searchLower))
    );
  }, [adminInscriptionSearchEdit, inscriptions_administratives]);

  // Filter offres de formation based on search
  const filteredOffresFormation = useMemo(() => {
    if (!offreFormationSearch.trim()) return offres_formation;
    
    const searchLower = offreFormationSearch.toLowerCase().trim();
    return offres_formation.filter(offre => 
      (offre.module?.nom_module && offre.module.nom_module.toLowerCase().includes(searchLower)) ||
      (offre.semestre?.nom_semestre && offre.semestre.nom_semestre.toLowerCase().includes(searchLower)) ||
      (offre.semestre?.niveau?.nom_niveau && offre.semestre.niveau.nom_niveau.toLowerCase().includes(searchLower)) ||
      (offre.section?.nom_section && offre.section.nom_section.toLowerCase().includes(searchLower)) ||
      (offre.section?.filiere?.nom_filiere && offre.section.filiere.nom_filiere.toLowerCase().includes(searchLower))
    );
  }, [offreFormationSearch, offres_formation]);

  // Filter offres de formation for edit form
  const filteredOffresFormationEdit = useMemo(() => {
    if (!offreFormationSearchEdit.trim()) return offres_formation;
    
    const searchLower = offreFormationSearchEdit.toLowerCase().trim();
    return offres_formation.filter(offre => 
      (offre.module?.nom_module && offre.module.nom_module.toLowerCase().includes(searchLower)) ||
      (offre.semestre?.nom_semestre && offre.semestre.nom_semestre.toLowerCase().includes(searchLower)) ||
      (offre.semestre?.niveau?.nom_niveau && offre.semestre.niveau.nom_niveau.toLowerCase().includes(searchLower)) ||
      (offre.section?.nom_section && offre.section.nom_section.toLowerCase().includes(searchLower)) ||
      (offre.section?.filiere?.nom_filiere && offre.section.filiere.nom_filiere.toLowerCase().includes(searchLower))
    );
  }, [offreFormationSearchEdit, offres_formation]);

  // Pagination info
  const currentPage = pagination?.current_page || 1;
  const lastPage = pagination?.last_page || 1;
  const total = pagination?.total || inscriptionsData.length;
  const from = pagination?.from || 1;
  const to = pagination?.to || inscriptionsData.length;

  // Get related student name safely
  const getStudentName = (inscription) => {
    if (inscription.inscription_administrative?.etudiant) {
      return `${inscription.inscription_administrative.etudiant.nom} ${inscription.inscription_administrative.etudiant.prenom}`;
    }
    if (inscription.etudiant) {
      return `${inscription.etudiant.nom} ${inscription.etudiant.prenom}`;
    }
    return 'N/A';
  };

  // Get student CNE safely
  const getStudentCNE = (inscription) => {
    if (inscription.inscription_administrative?.etudiant) {
      return inscription.inscription_administrative.etudiant.cne;
    }
    if (inscription.etudiant) {
      return inscription.etudiant.cne;
    }
    return 'N/A';
  };

  // Submit single inscription
  const handleSubmit = (e) => {
    e.preventDefault();

    
    // Basic validation
    if (!inscriptionForm.data.id_inscription_admin || !inscriptionForm.data.id_offre) {
      Swal.fire({
        icon: 'error',
        title: 'Champs requis',
        text: 'Veuillez sélectionner une inscription administrative et une offre de formation.'
      });
      return;
    }
    
    inscriptionForm.post('/inscriptions/pedagogiques', {
      onSuccess: () => {
        setShowAddModal(false);
        inscriptionForm.reset();
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Inscription pédagogique ajoutée avec succès',
          showConfirmButton: false,
          timer: 1500
        });
      },
      onError: (errors) => {
        let errorMessage = 'Veuillez corriger les erreurs dans le formulaire';
        
        if (errors.error) {
          errorMessage = errors.error;
        } else if (errors.message) {
          errorMessage = errors.message;
        } else if (typeof errors === 'string') {
          errorMessage = errors;
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

  // Handle edit
  const handleEditClick = (inscription) => {
    setEditingInscription(inscription);
    editForm.setData({
      id_inscription_admin: inscription.id_inscription_admin,
      id_offre: inscription.id_offre,
      type_inscription: inscription.type_inscription,
      credits_acquis: inscription.credits_acquis
    });
    setShowEditModal(true);
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    editForm.put(`/inscriptions/pedagogiques/${editingInscription.id_inscription_pedagogique}`, {
      onSuccess: () => {
        setShowEditModal(false);
        setEditingInscription(null);
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Inscription pédagogique mise à jour avec succès',
          showConfirmButton: false,
          timer: 1500
        });
      },
      onError: (errors) => {
        let errorMessage = 'Erreur lors de la mise à jour';
        
        if (errors.error) {
          errorMessage = errors.error;
        } else if (errors.message) {
          errorMessage = errors.message;
        } else if (typeof errors === 'string') {
          errorMessage = errors;
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

  // Handle delete
  const handleDelete = (id, force = false) => {
    console.log('=== DEBUGGING DELETE FUNCTION ===');
    console.log('Attempting to delete inscription with ID:', id);
    console.log('Force delete:', force);
    console.log('Delete URL:', `/inscriptions/pedagogiques/${id}${force ? '?force=1' : ''}`);
    
    // SweetAlert confirm dialog
    const confirmTitle = force 
      ? 'FORCE DELETE - Attention !'
      : 'Êtes-vous sûr ?';
    const confirmText = force 
      ? 'Vous allez supprimer cette inscription en ignorant les relations. Ceci peut causer des problèmes de données !'
      : 'Cette action est irréversible !';
    const confirmButtonText = force 
      ? 'Oui, forcer la suppression !'
      : 'Oui, supprimer !';
    
    Swal.fire({
      title: confirmTitle,
      text: confirmText,
      icon: force ? 'error' : 'warning',
      showCancelButton: true,
      confirmButtonColor: force ? '#dc2626' : '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: confirmButtonText,
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (!result.isConfirmed) {
        console.log('User cancelled deletion');
        return;
      }
      
      console.log('User confirmed deletion, making request...');
      
      const deleteUrl = force 
        ? `/inscriptions/pedagogiques/${id}?force=1`
        : `/inscriptions/pedagogiques/${id}`;
      
      router.delete(deleteUrl, {
        onSuccess: (response) => {
          console.log('✅ Delete successful:', response);
          Swal.fire(
            'Supprimé !',
            'L\'inscription pédagogique a été supprimée avec succès.',
            'success'
          );
          // Reload the page data
          router.reload({ only: ['inscriptions_pedagogiques'] });
        },
        onError: (errors) => {
          console.log('❌ Delete failed with errors:', errors);
          console.log('Error details:', JSON.stringify(errors, null, 2));
          
          // Show error message with option to force delete
          const errorMessage = errors.error || Object.values(errors).flat().join(', ') || 'Erreur lors de la suppression';
          
          if (!force && errorMessage.includes('données liées')) {
            Swal.fire({
              title: 'Suppression impossible',
              text: errorMessage,
              icon: 'error',
              showCancelButton: true,
              confirmButtonColor: '#dc2626',
              cancelButtonColor: '#6b7280',
              confirmButtonText: 'Forcer la suppression',
              cancelButtonText: 'Annuler',
              footer: '<small>⚠️ Forcer la suppression peut causer des problèmes de données</small>'
            }).then((forceResult) => {
              if (forceResult.isConfirmed) {
                handleDelete(id, true); // Retry with force
              }
            });
          } else {
            Swal.fire(
              'Erreur !',
              errorMessage,
              'error'
            );
          }
        },
        onFinish: () => {
          console.log('🔄 Delete request finished (success or error)');
        }
      });
    });
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

        // Validate and format data
        const errors = [];
        const preview = data.map((row, index) => {
          const rowErrors = [];
          const rowNumber = index + 2;
          
          // Check for required CNE
          if (!row.cne) {
            rowErrors.push('CNE requis');
          }
          
          // Check for required id_offre
          if (!row.id_offre) {
            rowErrors.push('ID Offre requis');
          }

          // Find student by CNE
          let student = null;
          let adminInscription = null;
          if (row.cne) {
            student = etudiants.find(e => e.cne === String(row.cne).trim());
            if (!student) {
              rowErrors.push(`Étudiant avec CNE "${row.cne}" non trouvé`);
            } else {
              // Find admin inscription for this student
              adminInscription = inscriptions_administratives.find(i => i.id_etudiant === student.id_etudiant);
              if (!adminInscription) {
                rowErrors.push(`Inscription administrative non trouvée pour CNE "${row.cne}"`);
              }
            }
          }

          // Validate id_offre exists
          let offre = null;
          if (row.id_offre) {
            offre = offres_formation.find(o => o.id_offre == row.id_offre);
            if (!offre) {
              rowErrors.push(`Offre de formation avec ID "${row.id_offre}" non trouvée`);
            }
          }

          // Validate type_inscription if provided
          const validTypes = ['Normal', 'Credit', 'Anticipe', 'Capitalisation'];
          if (row.type_inscription && !validTypes.includes(row.type_inscription)) {
            rowErrors.push(`Type d'inscription invalide: "${row.type_inscription}"`);
          }

          // Validate credits_acquis if provided
          if (row.credits_acquis !== undefined && row.credits_acquis !== '') {
            const credits = parseInt(row.credits_acquis);
            if (isNaN(credits) || credits < 0 || credits > 30) {
              rowErrors.push('Crédits acquis invalides (0-30)');
            }
          }

          if (rowErrors.length > 0) {
            errors.push({ row: rowNumber, errors: rowErrors });
          }

          return {
            cne: row.cne ? String(row.cne).trim() : '',
            id_offre: row.id_offre,
            type_inscription: row.type_inscription || 'Normal',
            credits_acquis: row.credits_acquis || 0,
            adminInscription: adminInscription,
            student: student,
            offre: offre,
            hasError: rowErrors.length > 0
          };
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
            text: `${data.length} inscription(s) prête(s) à importer.`,
            showConfirmButton: false,
            timer: 1500
          });
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Erreur lors de la lecture du fichier Excel'
        });
      }
    };

    reader.readAsBinaryString(file);
  };

  // Submit bulk import
  const handleBulkImport = () => {
    if (importErrors.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Erreurs détectées',
        text: 'Veuillez corriger les erreurs dans le fichier Excel avant d\'importer'
      });
      return;
    }

    // Filter valid inscriptions (those with adminInscription and offre)
    const validInscriptions = importPreview.filter(item => 
      item.adminInscription && item.offre && !item.hasError
    );

    if (validInscriptions.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Aucune donnée valide',
        text: 'Aucune inscription valide trouvée dans le fichier'
      });
      return;
    }

    const inscriptionsToImport = validInscriptions.map(item => ({
      id_inscription_admin: parseInt(item.adminInscription.id_inscription_admin),
      id_offre: parseInt(item.id_offre),
      type_inscription: item.type_inscription || importType || 'Normal',
      credits_acquis: parseInt(item.credits_acquis) || parseInt(importCredits) || 0
    }));
    
    // Validate data before sending
    const invalidData = inscriptionsToImport.find(item => 
      !item.id_inscription_admin || !item.id_offre || isNaN(item.id_inscription_admin) || isNaN(item.id_offre)
    );
    
    if (invalidData) {
      console.error('Invalid data found:', invalidData);
      Swal.fire({
        icon: 'error',
        title: 'Données invalides',
        text: 'Certaines données sont invalides. Vérifiez votre fichier Excel.'
      });
      return;
    }

    Swal.fire({
      title: 'Confirmer l\'import',
      text: `Vous allez importer ${inscriptionsToImport.length} inscription(s) pédagogique(s).`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Importer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        router.post('/inscriptions/pedagogiques/bulk-store', {
          inscriptions: inscriptionsToImport
        }, {
          onSuccess: () => {
            setShowImportModal(false);
            setImportFile(null);
            setImportPreview([]);
            setImportErrors([]);
            setSelectedImportOffre('');
            setImportType('Normal');
            setImportCredits(0);
            Swal.fire({
              icon: 'success',
              title: 'Succès',
              text: `${inscriptionsToImport.length} inscriptions importées avec succès`,
              showConfirmButton: false,
              timer: 1500
            });
          },
          onError: (errors) => {
            console.log('Import errors:', errors);
            let errorMessage = 'Erreur lors de l\'importation';
            
            if (errors.error) {
              errorMessage = errors.error;
            } else if (errors.message) {
              errorMessage = errors.message;
            } else if (typeof errors === 'string') {
              errorMessage = errors;
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
      }
    });
  };

  // Export import preview data to Excel
  const exportImportPreview = (type) => {
    let dataToExport = [];
    let filename = '';

    if (type === 'all') {
      dataToExport = importPreview;
      filename = 'inscriptions_pedagogiques_import_apercu.xlsx';
    } else if (type === 'valid') {
      dataToExport = importPreview.filter(p => !p.hasError);
      filename = 'inscriptions_pedagogiques_valides.xlsx';
    } else if (type === 'invalid') {
      dataToExport = importPreview.filter(p => p.hasError);
      filename = 'inscriptions_pedagogiques_invalides.xlsx';
    }

    if (dataToExport.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Aucune donnée',
        text: 'Aucune donnée à exporter'
      });
      return;
    }

    const exportData = dataToExport.map((item, index) => {
      const originalIndex = importPreview.indexOf(item);
      const errorInfo = importErrors.find(e => e.row === originalIndex + 2);
      return {
        'Ligne': originalIndex + 2,
        'CNE': item.cne || '',
        'Nom': item.adminInscription?.etudiant?.nom || item.student?.nom || '',
        'Prénom': item.adminInscription?.etudiant?.prenom || item.student?.prenom || '',
        'ID Offre': item.id_offre || '',
        'Module': item.offre?.module?.nom_module || '',
        'Code Module': item.offre?.module?.code_module || '',
        'Niveau': item.offre?.semestre?.niveau?.nom_niveau || '',
        'Semestre': item.offre?.semestre?.nom_semestre || '',
        'Section': item.offre?.section?.nom_section || '',
        'Filière': item.offre?.section?.filiere?.nom_filiere || '',
        'Type Inscription': item.type_inscription || '',
        'Crédits Acquis': item.credits_acquis || 0,
        'Statut': item.hasError ? 'Invalide' : 'Valide',
        'Erreurs': errorInfo ? errorInfo.errors.join('; ') : ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscriptions');
    
    XLSX.writeFile(wb, filename);

    Swal.fire({
      icon: 'success',
      title: 'Export réussi',
      text: `${dataToExport.length} ligne(s) exportée(s)`,
      showConfirmButton: false,
      timer: 1500
    });
  };

  // Download Excel template with all available offres
  const downloadTemplate = () => {
    // Create template with example data
    const template = [
      {
        'cne': 'G123456789',
        'id_offre': offres_formation[0]?.id_offre || '1',
        'type_inscription': 'Normal',
        'credits_acquis': '6'
      },
      {
        'cne': 'G987654321',
        'id_offre': offres_formation[1]?.id_offre || '2',
        'type_inscription': 'Credit',
        'credits_acquis': '3'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Add instructions
    const instruction = [
      ['Instructions:'],
      ['1. "cne" est requis pour identifier l\'étudiant'],
      ['2. "id_offre" est requis - utilisez un ID de la feuille "Offres_Formation"'],
      ['3. "type_inscription" peut être: Normal, Credit, Anticipe ou Capitalisation'],
      ['4. "credits_acquis" est optionnel (défaut: 0)'],
      [''],
      ['Note: Consultez la feuille "Offres_Formation" pour les IDs disponibles']
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(instruction);
    XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');
    
    // Add offres formation sheet with all available offres
    const offresData = offres_formation.map(offre => ({
      'id_offre': offre.id_offre,
      'module': offre.module?.nom_module || 'N/A',
      'code_module': offre.module?.code_module || 'N/A',
      'niveau': offre.semestre?.niveau?.nom_niveau || 'N/A',
      'semestre': offre.semestre?.nom_semestre || 'N/A',
      'filiere': offre.section?.filiere?.nom_filiere || 'N/A',
      'section': offre.section?.nom_section || 'N/A'
    }));
    const ws3 = XLSX.utils.json_to_sheet(offresData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Offres_Formation');
    
    XLSX.writeFile(wb, 'template_inscriptions_pedagogiques.xlsx');
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
      setSelectedInscriptions(inscriptionsData.map(i => i.id_inscription_pedagogique));
    }
  };

  // Stats calculations
  const stats = useMemo(() => {
    const totalStats = totalCount || total;
    const normal = inscriptionsData.filter(i => i.type_inscription === 'Normal').length;
    const credit = inscriptionsData.filter(i => i.type_inscription === 'Credit').length;
    const anticipe = inscriptionsData.filter(i => i.type_inscription === 'Anticipe').length;
    const capitalisation = inscriptionsData.filter(i => i.type_inscription === 'Capitalisation').length;
    const totalCredits = inscriptionsData.reduce((sum, i) => sum + (parseInt(i.credits_acquis) || 0), 0);
    
    return { total: totalStats, normal, credit, anticipe, capitalisation, totalCredits };
  }, [inscriptionsData, totalCount, total]);

  const downloadBulkUpdateTemplate = () => {
    const template = [{ cne: 'R123456789', nom_module: 'Anatomie', type_inscription: 'Normal', credits_acquis: 6 }];
    const ws = XLSX.utils.json_to_sheet(template);
    ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modification');
    const instructions = [
      ['COLONNES REQUISES:'],
      ['cne', 'CNE de l\'étudiant (obligatoire)'],
      ['nom_module', 'Nom du module (obligatoire)'],
      ['type_inscription', 'Normal | Credit | Anticipe | Capitalisation (optionnel)'],
      ['credits_acquis', 'Nombre entier 0-30 (optionnel)'],
      [],
      ['Laissez type_inscription ou credits_acquis vide pour ne pas modifier ce champ.'],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
    wsInstr['!cols'] = [{ wch: 20 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');
    XLSX.writeFile(wb, 'template_modification_inscriptions.xlsx');
  };

  const handleBulkUpdateFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkUpdateFile(file);
    setBulkUpdateErrors([]);
    setBulkUpdatePreview([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        const errors = [];
        const preview = data.map((row, i) => {
          const rowNum = i + 2;
          const cne = String(row.cne || row.CNE || '').trim();
          const nom_module = String(row.nom_module || row['Nom Module'] || row['nom module'] || '').trim();
          const type_inscription = String(row.type_inscription || row['Type Inscription'] || '').trim() || null;
          const credits_acquis = row.credits_acquis !== undefined && row.credits_acquis !== '' ? parseInt(row.credits_acquis) : null;
          const rowErrors = [];
          if (!cne) rowErrors.push('CNE manquant');
          if (!nom_module) rowErrors.push('Nom module manquant');
          if (type_inscription && !['Normal','Credit','Anticipe','Capitalisation'].includes(type_inscription))
            rowErrors.push(`Type '${type_inscription}' invalide`);
          if (credits_acquis !== null && (isNaN(credits_acquis) || credits_acquis < 0 || credits_acquis > 30))
            rowErrors.push('Crédits invalide (0-30)');
          if (!type_inscription && credits_acquis === null) rowErrors.push('Au moins un champ à modifier requis');
          // Try to find the module in the available modules list
          const foundModule = modules.find(m =>
            m.nom_module?.toLowerCase() === nom_module.toLowerCase() ||
            m.code_module?.toLowerCase() === nom_module.toLowerCase()
          );
          if (rowErrors.length) errors.push({ row: rowNum, cne, errors: rowErrors });
          return {
            rowNum, cne, nom_module,
            resolved_nom_module: foundModule ? foundModule.nom_module : null,
            moduleNotFound: !foundModule && nom_module,
            type_inscription, credits_acquis,
            hasError: rowErrors.length > 0,
          };
        });
        setBulkUpdatePreview(preview);
        setBulkUpdateErrors(errors);
      } catch {
        setBulkUpdateErrors([{ row: 0, cne: '', errors: ['Erreur lecture fichier Excel'] }]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkUpdateModuleOverride = (rowNum, nom_module) => {
    setBulkUpdatePreview(prev => prev.map(r => {
      if (r.rowNum !== rowNum) return r;
      const foundModule = modules.find(m =>
        m.nom_module?.toLowerCase() === nom_module.toLowerCase() ||
        m.code_module?.toLowerCase() === nom_module.toLowerCase()
      );
      return {
        ...r,
        nom_module,
        resolved_nom_module: foundModule ? foundModule.nom_module : null,
        moduleNotFound: !foundModule && nom_module,
      };
    }));
  };

  const handleBulkUpdate = () => {
    const validRows = bulkUpdatePreview.filter(r => !r.hasError);
    if (!validRows.length) return;
    router.post(route('inscriptions.pedagogiques.bulk-update'), {
      rows: validRows.map(({ rowNum, hasError, resolved_nom_module, moduleNotFound, ...rest }) => ({
        ...rest,
        nom_module: resolved_nom_module || rest.nom_module,
      })),
    }, {
      onSuccess: () => {
        setShowBulkUpdateModal(false);
        setBulkUpdateFile(null);
        setBulkUpdatePreview([]);
        setBulkUpdateErrors([]);
        Swal.fire({ icon: 'success', title: 'Mise à jour réussie', showConfirmButton: false, timer: 1500 });
        router.reload({ only: ['inscriptions_pedagogiques'] });
      },
      onError: (errors) => {
        Swal.fire({ icon: 'error', title: 'Erreur', text: errors.error || 'Erreur lors de la mise à jour' });
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="p-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 transition-colors">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inscriptions Pédagogiques</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Gestion des inscriptions aux modules pédagogiques</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Template</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Importer</span>
              </button>
              <button
                onClick={() => setShowBulkUpdateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Modifier en masse</span>
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

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par CNE, étudiant, module..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
              {isFiltering && (
                <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-4 h-4 animate-spin" />
              )}
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="">Tous les types</option>
                  <option value="Normal">Normal</option>
                  <option value="Credit">Crédit</option>
                  <option value="Anticipe">Anticipé</option>
                  <option value="Capitalisation">Capitalisation</option>
                </select>
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
                <span>Plus de filtres</span>
                {(selectedModuleFilter || selectedNiveauFilter || selectedSectionFilter || selectedSemestreFilter) && (
                  <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {[selectedModuleFilter, selectedNiveauFilter, selectedSectionFilter, selectedSemestreFilter].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* 1. Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    1. Section
                  </label>
                  <select
                    value={selectedSectionFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSectionFilter(val);
                      setSelectedNiveauFilter('');
                      setSelectedModuleFilter('');
                      setSelectedSemestreFilter('');
                      applyFilters({ section: val, niveau: '', module: '', semestre: '' });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Toutes les sections</option>
                    {sections.map(s => (
                      <option key={s.id_section} value={s.id_section}>
                        {s.filiere?.nom_filiere} ({s.nom_section})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Niveau — filtered by section via offres */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${selectedSectionFilter ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                    2. Niveau
                  </label>
                  <select
                    value={selectedNiveauFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedNiveauFilter(val);
                      setSelectedModuleFilter('');
                      setSelectedSemestreFilter('');
                      applyFilters({ niveau: val, module: '', semestre: '' });
                    }}
                    disabled={!selectedSectionFilter}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">{selectedSectionFilter ? 'Tous les niveaux' : '— Choisir section —'}</option>
                    {[...new Map(
                      offres_formation
                        .filter(o => !selectedSectionFilter || String(o.id_section) === String(selectedSectionFilter))
                        .filter(o => o.semestre?.niveau)
                        .map(o => [o.semestre.niveau.id_niveau, o.semestre.niveau])
                    ).values()]
                      .sort((a, b) => (a.nom_niveau || '').localeCompare(b.nom_niveau || ''))
                      .map(n => (
                        <option key={n.id_niveau} value={n.id_niveau}>{n.nom_niveau}</option>
                      ))
                    }
                  </select>
                </div>

                {/* 3. Semestre — filtered by section + niveau via offres */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${selectedNiveauFilter ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                    3. Semestre
                  </label>
                  <select
                    value={selectedSemestreFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSemestreFilter(val);
                      setSelectedModuleFilter('');
                      applyFilters({ semestre: val, module: '' });
                    }}
                    disabled={!selectedNiveauFilter}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">{selectedNiveauFilter ? 'Tous les semestres' : '— Choisir niveau —'}</option>
                    {[...new Map(
                      offres_formation
                        .filter(o => !selectedSectionFilter || String(o.id_section) === String(selectedSectionFilter))
                        .filter(o => !selectedNiveauFilter || String(o.semestre?.id_niveau) === String(selectedNiveauFilter))
                        .filter(o => o.semestre)
                        .map(o => [o.semestre.id_semestre, o.semestre])
                    ).values()]
                      .sort((a, b) => (a.nom_semestre || '').localeCompare(b.nom_semestre || ''))
                      .map(s => (
                        <option key={s.id_semestre} value={s.id_semestre}>{s.nom_semestre}</option>
                      ))
                    }
                  </select>
                </div>

                {/* 4. Module — filtered by section + niveau + semestre via offres */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${selectedSemestreFilter ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                    4. Module
                  </label>
                  <select
                    value={selectedModuleFilter}
                    onChange={(e) => handleFilterChange('module', e.target.value)}
                    disabled={!selectedSemestreFilter}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">{selectedSemestreFilter ? 'Tous les modules' : '— Choisir semestre —'}</option>
                    {[...new Map(
                      offres_formation
                        .filter(o => !selectedSectionFilter || String(o.id_section) === String(selectedSectionFilter))
                        .filter(o => !selectedNiveauFilter || String(o.semestre?.id_niveau) === String(selectedNiveauFilter))
                        .filter(o => !selectedSemestreFilter || String(o.id_semestre) === String(selectedSemestreFilter))
                        .filter(o => o.module)
                        .map(o => [o.module.id_module, o.module])
                    ).values()]
                      .sort((a, b) => (a.nom_module || '').localeCompare(b.nom_module || ''))
                      .map(m => (
                        <option key={m.id_module} value={m.id_module}>{m.nom_module}</option>
                      ))
                    }
                  </select>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Inscriptions</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
              </div>
              <BookOpen className="w-10 h-10 text-blue-500 dark:text-blue-400 opacity-50" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Type Normal</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.normal}</div>
              </div>
              <div className="w-10 h-10 text-green-500 dark:text-green-400 opacity-50 text-center">N</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Type Crédit</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.credit}</div>
              </div>
              <div className="w-10 h-10 text-purple-500 dark:text-purple-400 opacity-50 text-center">C</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Type Anticipé</div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.anticipe}</div>
              </div>
              <div className="w-10 h-10 text-yellow-500 dark:text-yellow-400 opacity-50 text-center">A</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Type Capitalisation</div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.capitalisation}</div>
              </div>
              <div className="w-10 h-10 text-orange-500 dark:text-orange-400 opacity-50 text-center">K</div>
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
                      checked={inscriptionsData.length > 0 && selectedInscriptions.length === inscriptionsData.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Étudiant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Module</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Offre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Crédits</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {inscriptionsData.length > 0 ? (
                  inscriptionsData.map((inscription) => {
                    const typeColors = {
                      'Normal': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                      'Credit': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
                      'Anticipe': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
                      'Capitalisation': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                    };

                    return (
                      <tr key={inscription.id_inscription_pedagogique} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedInscriptions.includes(inscription.id_inscription_pedagogique)}
                            onChange={() => toggleSelectInscription(inscription.id_inscription_pedagogique)}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {getStudentName(inscription)}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {getStudentCNE(inscription)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {inscription.offre_formation?.module?.nom_module || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {inscription.offre_formation?.module?.code_module || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {/* Module and Semester */}
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {inscription.offre_formation?.module?.nom_module || inscription.offre_formation?.nom_affiche || 'Module non défini'}
                            </div>
                            
                            {/* Level and Semester */}
                            {inscription.offre_formation?.semestre && (
                              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md inline-block">
                                {inscription.offre_formation.semestre.niveau?.nom_niveau || 'N/A'} - {inscription.offre_formation.semestre.nom_semestre || 'N/A'}
                              </div>
                            )}
                            
                            {/* Section and Filiere */}
                            <div className="flex flex-col space-y-0.5">
                              {inscription.offre_formation?.section && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                                  <span className="font-medium">Section:</span>
                                  <span className="ml-1">{inscription.offre_formation.section.nom_section}</span>
                                </div>
                              )}
                              
                              {inscription.offre_formation?.section?.filiere && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                                  <span className="inline-block w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                                  <span className="font-medium">Filière:</span>
                                  <span className="ml-1">{inscription.offre_formation.section.filiere.nom_filiere}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[inscription.type_inscription] || 'bg-gray-100 text-gray-800'}`}>
                            {inscription.type_inscription}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {inscription.credits_acquis}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(inscription)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                console.log('Delete button clicked for inscription:', inscription.id_inscription_pedagogique);
                                handleDelete(inscription.id_inscription_pedagogique);
                              }}
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
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                      <p>Aucune inscription pédagogique trouvée</p>
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

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ajouter une Inscription Pédagogique</h2>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    inscriptionForm.reset();
                  }} 
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Inscription Administrative *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Rechercher par CNE, nom, prénom ou ID..."
                        value={adminInscriptionSearch}
                        onChange={(e) => setAdminInscriptionSearch(e.target.value)}
                        onFocus={() => setShowAdminInscriptionDropdown(true)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                          inscriptionForm.errors.id_inscription_admin ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {showAdminInscriptionDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                          {filteredAdminInscriptions.length > 0 ? (
                            filteredAdminInscriptions.map(insc => (
                              <button
                                key={insc.id_inscription_admin}
                                type="button"
                                onClick={() => {
                                  inscriptionForm.setData('id_inscription_admin', insc.id_inscription_admin);
                                  setAdminInscriptionSearch(`${insc.etudiant?.cne} - ${insc.etudiant?.nom} ${insc.etudiant?.prenom}`);
                                  setShowAdminInscriptionDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600 last:border-b-0 transition-colors"
                              >
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{insc.etudiant?.cne} - {insc.etudiant?.nom} {insc.etudiant?.prenom}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">ID: {insc.id_inscription_admin}</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">Aucune inscription trouvée</div>
                          )}
                        </div>
                      )}
                      {inscriptionForm.data.id_inscription_admin && (
                        <button
                          type="button"
                          onClick={() => {
                            inscriptionForm.setData('id_inscription_admin', '');
                            setAdminInscriptionSearch('');
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {inscriptionForm.errors.id_inscription_admin && (
                      <p className="mt-1 text-sm text-red-600">{inscriptionForm.errors.id_inscription_admin}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Offre de Formation *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Rechercher par module, niveau, section ou filière..."
                        value={offreFormationSearch}
                        onChange={(e) => setOffreFormationSearch(e.target.value)}
                        onFocus={() => setShowOffreFormationDropdown(true)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                          inscriptionForm.errors.id_offre ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {showOffreFormationDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                          {filteredOffresFormation.length > 0 ? (
                            filteredOffresFormation.map(offre => (
                              <button
                                key={offre.id_offre}
                                type="button"
                                onClick={() => {
                                  inscriptionForm.setData('id_offre', offre.id_offre);
                                  setOffreFormationSearch(`${offre.module?.nom_module} - ${offre.semestre?.niveau?.nom_niveau}`);
                                  setShowOffreFormationDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600 last:border-b-0 transition-colors"
                              >
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{offre.module?.nom_module}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">{offre.semestre?.niveau?.nom_niveau} ({offre.semestre?.nom_semestre}) - {offre.section?.filiere?.nom_filiere} ({offre.section?.nom_section})</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">Aucune offre trouvée</div>
                          )}
                        </div>
                      )}
                      {inscriptionForm.data.id_offre && (
                        <button
                          type="button"
                          onClick={() => {
                            inscriptionForm.setData('id_offre', '');
                            setOffreFormationSearch('');
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {inscriptionForm.errors.id_offre && (
                      <p className="mt-1 text-sm text-red-600">{inscriptionForm.errors.id_offre}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Type d'inscription
                      </label>
                      <select
                        value={inscriptionForm.data.type_inscription}
                        onChange={(e) => inscriptionForm.setData('type_inscription', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Credit">Crédit</option>
                        <option value="Anticipe">Anticipé</option>
                        <option value="Capitalisation">Capitalisation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Crédits Acquis
                      </label>
                      <input
                        type="number"
                        value={inscriptionForm.data.credits_acquis}
                        onChange={(e) => inscriptionForm.setData('credits_acquis', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      inscriptionForm.reset();
                    }}
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

        {/* Edit Modal */}
        {showEditModal && editingInscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Modifier l'Inscription Pédagogique</h2>
                <button 
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingInscription(null);
                    editForm.reset();
                  }} 
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Inscription Administrative
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Rechercher par CNE, nom, prénom ou ID..."
                        value={adminInscriptionSearchEdit}
                        onChange={(e) => setAdminInscriptionSearchEdit(e.target.value)}
                        onFocus={() => setShowAdminInscriptionDropdownEdit(true)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      {showAdminInscriptionDropdownEdit && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                          {filteredAdminInscriptionsEdit.length > 0 ? (
                            filteredAdminInscriptionsEdit.map(insc => (
                              <button
                                key={insc.id_inscription_admin}
                                type="button"
                                onClick={() => {
                                  editForm.setData('id_inscription_admin', insc.id_inscription_admin);
                                  setAdminInscriptionSearchEdit(`${insc.etudiant?.cne} - ${insc.etudiant?.nom} ${insc.etudiant?.prenom}`);
                                  setShowAdminInscriptionDropdownEdit(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600 last:border-b-0 transition-colors"
                              >
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{insc.etudiant?.cne} - {insc.etudiant?.nom} {insc.etudiant?.prenom}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">ID: {insc.id_inscription_admin}</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">Aucune inscription trouvée</div>
                          )}
                        </div>
                      )}
                      {editForm.data.id_inscription_admin && (
                        <button
                          type="button"
                          onClick={() => {
                            editForm.setData('id_inscription_admin', '');
                            setAdminInscriptionSearchEdit('');
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Offre de Formation
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Rechercher par module, niveau, section ou filière..."
                        value={offreFormationSearchEdit}
                        onChange={(e) => setOffreFormationSearchEdit(e.target.value)}
                        onFocus={() => setShowOffreFormationDropdownEdit(true)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      {showOffreFormationDropdownEdit && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                          {filteredOffresFormationEdit.length > 0 ? (
                            filteredOffresFormationEdit.map(offre => (
                              <button
                                key={offre.id_offre}
                                type="button"
                                onClick={() => {
                                  editForm.setData('id_offre', offre.id_offre);
                                  setOffreFormationSearchEdit(`${offre.module?.nom_module} - ${offre.semestre?.niveau?.nom_niveau}`);
                                  setShowOffreFormationDropdownEdit(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600 last:border-b-0 transition-colors"
                              >
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{offre.module?.nom_module}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">{offre.semestre?.niveau?.nom_niveau} ({offre.semestre?.nom_semestre}) - {offre.section?.filiere?.nom_filiere} ({offre.section?.nom_section})</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">Aucune offre trouvée</div>
                          )}
                        </div>
                      )}
                      {editForm.data.id_offre && (
                        <button
                          type="button"
                          onClick={() => {
                            editForm.setData('id_offre', '');
                            setOffreFormationSearchEdit('');
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Type d'inscription
                      </label>
                      <select
                        value={editForm.data.type_inscription}
                        onChange={(e) => editForm.setData('type_inscription', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Credit">Crédit</option>
                        <option value="Anticipe">Anticipé</option>
                        <option value="Capitalisation">Capitalisation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Crédits Acquis
                      </label>
                      <input
                        type="number"
                        value={editForm.data.credits_acquis}
                        onChange={(e) => editForm.setData('credits_acquis', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingInscription(null);
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

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Excel - Inscriptions Pédagogiques</h2>
                <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); setImportErrors([]); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
                  />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Colonnes requises: <strong>cne</strong>, <strong>id_offre</strong><br />
                    Colonnes optionnelles: type_inscription, credits_acquis<br />
                    <span className="text-blue-600 dark:text-blue-400">Téléchargez le template pour voir la liste des offres disponibles</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type d'inscription par défaut
                    </label>
                    <select
                      value={importType}
                      onChange={(e) => setImportType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Credit">Crédit</option>
                      <option value="Anticipe">Anticipé</option>
                      <option value="Capitalisation">Capitalisation</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Utilisé si non spécifié dans le fichier</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Crédits Acquis par défaut
                    </label>
                    <input
                      type="number"
                      value={importCredits}
                      onChange={(e) => setImportCredits(parseInt(e.target.value) || 0)}
                      min="0"
                      max="30"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Utilisé si non spécifié dans le fichier</p>
                  </div>
                </div>

                {importErrors.length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-h-40 overflow-y-auto">
                    <h3 className="text-red-800 dark:text-red-400 font-medium mb-2">Erreurs détectées ({importErrors.length}):</h3>
                    {importErrors.slice(0, 10).map((error, i) => (
                      <div key={i} className="text-sm text-red-700 dark:text-red-300">
                        Ligne {error.row}: {error.errors.join(', ')}
                      </div>
                    ))}
                    {importErrors.length > 10 && (
                      <p className="text-sm text-red-500 mt-2">... et {importErrors.length - 10} autres erreurs</p>
                    )}
                  </div>
                )}

                {importPreview.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Aperçu ({importPreview.length} lignes)
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${importErrors.length === 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                          {importPreview.filter(p => !p.hasError).length} valide(s)
                        </span>
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          {importPreview.filter(p => p.hasError).length} invalide(s)
                        </span>
                      </div>
                    </div>
                    
                    {/* Export buttons */}
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => exportImportPreview('all')}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <Download className="w-4 h-4" />
                        Exporter tout ({importPreview.length})
                      </button>
                      <button
                        onClick={() => exportImportPreview('valid')}
                        disabled={importPreview.filter(p => !p.hasError).length === 0}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
                      >
                        <Download className="w-4 h-4" />
                        Exporter valides ({importPreview.filter(p => !p.hasError).length})
                      </button>
                      <button
                        onClick={() => exportImportPreview('invalid')}
                        disabled={importPreview.filter(p => p.hasError).length === 0}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                      >
                        <Download className="w-4 h-4" />
                        Exporter invalides ({importPreview.filter(p => p.hasError).length})
                      </button>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">#</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CNE</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Étudiant</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID Offre</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Module</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Crédits</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Erreur</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {importPreview.map((item, i) => (
                              <tr key={i} className={item.hasError ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs">{i + 2}</td>
                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.cne || '-'}</td>
                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                                  {item.adminInscription?.etudiant ? 
                                    `${item.adminInscription.etudiant.nom} ${item.adminInscription.etudiant.prenom}` :
                                    item.student ?
                                    `${item.student.nom} ${item.student.prenom}` :
                                    <span className="text-red-500">Non trouvé</span>
                                  }
                                </td>
                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.id_offre || '-'}</td>
                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                                  {item.offre ? 
                                    <span className="text-xs">{item.offre.module?.nom_module}</span> :
                                    <span className="text-red-500 text-xs">Non trouvée</span>
                                  }
                                </td>
                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.type_inscription}</td>
                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.credits_acquis}</td>
                                <td className="px-3 py-2">
                                  {!item.hasError && item.adminInscription && item.offre ? (
                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                      Valide
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                      Erreur
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-xs text-red-600 dark:text-red-400 max-w-xs truncate">
                                  {item.hasError ? importErrors.find(e => e.row === i + 2)?.errors.join(', ') : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); setImportErrors([]); }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleBulkImport}
                    disabled={importPreview.length === 0 || importErrors.length > 0 || importPreview.filter(p => !p.hasError).length === 0}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Importer {importPreview.filter(item => item.adminInscription || item.student).length} Inscriptions
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Update Modal */}
        {showBulkUpdateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                    <Edit className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Modifier en masse</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Importez un fichier Excel (CNE + Code Module) pour modifier les inscriptions</p>
                  </div>
                </div>
                <button onClick={() => { setShowBulkUpdateModal(false); setBulkUpdateFile(null); setBulkUpdatePreview([]); setBulkUpdateErrors([]); }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 overflow-y-auto space-y-5">
                <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Colonnes requises: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">cne</code>, <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">nom_module</code></p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Optionnelles: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">type_inscription</code>, <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">credits_acquis</code> — laissez vide pour ne pas modifier</p>
                  </div>
                  <button onClick={downloadBulkUpdateTemplate}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm whitespace-nowrap">
                    <Download className="w-4 h-4" />
                    Template
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Fichier Excel</label>
                  <input type="file" accept=".xlsx,.xls" onChange={handleBulkUpdateFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>

                {bulkUpdateErrors.length > 0 && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-h-36 overflow-y-auto">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Erreurs ({bulkUpdateErrors.length}) :</p>
                    {bulkUpdateErrors.map((e, i) => (
                      <div key={i} className="text-xs text-red-700 dark:text-red-400">Ligne {e.row} {e.cne ? `(${e.cne})` : ''}: {e.errors.join(', ')}</div>
                    ))}
                  </div>
                )}

                {bulkUpdatePreview.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Aperçu — {bulkUpdatePreview.filter(r => !r.hasError).length} valide(s) / {bulkUpdatePreview.length} total
                    </p>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CNE</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Module</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Crédits</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {bulkUpdatePreview.map((row, i) => (
                            <tr key={i} className={row.hasError ? 'bg-red-50 dark:bg-red-900/10' : row.moduleNotFound ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
                              <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{row.cne}</td>
                              <td className="px-3 py-2">
                                {row.moduleNotFound ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs text-yellow-600 dark:text-yellow-400">"{row.nom_module}" non trouvé</span>
                                    <input
                                      type="text"
                                      placeholder="Chercher module..."
                                      list={`modules-list-${i}`}
                                      defaultValue=""
                                      onChange={e => handleBulkUpdateModuleOverride(row.rowNum, e.target.value)}
                                      className="px-2 py-1 text-xs border border-yellow-300 dark:border-yellow-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-amber-500 w-full"
                                    />
                                    <datalist id={`modules-list-${i}`}>
                                      {modules.map(m => <option key={m.id_module} value={m.nom_module}>{m.nom_module} ({m.code_module})</option>)}
                                    </datalist>
                                  </div>
                                ) : (
                                  <span className="text-gray-900 dark:text-gray-100 text-sm">{row.resolved_nom_module || row.nom_module}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.type_inscription || <span className="text-gray-400 italic text-xs">inchangé</span>}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.credits_acquis !== null ? row.credits_acquis : <span className="text-gray-400 italic text-xs">inchangé</span>}</td>
                              <td className="px-3 py-2">
                                {row.hasError
                                  ? <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Erreur</span>
                                  : row.moduleNotFound
                                    ? <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">Module ?</span>
                                    : <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Valide</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {bulkUpdatePreview.filter(r => !r.hasError).length} inscription(s) à mettre à jour
                </p>
                <div className="flex gap-2">
                  <button onClick={() => { setShowBulkUpdateModal(false); setBulkUpdateFile(null); setBulkUpdatePreview([]); setBulkUpdateErrors([]); }}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                    Annuler
                  </button>
                  <button onClick={handleBulkUpdate}
                    disabled={bulkUpdatePreview.filter(r => !r.hasError).length === 0}
                    className="flex items-center gap-2 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                    <Edit className="w-4 h-4" />
                    Mettre à jour ({bulkUpdatePreview.filter(r => !r.hasError).length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InscriptionPedagogiqueDataTable;