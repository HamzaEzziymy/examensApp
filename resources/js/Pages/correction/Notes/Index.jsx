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

    const handleExcelExport = (group, opts) => {
        const { fields, sortBy, sortOrder, sortBy2, sortOrder2, filterType, filterMin, filterMax } = opts;

        let notes = [...group.notes];

        // Filter
        if (filterType !== 'all') {
            notes = notes.filter(n => {
                if (filterType === 'abs') return n.note === 'ABS';
                if (filterType === 'cap') return n.note === 'CAP';
                if (filterType === 'numeric') return !isNaN(parseFloat(n.note));
                return true;
            });
        }
        if (filterType === 'numeric' || filterType === 'all') {
            if (filterMin !== '') notes = notes.filter(n => isNaN(parseFloat(n.note)) || parseFloat(n.note) >= parseFloat(filterMin));
            if (filterMax !== '') notes = notes.filter(n => isNaN(parseFloat(n.note)) || parseFloat(n.note) <= parseFloat(filterMax));
        }

        // Sort
        const sortVal = (n, key) => {
            if (key === 'note') return isNaN(parseFloat(n.note)) ? -1 : parseFloat(n.note);
            if (key === 'nom') return `${n.etudiant_nom} ${n.etudiant_prenom}`.toLowerCase();
            if (key === 'prenom') return n.etudiant_prenom?.toLowerCase() || '';
            if (key === 'cne') return n.etudiant_cne?.toLowerCase() || '';
            if (key === 'anonymat') {
                const v = n.code_anonymat ?? '';
                return /^\d+$/.test(v.trim()) ? parseInt(v.trim(), 10) : v.toLowerCase();
            }
            return '';
        };
        const anonymatIsNumeric = notes.every(n => /^\d+$/.test((n.code_anonymat ?? '').trim()));
        notes.sort((a, b) => {
            const v1a = sortVal(a, sortBy), v1b = sortVal(b, sortBy);
            const cmp1 = v1a < v1b ? -1 : v1a > v1b ? 1 : 0;
            if (cmp1 !== 0) return sortOrder === 'desc' ? -cmp1 : cmp1;
            if (sortBy2 && sortBy2 !== 'none') {
                const v2a = sortVal(a, sortBy2), v2b = sortVal(b, sortBy2);
                const cmp2 = v2a < v2b ? -1 : v2a > v2b ? 1 : 0;
                return sortOrder2 === 'desc' ? -cmp2 : cmp2;
            }
            return 0;
        });
        const rows = notes.map((n, i) => {
            const row = {};
            if (fields.num)        row['N°']           = i + 1;
            if (fields.cne)        row['CNE']          = n.etudiant_cne;
            if (fields.nom)        row['Nom']          = n.etudiant_nom;
            if (fields.prenom)     row['Prénom']       = n.etudiant_prenom;
            if (fields.anonymat)   row['Anonymat']          = n.code_anonymat;
            if (fields.note)       row[`Note / ${n.note_sur}`] = n.note;
            if (fields.mention)    row['Mention']      = getMention(n.note, n.note_sur);
            if (fields.enseignant) row['Enseignant']   = n.enseignant_nom ? `${n.enseignant_nom} ${n.enseignant_prenom}` : '';
            if (fields.date)       row['Date saisie']  = n.date_saisie ? new Date(n.date_saisie).toLocaleDateString('fr-FR') : '';
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        // Auto column widths
        const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length, 12) }));
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Notes');
        const filename = opts.filename || `releve_${group.module_code}${group.element_code ? '_' + group.element_code : ''}`;
        XLSX.writeFile(wb, `${filename}.xlsx`);
        setExportModal(null);
    };

    const getMention = (note, noteSur) => {
        if (note === 'ABS') return 'Absent';
        if (note === 'CAP') return 'Capitalisé';
        const n = parseFloat(note);
        const base = noteSur ? (n / noteSur) * 20 : n;
        if (base >= 16) return 'Très Bien';
        if (base >= 14) return 'Bien';
        if (base >= 12) return 'Assez Bien';
        if (base >= 10) return 'Passable';
        return 'Insuffisant';
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
            {exportModal && <ExportModal group={exportModal} onClose={() => setExportModal(null)} onExcelExport={handleExcelExport} getMention={getMention} />}

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

const SORT_OPTIONS = [
    { value: 'nom',      label: 'Nom' },
    { value: 'prenom',   label: 'Prénom' },
    { value: 'note',     label: 'Note' },
    { value: 'anonymat', label: 'Anonymat' },
    { value: 'cne',      label: 'CNE' },
];

const ALL_FIELDS = [
    { key: 'num',        label: 'N°',          defaultOn: true },
    { key: 'cne',        label: 'CNE',          defaultOn: true },
    { key: 'nom',        label: 'Nom',          defaultOn: true },
    { key: 'prenom',     label: 'Prénom',       defaultOn: true },
    { key: 'anonymat',   label: 'Anonymat',     defaultOn: true },
    { key: 'note',       label: 'Note',         defaultOn: true },
    { key: 'mention',    label: 'Mention',      defaultOn: false },
    { key: 'enseignant', label: 'Enseignant',   defaultOn: false },
    { key: 'date',       label: 'Date saisie',  defaultOn: false },
];

function applyFiltersAndSort(notes, { filterType, filterMin, filterMax, sortBy, sortOrder, sortBy2, sortOrder2 }) {
    let result = [...notes];
    if (filterType === 'abs')      result = result.filter(n => n.note === 'ABS');
    else if (filterType === 'cap') result = result.filter(n => n.note === 'CAP');
    else if (filterType === 'numeric') result = result.filter(n => !isNaN(parseFloat(n.note)));
    if (filterMin !== '') result = result.filter(n => isNaN(parseFloat(n.note)) || parseFloat(n.note) >= parseFloat(filterMin));
    if (filterMax !== '') result = result.filter(n => isNaN(parseFloat(n.note)) || parseFloat(n.note) <= parseFloat(filterMax));
    const val = (n, key) => {
        if (key === 'note') return isNaN(parseFloat(n.note)) ? -1 : parseFloat(n.note);
        if (key === 'nom') return `${n.etudiant_nom} ${n.etudiant_prenom}`.toLowerCase();
        if (key === 'prenom') return n.etudiant_prenom?.toLowerCase() || '';
        if (key === 'cne') return n.etudiant_cne?.toLowerCase() || '';
        if (key === 'anonymat') { const v = n.code_anonymat ?? ''; return /^\d+$/.test(v.trim()) ? parseInt(v.trim(), 10) : v.toLowerCase(); }
        return '';
    };
    result.sort((a, b) => {
        const c1 = val(a, sortBy) < val(b, sortBy) ? -1 : val(a, sortBy) > val(b, sortBy) ? 1 : 0;
        if (c1 !== 0) return sortOrder === 'desc' ? -c1 : c1;
        if (sortBy2 && sortBy2 !== 'none') {
            const c2 = val(a, sortBy2) < val(b, sortBy2) ? -1 : val(a, sortBy2) > val(b, sortBy2) ? 1 : 0;
            return sortOrder2 === 'desc' ? -c2 : c2;
        }
        return 0;
    });
    return result;
}

function getMentionBadge(note, noteSur) {
    if (note === 'ABS') return { label: 'ABS', color: 'bg-orange-100 text-orange-700' };
    if (note === 'CAP') return { label: 'CAP', color: 'bg-purple-100 text-purple-700' };
    const n = parseFloat(note);
    const base = noteSur ? (n / noteSur) * 20 : n;
    if (base >= 16) return { label: 'TB',  color: 'bg-green-100 text-green-700' };
    if (base >= 14) return { label: 'B',   color: 'bg-blue-100 text-blue-700' };
    if (base >= 12) return { label: 'AB',  color: 'bg-cyan-100 text-cyan-700' };
    if (base >= 10) return { label: 'P',   color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'INS', color: 'bg-red-100 text-red-700' };
}

function ExportModal({ group, onClose, onExcelExport }) {
    const [format, setFormat] = useState('pdf');
    const [sortBy, setSortBy] = useState('anonymat');
    const [sortOrder, setSortOrder] = useState('asc');
    const [sortBy2, setSortBy2] = useState('none');
    const [sortOrder2, setSortOrder2] = useState('asc');
    const [filterType, setFilterType] = useState('all');
    const [filterMin, setFilterMin] = useState('');
    const [filterMax, setFilterMax] = useState('');
    const [filename, setFilename] = useState(`releve_${group.module_code}${group.element_code ? '_' + group.element_code : ''}`);
    const [fields, setFields] = useState(Object.fromEntries(ALL_FIELDS.map(f => [f.key, f.defaultOn])));
    const [activeTab, setActiveTab] = useState('config');

    const opts = { filterType, filterMin, filterMax, sortBy, sortOrder, sortBy2, sortOrder2 };
    const previewNotes = applyFiltersAndSort(group.notes, opts);

    const toggleField = (k) => setFields(prev => ({ ...prev, [k]: !prev[k] }));
    const toggleAll = (val) => setFields(Object.fromEntries(ALL_FIELDS.map(f => [f.key, val])));

    const numericNotes = previewNotes.filter(n => !isNaN(parseFloat(n.note)));
    const noteSur = group.notes[0]?.note_sur ?? 20;
    const avg = numericNotes.length ? (numericNotes.reduce((s, n) => s + parseFloat(n.note), 0) / numericNotes.length).toFixed(2) : '—';
    const passing = numericNotes.filter(n => parseFloat(n.note) >= noteSur / 2).length;
    const absCount = previewNotes.filter(n => n.note === 'ABS').length;

    const handleExport = () => {
        if (format === 'pdf') {
            window.open(route('correction.notes.export-pdf', { id_examen: group.id_examen, id_element: group.id_element ?? '', sort_by: sortBy, sort_order: sortOrder }), '_blank');
            onClose();
        } else if (format === 'pdf-custom') {
            const selectedCols = ALL_FIELDS.filter(f => fields[f.key]).map(f => f.key);
            const params = new URLSearchParams({ id_examen: group.id_examen, id_element: group.id_element ?? '', sort_by: sortBy, sort_order: sortOrder });
            selectedCols.forEach(c => params.append('columns[]', c));
            window.open(route('correction.notes.export-pdf-custom') + '?' + params.toString(), '_blank');
            onClose();
        } else {
            onExcelExport(group, { fields, ...opts, filename });
        }
    };

    const label = group.element_code ? `${group.module_code} — ${group.element_code}` : group.module_code;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <ArrowDownToLine size={20} className="text-indigo-600" />
                            Exporter le relevé
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {label}{group.session_nom ? ` · ${group.session_nom}` : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    {[['config', 'Configuration'], ['preview', `Aperçu (${previewNotes.length})`]].map(([t, lbl]) => (
                        <button key={t} onClick={() => setActiveTab(t)}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}>
                            {lbl}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">

                    {/* CONFIG TAB */}
                    {activeTab === 'config' && (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Left column */}
                            <div className="space-y-5">

                                {/* Format */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Format d'export</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            ['pdf',        '📄', 'PDF Standard',    'Format officiel 2 colonnes'],
                                            ['pdf-custom', '🎨', 'PDF Personnalisé', 'Colonnes au choix'],
                                            ['excel',      '📊', 'Excel',            'Données éditables'],
                                        ].map(([val, icon, lbl, desc]) => (
                                            <button key={val} onClick={() => setFormat(val)}
                                                className={`p-3 rounded-lg border-2 text-left transition-colors ${format === val ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                                                <div className="text-lg mb-1">{icon}</div>
                                                <div className={`text-xs font-semibold ${format === val ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'}`}>{lbl}</div>
                                                <div className="text-xs text-gray-400 mt-0.5 leading-tight">{desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Sort */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tri</label>
                                    <div className="space-y-2">
                                        {[
                                            { lbl: 'Primaire',   val: sortBy,  setVal: setSortBy,  order: sortOrder,  setOrder: setSortOrder,  hasNone: false },
                                            { lbl: 'Secondaire', val: sortBy2, setVal: setSortBy2, order: sortOrder2, setOrder: setSortOrder2, hasNone: true  },
                                        ].map(({ lbl, val, setVal, order, setOrder, hasNone }) => (
                                            <div key={lbl} className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">{lbl}</span>
                                                <select value={val} onChange={e => setVal(e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm">
                                                    {hasNone && <option value="none">— Aucun —</option>}
                                                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </select>
                                                {(!hasNone || val !== 'none') && (
                                                    <button onClick={() => setOrder(o => o === 'asc' ? 'desc' : 'asc')}
                                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap">
                                                        {order === 'asc' ? '↑ Croiss.' : '↓ Décroiss.'}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Filters */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filtres</label>
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {[
                                            ['all',     'Tous',        group.notes.length],
                                            ['numeric', 'Numériques',  group.notes.filter(n => !isNaN(parseFloat(n.note))).length],
                                            ['abs',     'Absents',     group.notes.filter(n => n.note === 'ABS').length],
                                            ['cap',     'Capitalisés', group.notes.filter(n => n.note === 'CAP').length],
                                        ].map(([val, lbl, count]) => (
                                            <button key={val} onClick={() => setFilterType(val)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${filterType === val ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                                {lbl}
                                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filterType === val ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}`}>{count}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {(filterType === 'all' || filterType === 'numeric') && (
                                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Note entre</span>
                                            <input type="number" value={filterMin} onChange={e => setFilterMin(e.target.value)} placeholder="min"
                                                className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded" />
                                            <span className="text-xs text-gray-400">—</span>
                                            <input type="number" value={filterMax} onChange={e => setFilterMax(e.target.value)} placeholder="max"
                                                className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded" />
                                            {(filterMin !== '' || filterMax !== '') && (
                                                <button onClick={() => { setFilterMin(''); setFilterMax(''); }} className="text-xs text-red-500 hover:text-red-700 ml-auto">✕ Effacer</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right column */}
                            <div className="space-y-5">

                                {/* Columns */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Colonnes</label>
                                        {format !== 'pdf' && (
                                            <div className="flex gap-3">
                                                <button onClick={() => toggleAll(true)} className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium">Tout</button>
                                                <button onClick={() => toggleAll(false)} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400">Aucun</button>
                                            </div>
                                        )}
                                    </div>
                                    {format === 'pdf' ? (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
                                            Le PDF Standard utilise un format fixe (CNE, Nom &amp; Prénom, Note). Choisissez <span className="font-semibold text-indigo-600 dark:text-indigo-400">PDF Personnalisé</span> pour choisir vos colonnes.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {ALL_FIELDS.map(({ key, label: lbl }) => (
                                                <label key={key} onClick={() => toggleField(key)}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors text-sm ${fields[key] ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${fields[key] ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-500'}`}>
                                                        {fields[key] && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                                                    </span>
                                                    {lbl}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Filename — Excel only */}
                                {format === 'excel' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom du fichier</label>
                                        <div className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg">
                                            <input type="text" value={filename} onChange={e => setFilename(e.target.value)}
                                                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 outline-none" />
                                            <span className="text-xs text-gray-400 shrink-0">.xlsx</span>
                                        </div>
                                    </div>
                                )}

                                {/* Summary */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Résumé</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { lbl: 'Étudiants', val: previewNotes.length, color: 'text-indigo-600 dark:text-indigo-400' },
                                            { lbl: 'Moyenne',   val: avg,                 color: 'text-blue-600 dark:text-blue-400' },
                                            { lbl: 'Admis',     val: numericNotes.length ? `${passing} (${Math.round(passing / numericNotes.length * 100)}%)` : '—', color: 'text-green-600 dark:text-green-400' },
                                            { lbl: 'Absents',   val: absCount,            color: 'text-orange-500 dark:text-orange-400' },
                                        ].map(({ lbl, val, color }) => (
                                            <div key={lbl} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5">
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{lbl}</div>
                                                <div className={`text-lg font-bold ${color}`}>{val}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PREVIEW TAB */}
                    {activeTab === 'preview' && (
                        <div className="p-6">
                            {previewNotes.length === 0 ? (
                                <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                                    Aucun étudiant ne correspond aux filtres sélectionnés.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">#</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Anonymat</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Étudiant</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">CNE</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Note / {noteSur}</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Mention</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {previewNotes.map((n, i) => {
                                                const badge = getMentionBadge(n.note, n.note_sur);
                                                return (
                                                    <tr key={n.id_note} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                        <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                                                        <td className="px-4 py-2.5 font-mono text-gray-700 dark:text-gray-300">{n.code_anonymat}</td>
                                                        <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100">{n.etudiant_nom} {n.etudiant_prenom}</td>
                                                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs font-mono">{n.etudiant_cne}</td>
                                                        <td className="px-4 py-2.5 text-center font-bold text-gray-900 dark:text-gray-100">
                                                            {n.note === 'ABS' || n.note === 'CAP' ? n.note : parseFloat(n.note).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-center">
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${format === 'pdf' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : format === 'pdf-custom' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                            {format === 'pdf' ? 'PDF Standard' : format === 'pdf-custom' ? 'PDF Personnalisé' : 'Excel'}
                        </span>
                        <span>{previewNotes.length} étudiant{previewNotes.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">
                            Annuler
                        </button>
                        <button onClick={handleExport} disabled={previewNotes.length === 0}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm flex items-center gap-2 transition-colors">
                            <ArrowDownToLine size={15} />
                            Exporter {previewNotes.length > 0 ? `(${previewNotes.length})` : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
