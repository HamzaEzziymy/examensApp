import React, { useState, useMemo, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Search, Plus, Upload, Download, Edit, Trash2, Filter, X, FileSpreadsheet, Users, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';

// Inertia props from controller
const StudentDataTable = ({ 
  students: initialStudents = [],
  sections = [],
  niveaux = [],
  annees = [],
  filters: initialFilters = {}
}) => {
  const [students, setStudents] = useState(initialStudents);

  // Sync local state with props when they change (after import)
  useEffect(() => {
    setStudents(initialStudents);
  }, [initialStudents]);
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [formErrors, setFormErrors] = useState({});

  // Form state for adding student
  const [formData, setFormData] = useState({
    cne: '',
    nom: '',
    prenom: '',
    mail_academique: '',
    mail_personnel: '',
    date_naissance: '',
    telephone: '',
    id_section: '',
    id_niveau: '',
    id_annee: ''
  });

  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [selectedImportSection, setSelectedImportSection] = useState('');

  // Server flash messages and import errors
  const { flash } = usePage().props;
  // Normalize server import errors: accept array or object { error: { ... } }
  const serverImportErrors = useMemo(() => {
    const raw = flash?.import_errors;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    // shape: { error: { row, cne, errors } }
    if (raw.error) return [raw.error];
    // shape: { errors: [...] } or other
    if (raw.errors && Array.isArray(raw.errors)) return raw.errors;
    // fallback: wrap raw in array
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
      toast.error(`${flash.import_errors.length} étudiants avec erreurs de validation`);
    }
  }, [flash?.success, flash?.import_partial, flash?.import_errors]);

  // Filter and search students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = !searchTerm || 
        student.cne?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.mail_academique?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [students, searchTerm]);

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
    console.log('=== DEBUGGING SINGLE STUDENT CREATION ===');
    console.log('Form data being sent:', formData);
    console.log('Current form errors:', formErrors);
    
    router.post('/inscriptions/etudiants', formData, {
      onSuccess: (response) => {
        console.log('✅ Student creation successful:', response);
        // Close modal and reset form
        setShowAddModal(false);
        setFormData({
          cne: '', nom: '', prenom: '',
          mail_academique: '', mail_personnel: '', date_naissance: '',
          telephone: '', id_section: '', id_niveau: '', id_annee: ''
        });
        setFormErrors({});
        
        // Force refresh the page data
        router.reload({ only: ['students'] });
      },
      onError: (errors) => {
        console.log('❌ Student creation failed with errors:', errors);
        console.log('Error details:', JSON.stringify(errors, null, 2));
        setFormErrors(errors || {});
        
        // Show detailed error message
        if (errors) {
          const errorMessages = Object.values(errors).flat().join(', ');
          toast.error(`Erreur de validation: ${errorMessages}`);
        }
      },
      onFinish: () => {
        console.log('🔄 Request finished (success or error)');
      }
    });
  };

  // Validation functions for core required fields only
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateCNE = (cne) => {
    // CNE should be alphanumeric and between 8-20 characters
    const cneRegex = /^[A-Za-z0-9]{8,20}$/;
    return cneRegex.test(cne);
  };

  // Check for duplicates in current data
  const checkDuplicates = (data, field) => {
    const values = data.map(row => row[field]).filter(val => val);
    const duplicates = values.filter((val, index) => values.indexOf(val) !== index);
    return [...new Set(duplicates)];
  };

  // Check for duplicates against existing students
  const checkExistingDuplicates = (data, field) => {
    const existingValues = students.map(student => student[field]).filter(val => val);
    const newValues = data.map(row => row[field]).filter(val => val);
    return newValues.filter(val => existingValues.includes(val));
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

        // First pass: generate emails for all rows to check for duplicates
        const processedData = data.map(row => {
          let finalEmail = row.mail_academique ? row.mail_academique.toString().trim() : '';
          
          // Auto-generate email if missing or invalid
          if (!finalEmail || !validateEmail(finalEmail)) {
            if (row.nom && row.prenom) {
              const nom = row.nom.toString().trim().toLowerCase();
              const prenom = row.prenom.toString().trim().toLowerCase();
              // Remove accents and special characters, replace spaces with dots
              const cleanNom = nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
              const cleanPrenom = prenom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
              finalEmail = `${cleanPrenom}.${cleanNom}@usmba.ac.ma`;
            }
          }
          
          return {
            ...row,
            processed_mail_academique: finalEmail
          };
        });

        // Check for duplicates in the file (using processed emails)
        const cneDuplicates = checkDuplicates(data, 'cne');
        const emailDuplicates = checkDuplicates(processedData, 'processed_mail_academique');
        
        // Check for duplicates against existing students (using processed emails)
        const existingCNEDuplicates = checkExistingDuplicates(data, 'cne');
        const existingEmailDuplicates = processedData
          .map(row => row.processed_mail_academique)
          .filter(email => email && students.some(student => student.mail_academique === email));

        const preview = processedData.map((row, index) => {
          const rowErrors = [];
          const rowNumber = index + 2; // Excel row number (starting from 2)

          // 1. CNE Validation (Required)
          if (!row.cne || row.cne.toString().trim() === '') {
            rowErrors.push('CNE requis');
          } else {
            const cne = row.cne.toString().trim();
            if (!validateCNE(cne)) {
              rowErrors.push('CNE invalide (8-20 caractères alphanumériques)');
            }
            if (cneDuplicates.includes(cne)) {
              rowErrors.push('CNE dupliqué dans le fichier');
            }
            if (existingCNEDuplicates.includes(cne)) {
              rowErrors.push('CNE existe déjà dans la base de données');
            }
          }

          // 2. Nom Validation (Required)
          if (!row.nom || row.nom.toString().trim() === '') {
            rowErrors.push('Nom requis');
          } else if (row.nom.toString().trim().length < 2) {
            rowErrors.push('Nom trop court (minimum 2 caractères)');
          } else if (row.nom.toString().trim().length > 50) {
            rowErrors.push('Nom trop long (maximum 50 caractères)');
          }

          // 3. Prénom Validation (Required)
          if (!row.prenom || row.prenom.toString().trim() === '') {
            rowErrors.push('Prénom requis');
          } else if (row.prenom.toString().trim().length < 2) {
            rowErrors.push('Prénom trop court (minimum 2 caractères)');
          } else if (row.prenom.toString().trim().length > 50) {
            rowErrors.push('Prénom trop long (maximum 50 caractères)');
          }

          // 4. Email Académique Validation (Required) with Auto-Generation
          const finalEmail = row.processed_mail_academique;
          
          if (!finalEmail) {
            rowErrors.push('Email académique requis (impossible de générer automatiquement sans nom et prénom)');
          } else {
            // Check for duplicates with the final email (original or auto-generated)
            if (emailDuplicates.includes(finalEmail)) {
              rowErrors.push('Email académique dupliqué dans le fichier');
            }
            if (existingEmailDuplicates.includes(finalEmail)) {
              rowErrors.push('Email académique existe déjà dans la base de données');
            }
          }

          // Note: All other fields (mail_personnel, telephone, date_naissance, nationalite, id_section) 
          // are optional and will be accepted as-is without validation

          const studentData = {
            cne: row.cne ? row.cne.toString().trim() : '',
            nom: row.nom ? row.nom.toString().trim() : '',
            prenom: row.prenom ? row.prenom.toString().trim() : '',

            mail_academique: finalEmail, // Use auto-generated or corrected email
            mail_personnel: row.mail_personnel ? row.mail_personnel.toString().trim() : '',
            date_naissance: row.date_naissance || '',
            telephone: row.telephone ? row.telephone.toString().trim() : '',
            id_section: row.id_section || ''
          };

          if (rowErrors.length > 0) {
            errors.push({ 
              row: rowNumber, 
              errors: rowErrors,
              cne: studentData.cne,
              nom: studentData.nom,
              prenom: studentData.prenom,
              mail_academique: studentData.mail_academique,
              data: studentData
            });
            invalidRows.push(studentData);
          } else {
            validRows.push(studentData);
          }

          return studentData;
        });

        setImportPreview(preview);
        setImportErrors(errors);

        // Show summary
        if (errors.length > 0) {
          toast.error(`${errors.length} erreurs détectées sur ${data.length} lignes`);
        } else {
          toast.success(`${data.length} étudiants valides prêts à importer`);
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
    // Filter out students with errors - only send valid students
    const validStudents = importPreview.filter(student => {
      return !importErrors.some(error => 
        error.data && 
        error.data.cne === student.cne && 
        error.data.mail_academique === student.mail_academique
      );
    });

    const studentsPayload = validStudents.map((s) => ({
      ...s,
      id_section: selectedImportSection || s.id_section || '',
    }));

    console.log('Frontend validation errors:', importErrors);
    console.log('Sending valid students payload:', studentsPayload);
    console.log('Total students in preview:', importPreview.length);
    console.log('Valid students to send:', studentsPayload.length);

    if (studentsPayload.length === 0) {
      toast.error('Aucun étudiant valide à importer');
      return;
    }

    router.post('/inscriptions/etudiants', { students: studentsPayload }, {
      onSuccess: (response) => {
        console.log('✅ Bulk import successful:', response);
        // Close the modal and reset state
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        setImportErrors([]);
        
        // Force refresh the page data
        router.reload({ only: ['students'] });
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
      'CNE': error.cne || '',
      'Nom': error.nom || '',
      'Prénom': error.prenom || '',
      'Email Académique': error.mail_academique || '',
      'Erreurs': error.errors.join(' | '),
      'Date du Rapport': new Date().toLocaleString('fr-FR')
    }));

    const ws = XLSX.utils.json_to_sheet(errorData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Erreurs Import');
    const fileName = `rapport_erreurs_etudiants_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Rapport d\'erreurs téléchargé');
  };

  // Download Excel template
  const downloadTemplate = () => {
    const template = [
      {
        cne: 'R123456789',
        nom: 'DUPONT',
        prenom: 'Jean',
        mail_academique: 'jean.dupont@etu.example.ma',
        mail_personnel: 'jean@gmail.com',
        date_naissance: '2000-01-15',
        telephone: '0612345678',
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
      router.delete(`/inscriptions/etudiants/${id}`);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mx-auto">
        <ToastContainer position="top-right" autoClose={3000} />
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Étudiants</h1>
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
                Ajouter Étudiant
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par CNE, nom, prénom, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          
        </div>

        {/* Server Import Errors Banner */}
        {serverImportErrors.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h3 className="text-yellow-800 dark:text-yellow-300 font-medium mb-2">Erreurs d\'import depuis le serveur:</h3>
            <div className="space-y-1 text-sm text-yellow-800 dark:text-yellow-300">
              {serverImportErrors.slice(0, 50).map((err, i) => (
                <div key={i}>
                  Ligne {err.row} {err.cne ? `(CNE: ${err.cne})` : ''}: {Array.isArray(err.errors) ? err.errors.join(', ') : err.errors}
                </div>
              ))}
              {serverImportErrors.length > 50 && (
                <div className="text-yellow-700 dark:text-yellow-400">... et {serverImportErrors.length - 50} autres</div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Étudiants</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{students.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Résultats</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredStudents.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Sélectionnés</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{selectedStudents.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Page</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{currentPage}/{totalPages}</div>
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
                      checked={selectedStudents.length === paginatedStudents.length && paginatedStudents.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">CNE</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nom Complet</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email Académique</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Téléphone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"> Filiere (Section)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedStudents.map((student) => (
                  <tr key={student.id_etudiant} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id_etudiant)}
                        onChange={() => toggleSelectStudent(student.id_etudiant)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{student.cne}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {student.nom} {student.prenom}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{student.mail_academique}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{student.telephone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {student.section?.filiere?.nom_filiere 
                        ? `${student.section.filiere.nom_filiere} (${student.section.nom_section})`
                        : student.section?.nom_section || '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        // onClick={() => router.visit(`/etudiants/${student.id_etudiant}/edit`)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                      >
                        <Eye className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id_etudiant)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
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
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {itemsPerPage === filteredStudents.length ? (
                  `Affichage de tous les ${filteredStudents.length} résultats`
                ) : (
                  `Affichage ${((currentPage - 1) * itemsPerPage) + 1} à ${Math.min(currentPage * itemsPerPage, filteredStudents.length)} sur ${filteredStudents.length} résultats`
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Afficher par page:</span>
                <div className="flex gap-2">
                  {/* select items per page */}
                  <select
                    className="px-8 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
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
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ajouter un Étudiant</h2>
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
                
                <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CNE *</label>
                  <input
                    type="text"
                    name="cne"
                    value={formData.cne}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${formErrors.cne ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {formErrors.cne && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.cne}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">filiére (Section)</label>
                  <select
                    name="id_section"
                    value={formData.id_section}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${formErrors.id_section ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  >
                    <option value="">--Sélectionner une filière--</option>
                    {sections.map(section => (
                      <option key={section.id_section} value={section.id_section}>
                        {section.filiere?.nom_filiere 
                          ? `${section.filiere.nom_filiere} (${section.nom_section})`
                          : section.nom_section}
                      </option>
                    ))}
                  </select>
                  {formErrors.id_section && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.id_section}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Niveau *</label>
                  <select
                    name="id_niveau"
                    value={formData.id_niveau}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${formErrors.id_niveau ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  >
                    <option value="">--Sélectionner un niveau--</option>
                    {niveaux.map(niveau => (
                      <option key={niveau.id_niveau} value={niveau.id_niveau}>
                        {niveau.nom_niveau}
                      </option>
                    ))}
                  </select>
                  {formErrors.id_niveau && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.id_niveau}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Année Universitaire *</label>
                  <select
                    name="id_annee"
                    value={formData.id_annee}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${formErrors.id_annee ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  >
                    <option value="">--Sélectionner une année--</option>
                    {annees.map(annee => (
                      <option key={annee.id_annee} value={annee.id_annee}>
                        {annee.annee_univ}
                      </option>
                    ))}
                  </select>
                  {formErrors.id_annee && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.id_annee}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom *</label>
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${formErrors.nom ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {formErrors.nom && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.nom}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prénom *</label>
                  <input
                    type="text"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${formErrors.prenom ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {formErrors.prenom && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.prenom}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Académique *</label>
                  <input
                    type="email"
                    name="mail_academique"
                    value={formData.mail_academique}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${formErrors.mail_academique ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {formErrors.mail_academique && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.mail_academique}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Personnel</label>
                  <input
                    type="email"
                    name="mail_personnel"
                    value={formData.mail_personnel}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${formErrors.mail_personnel ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {formErrors.mail_personnel && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.mail_personnel}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date de Naissance</label>
                  <input
                    type="date"
                    name="date_naissance"
                    value={formData.date_naissance}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${formErrors.date_naissance ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {formErrors.date_naissance && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.date_naissance}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${formErrors.telephone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {formErrors.telephone && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.telephone}</p>
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
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Excel - Étudiants</h2>
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
                  Colonnes requises: cne, nom, prenom, mail_academique<br/>
                  <span className="text-green-600 dark:text-green-400">
                    ✓ Si mail_academique est manquant ou invalide, il sera généré automatiquement: prenom.nom@usmba.ac.ma
                  </span>
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Affecter une filière (Section) à l\'import</label>
                <select
                  value={selectedImportSection}
                  onChange={(e) => setSelectedImportSection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">--Aucune (utiliser id_section du fichier)--</option>
                  {sections.map(section => (
                    <option key={section.id_section} value={section.id_section}>
                      {section.filiere?.nom_filiere 
                        ? `${section.filiere.nom_filiere} (${section.nom_section})`
                        : section.nom_section}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Si vous choisissez une section ici, elle sera appliquée à tous les étudiants importés.
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
                        Erreurs de validation - {importErrors.length} étudiants
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
                            <th className="px-3 py-2 text-left text-red-800 dark:text-red-300">CNE</th>
                            <th className="px-3 py-2 text-left text-red-800 dark:text-red-300">Nom</th>
                            <th className="px-3 py-2 text-left text-red-800 dark:text-red-300">Email</th>
                            <th className="px-3 py-2 text-left text-red-800 dark:text-red-300">Erreurs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-200 dark:divide-red-800">
                          {importErrors.map((error, i) => (
                            <tr key={i} className="text-red-700 dark:text-red-300">
                              <td className="px-3 py-2 font-medium">{error.row}</td>
                              <td className="px-3 py-2">{error.cne || '-'}</td>
                              <td className="px-3 py-2">{error.nom || '-'} {error.prenom || ''}</td>
                              <td className="px-3 py-2">{error.mail_academique || '-'}</td>
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
                      Corrigez les erreurs dans votre fichier Excel et réimportez-le. Seuls les étudiants valides seront importés.
                    </div>
                  </div>
                )}

                {/* Preview Section - Only show valid students */}
                {importPreview.length > 0 && importErrors.length < importPreview.length && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Aperçu des étudiants valides ({importPreview.length - importErrors.length} étudiants)
                    </h3>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Statut</th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">CNE</th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Nom</th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Prénom</th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Email</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {importPreview.slice(0, 15).map((student, i) => {
                              const hasError = importErrors.some(error => error.data && 
                                error.data.cne === student.cne && 
                                error.data.mail_academique === student.mail_academique
                              );
                              
                              if (hasError) return null; // Don't show students with errors in preview
                              
                              return (
                                <tr key={i} className="text-gray-900 dark:text-white">
                                  <td className="px-4 py-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                      ✓ Valide
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 font-medium">{student.cne}</td>
                                  <td className="px-4 py-2">{student.nom}</td>
                                  <td className="px-4 py-2">{student.prenom}</td>
                                  <td className="px-4 py-2">{student.mail_academique}</td>
                                </tr>
                              );
                            }).filter(Boolean)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {(importPreview.length - importErrors.length) > 15 && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        ... et {(importPreview.length - importErrors.length) - 15} autres étudiants valides
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
                    <>
                      <button
                        onClick={handleBulkImport}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                      >
                        Importer seulement les {importPreview.length - importErrors.length} étudiants valides
                      </button>
                      <button
                        onClick={() => {
                          // Test server validation by sending all data including invalid ones
                          const studentsPayload = importPreview.map((s) => ({
                            ...s,
                            id_section: selectedImportSection || s.id_section || '',
                          }));
                          console.log('Testing server validation with all data:', studentsPayload);
                          router.post('/inscriptions/etudiants', { students: studentsPayload });
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Test Server Validation
                      </button>
                    </>
                  ) : importErrors.length === 0 && importPreview.length > 0 ? (
                    <button
                      onClick={handleBulkImport}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Importer {importPreview.length} étudiants
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
                    >
                      {importPreview.length === 0 ? 'Aucun étudiant à importer' : 'Corrigez les erreurs pour importer'}
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

export default StudentDataTable;