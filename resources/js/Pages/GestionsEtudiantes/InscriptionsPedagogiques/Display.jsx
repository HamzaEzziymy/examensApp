import React, { useState, useMemo, useEffect } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Search, Plus, Upload, Download, X, FileSpreadsheet, BookOpen, ChevronLeft, ChevronRight, Eye, Edit, Trash2, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

const InscriptionPedagogiqueDataTable = ({ 
  inscriptions_pedagogiques: initialInscriptions = [],
  inscriptions_administratives = [],
  offres_formation = [],
  etudiants = [],
  filters: initialFilters = {}
}) => {


  const [inscriptions, setInscriptions] = useState(initialInscriptions.data || initialInscriptions);
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
  const [showAddModal, setShowAddModal] = useState(false);

  // Debug: Check if section/filiere data is loaded
  console.log('Inscriptions pedagogiques:', initialInscriptions);
  if (initialInscriptions && initialInscriptions.length > 0) {
    console.log('First inscription offre_formation:', initialInscriptions[0]?.offre_formation);
  }
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialInscriptions.current_page || 1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedInscriptions, setSelectedInscriptions] = useState([]);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInscription, setEditingInscription] = useState(null);

  // Handle paginated data from Laravel
  useEffect(() => {
    if (initialInscriptions.data) {
      setInscriptions(initialInscriptions.data);
      setCurrentPage(initialInscriptions.current_page);
    } else {
      setInscriptions(initialInscriptions);
    }
  }, [initialInscriptions]);

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

  // Filter and search inscriptions
  const filteredInscriptions = useMemo(() => {
    let filtered = inscriptions;
    
    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(inscription => {
        return (
          inscription.inscription_administrative?.etudiant?.cne?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inscription.inscription_administrative?.etudiant?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inscription.inscription_administrative?.etudiant?.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inscription.offre_formation?.module?.nom_module?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inscription.offre_formation?.nom_affiche?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Apply type filter
    if (selectedTypeFilter !== 'all') {
      filtered = filtered.filter(inscription => 
        inscription.type_inscription === selectedTypeFilter
      );
    }

    return filtered;
  }, [inscriptions, searchTerm, selectedTypeFilter]);

  // Pagination for client-side filtering (if not using server-side)
  const totalPages = Math.ceil(filteredInscriptions.length / itemsPerPage);
  const paginatedInscriptions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInscriptions.slice(start, start + itemsPerPage);
  }, [filteredInscriptions, currentPage, itemsPerPage]);

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
    
    inscriptionForm.post(route('inscriptions.pedagogiques.store'), {
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
    editForm.put(route('inscriptions.pedagogiques.update', editingInscription.id_inscription_pedagogique), {
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
        router.delete(route('inscriptions.pedagogiques.destroy', id), {
          onSuccess: () => {
            Swal.fire(
              'Supprimé !',
              'L\'inscription pédagogique a été supprimée.',
              'success'
            );
          }
        });
      }
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
          
          // Check for required columns
          if (!row.id_inscription_admin && !row.cne) {
            rowErrors.push('ID Inscription Admin ou CNE requis');
          }
          
          if (rowErrors.length > 0) {
            errors.push({ row: index + 2, errors: rowErrors });
          }

          // Find student by CNE if provided
          let student = null;
          if (row.cne) {
            student = etudiants.find(e => e.cne === row.cne);
            if (!student) rowErrors.push('Étudiant non trouvé avec ce CNE');
          }

          // Find admin inscription
          let adminInscription = null;
          if (row.id_inscription_admin) {
            adminInscription = inscriptions_administratives.find(i => i.id_inscription_admin == row.id_inscription_admin);
            if (!adminInscription) rowErrors.push('Inscription administrative non trouvée');
          }

          return {
            id_inscription_admin: row.id_inscription_admin || (adminInscription?.id_inscription_admin),
            cne: row.cne || (student?.cne),
            adminInscription: adminInscription,
            student: student
          };
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

    reader.readAsBinaryString(file);
  };

  // Submit bulk import
  const handleBulkImport = () => {
    if (!selectedImportOffre) {
      Swal.fire({
        icon: 'warning',
        title: 'Champs requis',
        text: 'Veuillez sélectionner une offre de formation'
      });
      return;
    }

    if (importErrors.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Erreurs détectées',
        text: 'Veuillez corriger les erreurs avant d\'importer'
      });
      return;
    }

    const validInscriptions = importPreview.filter(item => 
      item.adminInscription || (item.student && inscriptions_administratives.find(i => i.id_etudiant === item.student.id_etudiant))
    );

    if (validInscriptions.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Aucune donnée valide',
        text: 'Aucune inscription administrative valide trouvée'
      });
      return;
    }

    const inscriptionsToImport = validInscriptions.map(item => {
      // Get admin inscription ID
      let id_inscription_admin = item.id_inscription_admin;
      if (!id_inscription_admin && item.student) {
        const adminInscription = inscriptions_administratives.find(i => i.id_etudiant === item.student.id_etudiant);
        id_inscription_admin = adminInscription?.id_inscription_admin;
      }

      return {
        id_inscription_admin: parseInt(id_inscription_admin),
        id_offre: parseInt(selectedImportOffre),
        type_inscription: importType,
        credits_acquis: parseInt(importCredits) || 0
      };
    });
    
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
    
    router.post(route('inscriptions.pedagogiques.bulk-store'), {
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
  };

  // Download Excel template
  const downloadTemplate = () => {
    const template = [
      {
        'id_inscription_admin': '1',
        'cne': 'G123456789',
        'type_inscription': 'Normal',
        'credits_acquis': '6'
      },
      {
        'id_inscription_admin': '',
        'cne': 'G987654321',
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
      ['1. Utilisez soit "id_inscription_admin" soit "cne" pour identifier l\'étudiant'],
      ['2. "type_inscription" peut être: Normal, Credit, ou Anticipe'],
      ['3. "credits_acquis" est optionnel (défaut: 0)'],
      [''],
      ['Note: L\'offre de formation et le module seront sélectionnés dans l\'interface d\'import']
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(instruction);
    XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');
    
    XLSX.writeFile(wb, 'template_inscriptions_pedagogiques.xlsx');
  };

  // Select/deselect inscriptions
  const toggleSelectInscription = (id) => {
    setSelectedInscriptions(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedInscriptions.length === paginatedInscriptions.length) {
      setSelectedInscriptions([]);
    } else {
      setSelectedInscriptions(paginatedInscriptions.map(i => i.id_inscription_pedagogique));
    }
  };

  // Stats calculations
  const stats = useMemo(() => {
    const total = inscriptions.length;
    const normal = inscriptions.filter(i => i.type_inscription === 'Normal').length;
    const credit = inscriptions.filter(i => i.type_inscription === 'Credit').length;
    const anticipe = inscriptions.filter(i => i.type_inscription === 'Anticipe').length;
    const totalCredits = inscriptions.reduce((sum, i) => sum + (parseInt(i.credits_acquis) || 0), 0);
    
    return { total, normal, credit, anticipe, totalCredits };
  }, [inscriptions]);

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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="all">Tous les types</option>
                  <option value="Normal">Normal</option>
                  <option value="Credit">Crédit</option>
                  <option value="Anticipe">Anticipé</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                      checked={paginatedInscriptions.length > 0 && selectedInscriptions.length === paginatedInscriptions.length}
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
                {paginatedInscriptions.length > 0 ? (
                  paginatedInscriptions.map((inscription) => {
                    const typeColors = {
                      'Normal': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                      'Credit': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
                      'Anticipe': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
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
                              onClick={() => handleDelete(inscription.id_inscription_pedagogique)}
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
                {itemsPerPage >= filteredInscriptions.length ? (
                  `Affichage de tous les ${filteredInscriptions.length} résultats`
                ) : (
                  `Affichage ${((currentPage - 1) * itemsPerPage) + 1} à ${Math.min(currentPage * itemsPerPage, filteredInscriptions.length)} sur ${filteredInscriptions.length} résultats`
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
                      setItemsPerPage(filteredInscriptions.length);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 border rounded-lg text-sm transition ${
                      itemsPerPage >= filteredInscriptions.length
                        ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Tout
                  </button>
                </div>
              </div>
            </div>

            {itemsPerPage < filteredInscriptions.length && totalPages > 1 && (
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
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 border rounded-lg text-sm ${
                        currentPage === pageNum
                          ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
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
                    <select
                      value={inscriptionForm.data.id_inscription_admin}
                      onChange={(e) => inscriptionForm.setData('id_inscription_admin', e.target.value)}
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        inscriptionForm.errors.id_inscription_admin ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="">-- Sélectionner une inscription administrative --</option>
                      {inscriptions_administratives.map(insc => (
                        <option key={insc.id_inscription_admin} value={insc.id_inscription_admin}>
                          {insc.id_inscription_admin} - {insc.etudiant?.nom} {insc.etudiant?.prenom} ({insc.etudiant?.cne})
                        </option>
                      ))}
                    </select>
                    {inscriptionForm.errors.id_inscription_admin && (
                      <p className="mt-1 text-sm text-red-600">{inscriptionForm.errors.id_inscription_admin}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Offre de Formation *
                    </label>
                    <select
                      value={inscriptionForm.data.id_offre}
                      onChange={(e) => inscriptionForm.setData('id_offre', e.target.value)}
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        inscriptionForm.errors.id_offre ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="">-- Sélectionner une offre --</option>
                      {offres_formation.map(offre => (
                        <option key={offre.id_offre} value={offre.id_offre}>
                          {offre.module?.nom_module} - {offre.semestre?.niveau?.nom_niveau}({offre.semestre?.nom_semestre}) - {offre.section?.filiere?.nom_filiere} ({offre.section?.nom_section})
                        </option>
                      ))}
                    </select>
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
                    <select
                      value={editForm.data.id_inscription_admin}
                      onChange={(e) => editForm.setData('id_inscription_admin', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">-- Sélectionner une inscription administrative --</option>
                      {inscriptions_administratives.map(insc => (
                        <option key={insc.id_inscription_admin} value={insc.id_inscription_admin}>
                          {insc.id_inscription_admin} - {insc.etudiant?.nom} {insc.etudiant?.prenom} ({insc.etudiant?.cne})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Offre de Formation
                    </label>
                    <select
                      value={editForm.data.id_offre}
                      onChange={(e) => editForm.setData('id_offre', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">-- Sélectionner une offre --</option>
                      {offres_formation.map(offre => (
                        <option key={offre.id_offre} value={offre.id_offre}>
                          {offre.module?.nom_module} - {offre.semestre?.niveau?.nom_niveau}({offre.semestre?.nom_semestre}) - {offre.section?.filiere?.nom_filiere} ({offre.section?.nom_section})
                        </option>
                      ))}
                    </select>
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Excel - Inscriptions Pédagogiques</h2>
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
                  />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Colonnes requises: id_inscription_admin OU cne<br />
                    Colonnes optionnelles: type_inscription, credits_acquis
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Offre de Formation *
                    </label>
                    <select
                      value={selectedImportOffre}
                      onChange={(e) => setSelectedImportOffre(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="">-- Sélectionner une offre --</option>
                      {offres_formation.map(offre => (
                        <option key={offre.id_offre} value={offre.id_offre}>
                          {offre.module?.nom_module} - {offre.semestre?.niveau?.nom_niveau}({offre.semestre?.nom_semestre}) - {offre.section?.filiere?.nom_filiere} ({offre.section?.nom_section})
                        </option>
                      ))}
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
                      <option value="Normal">Normal</option>
                      <option value="Credit">Crédit</option>
                      <option value="Anticipe">Anticipé</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Crédits Acquis
                    </label>
                    <input
                      type="number"
                      value={importCredits}
                      onChange={(e) => setImportCredits(parseInt(e.target.value) || 0)}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                  </div>
                </div>

                {importErrors.length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h3 className="text-red-800 dark:text-red-400 font-medium mb-2">Erreurs détectées:</h3>
                    {importErrors.map((error, i) => (
                      <div key={i} className="text-sm text-red-700 dark:text-red-300">
                        Ligne {error.row}: {error.errors.join(', ')}
                      </div>
                    ))}
                  </div>
                )}

                {importPreview.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Aperçu ({importPreview.length} inscriptions)
                    </h3>
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID Inscription Admin</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CNE</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Étudiant</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {importPreview.slice(0, 20).map((item, i) => (
                              <tr key={i}>
                                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.id_inscription_admin || '-'}</td>
                                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.cne || '-'}</td>
                                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                  {item.adminInscription ? 
                                    `${item.adminInscription.etudiant?.nom} ${item.adminInscription.etudiant?.prenom}` :
                                    item.student ?
                                    `${item.student.nom} ${item.student.prenom}` :
                                    'Non trouvé'
                                  }
                                </td>
                                <td className="px-4 py-2">
                                  {item.adminInscription || item.student ? (
                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                      Valide
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                                      Invalide
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {importPreview.length > 20 && (
                        <p className="p-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                          ... et {importPreview.length - 20} autres inscriptions
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleBulkImport}
                    disabled={!selectedImportOffre || importPreview.length === 0}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Importer {importPreview.filter(item => item.adminInscription || item.student).length} Inscriptions
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