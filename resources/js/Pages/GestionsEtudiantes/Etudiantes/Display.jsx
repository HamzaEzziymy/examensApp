import React, { useState, useMemo, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Search, Plus, Upload, Download, Edit, Trash2, Filter, X, FileSpreadsheet, Users, ChevronLeft, ChevronRight, Eye, Loader2 } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import axios from 'axios';

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
  const [backendErrors, setBackendErrors] = useState([]); // Errors from backend validation
  const [isImporting, setIsImporting] = useState(false); // Loading state for import

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
      toast.success(flash.success, {
        icon: '✅',
        autoClose: 4000
      });
    }
    if (flash?.import_partial) {
      toast.info(flash.import_partial, {
        icon: '⚠️',
        autoClose: 5000
      });
    }
    if (flash?.import_errors && flash.import_errors.length > 0) {
      const errorCount = flash.import_errors.length;
      toast.error(
        `Import partiel: ${errorCount} étudiant${errorCount > 1 ? 's' : ''} avec erreurs de validation. Consultez le détail ci-dessous.`,
        {
          icon: '❌',
          autoClose: 6000
        }
      );
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
    
    router.post('/inscriptions/etudiants', formData, {
      onSuccess: (response) => {
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
          toast.error(`Erreur de validation: ${errorMessages}`, {
            icon: '❌',
            autoClose: 5000
          });
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
    const cneRegex = /^[A-Za-z0-9]{3,20}$/;
    return cneRegex.test(cne);
  };

  // Check for duplicates in current data (case-insensitive, trimmed)
  const checkDuplicates = (data, field) => {
    const values = data.map(row => row[field] ? row[field].toString().trim().toLowerCase() : '').filter(val => val);
    const duplicates = values.filter((val, index) => values.indexOf(val) !== index);
    return [...new Set(duplicates)];
  };

  // Check for duplicates against existing students (case-insensitive, trimmed)
  const checkExistingDuplicates = (data, field) => {
    const existingValues = students.map(student => student[field] ? student[field].toString().trim().toLowerCase() : '').filter(val => val);
    const newValues = data.map(row => row[field] ? row[field].toString().trim().toLowerCase() : '').filter(val => val);
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
          toast.error('Le fichier Excel est vide. Veuillez sélectionner un fichier contenant des données.', {
            icon: '📄',
            autoClose: 4000
          });
          return;
        }

        // Comprehensive validation - NO auto-generation of emails
        const errors = [];
        const validRows = [];
        const invalidRows = [];

        // Extract emails from data for duplicate checking
        const emailsInFile = data.map(row => 
          row.mail_academique ? row.mail_academique.toString().trim().toLowerCase() : ''
        ).filter(email => email);

        // Check for duplicates in the file
        const cneDuplicates = checkDuplicates(data, 'cne');
        
        // Find duplicate emails within the file (case-insensitive)
        const emailCounts = {};
        emailsInFile.forEach(email => {
          emailCounts[email] = (emailCounts[email] || 0) + 1;
        });
        const emailDuplicatesInFile = Object.keys(emailCounts).filter(email => emailCounts[email] > 1);
        
        // Check for duplicates against existing students
        const existingCNEDuplicates = checkExistingDuplicates(data, 'cne');
        const existingEmails = students.map(s => s.mail_academique?.toLowerCase()).filter(Boolean);

        const preview = data.map((row, index) => {
          const rowErrors = [];
          const rowNumber = index + 2; // Excel row number (starting from 2)

          // 1. CNE Validation (Required)
          if (!row.cne || row.cne.toString().trim() === '') {
            rowErrors.push('CNE requis');
          } else {
            const cne = row.cne.toString().trim();
            const cneLower = cne.toLowerCase();
            if (!validateCNE(cne)) {
              rowErrors.push('CNE invalide (3-20 caractères alphanumériques)');
            }
            if (cneDuplicates.includes(cneLower)) {
              rowErrors.push('CNE dupliqué dans le fichier');
            }
            if (existingCNEDuplicates.includes(cneLower)) {
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

          // 4. Email Académique Validation (Required) - NO auto-generation
          const emailValue = row.mail_academique ? row.mail_academique.toString().trim() : '';
          
          if (!emailValue) {
            rowErrors.push('Email académique requis');
          } else if (!validateEmail(emailValue)) {
            rowErrors.push('Format email académique invalide');
          } else {
            // Check for duplicates (case-insensitive)
            const emailLower = emailValue.toLowerCase();
            if (emailDuplicatesInFile.includes(emailLower)) {
              rowErrors.push('Email académique dupliqué dans le fichier');
            }
            if (existingEmails.includes(emailLower)) {
              rowErrors.push('Email académique existe déjà dans la base de données');
            }
          }

          // Note: All other fields (mail_personnel, telephone, date_naissance, nationalite, id_section) 
          // are optional and will be accepted as-is without validation

          const studentData = {
            cne: row.cne ? row.cne.toString().trim() : '',
            nom: row.nom ? row.nom.toString().trim() : '',
            prenom: row.prenom ? row.prenom.toString().trim() : '',
            mail_academique: emailValue,
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

        // Show summary with appropriate notification type
        if (errors.length > 0) {
          const validCount = data.length - errors.length;
          if (validCount > 0) {
            // Partial success - some valid, some errors
            toast.warning(
              `Fichier analysé: ${validCount} étudiant${validCount > 1 ? 's' : ''} valide${validCount > 1 ? 's' : ''}, ${errors.length} avec erreurs. Corrigez les erreurs ou importez uniquement les valides.`,
              {
                icon: '⚠️',
                autoClose: 6000
              }
            );
          } else {
            // All rows have errors
            toast.error(
              `Aucun étudiant valide: ${errors.length} erreur${errors.length > 1 ? 's' : ''} détectée${errors.length > 1 ? 's' : ''}. Veuillez corriger le fichier Excel.`,
              {
                icon: '❌',
                autoClose: 6000
              }
            );
          }
        } else {
          toast.success(
            `Fichier validé: ${data.length} étudiant${data.length > 1 ? 's' : ''} prêt${data.length > 1 ? 's' : ''} à importer.`,
            {
              icon: '✅',
              autoClose: 4000
            }
          );
        }

      } catch (error) {
        console.error('Excel parsing error:', error);
        toast.error(
          'Erreur lors de la lecture du fichier Excel. Vérifiez que le fichier est au format .xlsx ou .xls valide.',
          {
            icon: '📄',
            autoClose: 5000
          }
        );
      }
    };

    reader.readAsBinaryString(file);
  };

  // Submit bulk import
  const handleBulkImport = async () => {
    // Clear any previous backend errors
    setBackendErrors([]);
    
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

    // Calculate summary counts
    const totalRows = importPreview.length;
    const validCount = validStudents.length;
    const frontendSkippedCount = importErrors.length;

    console.log('Import Summary:');
    console.log('- Total rows in file:', totalRows);
    console.log('- Valid students to import:', validCount);
    console.log('- Skipped due to frontend errors:', frontendSkippedCount);
    console.log('Payload:', studentsPayload);

    if (studentsPayload.length === 0) {
      toast.error(
        'Aucun étudiant valide à importer. Veuillez corriger les erreurs dans votre fichier Excel.',
        {
          icon: '❌',
          autoClose: 5000
        }
      );
      return;
    }

    setIsImporting(true);

    try {
      // Use axios to get the full response including import errors
      const response = await axios.post('/inscriptions/etudiants', { students: studentsPayload }, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      console.log('✅ Import response:', response);
      const responseData = response.data;
      
      // Check if there are backend errors in the response (partial import)
      if (responseData.import_errors && responseData.import_errors.length > 0) {
        // Partial import - some students had errors
        const backendImportErrors = responseData.import_errors;
        setBackendErrors(backendImportErrors);
        
        if (responseData.created > 0) {
          toast.warning(
            `Import partiel: ${responseData.created} créé${responseData.created > 1 ? 's' : ''}, ${backendImportErrors.length} erreur${backendImportErrors.length > 1 ? 's' : ''} détectée${backendImportErrors.length > 1 ? 's' : ''} par le serveur.`,
            {
              icon: '⚠️',
              autoClose: 6000
            }
          );
          // Refresh the students list to show newly created ones
          router.reload({ only: ['students'] });
        } else {
          toast.error(
            `Import échoué: ${backendImportErrors.length} erreur${backendImportErrors.length > 1 ? 's' : ''} détectée${backendImportErrors.length > 1 ? 's' : ''} par le serveur. Consultez le détail ci-dessous.`,
            {
              icon: '❌',
              autoClose: 6000
            }
          );
        }
      } else {
        // All students imported successfully
        const createdCount = responseData.created || validCount;
        toast.success(
          `Import réussi: ${createdCount} étudiant${createdCount > 1 ? 's' : ''} créé${createdCount > 1 ? 's' : ''} avec succès!`,
          {
            icon: '🎉',
            autoClose: 4000
          }
        );
        
        // Close the modal and reset state
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        setImportErrors([]);
        setBackendErrors([]);
        
        // Force refresh the page data
        router.reload({ only: ['students'] });
      }
      
    } catch (error) {
      console.error('Import error:', error);
      
      if (error.response) {
        const responseData = error.response.data;
        
        // Check for backend import errors (duplicates, etc.) - status 422
        if (responseData.import_errors && responseData.import_errors.length > 0) {
          const backendImportErrors = responseData.import_errors;
          setBackendErrors(backendImportErrors);
          
          if (responseData.created > 0) {
            toast.warning(
              `Import partiel: ${responseData.created} créé${responseData.created > 1 ? 's' : ''}, ${backendImportErrors.length} erreur${backendImportErrors.length > 1 ? 's' : ''}.`,
              {
                icon: '⚠️',
                autoClose: 6000
              }
            );
            router.reload({ only: ['students'] });
          } else {
            toast.error(
              `${backendImportErrors.length} erreur${backendImportErrors.length > 1 ? 's' : ''} détectée${backendImportErrors.length > 1 ? 's' : ''} par le serveur. Consultez le détail ci-dessous.`,
              {
                icon: '❌',
                autoClose: 6000
              }
            );
          }
        } else if (error.response.status === 422 && responseData.errors) {
          // Laravel validation errors
          const errorMessages = Object.values(responseData.errors).flat();
          toast.error(
            `Erreur de validation: ${errorMessages.join(', ')}`,
            {
              icon: '❌',
              autoClose: 6000
            }
          );
        } else {
          toast.error(
            `Erreur lors de l'import: ${responseData.message || 'Erreur inconnue'}`,
            {
              icon: '❌',
              autoClose: 6000
            }
          );
        }
      } else {
        toast.error(
          `Erreur de connexion: ${error.message}`,
          {
            icon: '❌',
            autoClose: 6000
          }
        );
      }
    } finally {
      setIsImporting(false);
    }
  };

  // Download error report with comprehensive details
  const downloadErrorReport = () => {
    if (importErrors.length === 0) return;

    const now = new Date();
    const timestamp = now.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const dateForFilename = now.toISOString().split('T')[0];
    const timeForFilename = now.toTimeString().split(' ')[0].replace(/:/g, '-');

    // Calculate summary statistics
    const totalRows = importPreview.length;
    const validCount = totalRows - importErrors.length;
    const errorCount = importErrors.length;

    // Create summary sheet data
    const summaryData = [
      { 'Information': 'Rapport d\'erreurs - Import Étudiants', 'Valeur': '' },
      { 'Information': '', 'Valeur': '' },
      { 'Information': 'Date et heure du rapport', 'Valeur': timestamp },
      { 'Information': 'Fichier source', 'Valeur': importFile?.name || 'Non spécifié' },
      { 'Information': '', 'Valeur': '' },
      { 'Information': '--- RÉSUMÉ ---', 'Valeur': '' },
      { 'Information': 'Total de lignes dans le fichier', 'Valeur': totalRows },
      { 'Information': 'Étudiants valides', 'Valeur': validCount },
      { 'Information': 'Étudiants avec erreurs', 'Valeur': errorCount },
      { 'Information': 'Taux de réussite', 'Valeur': totalRows > 0 ? `${Math.round((validCount / totalRows) * 100)}%` : '0%' },
      { 'Information': '', 'Valeur': '' },
      { 'Information': '--- TYPES D\'ERREURS ---', 'Valeur': '' },
    ];

    // Count error types
    const errorTypeCounts = {};
    importErrors.forEach(error => {
      error.errors.forEach(err => {
        errorTypeCounts[err] = (errorTypeCounts[err] || 0) + 1;
      });
    });

    Object.entries(errorTypeCounts).forEach(([errorType, count]) => {
      summaryData.push({ 'Information': errorType, 'Valeur': count });
    });

    // Create detailed errors sheet data
    const errorData = importErrors.map((error, index) => ({
      '#': index + 1,
      'Ligne Excel': error.row,
      'CNE': error.cne || '(vide)',
      'Nom': error.nom || '(vide)',
      'Prénom': error.prenom || '(vide)',
      'Email Académique': error.mail_academique || '(vide)',
      'Email Personnel': error.data?.mail_personnel || '',
      'Téléphone': error.data?.telephone || '',
      'Date Naissance': error.data?.date_naissance || '',
      'Nombre d\'erreurs': error.errors.length,
      'Erreur 1': error.errors[0] || '',
      'Erreur 2': error.errors[1] || '',
      'Erreur 3': error.errors[2] || '',
      'Erreur 4': error.errors[3] || '',
      'Toutes les erreurs': error.errors.join(' | ')
    }));

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();

    // Add summary sheet
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    // Set column widths for summary
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

    // Add detailed errors sheet
    const wsErrors = XLSX.utils.json_to_sheet(errorData);
    // Set column widths for errors
    wsErrors['!cols'] = [
      { wch: 5 },   // #
      { wch: 10 },  // Ligne Excel
      { wch: 15 },  // CNE
      { wch: 15 },  // Nom
      { wch: 15 },  // Prénom
      { wch: 30 },  // Email Académique
      { wch: 25 },  // Email Personnel
      { wch: 15 },  // Téléphone
      { wch: 12 },  // Date Naissance
      { wch: 15 },  // Nombre d'erreurs
      { wch: 35 },  // Erreur 1
      { wch: 35 },  // Erreur 2
      { wch: 35 },  // Erreur 3
      { wch: 35 },  // Erreur 4
      { wch: 60 },  // Toutes les erreurs
    ];
    XLSX.utils.book_append_sheet(wb, wsErrors, 'Détails Erreurs');

    const fileName = `rapport_erreurs_etudiants_${dateForFilename}_${timeForFilename}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Rapport d'erreurs téléchargé: ${errorCount} erreurs sur ${totalRows} lignes`);
  };

  // Download server error report (for backend validation errors)
  const downloadServerErrorReport = () => {
    if (serverImportErrors.length === 0) return;

    const now = new Date();
    const timestamp = now.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const dateForFilename = now.toISOString().split('T')[0];
    const timeForFilename = now.toTimeString().split(' ')[0].replace(/:/g, '-');

    const errorCount = serverImportErrors.length;

    // Create summary sheet data
    const summaryData = [
      { 'Information': 'Rapport d\'erreurs Backend - Import Étudiants', 'Valeur': '' },
      { 'Information': '', 'Valeur': '' },
      { 'Information': 'Date et heure du rapport', 'Valeur': timestamp },
      { 'Information': 'Source', 'Valeur': 'Validation serveur (Backend)' },
      { 'Information': '', 'Valeur': '' },
      { 'Information': '--- RÉSUMÉ ---', 'Valeur': '' },
      { 'Information': 'Total d\'erreurs détectées', 'Valeur': errorCount },
      { 'Information': '', 'Valeur': '' },
      { 'Information': '--- TYPES D\'ERREURS ---', 'Valeur': '' },
    ];

    // Count error types
    const errorTypeCounts = {};
    serverImportErrors.forEach(error => {
      const errors = Array.isArray(error.errors) ? error.errors : [error.errors];
      errors.forEach(err => {
        errorTypeCounts[err] = (errorTypeCounts[err] || 0) + 1;
      });
    });

    Object.entries(errorTypeCounts).forEach(([errorType, count]) => {
      summaryData.push({ 'Information': errorType, 'Valeur': count });
    });

    // Create detailed errors sheet data
    const errorData = serverImportErrors.map((error, index) => {
      const errors = Array.isArray(error.errors) ? error.errors : [error.errors];
      return {
        '#': index + 1,
        'Ligne Excel': error.row || 'N/A',
        'CNE': error.cne || '(vide)',
        'Nom': error.nom || '(vide)',
        'Prénom': error.prenom || '(vide)',
        'Email Académique': error.mail_academique || '(vide)',
        'Nombre d\'erreurs': errors.length,
        'Erreur 1': errors[0] || '',
        'Erreur 2': errors[1] || '',
        'Erreur 3': errors[2] || '',
        'Erreur 4': errors[3] || '',
        'Toutes les erreurs': errors.join(' | ')
      };
    });

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();

    // Add summary sheet
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

    // Add detailed errors sheet
    const wsErrors = XLSX.utils.json_to_sheet(errorData);
    wsErrors['!cols'] = [
      { wch: 5 },   // #
      { wch: 10 },  // Ligne Excel
      { wch: 15 },  // CNE
      { wch: 15 },  // Nom
      { wch: 15 },  // Prénom
      { wch: 30 },  // Email Académique
      { wch: 15 },  // Nombre d'erreurs
      { wch: 35 },  // Erreur 1
      { wch: 35 },  // Erreur 2
      { wch: 35 },  // Erreur 3
      { wch: 35 },  // Erreur 4
      { wch: 60 },  // Toutes les erreurs
    ];
    XLSX.utils.book_append_sheet(wb, wsErrors, 'Détails Erreurs');

    const fileName = `rapport_erreurs_serveur_${dateForFilename}_${timeForFilename}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Rapport d'erreurs serveur téléchargé: ${errorCount} erreurs`, {
      icon: '📥',
      autoClose: 4000
    });
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-yellow-800 dark:text-yellow-300 font-medium">
                Erreurs d'import depuis le serveur ({serverImportErrors.length} erreur{serverImportErrors.length > 1 ? 's' : ''})
              </h3>
              <button
                onClick={downloadServerErrorReport}
                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3 h-3" />
                Télécharger Rapport
              </button>
            </div>
            <div className="space-y-1 text-sm text-yellow-800 dark:text-yellow-300 max-h-48 overflow-y-auto">
              {serverImportErrors.slice(0, 50).map((err, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="font-medium whitespace-nowrap">Ligne {err.row}</span>
                  {err.cne && <span className="text-yellow-600 dark:text-yellow-400">(CNE: {err.cne})</span>}
                  <span>: {Array.isArray(err.errors) ? err.errors.join(', ') : err.errors}</span>
                </div>
              ))}
              {serverImportErrors.length > 50 && (
                <div className="text-yellow-700 dark:text-yellow-400 font-medium mt-2">
                  ... et {serverImportErrors.length - 50} autres erreurs (téléchargez le rapport pour voir tout)
                </div>
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
                        onClick={() => router.visit(route('personnes.etudiants.details', student.id_etudiant))}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                        title="Voir les détails"
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
                  Colonnes requises: cne, nom, prenom, mail_academique
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Affecter une filière (Section) à l'import <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedImportSection}
                  onChange={(e) => setSelectedImportSection(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    !selectedImportSection && importPreview.length > 0 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                >
                  <option value="">--Sélectionnez une filière (obligatoire)--</option>
                  {sections.map(section => (
                    <option key={section.id_section} value={section.id_section}>
                      {section.filiere?.nom_filiere 
                        ? `${section.filiere.nom_filiere} (${section.nom_section})`
                        : section.nom_section}
                    </option>
                  ))}
                </select>
                {!selectedImportSection && importPreview.length > 0 && (
                  <p className="mt-1 text-xs text-red-500">
                    Veuillez sélectionner une filière avant d'importer
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  La filière sélectionnée sera appliquée à tous les étudiants importés.
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

                {/* Backend Error Display (errors from server validation) */}
                {backendErrors.length > 0 && (
                  <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-orange-800 dark:text-orange-300 font-medium">
                        ⚠️ Erreurs serveur - {backendErrors.length} étudiant{backendErrors.length > 1 ? 's' : ''} rejeté{backendErrors.length > 1 ? 's' : ''}
                      </h3>
                      <button
                        onClick={() => {
                          // Download backend error report
                          const now = new Date();
                          const timestamp = now.toLocaleString('fr-FR');
                          const dateForFilename = now.toISOString().split('T')[0];
                          
                          const errorData = backendErrors.map((error, index) => {
                            const errors = Array.isArray(error.errors) ? error.errors : [error.errors];
                            return {
                              '#': index + 1,
                              'Ligne Excel': error.row || 'N/A',
                              'CNE': error.cne || '(vide)',
                              'Nom': error.nom || '(vide)',
                              'Prénom': error.prenom || '(vide)',
                              'Email Académique': error.mail_academique || '(vide)',
                              'Erreurs': errors.join(' | '),
                              'Date du Rapport': timestamp
                            };
                          });
                          
                          const ws = XLSX.utils.json_to_sheet(errorData);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, 'Erreurs Serveur');
                          XLSX.writeFile(wb, `erreurs_serveur_${dateForFilename}.xlsx`);
                          toast.success('Rapport d\'erreurs serveur téléchargé');
                        }}
                        className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 flex items-center gap-1"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        Télécharger Rapport
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-orange-100 dark:bg-orange-900/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-orange-800 dark:text-orange-300">Ligne</th>
                            <th className="px-3 py-2 text-left text-orange-800 dark:text-orange-300">CNE</th>
                            <th className="px-3 py-2 text-left text-orange-800 dark:text-orange-300">Nom</th>
                            <th className="px-3 py-2 text-left text-orange-800 dark:text-orange-300">Email</th>
                            <th className="px-3 py-2 text-left text-orange-800 dark:text-orange-300">Erreurs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-200 dark:divide-orange-800">
                          {backendErrors.map((error, i) => {
                            const errors = Array.isArray(error.errors) ? error.errors : [error.errors];
                            return (
                              <tr key={i} className="text-orange-700 dark:text-orange-300">
                                <td className="px-3 py-2 font-medium">{error.row || 'N/A'}</td>
                                <td className="px-3 py-2">{error.cne || '-'}</td>
                                <td className="px-3 py-2">{error.nom || '-'} {error.prenom || ''}</td>
                                <td className="px-3 py-2">{error.mail_academique || '-'}</td>
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
                    <div className="mt-3 text-xs text-orange-600 dark:text-orange-400">
                      Ces erreurs ont été détectées par le serveur (doublons dans la base de données, etc.). Corrigez votre fichier et réessayez.
                    </div>
                  </div>
                )}

                {/* Preview Section - Show ALL students with validation status per row */}
                {importPreview.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Aperçu de l'import ({importPreview.length} étudiants - {importPreview.length - importErrors.length} valides, {importErrors.length} avec erreurs)
                    </h3>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Ligne</th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Statut</th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">CNE</th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Nom</th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Prénom</th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Email</th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Erreurs</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {importPreview.map((student, i) => {
                              const rowError = importErrors.find(error => error.data && 
                                error.data.cne === student.cne && 
                                error.data.mail_academique === student.mail_academique
                              );
                              const hasError = !!rowError;
                              const rowNumber = i + 2; // Excel row number (starting from 2)
                              
                              return (
                                <tr 
                                  key={i} 
                                  className={`${hasError 
                                    ? 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200' 
                                    : 'bg-green-50 dark:bg-green-900/10 text-gray-900 dark:text-white'
                                  }`}
                                >
                                  <td className="px-4 py-2 font-medium text-gray-600 dark:text-gray-400">{rowNumber}</td>
                                  <td className="px-4 py-2">
                                    {hasError ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                                        ✗ Invalide
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                        ✓ Valide
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 font-medium">{student.cne || '-'}</td>
                                  <td className="px-4 py-2">{student.nom || '-'}</td>
                                  <td className="px-4 py-2">{student.prenom || '-'}</td>
                                  <td className="px-4 py-2">{student.mail_academique || '-'}</td>
                                  <td className="px-4 py-2">
                                    {hasError && rowError.errors && (
                                      <div className="space-y-1">
                                        {rowError.errors.map((err, j) => (
                                          <div key={j} className="text-xs bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded text-red-700 dark:text-red-300">
                                            {err}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    Annuler
                  </button>
                  {(() => {
                    const validCount = importPreview.length - importErrors.length;
                    const hasValidRows = validCount > 0;
                    const hasErrors = importErrors.length > 0;
                    const hasMixedResults = hasValidRows && hasErrors;
                    const allValid = hasValidRows && !hasErrors;
                    const noValidRows = !hasValidRows;
                    const sectionSelected = !!selectedImportSection;

                    // Case 1: No file loaded or no students
                    if (importPreview.length === 0) {
                      return (
                        <button
                          disabled
                          className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
                        >
                          Sélectionnez un fichier Excel
                        </button>
                      );
                    }

                    // Case 2: No section selected - require section
                    if (!sectionSelected) {
                      return (
                        <button
                          disabled
                          className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
                        >
                          Sélectionnez une filière
                        </button>
                      );
                    }

                    // Case 3: All rows have errors - disable import
                    if (noValidRows) {
                      return (
                        <button
                          disabled
                          className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
                        >
                          Aucun étudiant valide - Corrigez les erreurs
                        </button>
                      );
                    }

                    // Case 4: Currently importing - show loading state
                    if (isImporting) {
                      return (
                        <button
                          disabled
                          className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed flex items-center gap-2"
                        >
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Import en cours...
                        </button>
                      );
                    }

                    // Case 5: Mixed valid/invalid - show "Import valid only" option
                    if (hasMixedResults) {
                      return (
                        <button
                          onClick={handleBulkImport}
                          disabled={isImporting}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          Importer seulement les {validCount} étudiants valides
                        </button>
                      );
                    }

                    // Case 6: All valid - normal import
                    if (allValid) {
                      return (
                        <button
                          onClick={handleBulkImport}
                          disabled={isImporting}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          Importer {validCount} étudiants
                        </button>
                      );
                    }

                    return null;
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

export default StudentDataTable;