import React, { useState, useMemo } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Search, Plus, Upload, Download, Trash2, X, FileSpreadsheet, Users, ChevronLeft, ChevronRight, Eye, Edit, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

// Inertia props from controller
const Display = ({ 
  inscriptions: initialInscriptions = [],
  students = [],
  annees = [],
  niveaux = [],
  sections = [],
  filters: initialFilters = {}
}) => {
  const [inscriptions, setInscriptions] = useState(initialInscriptions);
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedInscriptions, setSelectedInscriptions] = useState([]);
  const [editingInscription, setEditingInscription] = useState(null);
  const [filterAnnee, setFilterAnnee] = useState('');
  const [filterNiveau, setFilterNiveau] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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
  const [selectedImportAnnee, setSelectedImportAnnee] = useState('');
  const [selectedImportNiveau, setSelectedImportNiveau] = useState('');
  const [selectedImportSection, setSelectedImportSection] = useState('');
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
  const [importStatut, setImportStatut] = useState('Active');
  const [importType, setImportType] = useState('nouveau');

  // Filter and search inscriptions
  const filteredInscriptions = useMemo(() => {
    return inscriptions.filter(inscription => {
      const matchesSearch = !searchTerm || 
        inscription.etudiant?.cne?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inscription.etudiant?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inscription.etudiant?.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inscription.etudiant?.mail_academique?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAnnee = !filterAnnee || inscription.id_annee == filterAnnee;
      const matchesNiveau = !filterNiveau || inscription.id_niveau == filterNiveau;
      const matchesSection = !filterSection || inscription.id_section == filterSection;
      const matchesStatut = !filterStatut || inscription.statut === filterStatut;
      
      return matchesSearch && matchesAnnee && matchesNiveau && matchesSection && matchesStatut;
    });
  }, [inscriptions, searchTerm, filterAnnee, filterNiveau, filterSection, filterStatut]);

  // Pagination
  const totalPages = Math.ceil(filteredInscriptions.length / itemsPerPage);
  const paginatedInscriptions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInscriptions.slice(start, start + itemsPerPage);
  }, [filteredInscriptions, currentPage, itemsPerPage]);

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
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        // Validate and format data - only CNE is required
        const errors = [];
        const preview = data.map((row, index) => {
          const rowErrors = [];
          
          // Only check for CNE
          if (!row.cne) rowErrors.push('CNE requis');
          
          if (rowErrors.length > 0) {
            errors.push({ row: index + 2, errors: rowErrors });
          }

          return {
            cne: row.cne || '',
            // Find student by CNE
            student: students.find(s => s.cne === row.cne)
          };
        });

        setImportPreview(preview);
        setImportErrors(errors);
      } catch (error) {
        alert('Erreur lors de la lecture du fichier Excel');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Submit bulk import
  const handleBulkImport = () => {
    if (!selectedImportAnnee || !selectedImportNiveau || !selectedImportSection) {
      alert('Veuillez sélectionner une année, un niveau et une section pour l\'import.');
      return;
    }

    if (importErrors.length > 0) {
      alert('Veuillez corriger les erreurs avant d\'importer');
      return;
    }

    const inscriptionsToImport = importPreview
      .filter(item => item.student) // Only include items with found students
      .map(item => ({
        id_etudiant: item.student.id_etudiant,
        id_annee: selectedImportAnnee,
        id_niveau: selectedImportNiveau,
        id_section: selectedImportSection,
        date_inscription: importDate,
        statut: importStatut,
        type_inscription: importType
      }));

    if (inscriptionsToImport.length === 0) {
      alert('Aucun étudiant valide trouvé pour l\'import');
      return;
    }

    router.post('/inscriptions/administratives', { inscriptions: inscriptionsToImport }, {
      onSuccess: () => {
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        setImportErrors([]);
        setSelectedImportAnnee('');
        setSelectedImportNiveau('');
        setSelectedImportSection('');
        setImportDate(new Date().toISOString().split('T')[0]);
        setImportStatut('Active');
        setImportType('nouveau');
        Swal.fire({
          icon: 'success',
          title: 'Inscriptions ajoutées',
          text: `${inscriptionsToImport.length} inscriptions ont été ajoutées avec succès`,
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          // Redirect to the inscriptions page after success
          router.visit(route('inscriptions.administratives.index'));
        });
      },
      onError: () => {
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Une erreur est survenue lors de l\'importation des inscriptions'
        });
      }
    });
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
    if (selectedInscriptions.length === paginatedInscriptions.length) {
      setSelectedInscriptions([]);
    } else {
      setSelectedInscriptions(paginatedInscriptions.map(i => i.id_inscription_admin));
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
    const dataToExport = filteredInscriptions.map(inscription => ({
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

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterAnnee('');
    setFilterNiveau('');
    setFilterSection('');
    setFilterStatut('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
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
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Année</label>
                <select
                  value={filterAnnee}
                  onChange={(e) => setFilterAnnee(e.target.value)}
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
                  onChange={(e) => setFilterNiveau(e.target.value)}
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
                  onChange={(e) => setFilterSection(e.target.value)}
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
                  onChange={(e) => setFilterStatut(e.target.value)}
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
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
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
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{inscriptions.length}</div>
              </div>
              <Users className="w-10 h-10 text-blue-500 dark:text-blue-400 opacity-50" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Résultats</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredInscriptions.length}</div>
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
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{currentPage}/{totalPages || 1}</div>
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
                      checked={paginatedInscriptions.length > 0 && selectedInscriptions.length === paginatedInscriptions.length}
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
                {paginatedInscriptions.map((inscription) => (
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

            {itemsPerPage < filteredInscriptions.length && (
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
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Aperçu ({importPreview.length} étudiants)
                    </h3>
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CNE</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Étudiant</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {importPreview.slice(0, 10).map((item, i) => (
                              <tr key={i}>
                                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.cne}</td>
                                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                  {item.student ? `${item.student.nom} ${item.student.prenom}` : 'Non trouvé'}
                                </td>
                                <td className="px-4 py-2">
                                  {item.student ? (
                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                      Trouvé
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                                      Non trouvé
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {importPreview.length > 10 && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        ... et {importPreview.length - 10} autres étudiants
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleBulkImport}
                    disabled={importPreview.length === 0 || importErrors.length > 0 || !selectedImportAnnee || !selectedImportNiveau || !selectedImportSection}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Importer {importPreview.filter(item => item.student).length} Inscriptions
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

export default Display;