import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { FileText, Trash2, Search, ChevronLeft, ChevronRight, CheckCircle, Clock, AlertCircle, TrendingUp, Plus, X, Loader2 } from 'lucide-react';
import InputError from '@/Components/InputError';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function NotesIndex({ notes = {}, examens = [], enseignants = [] }) {
    const { auth } = usePage().props;
    
    const [searchTerm, setSearchTerm] = useState('');
    
    // Unified import states
    const [showImportModal, setShowImportModal] = useState(false);
    const [showBulkInputModal, setShowBulkInputModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState([]);
    const [importErrors, setImportErrors] = useState([]);
    const [backendErrors, setBackendErrors] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importType, setImportType] = useState('cne'); // 'cne' or 'anonymat'
    
    // Common import fields
    const [selectedImportExamen, setSelectedImportExamen] = useState('');
    const [selectedImportElement, setSelectedImportElement] = useState('');
    const [selectedImportEnseignant, setSelectedImportEnseignant] = useState('');
    const [importNoteSur, setImportNoteSur] = useState('20');
    const [importCommentaire, setImportCommentaire] = useState('');
    
    // Bulk input states
    const [bulkInputRows, setBulkInputRows] = useState([]);

    const data = notes.data || [];
    const links = notes.links || [];

    // Auto-load students for bulk input when exam is selected
    useEffect(() => {
        if (selectedImportExamen && showBulkInputModal && bulkInputRows.length === 0) {
            initializeBulkInput();
        }
    }, [selectedImportExamen, showBulkInputModal]);

    // Filter notes by search term
    const filteredNotes = data
        .filter((note) => {
            const query = searchTerm.toLowerCase();
            const etudiantName = note.anonymat?.etudiant 
                ? `${note.anonymat.etudiant.nom} ${note.anonymat.etudiant.prenom}`.toLowerCase()
                : '';
            const moduleName = note.examen?.module?.nom_module?.toLowerCase() || '';
            const anonymatCode = note.anonymat?.code_anonymat?.toLowerCase() || '';
            return etudiantName.includes(query) || moduleName.includes(query) || anonymatCode.includes(query);
        });

    // Calculate statistics
    const stats = {
        total: filteredNotes.length,
        moyenne: filteredNotes.length > 0 
            ? (() => {
                const numericNotes = filteredNotes.filter(n => !isNaN(parseFloat(n.note)));
                return numericNotes.length > 0 
                    ? (numericNotes.reduce((sum, n) => sum + parseFloat(n.note), 0) / numericNotes.length).toFixed(2)
                    : 0;
            })()
            : 0,
        reussite: filteredNotes.filter(n => !isNaN(parseFloat(n.note)) && parseFloat(n.note) >= 10).length,
        echec: filteredNotes.filter(n => !isNaN(parseFloat(n.note)) && parseFloat(n.note) < 10).length,
        absents: filteredNotes.filter(n => n.note === 'ABS').length,
        capitalises: filteredNotes.filter(n => n.note === 'CAP').length,
    };

    const handleDelete = (id) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
            // Use Inertia router for deletion
            router.delete(route('correction.notes.destroy', id));
        }
    };

    const getNoteColor = (note) => {
        const n = parseFloat(note);
        if (n >= 16) return 'text-green-600 dark:text-green-400';
        if (n >= 14) return 'text-blue-600 dark:text-blue-400';
        if (n >= 10) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    // Import functions
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImportFile(file);
        setBackendErrors([]);
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

                // Validate data based on import type
                const errors = [];
                const preview = data.map((row, index) => {
                    const rowErrors = [];
                    const rowNumber = index + 2;
                    
                    let identifier = '';
                    if (importType === 'cne') {
                        identifier = row.cne ? row.cne.toString().trim().toUpperCase() : '';
                        if (!identifier) rowErrors.push('CNE requis');
                    } else {
                        identifier = row.anonymat ? row.anonymat.toString().trim() : '';
                        if (!identifier) rowErrors.push('Code anonymat requis');
                    }

                    const note = row.note ? row.note.toString().trim() : '';
                    if (!note) {
                        rowErrors.push('Note requise');
                    } else if (!['ABS', 'CAP'].includes(note.toUpperCase()) && isNaN(parseFloat(note))) {
                        rowErrors.push('Note invalide (nombre, ABS, ou CAP)');
                    }

                    if (rowErrors.length > 0) {
                        errors.push({
                            row: rowNumber,
                            identifier: identifier,
                            note: note,
                            errors: rowErrors
                        });
                    }

                    return {
                        identifier: identifier,
                        note: note,
                        rowNumber: rowNumber,
                        hasError: rowErrors.length > 0,
                        errors: rowErrors
                    };
                });

                setImportPreview(preview);
                setImportErrors(errors);

                const validCount = preview.filter(p => !p.hasError).length;
                const errorCount = errors.length;

                if (errorCount > 0) {
                    if (validCount > 0) {
                        toast.warning(`Fichier analysé: ${validCount} valides, ${errorCount} avec erreurs`);
                    } else {
                        toast.error(`Aucune note valide: ${errorCount} erreurs détectées`);
                    }
                } else {
                    toast.success(`Fichier validé: ${validCount} notes prêtes à importer`);
                }
            } catch (error) {
                console.error('Excel parsing error:', error);
                toast.error('Erreur lors de la lecture du fichier Excel');
            }
        };

        reader.readAsBinaryString(file);
    };

    const handleBulkImport = async () => {
        if (!selectedImportExamen) {
            toast.error('Veuillez sélectionner un examen');
            return;
        }

        const validItems = importPreview.filter(item => !item.hasError);
        if (validItems.length === 0) {
            toast.error('Aucune note valide trouvée pour l\'import');
            return;
        }

        setIsImporting(true);
        setBackendErrors([]);

        try {
            // First, get anonymats/students based on identifiers
            const identifiers = validItems.map(item => item.identifier);
            let studentsResponse;
            
            if (importType === 'cne') {
                studentsResponse = await axios.post(route('correction.notes.students-by-cne'), {
                    cnes: identifiers,
                    examen_id: selectedImportExamen
                });
            } else {
                // For anonymat type, we need to get anonymats directly
                const anonymatsResponse = await axios.get(route('correction.notes.anonymats'), {
                    params: { examen_id: selectedImportExamen }
                });
                
                // Create a map of anonymat codes to anonymats
                const anonymatMap = {};
                anonymatsResponse.data.forEach(anonymat => {
                    anonymatMap[anonymat.code_anonymat] = {
                        anonymat: anonymat,
                        etudiant: anonymat.etudiant
                    };
                });
                studentsResponse = { data: anonymatMap };
            }

            // Prepare notes for import
            const notesToImport = [];
            const notFoundErrors = [];

            validItems.forEach((item, index) => {
                const studentData = studentsResponse.data[item.identifier];
                if (studentData && studentData.anonymat) {
                    notesToImport.push({
                        id_anonymat: studentData.anonymat.id_anonymat,
                        id_examen: selectedImportExamen,
                        id_element: selectedImportElement || null,
                        id_enseignant: selectedImportEnseignant || null,
                        note: item.note,
                        note_sur: importNoteSur,
                        commentaire: importCommentaire || null
                    });
                } else {
                    notFoundErrors.push({
                        row: item.rowNumber,
                        identifier: item.identifier,
                        errors: [importType === 'cne' ? 'Étudiant non trouvé ou non inscrit à cet examen' : 'Code anonymat non trouvé pour cet examen']
                    });
                }
            });

            if (notesToImport.length === 0) {
                setBackendErrors(notFoundErrors);
                toast.error('Aucun étudiant trouvé pour l\'import');
                setIsImporting(false);
                return;
            }

            // Import notes
            const response = await axios.post(route('correction.notes.import'), 
                { notes: notesToImport },
                {
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                }
            );

            const responseData = response.data;
            const allErrors = [...notFoundErrors, ...(responseData.import_errors || [])];

            if (allErrors.length > 0) {
                setBackendErrors(allErrors);
                
                if (responseData.created > 0) {
                    toast.warning(`Import partiel: ${responseData.created} créées, ${allErrors.length} erreurs`);
                } else {
                    toast.error(`Import échoué: ${allErrors.length} erreurs`);
                }
            } else {
                const createdCount = responseData.created || notesToImport.length;
                toast.success(`Import réussi: ${createdCount} notes créées!`);
                
                // Reset and close modal
                resetImportModal();
            }

            // Reload the page data
            window.location.reload();

        } catch (error) {
            console.error('Import error:', error);
            if (error.response && error.response.data) {
                const responseData = error.response.data;
                if (responseData.import_errors) {
                    setBackendErrors(responseData.import_errors);
                }
                toast.error(responseData.message || 'Erreur lors de l\'import');
            } else {
                toast.error('Erreur de connexion');
            }
        } finally {
            setIsImporting(false);
        }
    };

    const resetImportModal = () => {
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        setImportErrors([]);
        setBackendErrors([]);
        setSelectedImportExamen('');
        setSelectedImportElement('');
        setSelectedImportEnseignant('');
        setImportNoteSur('20');
        setImportCommentaire('');
        setImportType('cne');
        setBulkInputRows([]);
    };

    const resetBulkInputModal = () => {
        setShowBulkInputModal(false);
        setSelectedImportExamen('');
        setSelectedImportElement('');
        setSelectedImportEnseignant('');
        setImportNoteSur('20');
        setImportCommentaire('');
        setBulkInputRows([]);
    };

    const downloadTemplate = () => {
        const template = importType === 'cne' 
            ? [{ cne: 'R123456789', note: '15.5' }]
            : [{ anonymat: 'ANON001', note: '15.5' }];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Notes');
        XLSX.writeFile(wb, `template_notes_${importType}.xlsx`);
    };

    // Bulk input functions
    const initializeBulkInput = async () => {
        if (!selectedImportExamen) {
            toast.error('Veuillez d\'abord sélectionner un examen');
            return;
        }
        
        try {
            // Get ALL anonymats for the selected exam
            const response = await axios.get(route('correction.notes.anonymats'), {
                params: { examen_id: selectedImportExamen }
            });
            
            const anonymats = response.data;
            if (anonymats.length === 0) {
                toast.error('Aucun étudiant trouvé pour cet examen');
                return;
            }
            
            // Create rows with ALL students for this exam
            const rows = anonymats.map((anonymat, index) => {
                // Try multiple ways to get etudiant data
                const etudiant = anonymat.etudiant || 
                               anonymat.inscription_pedagogique?.etudiant ||
                               anonymat.inscription_pedagogique?.inscription_administrative?.etudiant;
                
                return {
                    id: index,
                    anonymat: anonymat,
                    etudiant: etudiant,
                    note: '',
                    hasError: false,
                    errors: []
                };
            });
            
            setBulkInputRows(rows);
            toast.success(`${rows.length} étudiants chargés pour la saisie`);
            
            // Debug: Log first few rows to check data structure
            console.log('First 3 rows:', rows.slice(0, 3));
        } catch (error) {
            console.error('Error loading students:', error);
            toast.error('Erreur lors du chargement des étudiants');
        }
    };

    const handleBulkInputSubmit = async () => {
        // Validate rows - only check if notes are filled
        const validRows = bulkInputRows.filter(row => row.note && row.note.trim());
        if (validRows.length === 0) {
            toast.error('Veuillez saisir au moins une note');
            return;
        }

        setIsImporting(true);

        try {
            // Prepare notes directly from the loaded anonymats
            const notesToImport = validRows.map(row => ({
                id_anonymat: row.anonymat.id_anonymat,
                id_examen: selectedImportExamen,
                id_element: selectedImportElement || null,
                id_enseignant: selectedImportEnseignant || null,
                note: row.note.trim(),
                note_sur: importNoteSur,
                commentaire: importCommentaire || null
            }));

            // Import notes
            const response = await axios.post(route('correction.notes.import'), 
                { notes: notesToImport },
                {
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                }
            );

            const responseData = response.data;
            if (responseData.created > 0) {
                toast.success(`${responseData.created} notes créées avec succès!`);
                resetBulkInputModal();
                window.location.reload();
            } else if (responseData.import_errors && responseData.import_errors.length > 0) {
                toast.error(`Erreurs détectées: ${responseData.import_errors.length} notes non créées`);
            }

        } catch (error) {
            console.error('Bulk input error:', error);
            if (error.response && error.response.data && error.response.data.import_errors) {
                toast.error(`${error.response.data.import_errors.length} erreurs détectées`);
            } else {
                toast.error('Erreur lors de la saisie en lot');
            }
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Gestion des notes" />

            <div className="space-y-6">
                {/* Header with Statistics */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <FileText size={32} className="text-indigo-600" />
                                Gestion des notes
                            </h1>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                Saisissez et gérez les notes des étudiants
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                            >
                                <Plus size={16} />
                                <span className="hidden sm:inline">Import Excel</span>
                            </button>
                            <button
                                onClick={() => setShowBulkInputModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                            >
                                <Plus size={16} />
                                <span className="hidden sm:inline">Saisie en lot</span>
                            </button>
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        {/* Total Notes */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Notes</p>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.total}</p>
                                </div>
                                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg">
                                    <FileText size={24} className="text-indigo-600 dark:text-indigo-400" />
                                </div>
                            </div>
                        </div>

                        {/* Moyenne */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Moyenne</p>
                                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.moyenne}/20</p>
                                </div>
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                                    <TrendingUp size={24} className="text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </div>

                        {/* Réussite */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Réussite (≥10)</p>
                                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.reussite}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {stats.total > 0 ? Math.round((stats.reussite / stats.total) * 100) : 0}%
                                    </p>
                                </div>
                                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                                    <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </div>

                        {/* Échec */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Échec (&lt;10)</p>
                                    <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{stats.echec}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {stats.total > 0 ? Math.round((stats.echec / stats.total) * 100) : 0}%
                                    </p>
                                </div>
                                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                                    <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                        </div>

                        {/* Absents */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Absents</p>
                                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{stats.absents}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ABS</p>
                                </div>
                                <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg">
                                    <Clock size={24} className="text-orange-600 dark:text-orange-400" />
                                </div>
                            </div>
                        </div>

                        {/* Capitalisés */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Capitalisés</p>
                                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{stats.capitalises}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">CAP</p>
                                </div>
                                <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
                                    <CheckCircle size={24} className="text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6">
                    {/* List Section */}
                    <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
                        <div className="mb-4">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher une note..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Étudiant
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Examen
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Élément
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Note
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Enseignant
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Date
                                        </th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredNotes.length > 0 ? (
                                        filteredNotes.map((note) => (
                                            <tr key={note.id_note} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    <div className="font-semibold">
                                                        {note.anonymat?.etudiant
                                                            ? `${note.anonymat.etudiant.nom} ${note.anonymat.etudiant.prenom}`
                                                            : 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {note.anonymat?.code_anonymat}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    <div className="font-semibold">
                                                        {note.examen?.module?.code_module}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {note.examen?.module?.nom_module}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    {note.element ? (
                                                        <div>
                                                            <div className="font-semibold">
                                                                {note.element.code_element}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {note.element.nom_element}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Module complet</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {note.note === 'ABS' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                                                            ABS
                                                        </span>
                                                    ) : note.note === 'CAP' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                                            CAP
                                                        </span>
                                                    ) : (
                                                        <div>
                                                            <span className={`text-2xl font-bold ${getNoteColor(note.note)}`}>
                                                                {parseFloat(note.note).toFixed(2)}
                                                            </span>
                                                            <span className="text-xs text-gray-500 ml-1">/{note.note_sur || 20}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    {note.enseignant ? (
                                                        <div>
                                                            <div className="font-semibold">
                                                                {note.enseignant.nom} {note.enseignant.prenom}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Non assigné</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    {note.date_saisie && new Date(note.date_saisie).toLocaleDateString('fr-FR')}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleDelete(note.id_note)}
                                                            className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-gray-600"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                                Aucune note trouvée
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {links.length > 0 && (
                            <div className="mt-6 flex items-center justify-between">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Affichage de {notes.from || 0} à {notes.to || 0} sur {notes.total || 0} notes
                                </div>
                                <div className="flex gap-2">
                                    {links.map((link, index) => (
                                        <Link
                                            key={index}
                                            href={link.url || '#'}
                                            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                link.active
                                                    ? 'bg-indigo-600 text-white'
                                                    : link.url
                                                    ? 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                                                    : 'border border-gray-300 text-gray-400 cursor-not-allowed dark:border-gray-600 dark:text-gray-600'
                                            }`}
                                            disabled={!link.url}
                                        >
                                            {link.label.includes('Previous') ? <ChevronLeft size={16} /> : link.label.includes('Next') ? <ChevronRight size={16} /> : link.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={3000} />

            {/* Unified Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ajouter des notes</h2>
                            <button onClick={resetImportModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6">
                            {/* Import Type Selection */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Type d'import
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="cne"
                                            checked={importType === 'cne'}
                                            onChange={(e) => setImportType(e.target.value)}
                                            className="mr-2"
                                        />
                                        CNE + Note
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="anonymat"
                                            checked={importType === 'anonymat'}
                                            onChange={(e) => setImportType(e.target.value)}
                                            className="mr-2"
                                        />
                                        Anonymat + Note
                                    </label>
                                </div>
                            </div>

                            {/* File Selection */}
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
                                    Le fichier Excel doit contenir les colonnes: {importType === 'cne' ? '"cne"' : '"anonymat"'} et "note"
                                </p>
                                <button
                                    onClick={downloadTemplate}
                                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                >
                                    Télécharger le modèle Excel
                                </button>
                            </div>

                            {/* Common Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Examen *
                                    </label>
                                    <select
                                        value={selectedImportExamen}
                                        onChange={(e) => setSelectedImportExamen(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
                                    >
                                        <option value="">--Sélectionner un examen--</option>
                                        {examens.map(examen => (
                                            <option key={examen.id_examen} value={examen.id_examen}>
                                                {examen.module?.code_module} - {examen.module?.nom_module}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Élément du module
                                    </label>
                                    <select
                                        value={selectedImportElement}
                                        onChange={(e) => setSelectedImportElement(e.target.value)}
                                        disabled={!selectedImportExamen}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg disabled:opacity-50"
                                    >
                                        <option value="">--Module complet--</option>
                                        {selectedImportExamen && examens.find(e => e.id_examen == selectedImportExamen)?.module?.elements?.map(element => (
                                            <option key={element.id_element} value={element.id_element}>
                                                {element.code_element} - {element.nom_element}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Enseignant
                                    </label>
                                    <select
                                        value={selectedImportEnseignant}
                                        onChange={(e) => setSelectedImportEnseignant(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
                                    >
                                        <option value="">--Aucun enseignant--</option>
                                        {enseignants.map(enseignant => (
                                            <option key={enseignant.id_enseignant} value={enseignant.id_enseignant}>
                                                {enseignant.nom} {enseignant.prenom}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Note sur
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={importNoteSur}
                                        onChange={(e) => setImportNoteSur(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Commentaire (optionnel)
                                </label>
                                <textarea
                                    rows="2"
                                    value={importCommentaire}
                                    onChange={(e) => setImportCommentaire(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
                                    placeholder="Commentaire commun pour toutes les notes..."
                                />
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
                                            {importPreview.filter(p => !p.hasError).length}
                                        </div>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                                        <div className="text-red-800 dark:text-red-300 font-medium">Erreurs</div>
                                        <div className="text-2xl font-bold text-red-900 dark:text-red-100">{importErrors.length}</div>
                                    </div>
                                </div>
                            )}

                            {/* Errors Display */}
                            {(importErrors.length > 0 || backendErrors.length > 0) && (
                                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <h3 className="text-red-800 dark:text-red-300 font-medium mb-3">
                                        Erreurs - {importErrors.length + backendErrors.length} ligne(s)
                                    </h3>
                                    <div className="max-h-48 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-red-100 dark:bg-red-900/50 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-red-800 dark:text-red-300">Ligne</th>
                                                    <th className="px-3 py-2 text-left text-red-800 dark:text-red-300">{importType === 'cne' ? 'CNE' : 'Anonymat'}</th>
                                                    <th className="px-3 py-2 text-left text-red-800 dark:text-red-300">Erreurs</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-red-200 dark:divide-red-800">
                                                {[...importErrors, ...backendErrors].map((error, i) => (
                                                    <tr key={i} className="text-red-700 dark:text-red-300">
                                                        <td className="px-3 py-2 font-medium">{error.row}</td>
                                                        <td className="px-3 py-2">{error.identifier || error.cne || error.anonymat || '-'}</td>
                                                        <td className="px-3 py-2">
                                                            <div className="space-y-1">
                                                                {(Array.isArray(error.errors) ? error.errors : [error.errors]).map((err, j) => (
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

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={resetImportModal}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Annuler
                                </button>
                                {(() => {
                                    const validCount = importPreview.filter(p => !p.hasError).length;
                                    const hasValidRows = validCount > 0;
                                    const hasErrors = importErrors.length > 0;
                                    const allFieldsSelected = selectedImportExamen;

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
                                                Sélectionnez un examen
                                            </button>
                                        );
                                    }

                                    if (!hasValidRows) {
                                        return (
                                            <button disabled className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed">
                                                Aucune note valide
                                            </button>
                                        );
                                    }

                                    if (isImporting) {
                                        return (
                                            <button disabled className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed flex items-center gap-2">
                                                <Loader2 size={16} className="animate-spin" />
                                                Import en cours...
                                            </button>
                                        );
                                    }

                                    return (
                                        <button
                                            onClick={handleBulkImport}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                                        >
                                            Importer {validCount} note{validCount > 1 ? 's' : ''}
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Input Modal */}
            {showBulkInputModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Saisie en lot - Notes</h2>
                            <button onClick={resetBulkInputModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6">
                            {/* Common Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Examen *
                                    </label>
                                    <select
                                        value={selectedImportExamen}
                                        onChange={(e) => {
                                            setSelectedImportExamen(e.target.value);
                                            setBulkInputRows([]); // Clear rows when exam changes
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
                                    >
                                        <option value="">--Sélectionner un examen--</option>
                                        {examens.map(examen => (
                                            <option key={examen.id_examen} value={examen.id_examen}>
                                                {examen.module?.code_module} - {examen.module?.nom_module}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Élément du module
                                    </label>
                                    <select
                                        value={selectedImportElement}
                                        onChange={(e) => setSelectedImportElement(e.target.value)}
                                        disabled={!selectedImportExamen}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg disabled:opacity-50"
                                    >
                                        <option value="">--Module complet--</option>
                                        {selectedImportExamen && examens.find(e => e.id_examen == selectedImportExamen)?.module?.elements?.map(element => (
                                            <option key={element.id_element} value={element.id_element}>
                                                {element.code_element} - {element.nom_element}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Note sur
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={importNoteSur}
                                        onChange={(e) => setImportNoteSur(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Enseignant
                                    </label>
                                    <select
                                        value={selectedImportEnseignant}
                                        onChange={(e) => setSelectedImportEnseignant(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
                                    >
                                        <option value="">--Aucun enseignant--</option>
                                        {enseignants.map(enseignant => (
                                            <option key={enseignant.id_enseignant} value={enseignant.id_enseignant}>
                                                {enseignant.nom} {enseignant.prenom}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Commentaire (optionnel)
                                    </label>
                                    <input
                                        type="text"
                                        value={importCommentaire}
                                        onChange={(e) => setImportCommentaire(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
                                        placeholder="Commentaire commun pour toutes les notes..."
                                    />
                                </div>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={initializeBulkInput}
                                        disabled={!selectedImportExamen}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Charger tous les étudiants
                                    </button>
                                    {bulkInputRows.length > 0 && (
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {bulkInputRows.length} étudiants chargés
                                        </span>
                                    )}
                                </div>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                    Tous les étudiants inscrits à cet examen seront automatiquement chargés
                                </p>
                            </div>

                            {/* Bulk Input Table */}
                            {bulkInputRows.length > 0 && (
                                <div className="mb-6">
                                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                                        <div className="max-h-96 overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">#</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CNE</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Étudiant</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Anonymat</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Note /{importNoteSur}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {bulkInputRows.map((row, index) => (
                                                        <tr key={row.id}>
                                                            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{index + 1}</td>
                                                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">
                                                                {row.etudiant?.cne || 'N/A'}
                                                            </td>
                                                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                                                {row.etudiant ? `${row.etudiant.nom} ${row.etudiant.prenom}` : 'N/A'}
                                                            </td>
                                                            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                                                                {row.anonymat?.code_anonymat || 'N/A'}
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <input
                                                                    type="text"
                                                                    value={row.note}
                                                                    onChange={(e) => {
                                                                        const newRows = [...bulkInputRows];
                                                                        newRows[index].note = e.target.value;
                                                                        setBulkInputRows(newRows);
                                                                    }}
                                                                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded"
                                                                    placeholder="15.5, ABS, CAP"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                                        <p>💡 <strong>Instructions:</strong></p>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            <li>Saisissez les notes dans la colonne "Note"</li>
                                            <li>Utilisez des nombres (ex: 15.5), "ABS" pour absent, ou "CAP" pour capitalisé</li>
                                            <li>Laissez vide les lignes que vous ne voulez pas noter</li>
                                            <li>Les informations étudiant sont automatiquement chargées depuis l'examen</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={resetBulkInputModal}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Annuler
                                </button>
                                {bulkInputRows.length > 0 && selectedImportExamen && (
                                    <button
                                        onClick={handleBulkInputSubmit}
                                        disabled={isImporting}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isImporting && <Loader2 size={16} className="animate-spin" />}
                                        Sauvegarder les notes
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
