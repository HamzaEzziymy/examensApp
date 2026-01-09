import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import CorrectionHeader from '../Header';
import { ClipboardCheck, Download, Edit3, FileSignature, Gauge, Trash2, Upload, Users } from 'lucide-react';
import * as XLSX from 'xlsx';

const gradeTone = (value) => {
    if (value === null || value === undefined) {
        return 'text-gray-500';
    }
    if (value >= 14) return 'text-emerald-600';
    if (value >= 10) return 'text-blue-600';
    if (value >= 7) return 'text-amber-600';
    return 'text-red-600';
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '--');
const defaultNoteState = () => ({
    id_anonymat: '',
    id_correcteur: '',
    note: '',
    date_saisie: '',
    commentaire: '',
});

const sanitizeFileName = (value) =>
    (value || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9._-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

const ensureXlsxExtension = (value) => {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) return 'modele_notes.xlsx';
    return trimmed.toLowerCase().endsWith('.xlsx') ? trimmed : `${trimmed}.xlsx`;
};

const formatModuleLabel = (examen) => {
    const parts = [examen?.module?.code_module, examen?.module?.nom_module].filter(Boolean);
    return parts.length ? parts.join(' - ') : '--';
};

const formatStudentLabel = (student) => {
    if (!student) return '';
    return `${student.nom ?? ''} ${student.prenom ?? ''}`.trim();
};

const defaultTemplateName = (examen) => {
    const parts = [
        sanitizeFileName(examen?.session_examen?.nom_session),
        sanitizeFileName(examen?.module?.code_module),
        sanitizeFileName(examen?.module?.nom_module),
    ].filter(Boolean);

    const base = parts.length ? parts.join('_') : 'modele_notes';
    return ensureXlsxExtension(base);
};

const buildTemplateSheetData = (anonymats, examen) => {
    const header = ['code_anonymat', 'note', 'commentaire', 'etudiant', 'cne'];
    const meta = [
        ['', 'Module', formatModuleLabel(examen)],
        ['', 'Session', examen?.session_examen?.nom_session ?? '--'],
        ['', 'Total anonymats', anonymats?.length ?? 0],
        ['', 'Instruction', 'Remplir note/commentaire ; ne pas modifier code_anonymat.'],
        [''],
    ];

    const rows = (anonymats ?? []).map((anon) => {
        const student = anon.inscription_pedagogique?.etudiant;
        return [
            anon.code_anonymat ?? '',
            '',
            '',
            formatStudentLabel(student),
            student?.cne ?? '',
        ];
    });

    return [header, ...meta, ...rows];
};

export default function NotesIndex({
    examens = [],
    selectedExamenId,
    notes = [],
    summary = {},
    anonymats = [],
    correcteurs = [],
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [showImport, setShowImport] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const noteForm = useForm(defaultNoteState());
    const importForm = useForm({
        id_correcteur: '',
        file: null,
    });

    const selectedExamen = examens.find((exam) => exam.id_examen === selectedExamenId);
    const availableAnonymats = useMemo(() => anonymats ?? [], [anonymats]);

    const filteredNotes = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) {
            return notes;
        }

        return notes.filter((note) => {
            const student = note.anonymat?.inscription_pedagogique?.etudiant;
            const module = note.anonymat?.inscription_pedagogique?.module;
            const correcteurName = note.correcteur?.enseignant
                ? `${note.correcteur.enseignant.nom ?? ''} ${note.correcteur.enseignant.prenom ?? ''}`
                : '';

            const searchable = [
                student?.nom,
                student?.prenom,
                student?.cne,
                module?.nom_module,
                module?.code_module,
                note.anonymat?.code_anonymat,
                correcteurName,
                note.commentaire,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchable.includes(query);
        });
    }, [notes, searchTerm]);

    const handleExamChange = (event) => {
        const value = event.target.value;
        router.get(
            route('correction.notes.index'),
            value ? { examen: value } : {},
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    useEffect(() => {
        resetForm();
    }, [selectedExamenId]);

    useEffect(() => {
        setTemplateName(defaultTemplateName(selectedExamen));
    }, [selectedExamenId, selectedExamen]);

    const startEdit = (note) => {
        setEditingId(note.id_note);
        noteForm.setData({
            id_anonymat: note.id_anonymat ? String(note.id_anonymat) : '',
            id_correcteur: note.id_correcteur ? String(note.id_correcteur) : '',
            note: note.note ?? '',
            date_saisie: note.date_saisie ? note.date_saisie.substring(0, 10) : '',
            commentaire: note.commentaire ?? '',
        });
    };

    const resetForm = () => {
        setEditingId(null);
        noteForm.reset();
        noteForm.setData(defaultNoteState());
    };

    const submit = (event) => {
        event.preventDefault();
        if (!selectedExamenId && !noteForm.data.id_anonymat) {
            return;
        }

        if (editingId) {
            noteForm.put(route('correction.notes.update', editingId), {
                preserveScroll: true,
                onSuccess: resetForm,
            });
        } else {
            noteForm.post(route('correction.notes.store'), {
                preserveScroll: true,
                onSuccess: resetForm,
            });
        }
    };

    const handleDelete = (noteId) => {
        if (!window.confirm('Supprimer cette note ?')) return;
        noteForm.delete(route('correction.notes.destroy', noteId), {
            preserveScroll: true,
            onSuccess: resetForm,
        });
    };

    const generateTemplate = () => {
        if (!selectedExamen) {
            window.alert('Choisissez un examen pour generer le fichier.');
            return;
        }

        if (!availableAnonymats.length) {
            window.alert('Aucun anonymat disponible pour cet examen.');
            return;
        }

        const workbook = XLSX.utils.book_new();
        const sheetData = buildTemplateSheetData(availableAnonymats, selectedExamen);
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

        worksheet['!cols'] = [
            { wch: 18 },
            { wch: 10 },
            { wch: 28 },
            { wch: 32 },
            { wch: 16 },
        ];

        const desiredName = ensureXlsxExtension(
            sanitizeFileName(templateName) || defaultTemplateName(selectedExamen)
        );

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Notes');
        XLSX.writeFile(workbook, desiredName);
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Gestion des notes</h2>}
        >
            <Head title="Gestion des notes" />

            <CorrectionHeader />
            <ImportModal open={showImport} onClose={() => setShowImport(false)} form={importForm} correcteurs={correcteurs} />

            <div className="mt-4 grid gap-4 lg:grid-cols-4">
                <SummaryCard
                    title="Copies avec note"
                    value={summary.count ?? 0}
                    icon={<ClipboardCheck size={18} />}
                    tone="text-indigo-600"
                />
                <SummaryCard
                    title="Copies restantes"
                    value={summary.pendingCopies ?? 0}
                    icon={<FileSignature size={18} />}
                    tone="text-amber-600"
                />
                <SummaryCard
                    title="Moyenne"
                    value={summary.average !== null && summary.average !== undefined ? Number(summary.average).toFixed(2) : '--'}
                    icon={<Gauge size={18} />}
                    tone="text-emerald-600"
                />
                <SummaryCard
                    title="Total copies"
                    value={summary.totalCopies ?? anonymats.length ?? 0}
                    icon={<Users size={18} />}
                    tone="text-gray-700 dark:text-gray-200"
                />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <aside className="space-y-4">
                    <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                {editingId ? 'Modifier une note' : 'Saisir une note'}
                            </div>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="text-xs text-indigo-600 hover:underline dark:text-indigo-300"
                                >
                                    Annuler
                                </button>
                            )}
                        </div>
                        <form className="space-y-3" onSubmit={submit}>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Anonymat</label>
                                <select
                                    value={noteForm.data.id_anonymat}
                                    onChange={(e) => noteForm.setData('id_anonymat', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    disabled={!selectedExamenId || noteForm.processing}
                                >
                                    <option value="">-- Choisir --</option>
                                    {availableAnonymats.map((anon) => (
                                        <option key={anon.id_anonymat} value={anon.id_anonymat}>
                                            {anon.code_anonymat} - {anon.inscription_pedagogique?.etudiant?.nom} {anon.inscription_pedagogique?.etudiant?.prenom}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={noteForm.errors.id_anonymat} className="mt-1" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Correcteur</label>
                                <select
                                    value={noteForm.data.id_correcteur}
                                    onChange={(e) => noteForm.setData('id_correcteur', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    disabled={!selectedExamenId || noteForm.processing}
                                >
                                    <option value="">-- Choisir --</option>
                                    {correcteurs.map((corr) => (
                                        <option key={corr.id_correcteur} value={corr.id_correcteur}>
                                            {corr.enseignant ? `${corr.enseignant.nom} ${corr.enseignant.prenom}` : 'Correcteur'} ({corr.statut ?? 'En cours'})
                                        </option>
                                    ))}
                                </select>
                                <InputError message={noteForm.errors.id_correcteur} className="mt-1" />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Note /20</label>
                                    <input
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        max="20"
                                        value={noteForm.data.note}
                                        onChange={(e) => noteForm.setData('note', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                        disabled={noteForm.processing}
                                        required
                                    />
                                    <InputError message={noteForm.errors.note} className="mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Date</label>
                                    <input
                                        type="date"
                                        value={noteForm.data.date_saisie ?? ''}
                                        onChange={(e) => noteForm.setData('date_saisie', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                        disabled={noteForm.processing}
                                    />
                                    <InputError message={noteForm.errors.date_saisie} className="mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Commentaire</label>
                                <textarea
                                    rows={3}
                                    value={noteForm.data.commentaire}
                                    onChange={(e) => noteForm.setData('commentaire', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    disabled={noteForm.processing}
                                />
                                <InputError message={noteForm.errors.commentaire} className="mt-1" />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                    disabled={noteForm.processing}
                                >
                                    Reinitialiser
                                </button>
                                <button
                                    type="submit"
                                    disabled={noteForm.processing || !selectedExamenId}
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {editingId ? 'Mettre a jour' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Import Excel/CSV</div>
                            <button
                                type="button"
                                onClick={() => setShowImport(true)}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                            >
                                <Upload size={14} />
                                Importer
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                            Chargez un fichier CSV ou Excel (.csv, .xlsx) contenant les colonnes
                            <code className="mx-1 rounded bg-gray-100 px-1 dark:bg-gray-700">code_anonymat</code>,
                            <code className="mx-1 rounded bg-gray-100 px-1 dark:bg-gray-700">note</code>,
                            <code className="mx-1 rounded bg-gray-100 px-1 dark:bg-gray-700">commentaire</code>.
                            Utilisez le bouton « Excel correcteur » pour recuperer un modele pre-rempli.
                        </p>
                    </div>

                    <TemplateCard
                        templateName={templateName}
                        onTemplateNameChange={setTemplateName}
                        onGenerate={generateTemplate}
                        examen={selectedExamen}
                        anonymatCount={availableAnonymats.length}
                    />

                    <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
                        <div className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">Correcteurs</div>
                        {correcteurs.length > 0 ? (
                            <div className="space-y-3">
                                {correcteurs.map((corr) => (
                                    <div key={corr.id_correcteur} className="rounded-lg border border-gray-100 p-3 dark:border-gray-700">
                                        <div className="font-medium text-gray-800 dark:text-gray-100">
                                            {corr.enseignant ? `${corr.enseignant.nom} ${corr.enseignant.prenom}` : 'Correcteur'}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{corr.statut ?? 'En cours'}</div>
                                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Copies attribuees: {corr.nombre_copies ?? '--'}
                                        </div>
                                        {corr.date_limite_correction && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Limite: {formatDate(corr.date_limite_correction)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">Aucun correcteur associe.</div>
                        )}
                    </div>

                    <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            Suivi des copies
                        </div>
                        <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex items-center justify-between">
                                <span>Total anonymats</span>
                                <span className="font-semibold">{summary.totalCopies ?? anonymats.length ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Notees</span>
                                <span className="font-semibold text-indigo-600">{summary.count ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Restantes</span>
                                    <span className="font-semibold text-amber-600">{summary.pendingCopies ?? 0}</span>
                                </div>
                            </div>
                            <div className="mt-4 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                                <div
                                className="h-2 rounded-full bg-indigo-500"
                                style={{
                                    width:
                                        summary.totalCopies && summary.totalCopies > 0
                                            ? `${Math.min(100, Math.round(((summary.count ?? 0) / summary.totalCopies) * 100))}%`
                                            : '0%',
                                }}
                            />
                        </div>
                    </div>
                </aside>

                <div className="lg:col-span-2 space-y-4">
                    <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Examen</label>
                                <select
                                    value={selectedExamenId ?? ''}
                                    onChange={handleExamChange}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                >
                                    <option value="">-- Choisir un examen --</option>
                                    {examens.map((examen) => (
                                        <option key={examen.id_examen} value={examen.id_examen}>
                                            {examen.module?.nom_module ?? 'Module'} - {examen.session_examen?.nom_session ?? 'Session'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                                {selectedExamen ? (
                                    <>
                                        <div className="font-semibold">
                                            {selectedExamen.module?.code_module} - {selectedExamen.module?.nom_module}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {selectedExamen.session_examen?.nom_session} - {selectedExamen.session_examen?.type_session}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {selectedExamen.date_examen ? new Date(selectedExamen.date_examen).toLocaleDateString() : '--'}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-xs text-gray-500">Choisissez un examen pour voir les notes.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Notes saisies</h3>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {filteredNotes.length} / {notes.length} lignes
                                </span>
                            </div>
                            <div className="w-full md:w-72">
                                <label htmlFor="note-search" className="sr-only">
                                    Rechercher
                                </label>
                                <input
                                    id="note-search"
                                    type="search"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Filtrer (nom, anonymat, module, correcteur)"
                                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900/40">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Etudiant
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Module
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Anonymat
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Note
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Correcteur
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Date
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Commentaire
                                        </th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredNotes.map((note) => {
                                        const student = note.anonymat?.inscription_pedagogique?.etudiant;
                                        const module = note.anonymat?.inscription_pedagogique?.module;
                                        const correcteur = note.correcteur?.enseignant;

                                        return (
                                            <tr key={note.id_note} className="text-sm text-gray-700 dark:text-gray-200">
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold">
                                                        {student ? `${student.nom} ${student.prenom}` : '--'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{student?.cne ?? ''}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold">{module?.nom_module ?? '--'}</div>
                                                    <div className="text-xs text-gray-500">{module?.code_module ?? ''}</div>
                                                </td>
                                                <td className="px-4 py-3">{note.anonymat?.code_anonymat ?? '--'}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-base font-semibold ${gradeTone(note.note)}`}>
                                                        {note.note !== null && note.note !== undefined ? Number(note.note).toFixed(2) : '--'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {correcteur ? (
                                                        <>
                                                            <div className="font-medium">
                                                                {correcteur.nom} {correcteur.prenom}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{note.correcteur?.statut ?? ''}</div>
                                                        </>
                                                    ) : (
                                                        '--'
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">{formatDate(note.date_saisie)}</td>
                                                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                                                    {note.commentaire ?? '--'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(note)}
                                                            className="rounded-full p-2 text-indigo-600 transition hover:bg-indigo-50 dark:hover:bg-gray-700"
                                                            title="Modifier"
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(note.id_note)}
                                                            className="rounded-full p-2 text-red-600 transition hover:bg-red-50 dark:hover:bg-gray-700"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredNotes.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                                Aucun resultat pour cette recherche.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function TemplateCard({ templateName, onTemplateNameChange, onGenerate, examen, anonymatCount }) {
    const disabled = !examen || anonymatCount === 0;

    return (
        <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Excel correcteur</div>
                <button
                    type="button"
                    onClick={onGenerate}
                    disabled={disabled}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                    <Download size={14} />
                    Generer
                </button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">
                Genere un fichier .xlsx pre-rempli pour les correcteurs (code anonymat, note, commentaire).
                Selectionnez un examen puis cliquez sur Generer.
            </p>
            <div className="mt-3 space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Nom du fichier</label>
                <input
                    type="text"
                    value={templateName}
                    onChange={(e) => onTemplateNameChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                    placeholder={defaultTemplateName(examen)}
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Extension .xlsx ajoutee automatiquement. Les metadonnees en haut du fichier sont ignorees a l&apos;import.
                </p>
            </div>
            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                <div className="flex items-center justify-between">
                    <span>Module</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{formatModuleLabel(examen)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                    <span>Anonymats</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{anonymatCount ?? 0}</span>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ title, value, icon, tone }) {
    return (
        <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{title}</span>
                <span className={tone}>{icon}</span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-800 dark:text-gray-100">{value}</div>
        </div>
    );
}

function ImportModal({ open, onClose, form, correcteurs }) {
    const [fileHint, setFileHint] = useState('');

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const extension = (file.name.split('.').pop() || '').toLowerCase();
        if (['xlsx', 'xls'].includes(extension)) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                    const firstSheet = workbook.SheetNames?.[0];
                    if (!firstSheet) {
                        setFileHint('Feuille Excel vide.');
                        form.setData('file', null);
                        return;
                    }

                    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet], { FS: ';' });
                    const safeName = `${file.name.replace(/\.[^.]+$/, '')}.csv`;
                    const csvFile = new File([csv], safeName, { type: 'text/csv' });

                    form.setData('file', csvFile);
                    setFileHint('Fichier Excel converti automatiquement en CSV.');
                } catch (error) {
                    console.error('Conversion Excel -> CSV echouee', error);
                    setFileHint('Conversion impossible. Merci de fournir un fichier CSV.');
                    form.setData('file', null);
                }
            };
            reader.readAsArrayBuffer(file);
            return;
        }

        setFileHint('');
        form.setData('file', file);
    };

    return (
        <Modal show={open} onClose={onClose} maxWidth="md">
            <div className="p-6">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Importer des notes</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-300">
                            Associez un correcteur puis choisissez un fichier CSV/Excel.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setFileHint('');
                            onClose();
                        }}
                        className="rounded-lg px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        Fermer
                    </button>
                </div>
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(route('correction.notes.import'), {
                            forceFormData: true,
                            preserveScroll: true,
                            onSuccess: () => {
                                form.reset();
                                setFileHint('');
                                onClose();
                            },
                        });
                    }}
                >
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Correcteur</label>
                        <select
                            value={form.data.id_correcteur}
                            onChange={(e) => form.setData('id_correcteur', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        >
                            <option value="">-- Choisir --</option>
                            {correcteurs.map((corr) => (
                                <option key={corr.id_correcteur} value={corr.id_correcteur}>
                                    {corr.enseignant ? `${corr.enseignant.nom} ${corr.enseignant.prenom}` : 'Correcteur'}
                                </option>
                            ))}
                        </select>
                        <InputError message={form.errors.id_correcteur} className="mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Fichier CSV/Excel</label>
                        <input
                            type="file"
                            accept=".csv,.txt,.xlsx,.xls"
                            onChange={handleFileChange}
                            className="mt-1 w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500 dark:text-gray-200"
                        />
                        <InputError message={form.errors.file} className="mt-1" />
                        {fileHint && (
                            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                                {fileHint}
                            </p>
                        )}
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                form.reset();
                                setFileHint('');
                                onClose();
                            }}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            disabled={form.processing}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            Importer
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
