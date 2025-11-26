import React, { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { Search, Plus, Upload, Download, Edit, Trash2, Filter, X, FileSpreadsheet, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

// Inertia props from controller
const StudentDataTable = ({ 
  students: initialStudents = [],
  sections = [],
  filters: initialFilters = {}
}) => {
  const [students, setStudents] = useState(initialStudents);
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
  const [selectedSection, setSelectedSection] = useState(initialFilters.section || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedStudents, setSelectedStudents] = useState([]);

  console.log(sections);
  // Form state for adding student
  const [formData, setFormData] = useState({
    cne: '',
    nom: '',
    prenom: '',
    nationalite: '',
    mail_academique: '',
    mail_personnel: '',
    date_naissance: '',
    telephone: '',
    id_section: ''
  });

  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);

  // Filter and search students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = !searchTerm || 
        student.cne?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.mail_academique?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSection = !selectedSection || student.id_section === parseInt(selectedSection);
      
      return matchesSearch && matchesSection;
    });
  }, [students, searchTerm, selectedSection]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  // Handle form input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit single student
  const handleSubmit = () => {
    router.post('/etudiants', formData, {
      onSuccess: () => {
        setShowAddModal(false);
        setFormData({
          cne: '', nom: '', prenom: '', nationalite: '',
          mail_academique: '', mail_personnel: '', date_naissance: '',
          telephone: '', id_section: ''
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
          
          if (!row.cne) rowErrors.push('CNE requis');
          if (!row.nom) rowErrors.push('Nom requis');
          if (!row.prenom) rowErrors.push('Prénom requis');
          if (!row.mail_academique) rowErrors.push('Email académique requis');
          
          if (rowErrors.length > 0) {
            errors.push({ row: index + 2, errors: rowErrors });
          }

          return {
            cne: row.cne || '',
            nom: row.nom || '',
            prenom: row.prenom || '',
            nationalite: row.nationalite || '',
            mail_academique: row.mail_academique || '',
            mail_personnel: row.mail_personnel || '',
            date_naissance: row.date_naissance || '',
            telephone: row.telephone || '',
            id_section: row.id_section || ''
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
    if (importErrors.length > 0) {
      alert('Veuillez corriger les erreurs avant d\'importer');
      return;
    }

    router.post('/etudiants/bulk-import', { students: importPreview }, {
      onSuccess: () => {
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        setImportErrors([]);
      }
    });
  };

  // Download Excel template
  const downloadTemplate = () => {
    const template = [
      {
        cne: 'R123456789',
        nom: 'DUPONT',
        prenom: 'Jean',
        nationalite: 'Marocaine',
        mail_academique: 'jean.dupont@etu.example.ma',
        mail_personnel: 'jean@gmail.com',
        date_naissance: '2000-01-15',
        telephone: '0612345678',
        id_section: '1'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Etudiants');
    XLSX.writeFile(wb, 'template_etudiants.xlsx');
  };

  // Delete student
  const handleDelete = (id) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet étudiant ?')) {
      router.delete(`/etudiants/${id}`);
    }
  };

  // Select/deselect students
  const toggleSelectStudent = (id) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === paginatedStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(paginatedStudents.map(s => s.id_etudiant));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Gestion des Étudiants</h1>
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
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Ajouter Étudiant
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par CNE, nom, prénom, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              Filtres
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Toutes les sections</option>
                    {sections.map(section => (
                      <option key={section.id_section} value={section.id_section}>
                        {section.nom_section}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Total Étudiants</div>
            <div className="text-2xl font-bold text-gray-900">{students.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Résultats</div>
            <div className="text-2xl font-bold text-blue-600">{filteredStudents.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Sélectionnés</div>
            <div className="text-2xl font-bold text-purple-600">{selectedStudents.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Page</div>
            <div className="text-2xl font-bold text-gray-900">{currentPage}/{totalPages}</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedStudents.length === paginatedStudents.length && paginatedStudents.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNE</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom Complet</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email Académique</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedStudents.map((student) => (
                  <tr key={student.id_etudiant} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id_etudiant)}
                        onChange={() => toggleSelectStudent(student.id_etudiant)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.cne}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {student.nom} {student.prenom}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.mail_academique}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.telephone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {sections.find(s => s.id_section === student.id_section)?.nom_section || '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => router.visit(`/etudiants/${student.id_etudiant}/edit`)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id_etudiant)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">
                {itemsPerPage === filteredStudents.length ? (
                  `Affichage de tous les ${filteredStudents.length} résultats`
                ) : (
                  `Affichage ${((currentPage - 1) * itemsPerPage) + 1} à ${Math.min(currentPage * itemsPerPage, filteredStudents.length)} sur ${filteredStudents.length} résultats`
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Afficher par page:</span>
                <div className="flex gap-2">
                  {/* select items per page */}
                  <select
                    className="px-5 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                  <button
                    onClick={() => {
                      setItemsPerPage(filteredStudents.length);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 border rounded-lg text-sm transition ${
                      itemsPerPage === filteredStudents.length
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Tout
                  </button>
                </div>
              </div>
            </div>

            {itemsPerPage < filteredStudents.length && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 min-w-fit">
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
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
        </div>

        {/* Add Student Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-xl font-bold text-gray-900">Ajouter un Étudiant</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CNE *</label>
                    <input
                      type="text"
                      name="cne"
                      value={formData.cne}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                    <select
                      name="id_section"
                      value={formData.id_section}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner une section</option>
                      {sections.map(section => (
                        <option key={section.id_section} value={section.id_section}>
                          {section.nom_section}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                    <input
                      type="text"
                      name="nom"
                      value={formData.nom}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prénom *</label>
                    <input
                      type="text"
                      name="prenom"
                      value={formData.prenom}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Académique *</label>
                    <input
                      type="email"
                      name="mail_academique"
                      value={formData.mail_academique}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Personnel</label>
                    <input
                      type="email"
                      name="mail_personnel"
                      value={formData.mail_personnel}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nationalité</label>
                    <input
                      type="text"
                      name="nationalite"
                      value={formData.nationalite}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date de Naissance</label>
                    <input
                      type="date"
                      name="date_naissance"
                      value={formData.date_naissance}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                    <input
                      type="tel"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-xl font-bold text-gray-900">Import Excel - Étudiants</h2>
                <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sélectionner un fichier Excel
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="mt-2 text-sm text-gray-600">
                    Colonnes requises: cne, nom, prenom, mail_academique
                  </p>
                </div>

                {importErrors.length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="text-red-800 font-medium mb-2">Erreurs détectées:</h3>
                    {importErrors.map((error, i) => (
                      <div key={i} className="text-sm text-red-700">
                        Ligne {error.row}: {error.errors.join(', ')}
                      </div>
                    ))}
                  </div>
                )}

                {importPreview.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">
                      Aperçu ({importPreview.length} étudiants)
                    </h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left">CNE</th>
                              <th className="px-4 py-2 text-left">Nom</th>
                              <th className="px-4 py-2 text-left">Prénom</th>
                              <th className="px-4 py-2 text-left">Email</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {importPreview.slice(0, 10).map((student, i) => (
                              <tr key={i}>
                                <td className="px-4 py-2">{student.cne}</td>
                                <td className="px-4 py-2">{student.nom}</td>
                                <td className="px-4 py-2">{student.prenom}</td>
                                <td className="px-4 py-2">{student.mail_academique}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {importPreview.length > 10 && (
                      <p className="mt-2 text-sm text-gray-600">
                        ... et {importPreview.length - 10} autres étudiants
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleBulkImport}
                    disabled={importPreview.length === 0 || importErrors.length > 0}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Importer {importPreview.length} Étudiants
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

export default StudentDataTable;
