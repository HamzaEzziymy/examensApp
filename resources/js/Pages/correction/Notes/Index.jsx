import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { FileText, Trash2, Search, Plus, X, Loader2, ChevronDown, ChevronUp, ArrowDownToLine } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function NotesIndex({ examens = [], enseignants = [] }) {
    const { auth } = usePage().props;

    const [searchTerm, setSearchTerm] = useState('');
    const [groupedNotes, setGroupedNotes] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [exportModal, setExportModal] = useState(null);

    // Import modal state
    const [showModal, setShowModal] = useState(false);
    const [inputMode, setInputMode] = useState('bulk');
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState([]);
    const [importErrors, setImportErrors] = useState([]);
    const [backendErrors, setBackendErrors] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importType, setImportType] = useState('cne');
    const [selectedImportExamen, setSelectedImportExamen] = useState('');
    const [selectedImportElement, setSelectedImportElement] = useState('');
    const [selectedImportEnseignant, setSelectedImportEnseignant] = useState('');
    const [importNoteSur, setImportNoteSur] = useState('20');
    const [importCommentaire, setImportCommentaire] = useState('');
    const [bulkInputRows, setBulkInputRows] = useState([]);

    const selectedExamData = examens.find(e => e.id_examen == selectedImportExamen);
    const availableElements = selectedExamData?.module?.elements || [];

    const fetchGroupedNotes = async () => {
        setLoadingGroups(true);
        try {
            const res = await axios.get(route('correction.notes.grouped'));
            setGroupedNotes(res.data);
        } catch {
            toast.error('Erreur lors du chargement des notes');
        } finally {
            setLoadingGroups(false);
        }
    };

    useEffect(() => { fetchGroupedNotes(); }, []);

    useEffect(() => {
        if (selectedImportExamen && inputMode === 'bulk' && showModal && bulkInputRows.length === 0) {
            initializeBulkInput();
        }
    }, [selectedImportExamen, inputMode, showModal]);

    const toggleGroup = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

    const filteredGroups = groupedNotes.filter((group) => {
        const q = searchTerm.toLowerCase();
        return (
            (group.session_nom?.toLowerCase() || '').includes(q) ||
            (group.module_code?.toLowerCase() || '').includes(q) ||
            (group.module_name?.toLowerCase() || '').includes(q) ||
            (group.element_code?.toLowerCase() || '').includes(q) ||
            (group.element_name?.toLowerCase() || '').includes(q)
        );
    });

    const handleDelete = (id) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
            router.delete(route('correction.notes.destroy', id), {
                onSuccess: () => fetchGroupedNotes(),
            });
        }
    };

    const handleDeleteGroup = async (group) => {
        const label = group.element_code ? `${group.module_code} / ${group.element_code}` : group.module_code;
        if (!confirm(`Supprimer toutes les ${group.notes_count} notes de "${label}" ?`)) return;
        try {
            await Promise.all(group.notes.map(n => axios.delete(route('correction.notes.destroy', n.id_note))));
            toast.success(`${group.notes_count} notes supprimées`);
            fetchGroupedNotes();
        } catch {
            toast.error('Erreur lors de la suppression');
        }
    };

    const handleExcelExport = (group, fields) => {
        const rows = group.notes.map(n => {
            const row = {};
            if (fields.cne)        row['CNE']         = n.etudiant_cne;
            if (fields.nom)        row['Nom']          = n.etudiant_nom;
            if (fields.prenom)     row['Prénom']       = n.etudiant_prenom;
            if (fields.anonymat)   row['Anonymat']     = n.code_anonymat;
            if (fields.note)       row['Note']         = n.note;
            if (fields.note_sur)   row['Note sur']     = n.note_sur;
            if (fields.enseignant) row['Enseignant']   = n.enseignant_nom ? `${n.enseignant_nom} ${n.enseignant_prenom}` : '';
            if (fields.date)       row['Date saisie']  = n.date_saisie ? new Date(n.date_saisie).toLocaleDateString('fr-FR') : '';
            return row;
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Notes');
        XLSX.writeFile(wb, `releve_${group.module_code}${group.element_code ? '_' + group.element_code : ''}.xlsx`);
        setExportModal(null);
    };

    const getNoteColor = (note) => {
        const n = parseFloat(note);
        if (n >= 16) return 'text-green-600 dark:text-green-400';
        if (n >= 14) return 'text-blue-600 dark:text-blue-400';
        if (n >= 10) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const resetModal = () => {
        setShowModal(false);
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

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportFile(file);
        setBackendErrors([]);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const workbook = XLSX.read(event.target.result, { type: 'binary' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(sheet);
                if (data.length === 0) { toast.error('Le fichier Excel est vide'); return; }
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
                    if (!note) rowErrors.push('Note requise');
                    else if (!['ABS', 'CAP'].includes(note.toUpperCase()) && isNaN(parseFloat(note)))
                        rowErrors.push('Note invalide (nombre, ABS, ou CAP)');
                    if (rowErrors.length > 0) errors.push({ row: rowNumber, identifier, note, errors: rowErrors });
                    return { identifier, note, rowNumber, hasError: rowErrors.length > 0, errors: rowErrors };
                });
                setImportPreview(preview);
                setImportErrors(errors);
                const validCount = preview.filter(p => !p.hasError).length;
                if (errors.length > 0) {
                    validCount > 0
                        ? toast.warning(`Fichier analysé: ${validCount} valides, ${errors.length} avec erreurs`)
                        : toast.error(`Aucune note valide: ${errors.length} erreurs détectées`);
                } else {
                    toast.success(`Fichier validé: ${validCount} notes prêtes à importer`);
                }
            } catch { toast.error('Erreur lors de la lecture du fichier Excel'); }
        };
        reader.readAsBinaryString(file);
    };

    const downloadTemplate = () => {
        const template = importType === 'cne' ? [{ cne: 'R123456789', note: '15.5' }] : [{ anonymat: '1001', note: '15.5' }];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Notes');
        XLSX.writeFile(wb, `template_notes_${importType}.xlsx`);
    };

    const handleExcelImport = async () => {
        if (!selectedImportExamen) { toast.error('Veuillez sélectionner un examen'); return; }
        const validItems = importPreview.filter(item => !item.hasError);
        if (validItems.length === 0) { toast.error('Aucune note valide trouvée'); return; }
        setIsImporting(true);
        setBackendErrors([]);
        try {
            const identifiers = validItems.map(item => item.identifier);
            let studentsResponse;
            if (importType === 'cne') {
                studentsResponse = await axios.post(route('correction.notes.students-by-cne'), { cnes: identifiers, examen_id: selectedImportExamen });
            } else {
                const anonymatsResponse = await axios.get(route('correction.notes.anonymats'), { params: { examen_id: selectedImportExamen } });
                const anonymatMap = {};
                anonymatsResponse.data.forEach(a => { anonymatMap[a.code_anonymat] = { anonymat: a, etudiant: a.etudiant }; });
                studentsResponse = { data: anonymatMap };
            }
            const notesToImport = [];
            const notFoundErrors = [];
            validItems.forEach((item) => {
                const studentData = studentsResponse.data[item.identifier];
                if (studentData?.anonymat) {
                    notesToImport.push({ id_anonymat: studentData.anonymat.id_anonymat, id_examen: selectedImportExamen, id_element: selectedImportElement || null, id_enseignant: selectedImportEnseignant || null, note: item.note, note_sur: importNoteSur, commentaire: importCommentaire || null });
                } else {
                    notFoundErrors.push({ row: item.rowNumber, identifier: item.identifier, errors: [importType === 'cne' ? 'Étudiant non trouvé' : 'Code anonymat non trouvé'] });
                }
            });
            if (notesToImport.length === 0) { setBackendErrors(notFoundErrors); toast.error('Aucun étudiant trouvé'); setIsImporting(false); return; }
            const response = await axios.post(route('correction.notes.import'), { notes: notesToImport }, { headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
            const responseData = response.data;
            const allErrors = [...notFoundErrors, ...(responseData.import_errors || [])];
            if (allErrors.length > 0) {
                setBackendErrors(allErrors);
                responseData.created > 0 ? toast.warning(`Import partiel: ${responseData.created} créées, ${allErrors.length} erreurs`) : toast.error(`Import échoué: ${allErrors.length} erreurs`);
            } else {
                toast.success(`Import réussi: ${responseData.created || notesToImport.length} notes créées!`);
                resetModal();
            }
            fetchGroupedNotes();
        } catch (error) {
            if (error.response?.data?.import_errors) setBackendErrors(error.response.data.import_errors);
            toast.error(error.response?.data?.message || 'Erreur lors de l\'import');
        } finally { setIsImporting(false); }
    };

    const initializeBulkInput = async () => {
        if (!selectedImportExamen) { toast.error('Veuillez d\'abord sélectionner un examen'); return; }
        try {
            const response = await axios.get(route('correction.notes.anonymats'), { params: { examen_id: selectedImportExamen } });
            const anonymats = response.data;
            if (anonymats.length === 0) { toast.error('Aucun étudiant trouvé pour cet examen'); return; }
            const rows = anonymats.map((anonymat, index) => {
                const etudiant = anonymat.etudiant || anonymat.inscription_pedagogique?.inscription_administrative?.etudiant;
                return { id: index, anonymat, etudiant, note: '', hasError: false, errors: [] };
            });
            setBulkInputRows(rows);
            toast.success(`${rows.length} étudiants chargés`);
        } catch { toast.error('Erreur lors du chargement des étudiants'); }
    };

    const handleBulkInputSubmit = async () => {
        const validRows = bulkInputRows.filter(row => row.note && row.note.trim());
        if (validRows.length === 0) { toast.error('Veuillez saisir au moins une note'); return; }
        setIsImporting(true);
        try {
            const notesToImport = validRows.map(row => ({ id_anonymat: row.anonymat.id_anonymat, id_examen: selectedImportExamen, id_element: selectedImportElement || null, id_enseignant: selectedImportEnseignant || null, note: row.note.trim(), note_sur: importNoteSur, commentaire: importCommentaire || null }));
            const response = await axios.post(route('correction.notes.import'), { notes: notesToImport }, { headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
            const responseData = response.data;
            if (responseData.created > 0) {
                toast.success(`${responseData.created} notes créées avec succès!`);
                resetModal();
                fetchGroupedNotes();
            } else if (responseData.import_errors?.length > 0) {
                toast.error(`Erreurs: ${responseData.import_errors.length} notes non créées`);
            }
        } catch { toast.error('Erreur lors de la saisie en lot'); }
        finally { setIsImporting(false); }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Gestion des notes" />
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <FileText size={32} className="text-indigo-600" />
                            Gestion des notes
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Saisissez et gérez les notes des étudiants</p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                        <Plus size={16} />
                        <span className="hidden sm:inline">Saisir des notes</span>
                    </button>
                </div>

                {/* Notes Table */}
                <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
                    <div className="mb-4">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                            <input type="text" placeholder="Rechercher par session, module ou élément..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white w-8"></th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Session</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Module</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Élément</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Nbr Étudiants</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {loadingGroups ? (
                                    <tr><td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                        <Loader2 size={20} className="animate-spin inline mr-2" />Chargement...
                                    </td></tr>
                                ) : filteredGroups.length > 0 ? (
                                    filteredGroups.map((group) => {
                                        const key = `${group.id_examen}-${group.id_element ?? 'module'}`;
                                        const isExpanded = !!expandedGroups[key];
                                        return (
                                            <React.Fragment key={key}>
                                                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => toggleGroup(key)}>
                                                    <td className="px-4 py-3 text-gray-400">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                        {group.session_nom ? (<><div className="font-semibold">{group.session_nom}</div>{group.session_type && <div className="text-xs text-gray-500">{group.session_type}</div>}</>) : <span className="text-xs text-gray-400 italic">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                        <div className="font-semibold">{group.module_code}</div>
                                                        <div className="text-xs text-gray-500">{group.module_name}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                        {group.element_code ? (<><div className="font-semibold">{group.element_code}</div><div className="text-xs text-gray-500">{group.element_name}</div></>) : <span className="text-xs text-gray-400 italic">Module complet</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                            {group.notes_count} étudiant{group.notes_count > 1 ? 's' : ''}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right">
                                                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                            <button onClick={() => setExportModal(group)} className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700" title="Exporter le relevé">
                                                                <ArrowDownToLine size={15} />
                                                            </button>
                                                            <button onClick={() => handleDeleteGroup(group)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-gray-700" title="Supprimer toutes les notes">
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan="6" className="p-0">
                                                            <div className="bg-gray-50 dark:bg-gray-900/40 border-t border-b border-gray-200 dark:border-gray-700">
                                                                <table className="w-full">
                                                                    <thead>
                                                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                                                            <th className="px-6 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Étudiant</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Anonymat</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Note</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Enseignant</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Date</th>
                                                                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                                        {group.notes.map((note) => (
                                                                            <tr key={note.id_note} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                                                                                <td className="px-6 py-2 text-sm text-gray-900 dark:text-gray-100">
                                                                                    <div className="font-medium">{note.etudiant_nom} {note.etudiant_prenom}</div>
                                                                                    <div className="text-xs text-gray-400">{note.etudiant_cne}</div>
                                                                                </td>
                                                                                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{note.code_anonymat}</td>
                                                                                <td className="px-4 py-2 text-sm">
                                                                                    {note.note === 'ABS' ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">ABS</span>
                                                                                    : note.note === 'CAP' ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">CAP</span>
                                                                                    : <span className={`font-bold ${getNoteColor(note.note)}`}>{parseFloat(note.note).toFixed(2)}<span className="text-xs text-gray-400 font-normal ml-1">/{note.note_sur}</span></span>}
                                                                                </td>
                                                                                <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                                                                                    {note.enseignant_nom ? `${note.enseignant_nom} ${note.enseignant_prenom}` : <span className="text-xs text-gray-400 italic">Non assigné</span>}
                                                                                </td>
                                                                                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                                                    {note.date_saisie && new Date(note.date_saisie).toLocaleDateString('fr-FR')}
                                                                                </td>
                                                                                <td className="px-4 py-2 text-right">
                                                                                    <button onClick={() => handleDelete(note.id_note)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-gray-700" title="Supprimer">
                                                                                        <Trash2 size={14} />
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan="6" className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">Aucune note trouvée</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={3000} />
            {exportModal && <ExportModal group={exportModal} onClose={() => setExportModal(null)} onExcelExport={handleExcelExport} />}

            {/* Import Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Saisir des notes</h2>
                            <button onClick={resetModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={24} /></button>
                        </div>
                        <div className="p-6">
                            {/* Mode Toggle */}
                            <div className="mb-6">
                                <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden w-fit">
                                    <button onClick={() => { setInputMode('bulk'); setBulkInputRows([]); }}
                                        className={`px-5 py-2.5 text-sm font-medium transition-colors ${inputMode === 'bulk' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                                        Saisie en lot
                                    </button>
                                    <button onClick={() => { setInputMode('excel'); setImportPreview([]); setImportErrors([]); setBackendErrors([]); setImportFile(null); }}
                                        className={`px-5 py-2.5 text-sm font-medium transition-colors ${inputMode === 'excel' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                                        Importer Excel
                                    </button>
                                </div>
                            </div>

                            {/* Common Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Examen *</label>
                                    <select value={selectedImportExamen} onChange={(e) => { setSelectedImportExamen(e.target.value); setBulkInputRows([]); }}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg">
                                        <option value="">--Sélectionner un examen--</option>
                                        {examens.map(examen => (
                                            <option key={examen.id_examen} value={examen.id_examen}>
                                                {examen.module?.code_module} - {examen.module?.nom_module}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Élément du module</label>
                                    <select value={selectedImportElement} onChange={(e) => setSelectedImportElement(e.target.value)} disabled={!selectedImportExamen}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg disabled:opacity-50">
                                        <option value="">--Module complet--</option>
                                        {availableElements.map(element => (
                                            <option key={element.id_element} value={element.id_element}>{element.code_element} - {element.nom_element}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note sur</label>
                                    <input type="number" step="0.01" min="0" max="100" value={importNoteSur} onChange={(e) => setImportNoteSur(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enseignant</label>
                                    <select value={selectedImportEnseignant} onChange={(e) => setSelectedImportEnseignant(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg">
                                        <option value="">--Aucun enseignant--</option>
                                        {enseignants.map(e => <option key={e.id_enseignant} value={e.id_enseignant}>{e.nom} {e.prenom}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Commentaire (optionnel)</label>
                                    <input type="text" value={importCommentaire} onChange={(e) => setImportCommentaire(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
                                        placeholder="Commentaire commun pour toutes les notes..." />
                                </div>
                            </div>

                            <hr className="my-4 border-gray-200 dark:border-gray-700" />

                            {/* Bulk Input */}
                            {inputMode === 'bulk' && (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <button onClick={initializeBulkInput} disabled={!selectedImportExamen}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                            Charger les étudiants
                                        </button>
                                        {bulkInputRows.length > 0 && <span className="text-sm text-gray-600 dark:text-gray-400">{bulkInputRows.length} étudiants chargés</span>}
                                    </div>
                                    {bulkInputRows.length > 0 && (
                                        <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden mb-4">
                                            <div className="max-h-96 overflow-y-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CNE</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Étudiant</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Anonymat</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Note /{importNoteSur}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                        {bulkInputRows.map((row, index) => (
                                                            <tr key={row.id}>
                                                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{index + 1}</td>
                                                                <td className="px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{row.etudiant?.cne || 'N/A'}</td>
                                                                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{row.etudiant ? `${row.etudiant.nom} ${row.etudiant.prenom}` : 'N/A'}</td>
                                                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{row.anonymat?.code_anonymat || 'N/A'}</td>
                                                                <td className="px-4 py-2">
                                                                    <input type="text" value={row.note}
                                                                        onChange={(e) => { const newRows = [...bulkInputRows]; newRows[index].note = e.target.value; setBulkInputRows(newRows); }}
                                                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded"
                                                                        placeholder="15.5, ABS, CAP" />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Saisissez des nombres (ex: 15.5), "ABS" pour absent, ou "CAP" pour capitalisé.</p>
                                </div>
                            )}

                            {/* Excel Import */}
                            {inputMode === 'excel' && (
                                <div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type d'identifiant</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" value="cne" checked={importType === 'cne'} onChange={(e) => setImportType(e.target.value)} />CNE + Note</label>
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" value="anonymat" checked={importType === 'anonymat'} onChange={(e) => setImportType(e.target.value)} />Anonymat + Note</label>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fichier Excel</label>
                                        <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg" />
                                        <p className="mt-1 text-sm text-gray-500">Colonnes requises: {importType === 'cne' ? '"cne"' : '"anonymat"'} et "note"</p>
                                        <button onClick={downloadTemplate} className="mt-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Télécharger le modèle Excel</button>
                                    </div>
                                    {importPreview.length > 0 && (
                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                                <div className="text-blue-800 dark:text-blue-300 font-medium">Total</div>
                                                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{importPreview.length}</div>
                                            </div>
                                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                                                <div className="text-green-800 dark:text-green-300 font-medium">Valides</div>
                                                <div className="text-2xl font-bold text-green-900 dark:text-green-100">{importPreview.filter(p => !p.hasError).length}</div>
                                            </div>
                                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                                                <div className="text-red-800 dark:text-red-300 font-medium">Erreurs</div>
                                                <div className="text-2xl font-bold text-red-900 dark:text-red-100">{importErrors.length}</div>
                                            </div>
                                        </div>
                                    )}
                                    {(importErrors.length > 0 || backendErrors.length > 0) && (
                                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                                            <h3 className="text-red-800 dark:text-red-300 font-medium mb-3">Erreurs — {importErrors.length + backendErrors.length} ligne(s)</h3>
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
                                                                <td className="px-3 py-2">{(Array.isArray(error.errors) ? error.errors : [error.errors]).map((err, j) => <div key={j} className="text-xs bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded mb-1">{err}</div>)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button onClick={resetModal} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Annuler</button>
                                {inputMode === 'bulk' && bulkInputRows.length > 0 && selectedImportExamen && (
                                    <button onClick={handleBulkInputSubmit} disabled={isImporting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
                                        {isImporting && <Loader2 size={16} className="animate-spin" />}Sauvegarder les notes
                                    </button>
                                )}
                                {inputMode === 'excel' && importPreview.filter(p => !p.hasError).length > 0 && selectedImportExamen && (
                                    <button onClick={handleExcelImport} disabled={isImporting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
                                        {isImporting && <Loader2 size={16} className="animate-spin" />}
                                        Importer {importPreview.filter(p => !p.hasError).length} note{importPreview.filter(p => !p.hasError).length > 1 ? 's' : ''}
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

import React from 'react';

function ExportModal({ group, onClose, onExcelExport }) {
    const [format, setFormat] = useState('pdf');
    const [sortBy, setSortBy] = useState('nom');
    const [sortOrder, setSortOrder] = useState('asc');
    const [fields, setFields] = useState({ cne: true, nom: true, prenom: true, anonymat: true, note: true, note_sur: true, enseignant: false, date: false });

    const toggleField = (f) => setFields(prev => ({ ...prev, [f]: !prev[f] }));

    const handleExport = () => {
        if (format === 'pdf') {
            window.open(route('correction.notes.export-pdf', { id_examen: group.id_examen, id_element: group.id_element ?? '', sort_by: sortBy, sort_order: sortOrder }), '_blank');
            onClose();
        } else {
            onExcelExport(group, fields);
        }
    };

    const label = group.element_code ? `${group.module_code} — ${group.element_code}` : group.module_code;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Exporter le relevé</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
                </div>
                <div className="p-5 space-y-5">
                    <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Format</p>
                        <div className="flex gap-3">
                            {[['pdf', 'PDF'], ['excel', 'Excel']].map(([val, lbl]) => (
                                <button key={val} onClick={() => setFormat(val)}
                                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition ${format === val ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                    {lbl}
                                </button>
                            ))}
                        </div>
                    </div>
                    {format === 'pdf' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trier par</label>
                                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg">
                                    <option value="nom">Nom</option>
                                    <option value="note">Note</option>
                                    <option value="anonymat">Anonymat</option>
                                    <option value="cne">CNE</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordre</label>
                                <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg">
                                    <option value="asc">Croissant</option>
                                    <option value="desc">Décroissant</option>
                                </select>
                            </div>
                        </div>
                    )}
                    {format === 'excel' && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Colonnes à inclure</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[['cne','CNE'],['nom','Nom'],['prenom','Prénom'],['anonymat','Anonymat'],['note','Note'],['note_sur','Note sur'],['enseignant','Enseignant'],['date','Date saisie']].map(([key, lbl]) => (
                                    <label key={key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                        <input type="checkbox" checked={fields[key]} onChange={() => toggleField(key)} className="rounded border-gray-300 text-indigo-600" />{lbl}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 px-5 pb-5">
                    <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Annuler</button>
                    <button onClick={handleExport} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2">
                        <ArrowDownToLine size={15} />Exporter
                    </button>
                </div>
            </div>
        </div>
    );
}
