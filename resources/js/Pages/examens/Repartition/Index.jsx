import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import ExamHeader from '../Header';
import { useEffect, useMemo, useState } from 'react';
import InputError from '@/Components/InputError';
import PvAbsenceSection from '@/Pages/Documents/Pvs/PvAbsenceSection';
import Swal from 'sweetalert2';
import { CheckCircle2, Download, Edit3, FileDown, FileSpreadsheet, FileText, GripVertical, Table2, Trash2, UploadCloud, X, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import XlsxPopulate from 'xlsx-populate/browser/xlsx-populate';

const badgeClasses = (present) =>
    present
        ? 'inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200'
        : 'inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-900/40 dark:text-amber-200';

const formatTime = (value) => (value ? value.substring(0, 5) : '--');
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '--');

const normalizeText = (value) => {
    if (value === undefined || value === null) {
        return '';
    }

    return value
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

const sanitizeFileName = (value) =>
    (value || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9._-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

const ensureXlsxExtension = (value) => {
    const trimmed = value?.trim();
    if (!trimmed) return 'notes.xlsx';
    return trimmed.toLowerCase().endsWith('.xlsx') ? trimmed : `${trimmed}.xlsx`;
};

const TEMPLATE_URL = '/templates/repartition.xlsx';
const TEMPLATE_TABLE_PATH = 'xl/tables/table1.xml';
const TEMPLATE_HEADER_ROW = 9;
const TEMPLATE_START_ROW = 10;
const TEMPLATE_REPEAT_ROW = 11;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const MODULE_ONLY_FILTER = '__module__';
const REPARTITION_EXPORT_FIELDS = [
    { key: 'cne', label: 'CNE', defaultOn: true },
    { key: 'etudiant', label: 'Etudiant', defaultOn: true },
    { key: 'nom', label: 'Nom', defaultOn: false },
    { key: 'prenom', label: 'Prenom', defaultOn: false },
    { key: 'grille', label: 'Grille', defaultOn: true },
    { key: 'place', label: 'Place', defaultOn: true },
    { key: 'anonymat', label: 'Anonymat', defaultOn: true },
    { key: 'presence', label: 'Presence', defaultOn: true },
];

const defaultExportColumns = () =>
    REPARTITION_EXPORT_FIELDS.map(({ key, label, defaultOn }) => ({
        key,
        label,
        enabled: defaultOn,
    }));

const safeSheetName = (value) => {
    const name = (value || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').trim() || 'Sheet';
    return name.slice(0, 31);
};

const formatModuleLabel = (module) => {
    const parts = [module?.code_module, module?.nom_module].filter(Boolean);
    return parts.length ? parts.join(' - ') : 'Module';
};

const formatModuleName = (module) => module?.nom_module || module?.code_module || 'Module';

const formatElementLabel = (element) => {
    const parts = [element?.code_element, element?.nom_element].filter(Boolean);
    return parts.length ? parts.join(' - ') : 'Element';
};

const formatElementName = (element) => element?.nom_element || element?.code_element || null;

const isSelfReferencingElement = (module, element) =>
    module &&
    element &&
    element.code_element === module.code_module &&
    element.nom_element === module.nom_module;

const formatSessionLabel = (session) => {
    if (!session) return null;
    const parts = [session.nom_session, session.type_session].filter(Boolean);
    return parts.join(' - ') || null;
};

const formatSectionLabel = (section) =>
    [section?.nom_section, section?.langue].filter(Boolean).join(' - ');

const exportFilenamePrefix = (format, documentType) => {
    if (format === 'excel' && documentType === 'correctors') {
        return 'notes_module';
    }

    if (documentType === 'absence-module') {
        return 'pv_absence_module';
    }

    if (documentType === 'absence-collective') {
        return 'pv_absence_collective';
    }

    if (documentType === 'collective') {
        return 'presence_collective';
    }

    if (documentType === 'places') {
        return 'repartition_salles_places';
    }

    return 'repartition';
};

const buildDefaultExportFilename = (examen, format = 'pdf', documentType = 'repartition') => {
    const prefix = exportFilenamePrefix(format, documentType);
    const baseName = sanitizeFileName(
        [
            prefix,
            formatSessionLabel(examen?.session_examen),
            examen?.module?.code_module,
            examen?.element?.code_element,
            examen?.id_examen,
        ]
            .filter(Boolean)
            .join('_'),
    );

    return baseName || prefix;
};

const downloadBlob = (blob, filename) => {
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
};

const salleIndexFromGrille = (value) => {
    const str = String(value ?? '').padStart(7, '0');
    const digit = Number(str.charAt(3));
    return Number.isNaN(digit) || digit < 1 ? 1 : digit;
};

const extractFilenameFromDisposition = (disposition, fallbackFilename) => {
    const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i.exec(disposition || '');
    return match ? match[1].replace(/['"]/g, '') : fallbackFilename;
};

const readFailedResponseMessage = async (response, fallback) => {
    const contentType = response.headers.get('Content-Type') || '';

    try {
        if (contentType.includes('application/json')) {
            const payload = await response.json();
            return payload?.message || payload?.error || fallback;
        }

        const text = (await response.text())?.trim();
        return text || fallback;
    } catch {
        return fallback;
    }
};

const cloneTemplateCellStyle = (sourceCell, targetCell) => {
    if (sourceCell?._style) {
        targetCell.style(sourceCell.workbook().styleSheet().createStyle(sourceCell._style.id()));
        return;
    }

    if (sourceCell?._styleId !== undefined && sourceCell?._styleId !== null) {
        targetCell._styleId = sourceCell._styleId;
    }
};

const cloneTemplateRow = (sheet, sourceRowNumber, targetRowNumber) => {
    const sourceRow = sheet.row(sourceRowNumber);
    const targetRow = sheet.row(targetRowNumber);

    targetRow._node.attributes = {
        r: targetRowNumber,
        ...Object.fromEntries(Object.entries(sourceRow._node.attributes || {}).filter(([key]) => key !== 'r')),
    };

    ['B', 'C'].forEach((column) => {
        cloneTemplateCellStyle(sourceRow.cell(column), targetRow.cell(column));
    });
};

const updateTemplateTableRange = async (workbook, lastDataRow) => {
    const tableFile = workbook?._zip?.file?.(TEMPLATE_TABLE_PATH);

    if (!tableFile || typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
        return;
    }

    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const tableXml = await tableFile.async('string');
    const tableDocument = parser.parseFromString(tableXml, 'application/xml');
    const tableNode = tableDocument.documentElement;
    const tableRange = `B${TEMPLATE_HEADER_ROW}:C${lastDataRow}`;

    if (!tableNode || tableNode.nodeName === 'parsererror') {
        return;
    }

    tableNode.setAttribute('ref', tableRange);

    const autoFilterNode = tableDocument.getElementsByTagName('autoFilter')[0];
    if (autoFilterNode) {
        autoFilterNode.setAttribute('ref', tableRange);
    }

    workbook._zip.file(TEMPLATE_TABLE_PATH, serializer.serializeToString(tableDocument));
};

const defaultFormState = (examenId) => ({
    id_examen: examenId ? String(examenId) : '',
    id_inscription_pedagogique: '',
    code_grille: '',
    code_anonymat: '',
    numero_place: '',
    present: false,
    heure_arrivee: '',
    heure_sortie: '',
    observation: '',
});

const resolveExamMeta = (examen) => {
    if (examen.semestre_id || examen.niveau_id || examen.filiere_nom) {
        return {
            semestreId: examen.semestre_id,
            semestreNom: examen.semestre_nom,
            niveauId: examen.niveau_id,
            niveauNom: examen.niveau_nom,
            filiereNom: examen.filiere_nom,
            sectionId: examen.section_id,
            sectionNom: examen.section_nom,
            sectionLangue: examen.section_langue,
        };
    }

    const offres = examen.module?.offres_formation || [];
    const session = examen.session_examen;
    const matchedOffre =
        offres.find((offre) => {
            const matchFiliere = session?.id_filiere ? offre.section?.id_filiere == session.id_filiere : true;
            const matchAnnee = session?.id_annee ? offre.id_annee == session.id_annee : true;
            return matchFiliere && matchAnnee;
        }) || offres[0];

    const semestre = matchedOffre?.semestre;
    const niveau = semestre?.niveau;
    const section = matchedOffre?.section;

    return {
        semestreId: semestre?.id_semestre,
        semestreNom: semestre?.nom_semestre,
        niveauId: niveau?.id_niveau,
        niveauNom: niveau?.nom_niveau,
        filiereNom: section?.filiere?.nom_filiere,
        sectionId: section?.id_section,
        sectionNom: section?.nom_section,
        sectionLangue: section?.langue,
    };
};

const isDentaireFiliere = (value) => normalizeText(value).includes('dent');

const usesElementRepartitionLogic = (examen) => isDentaireFiliere(resolveExamMeta(examen).filiereNom);

const formatExamLabel = (examen) => {
    const moduleLabel = formatModuleLabel(examen?.module);

    if (!usesElementRepartitionLogic(examen)) {
        return moduleLabel;
    }

    const elementLabel = formatElementLabel(examen?.element);

    if (elementLabel && elementLabel !== 'Element') {
        return `${moduleLabel} / ${elementLabel}`;
    }

    return moduleLabel;
};

const resolvedExamSalles = (examen) => {
    const salles = Array.isArray(examen?.salles) && examen.salles.length
        ? examen.salles
        : (examen?.salle ? [examen.salle] : []);

    return salles
        .filter((salle) => salle?.id_salle)
        .slice()
        .sort((left, right) => {
            const leftOrder = Number(left?.pivot?.ordre ?? Number.MAX_SAFE_INTEGER);
            const rightOrder = Number(right?.pivot?.ordre ?? Number.MAX_SAFE_INTEGER);

            if (leftOrder !== rightOrder) {
                return leftOrder - rightOrder;
            }

            const leftPrimary = Number(left?.id_salle) === Number(examen?.id_salle) ? 0 : 1;
            const rightPrimary = Number(right?.id_salle) === Number(examen?.id_salle) ? 0 : 1;

            if (leftPrimary !== rightPrimary) {
                return leftPrimary - rightPrimary;
            }

            return Number(left?.id_salle ?? 0) - Number(right?.id_salle ?? 0);
        });
};

const examSalleForIndex = (examen, salleIndex) => resolvedExamSalles(examen)[salleIndex - 1] || null;

const repartitionStudent = (repartition) =>
    repartition?.inscription_pedagogique?.etudiant ||
    repartition?.inscription_pedagogique?.inscription_administrative?.etudiant ||
    {};

const repartitionStudentName = (repartition) => {
    const student = repartitionStudent(repartition);
    return [student.nom, student.prenom].filter(Boolean).join(' ').trim() || '-';
};

const selectedExportColumns = (columns) =>
    columns
        .filter((column) => column.enabled)
        .map((column) => column.key);

function RepartitionExportModal({
    selectedExamen,
    selectedExamenUsesElements,
    repartitions,
    filteredRepartitions,
    searchActive,
    collectiveModulesCount,
    initialColumns,
    initialPresenceFilled,
    onClose,
    onPdfRepartition,
    onPdfCollective,
    onPdfAbsenceModule,
    onPdfAbsenceCollective,
    onPdfSallesPlaces,
    onExcelRepartition,
    onExcelCollective,
    onExcelTemplates,
}) {
    const [format, setFormat] = useState('pdf');
    const [documentType, setDocumentType] = useState('repartition');
    const [localColumns, setLocalColumns] = useState(() =>
        initialColumns.map((column) => ({ ...column })),
    );
    const [localPresenceFilled, setLocalPresenceFilled] = useState(initialPresenceFilled);
    const [exportScope, setExportScope] = useState('all');
    const [exportFilename, setExportFilename] = useState(() =>
        buildDefaultExportFilename(selectedExamen, 'pdf', 'repartition'),
    );
    const [dragOverKey, setDragOverKey] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    const selectedColumns = selectedExportColumns(localColumns);
    const canConfigureColumns = documentType === 'repartition';
    const scopedRepartitions =
        exportScope === 'filtered' && searchActive ? filteredRepartitions : repartitions;
    const previewRows = scopedRepartitions.slice(0, 5);
    const exportDisabled =
        isExporting ||
        scopedRepartitions.length === 0 ||
        (canConfigureColumns && selectedColumns.length === 0);
    const showCollectiveAbsenceActions = format === 'pdf' && documentType === 'collective';

    const documentOptions = format === 'pdf'
        ? [
            {
                key: 'repartition',
                label: 'Repartition',
                description: 'PDF par salle avec colonnes au choix.',
                icon: FileText,
            },
            {
                key: 'collective',
                label: 'Presence collective',
                description: 'Feuille collective pour la session.',
                icon: FileText,
            },
            {
                key: 'places',
                label: 'Plan salles / places',
                description: 'Liste orientee salles et numeros de place.',
                icon: FileText,
            },
        ]
        : [
            {
                key: 'repartition',
                label: 'Repartition Excel',
                description: 'Table editable avec les etudiants affectes.',
                icon: Table2,
            },
            {
                key: 'collective',
                label: 'Presence collective Excel',
                description: 'Classeur par salle pour toute la presence collective.',
                icon: FileSpreadsheet,
            },
            {
                key: 'correctors',
                label: 'Fichiers correcteurs',
                description: selectedExamenUsesElements
                    ? 'Modele notes module + elements.'
                    : 'Modele notes du module.',
                icon: FileSpreadsheet,
            },
        ];

    useEffect(() => {
        setDocumentType('repartition');
    }, [format]);

    useEffect(() => {
        if (!searchActive && exportScope === 'filtered') {
            setExportScope('all');
        }
    }, [exportScope, searchActive]);

    useEffect(() => {
        setExportFilename(buildDefaultExportFilename(selectedExamen, format, documentType));
    }, [documentType, format, selectedExamen]);

    const toggleColumn = (key) => {
        setLocalColumns((current) =>
            current.map((column) =>
                column.key === key ? { ...column, enabled: !column.enabled } : column,
            ),
        );
    };

    const setAllColumns = (value) => {
        setLocalColumns((current) =>
            current.map((column) => ({ ...column, enabled: value })),
        );
    };

    const moveColumn = (fromIndex, toIndex) => {
        if (fromIndex === toIndex) return;

        setLocalColumns((current) => {
            const next = [...current];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });
    };

    const buildExportOptions = () => ({
        columns: localColumns,
        presenceFilled: localPresenceFilled,
        filename: exportFilename,
        repartitionIds:
            exportScope === 'filtered' && searchActive
                ? scopedRepartitions.map((repartition) => repartition.id_repartition)
                : [],
    });

    const runExportAction = async (callback) => {
        setIsExporting(true);

        try {
            await callback(buildExportOptions());
            onClose();
        } catch (error) {
            setIsExporting(false);
            throw error;
        }
    };

    const handleSubmit = async () => {
        await runExportAction(async (exportOptions) => {
            if (format === 'pdf') {
                if (documentType === 'collective') {
                    await onPdfCollective(exportOptions);
                } else if (documentType === 'places') {
                    await onPdfSallesPlaces(exportOptions);
                } else {
                    await onPdfRepartition(exportOptions);
                }
            } else if (documentType === 'collective') {
                await onExcelCollective(exportOptions);
            } else if (documentType === 'correctors') {
                await onExcelTemplates(exportOptions);
            } else {
                onExcelRepartition(exportOptions);
            }
        });
    };

    const outputLabel = format === 'pdf' ? 'PDF' : 'Excel';
    const selectedDocument = documentOptions.find((option) => option.key === documentType);
    const scopeOptions = [
        {
            value: 'all',
            label: 'Tous',
            count: repartitions.length,
            description: 'Exporter toute la repartition de l examen.',
            disabled: repartitions.length === 0,
        },
        {
            value: 'filtered',
            label: 'Filtres',
            count: filteredRepartitions.length,
            description: searchActive
                ? 'Limiter l export aux lignes visibles dans le tableau.'
                : 'Activez une recherche pour filtrer les lignes a exporter.',
            disabled: !searchActive,
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <FileDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                Exporter la repartition
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Configurez votre export {outputLabel.toLowerCase()} avant telechargement
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-5 px-6 py-5">
                    <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {selectedExamen ? formatExamLabel(selectedExamen) : 'Examen non selectionne'}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {selectedExamen?.session_examen?.nom_session ?? 'Session'} · {repartitions.length} ligne(s) disponibles
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                            Format d'export
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {[
                                {
                                    key: 'pdf',
                                    label: 'PDF',
                                    description: 'Documents prets a imprimer par salle.',
                                    icon: FileText,
                                },
                                {
                                    key: 'excel',
                                    label: 'Excel',
                                    description: 'Fichiers editables pour suivi et traitement.',
                                    icon: FileSpreadsheet,
                                },
                            ].map((option) => {
                                const Icon = option.icon;
                                const active = format === option.key;

                                return (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => setFormat(option.key)}
                                        className={`rounded-xl border-2 px-4 py-3 text-left transition-all ${
                                            active
                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                                : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                                        }`}
                                    >
                                        <div className="mb-2 flex items-center gap-2">
                                            <Icon className={`h-4 w-4 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`} />
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {option.label}
                                            </span>
                                        </div>
                                        <div className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                                            {option.description}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                            Document
                        </label>
                        <div className="grid gap-2">
                            {documentOptions.map((option) => {
                                const Icon = option.icon;
                                const active = documentType === option.key;

                                return (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => setDocumentType(option.key)}
                                        className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                                            active
                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                                : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                                        }`}
                                    >
                                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`} />
                                        <span>
                                            <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                                                {option.label}
                                            </span>
                                            <span className="mt-0.5 block text-xs leading-5 text-gray-500 dark:text-gray-400">
                                                {option.description}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                            Donnees a exporter
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {scopeOptions.map((option) => {
                                const active = exportScope === option.value;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setExportScope(option.value)}
                                        disabled={option.disabled}
                                        className={`rounded-xl border-2 px-4 py-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                                            active
                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                                : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {option.label}
                                            </span>
                                            <span className={`text-sm font-bold ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {option.count}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                            {option.description}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {canConfigureColumns && (
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                                    Colonnes
                                    <span className="normal-case font-normal text-gray-400">
                                        {' '}
                                        (glisser pour reordonner)
                                    </span>
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAllColumns(true)}
                                        className="text-xs text-emerald-600 hover:underline"
                                    >
                                        Tout
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                        type="button"
                                        onClick={() => setAllColumns(false)}
                                        className="text-xs text-red-500 hover:underline"
                                    >
                                        Aucun
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                {localColumns.map((column, index) => (
                                    <div
                                        key={column.key}
                                        draggable
                                        onDragStart={(event) =>
                                            event.dataTransfer.setData('text/plain', String(index))
                                        }
                                        onDragOver={(event) => {
                                            event.preventDefault();
                                            setDragOverKey(column.key);
                                        }}
                                        onDragLeave={() => setDragOverKey(null)}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            moveColumn(
                                                Number(event.dataTransfer.getData('text/plain')),
                                                index,
                                            );
                                            setDragOverKey(null);
                                        }}
                                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-all ${
                                            column.enabled
                                                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                                                : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700'
                                        } ${dragOverKey === column.key ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                    >
                                        <GripVertical className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                        <input
                                            type="checkbox"
                                            checked={column.enabled}
                                            onChange={() => toggleColumn(column.key)}
                                            className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            onClick={(event) => event.stopPropagation()}
                                        />
                                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">
                                            {column.label}
                                        </span>
                                        <span className="text-xs text-gray-300 dark:text-gray-500">
                                            #{index + 1}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                <input
                                    type="checkbox"
                                    checked={localPresenceFilled}
                                    onChange={() => setLocalPresenceFilled((current) => !current)}
                                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                Remplir la colonne presence
                            </label>
                        </div>
                    )}

                    <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                            Nom du fichier
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={exportFilename}
                                onChange={(event) => setExportFilename(event.target.value)}
                                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                placeholder={buildDefaultExportFilename(selectedExamen, format, documentType)}
                            />
                            <span className="whitespace-nowrap text-xs text-gray-400">
                                .{format === 'pdf' ? 'pdf' : 'xlsx'}
                            </span>
                        </div>
                    </div>

                    {showCollectiveAbsenceActions && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-700/60 dark:bg-amber-900/10">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        PV d&apos;absence
                                    </div>
                                    <div className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">
                                        Genere le modele du parcours <code>/documents/proces-v</code> pour le module courant
                                        ou pour l&apos;ensemble des modules de la presence collective.
                                    </div>
                                </div>
                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 shadow-sm dark:bg-gray-800 dark:text-amber-300">
                                    {collectiveModulesCount} module(s)
                                </span>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => runExportAction(onPdfAbsenceModule)}
                                    disabled={isExporting || scopedRepartitions.length === 0}
                                    className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-600 dark:bg-gray-800 dark:text-amber-200 dark:hover:bg-amber-900/20"
                                >
                                    <Download className="h-4 w-4" />
                                    PV d&apos;absence du module courant
                                </button>
                                <button
                                    type="button"
                                    onClick={() => runExportAction(onPdfAbsenceCollective)}
                                    disabled={isExporting || scopedRepartitions.length === 0 || collectiveModulesCount === 0}
                                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Download className="h-4 w-4" />
                                    PV d&apos;absence tous modules
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        Apercu de l'export
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {selectedDocument?.label || 'Document'} · {scopedRepartitions.length} ligne(s)
                                    </div>
                                </div>
                                {canConfigureColumns && (
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {selectedColumns.length} colonne(s)
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                            {previewRows.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                                                Etudiant
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                                                Grille
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                                                Place
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {previewRows.map((repartition) => (
                                            <tr key={repartition.id_repartition}>
                                                <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                                                    {repartitionStudentName(repartition)}
                                                </td>
                                                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                                                    {repartition.code_grille ?? '-'}
                                                </td>
                                                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                                                    {repartition.numero_place ?? '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                    Aucune ligne a exporter avec les filtres actuels.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {canConfigureColumns ? `${selectedColumns.length} col · ` : ''}
                        {scopedRepartitions.length} ligne(s) · {selectedDocument?.label || outputLabel}
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={exportDisabled}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <FileDown className="h-4 w-4" />
                            {isExporting ? 'Export en cours...' : `Exporter en ${outputLabel}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function RepartitionIndex({
    examens,
    repartitions,
    inscriptions,
    selectedExamenId,
    salles,
    pvDocuments = [],
    pvFormOptions = {},
}) {
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedNiveau, setSelectedNiveau] = useState('');
    const [selectedSemestre, setSelectedSemestre] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedElement, setSelectedElement] = useState('');
    const [showExportModal, setShowExportModal] = useState(false);
    const [showPvAbsenceSection, setShowPvAbsenceSection] = useState(false);
    const [isPushingPointage, setIsPushingPointage] = useState(false);
    const [columns, setColumns] = useState(() => defaultExportColumns());
    const [presenceFilled, setPresenceFilled] = useState(true);
    const [templateBuffer, setTemplateBuffer] = useState(null);
    const { data, setData, post, put, delete: destroy, processing, errors } = useForm(defaultFormState(selectedExamenId));

    const selectedExamen = useMemo(
        () => examens.find((examen) => examen.id_examen === selectedExamenId),
        [examens, selectedExamenId],
    );
    const selectedExamenUsesElements = useMemo(
        () => (selectedExamen ? usesElementRepartitionLogic(selectedExamen) : false),
        [selectedExamen],
    );
    const selectedExamenPvInitialValues = useMemo(() => {
        if (!selectedExamen) {
            return {};
        }

        const examMeta = resolveExamMeta(selectedExamen);
        const examSalles = resolvedExamSalles(selectedExamen);
        const prefilledSalle = examSalles.length === 1 ? examSalles[0] : null;
        const examDate = selectedExamen.date_examen
            ? new Date(selectedExamen.date_examen).toLocaleDateString('fr-FR')
            : '';

        return {
            nomDoc: [
                "PV absence",
                selectedExamen.session_examen?.nom_session,
                prefilledSalle?.code_salle || prefilledSalle?.nom_salle,
            ]
                .filter(Boolean)
                .join(' - '),
            descripDoc: [formatExamLabel(selectedExamen), examDate].filter(Boolean).join(' - '),
            session_id: selectedExamen.id_session_examen ? String(selectedExamen.id_session_examen) : '',
            niveau_id: examMeta.niveauId ? String(examMeta.niveauId) : '',
            filiere_id:
                selectedExamen.offre_formation?.section?.id_filiere
                || selectedExamen.session_examen?.id_filiere
                    ? String(
                          selectedExamen.offre_formation?.section?.id_filiere
                              || selectedExamen.session_examen?.id_filiere,
                      )
                    : '',
            section_id: selectedExamen.offre_formation?.id_section
                ? String(selectedExamen.offre_formation.id_section)
                : '',
            salle_id: prefilledSalle?.id_salle ? String(prefilledSalle.id_salle) : '',
            module_id: '',
        };
    }, [selectedExamen]);
    const pvAbsenceFormKey = useMemo(
        () =>
            JSON.stringify({
                examen: selectedExamenId ?? null,
                defaults: selectedExamenPvInitialValues,
            }),
        [selectedExamenId, selectedExamenPvInitialValues],
    );

    const editingRow = useMemo(
        () => repartitions.find((item) => item.id_repartition === editingId),
        [editingId, repartitions],
    );

    useEffect(() => {
        setData(() => defaultFormState(selectedExamenId));
        setEditingId(null);
        setSearchTerm('');
        setCurrentPage(1);
    }, [selectedExamenId]);

    useEffect(() => {
        if (!selectedExamenId) {
            setShowPvAbsenceSection(false);
        }
    }, [selectedExamenId]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleExamChange = (eventOrValue) => {
        const value = typeof eventOrValue === 'string' ? eventOrValue : eventOrValue.target.value;
        router.get(
            route('surveillance.repartition-etudiants.index'),
            value ? { examen: value } : {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const assignedIds = useMemo(
        () => new Set(repartitions.map((item) => item.id_inscription_pedagogique)),
        [repartitions],
    );

    const studentCount = inscriptions.length;
    const salleUsage = useMemo(() => {
        if (!selectedExamen) return [];
        const examSalles = resolvedExamSalles(selectedExamen);
        const salleFromGrille = (code) => {
            if (code === null || code === undefined) return null;
            const str = String(code).padStart(7, '0'); // f n s salle + seat(3)
            const digit = Number(str.charAt(3));
            return Number.isNaN(digit) ? null : digit;
        };
        return examSalles.map((salle, index) => {
            const capacity = salle.capacite_examens ?? salle.capacite ?? 0;
            const usage = repartitions.filter((item) => {
                const salleDigit = salleFromGrille(item.code_grille);
                const grilleMatch = salleDigit === index + 1 || Number(item.code_grille) === index + 1;
                const codeMatch =
                    item.numero_place && salle.code_salle
                        ? String(item.numero_place).includes(String(salle.code_salle))
                        : false;
                return grilleMatch || codeMatch;
            }).length;
            const percent = capacity ? Math.min(100, Math.round((usage / capacity) * 100)) : null;
            return {
                code: salle.code_salle || `Salle ${index + 1}`,
                capacity,
                usage,
                percent,
            };
        });
    }, [selectedExamen, repartitions]);

    const availableInscriptions = inscriptions.filter((inscription) => {
        if (!assignedIds.has(inscription.id_inscription_pedagogique)) {
            return true;
        }

        return editingRow?.id_inscription_pedagogique === inscription.id_inscription_pedagogique;
    });

    const filteredRepartitions = useMemo(() => {
        const query = normalizeText(searchTerm.trim());

        const sorted = [...repartitions].sort((a, b) => {
            const aName = normalizeText(
                `${a.inscription_pedagogique?.etudiant?.nom ?? ''} ${a.inscription_pedagogique?.etudiant?.prenom ?? ''}`,
            );
            const bName = normalizeText(
                `${b.inscription_pedagogique?.etudiant?.nom ?? ''} ${b.inscription_pedagogique?.etudiant?.prenom ?? ''}`,
            );
            if (aName === bName) {
                return (a.code_grille || 0) - (b.code_grille || 0);
            }
            return aName.localeCompare(bName);
        });

        if (!query) {
            return sorted;
        }

        return sorted.filter((item) => {
            const searchableValues = [
                item.inscription_pedagogique?.etudiant?.nom,
                item.inscription_pedagogique?.etudiant?.prenom,
                item.inscription_pedagogique?.etudiant?.cne,
                item.inscription_pedagogique?.module?.nom_module,
                item.inscription_pedagogique?.module?.code_module,
                item.code_grille,
                item.numero_place,
                item.code_anonymat,
                item.observation,
                item.present ? 'present' : 'absent',
                item.heure_arrivee,
                item.heure_sortie,
            ];

            return searchableValues.some((value) => normalizeText(value).includes(query));
        });
    }, [repartitions, searchTerm]);

    const searchActive = searchTerm.trim().length > 0;
    const totalFilteredRepartitions = filteredRepartitions.length;
    const totalPages = Math.max(1, Math.ceil(totalFilteredRepartitions / rowsPerPage));

    useEffect(() => {
        setCurrentPage((page) => Math.min(page, totalPages));
    }, [totalPages]);

    const paginatedRepartitions = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return filteredRepartitions.slice(startIndex, startIndex + rowsPerPage);
    }, [currentPage, filteredRepartitions, rowsPerPage]);

    const pageStart = totalFilteredRepartitions === 0 ? 0 : ((currentPage - 1) * rowsPerPage) + 1;
    const pageEnd = Math.min(currentPage * rowsPerPage, totalFilteredRepartitions);

    const salleIndices = useMemo(
        () => Array.from(new Set(repartitions.map((item) => salleIndexFromGrille(item.code_grille)))).sort((a, b) => a - b),
        [repartitions],
    );

    const examensWithMeta = useMemo(
        () =>
            examens.map((examen) => ({
                examen,
                ...resolveExamMeta(examen),
            })),
        [examens],
    );
    const selectedExamenMeta = useMemo(
        () => (selectedExamen ? resolveExamMeta(selectedExamen) : null),
        [selectedExamen],
    );
    const collectiveExamens = useMemo(() => {
        if (!selectedExamen || !selectedExamenMeta) {
            return [];
        }

        const selectedSessionId = String(
            selectedExamen.session_examen?.id_session_examen ?? selectedExamen.id_session_examen ?? '',
        );
        const selectedSemestreId = selectedExamenMeta.semestreId ? String(selectedExamenMeta.semestreId) : '';
        const selectedNiveauId = selectedExamenMeta.niveauId ? String(selectedExamenMeta.niveauId) : '';
        const selectedFiliere = normalizeText(selectedExamenMeta.filiereNom);

        return examensWithMeta
            .filter(({ examen, semestreId, niveauId, filiereNom }) => {
                const examSessionId = String(
                    examen.session_examen?.id_session_examen ?? examen.id_session_examen ?? '',
                );

                if (examSessionId !== selectedSessionId) {
                    return false;
                }

                if (selectedSemestreId && String(semestreId ?? '') !== selectedSemestreId) {
                    return false;
                }

                if (selectedNiveauId && String(niveauId ?? '') !== selectedNiveauId) {
                    return false;
                }

                if (selectedFiliere && normalizeText(filiereNom) !== selectedFiliere) {
                    return false;
                }

                return true;
            })
            .map(({ examen }) => examen);
    }, [examensWithMeta, selectedExamen, selectedExamenMeta]);
    const collectiveSalles = useMemo(() => {
        const seen = new Set();

        return collectiveExamens.flatMap((examen) => resolvedExamSalles(examen)).filter((salle) => {
            const key = String(salle.id_salle);
            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        });
    }, [collectiveExamens]);

    const availableNiveaux = useMemo(() => {
        const map = new Map();
        examensWithMeta.forEach(({ niveauId, niveauNom }) => {
            if (!niveauId) return;
            if (!map.has(niveauId)) {
                map.set(niveauId, {
                    id: niveauId,
                    nom: niveauNom || `Niveau ${niveauId}`,
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom));
    }, [examensWithMeta]);

    const availableSemestres = useMemo(() => {
        const map = new Map();
        examensWithMeta.forEach(({ semestreId, semestreNom, niveauId }) => {
            if (!semestreId) return;
            if (selectedNiveau && String(niveauId) !== String(selectedNiveau)) return;
            if (!map.has(semestreId)) {
                map.set(semestreId, {
                    id: semestreId,
                    nom: semestreNom || `Semestre ${semestreId}`,
                    niveauId,
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom));
    }, [examensWithMeta, selectedNiveau]);

    const availableSections = useMemo(() => {
        const map = new Map();
        examensWithMeta.forEach(({ sectionId, sectionNom, sectionLangue, niveauId, semestreId }) => {
            if (!sectionId) return;
            if (selectedNiveau && String(niveauId) !== String(selectedNiveau)) return;
            if (selectedSemestre && String(semestreId) !== String(selectedSemestre)) return;
            if (!map.has(sectionId)) {
                map.set(sectionId, {
                    id: sectionId,
                    nom_section: sectionNom || `Section ${sectionId}`,
                    langue: sectionLangue,
                });
            }
        });
        return Array.from(map.values()).sort((a, b) =>
            formatSectionLabel(a).localeCompare(formatSectionLabel(b)),
        );
    }, [examensWithMeta, selectedNiveau, selectedSemestre]);

    useEffect(() => {
        if (!selectedSection) {
            return;
        }

        const exists = availableSections.some((section) => String(section.id) === String(selectedSection));
        if (!exists) {
            setSelectedSection('');
        }
    }, [availableSections, selectedSection]);

    const examensMatchingAcademicFilters = useMemo(() => {
        return examensWithMeta
            .filter(({ niveauId, semestreId, sectionId }) => {
                if (selectedNiveau && String(niveauId) !== String(selectedNiveau)) {
                    return false;
                }
                if (selectedSemestre && String(semestreId) !== String(selectedSemestre)) {
                    return false;
                }
                if (selectedSection && String(sectionId) !== String(selectedSection)) {
                    return false;
                }
                return true;
            })
            .map(({ examen }) => examen);
    }, [examensWithMeta, selectedNiveau, selectedSection, selectedSemestre]);

    const filteredExamens = examensMatchingAcademicFilters;

    const availableElements = useMemo(() => {
        if (!selectedExamen?.module || !selectedExamenUsesElements) {
            return [];
        }

        const options = (selectedExamen.module.elements || [])
            .filter((element) => !isSelfReferencingElement(selectedExamen.module, element))
            .map((element) => ({
                id: String(element.id_element),
                label: formatElementLabel(element),
            }));

        const hasModuleOnly = examensMatchingAcademicFilters.some(
            (examen) =>
                String(examen.id_module) === String(selectedExamen.id_module) &&
                !examen.element?.id_element,
        );

        options.sort((left, right) => left.label.localeCompare(right.label));

        if (hasModuleOnly) {
            options.unshift({
                id: MODULE_ONLY_FILTER,
                label: 'Module complet',
            });
        }

        return options;
    }, [examensMatchingAcademicFilters, selectedExamen, selectedExamenUsesElements]);

    useEffect(() => {
        if (!selectedExamen) {
            if (selectedElement) {
                setSelectedElement('');
            }

            return;
        }

        if (!selectedExamenUsesElements) {
            if (selectedElement) {
                setSelectedElement('');
            }

            return;
        }

        const nextValue = selectedExamen.element?.id_element
            ? String(selectedExamen.element.id_element)
            : MODULE_ONLY_FILTER;

        if (selectedElement !== nextValue) {
            setSelectedElement(nextValue);
        }
    }, [selectedExamen, selectedElement, selectedExamenUsesElements]);

    useEffect(() => {
        if (filteredExamens.length > 0 || !selectedExamenId) {
            return;
        }

        handleExamChange('');
    }, [filteredExamens, selectedExamenId]);

    useEffect(() => {
        if (filteredExamens.length === 0) return;

        const selectedId = selectedExamenId ? String(selectedExamenId) : '';
        const exists = filteredExamens.some((examen) => String(examen.id_examen) === selectedId);
        if (!exists) {
            handleExamChange(String(filteredExamens[0].id_examen));
        }
    }, [filteredExamens, selectedExamenId]);

    const handleElementChange = (event) => {
        const value = event.target.value;
        setSelectedElement(value);

        if (!selectedExamenUsesElements || !selectedExamen?.id_module || !value) {
            return;
        }

        const targetExam = examensMatchingAcademicFilters.find((examen) => {
            if (String(examen.id_module) !== String(selectedExamen.id_module)) {
                return false;
            }

            if (value === MODULE_ONLY_FILTER) {
                return !examen.element?.id_element;
            }

            return String(examen.element?.id_element ?? '') === String(value);
        });

        if (!targetExam) {
            Swal.fire({
                icon: 'info',
                title: 'Aucun examen planifie pour cet element',
            });

            return;
        }

        if (String(targetExam.id_examen) !== String(selectedExamenId ?? '')) {
            handleExamChange(String(targetExam.id_examen));
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setData(() => defaultFormState(selectedExamenId));
    };

    const startEdit = (repartition) => {
        setEditingId(repartition.id_repartition);
        setData((values) => ({
            ...values,
            id_examen: selectedExamenId ? String(selectedExamenId) : '',
            id_inscription_pedagogique: repartition.id_inscription_pedagogique
                ? String(repartition.id_inscription_pedagogique)
                : '',
            code_grille: repartition.code_grille ?? '',
            code_anonymat: repartition.code_anonymat ?? '',
            numero_place: repartition.numero_place ?? '',
            present: Boolean(repartition.present),
            heure_arrivee: repartition.heure_arrivee ?? '',
            heure_sortie: repartition.heure_sortie ?? '',
            observation: repartition.observation ?? '',
        }));
    };

    const submit = (event) => {
        event.preventDefault();
        if (!data.id_examen) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }

        if (editingId) {
            put(route('surveillance.repartition-etudiants.update', editingId), {
                preserveScroll: true,
                onSuccess: () => {
                    Swal.fire({ icon: 'success', title: 'Repartition mise a jour', timer: 1200, showConfirmButton: false });
                    resetForm();
                },
            });
        } else {
            post(route('surveillance.repartition-etudiants.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    Swal.fire({ icon: 'success', title: 'Etudiant ajoute', timer: 1200, showConfirmButton: false });
                    resetForm();
                },
            });
        }
    };

    const handleDelete = (id, examenId) => {
        Swal.fire({
            icon: 'warning',
            title: 'Supprimer cette affectation ?',
            showCancelButton: true,
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler',
        }).then((result) => {
            if (!result.isConfirmed) return;
            destroy(route('surveillance.repartition-etudiants.destroy', { repartition_etudiant: id, examen: examenId }), {
                onSuccess: () =>
                    Swal.fire({
                        icon: 'success',
                        title: 'Repartition supprimee',
                        timer: 1200,
                        showConfirmButton: false,
                    }),
            });
        });
    };

    const resolveExportRows = (repartitionIds = []) => {
        if (!Array.isArray(repartitionIds) || repartitionIds.length === 0) {
            return repartitions;
        }

        const ids = new Set(repartitionIds.map((value) => String(value)));

        return repartitions.filter((repartition) => ids.has(String(repartition.id_repartition)));
    };

    const downloadPdfPerSalle = async (
        baseUrl,
        requestParams,
        fallbackPrefix,
        exportRows = repartitions,
        filename = '',
        options = {},
    ) => {
        const resolveSalleForIndex = options.resolveSalleForIndex;
        const targetSalleIndices = Array.from(
            new Set(exportRows.map((item) => salleIndexFromGrille(item.code_grille))),
        ).sort((left, right) => left - right);

        if (targetSalleIndices.length === 0) {
            Swal.fire({ icon: 'info', title: 'Aucune repartition pour cet examen' });
            return;
        }

        const fallbackBase =
            sanitizeFileName((filename || '').replace(/\.pdf$/i, '')) || fallbackPrefix;

        for (const index of targetSalleIndices) {
            const params = new URLSearchParams(requestParams.toString());
            params.set('salle_index', String(index));
            const salle = resolveSalleForIndex?.(index);
            if (salle?.id_salle) {
                params.set('salle_id', String(salle.id_salle));
            }
            const url = `${baseUrl}?${params.toString()}`;

            try {
                const response = await fetch(url, { credentials: 'same-origin' });
                if (!response.ok) {
                    throw new Error(
                        await readFailedResponseMessage(
                            response,
                            `Erreur serveur (${response.status})`,
                        ),
                    );
                }

                const blob = await response.blob();
                const filename = extractFilenameFromDisposition(
                    response.headers.get('Content-Disposition'),
                    targetSalleIndices.length === 1
                        ? `${fallbackBase}.pdf`
                        : `${fallbackBase}-salle-${index}.pdf`,
                );

                downloadBlob(blob, filename);
                await new Promise((resolve) => setTimeout(resolve, 200));
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Echec du telechargement',
                    text: error?.message || 'Impossible de telecharger les PDFs.',
                });
                break;
            }
        }
    };

    const handlePushPointage = async () => {
        if (!selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }

        if (!repartitions.length) {
            Swal.fire({ icon: 'info', title: 'Aucune repartition pour cet examen' });
            return;
        }

        const confirmation = await Swal.fire({
            icon: 'question',
            title: 'Envoyer au pointage ?',
            text: 'La repartition de cet examen sera envoyee a l application externe.',
            showCancelButton: true,
            confirmButtonText: 'Envoyer',
            cancelButtonText: 'Annuler',
        });

        if (!confirmation.isConfirmed) {
            return;
        }

        setIsPushingPointage(true);

        try {
            const response = await window.axios.post(
                route('surveillance.repartition-etudiants.push-pointage', selectedExamenId),
            );

            Swal.fire({
                icon: 'success',
                title: 'Envoye au pointage',
                text: response.data?.message || 'La repartition a ete envoyee.',
                timer: 1800,
                showConfirmButton: false,
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Envoi impossible',
                text: error.response?.data?.message || 'Erreur lors de l envoi vers l application pointage.',
            });
        } finally {
            setIsPushingPointage(false);
        }
    };

    const handleExport = async (options = {}) => {
        if (!selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }
        const exportColumns = options.columns ?? columns;
        const exportPresenceFilled = options.presenceFilled ?? presenceFilled;
        const exportRows = resolveExportRows(options.repartitionIds);
        const selectedColumns = selectedExportColumns(exportColumns);

        if (selectedColumns.length === 0) {
            Swal.fire({ icon: 'info', title: 'Choisissez au moins une colonne' });
            return;
        }

        const baseUrl = route('surveillance.repartition-etudiants.export', selectedExamenId);
        const params = new URLSearchParams();
        selectedColumns.forEach((col) => params.append('columns[]', col));
        params.append('presence_filled', exportPresenceFilled ? '1' : '0');
        (options.repartitionIds ?? []).forEach((id) => params.append('ids[]', String(id)));
        if (options.filename?.trim()) {
            params.append('filename', options.filename.trim());
        }
        await downloadPdfPerSalle(baseUrl, params, 'repartition', exportRows, options.filename);
    };

    const handleCollectiveExport = async (options = {}) => {
        if (!selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }

        const baseUrl = route('surveillance.repartition-etudiants.export-collective', selectedExamenId);
        const params = new URLSearchParams();
        (options.repartitionIds ?? []).forEach((id) => params.append('ids[]', String(id)));
        if (options.filename?.trim()) {
            params.append('filename', options.filename.trim());
        }

        if (collectiveSalles.length === 0) {
            Swal.fire({ icon: 'info', title: 'Aucune salle trouvee pour cette exportation collective' });
            return;
        }

        const fallbackBase =
            sanitizeFileName((options.filename || '').replace(/\.pdf$/i, '')) || 'presence-collective';

        for (const salle of collectiveSalles) {
            const requestParams = new URLSearchParams(params.toString());
            requestParams.set('salle_id', String(salle.id_salle));

            try {
                const response = await fetch(`${baseUrl}?${requestParams.toString()}`, {
                    credentials: 'same-origin',
                });
                if (!response.ok) {
                    throw new Error(
                        await readFailedResponseMessage(
                            response,
                            `Erreur serveur (${response.status})`,
                        ),
                    );
                }

                const blob = await response.blob();
                const fallbackFilename =
                    collectiveSalles.length === 1
                        ? `${fallbackBase}.pdf`
                        : `${fallbackBase}-salle-${sanitizeFileName(salle.code_salle || salle.nom_salle || salle.id_salle)}.pdf`;
                const filename = extractFilenameFromDisposition(
                    response.headers.get('Content-Disposition'),
                    fallbackFilename,
                );

                downloadBlob(blob, filename);
                await new Promise((resolve) => setTimeout(resolve, 200));
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Echec du telechargement',
                    text: error?.message || 'Impossible de telecharger les PDFs collectifs.',
                });
                break;
            }
        }
    };

    const resolvePdfExportFilename = (requestedFilename, targetDocumentType, sourceDocumentType = targetDocumentType) => {
        const trimmed = requestedFilename?.trim();
        const sourceDefault = buildDefaultExportFilename(selectedExamen, 'pdf', sourceDocumentType);

        if (!trimmed || trimmed === sourceDefault) {
            return buildDefaultExportFilename(selectedExamen, 'pdf', targetDocumentType);
        }

        return trimmed;
    };

    const handleModuleAbsenceExport = async (options = {}) => {
        if (!selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }

        const exportRows = resolveExportRows(options.repartitionIds);
        const filename = resolvePdfExportFilename(options.filename, 'absence-module', 'collective');
        const baseUrl = route('surveillance.repartition-etudiants.export-pv-absence', selectedExamenId);
        const params = new URLSearchParams();

        (options.repartitionIds ?? []).forEach((id) => params.append('ids[]', String(id)));
        if (filename?.trim()) {
            params.append('filename', filename.trim());
        }

        await downloadPdfPerSalle(
            baseUrl,
            params,
            'pv-absence-module',
            exportRows,
            filename,
            {
                resolveSalleForIndex: (index) => examSalleForIndex(selectedExamen, index),
            },
        );
    };

    const handleCollectiveAbsenceExport = async (options = {}) => {
        if (!selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }

        if (collectiveSalles.length === 0) {
            Swal.fire({ icon: 'info', title: 'Aucune salle trouvee pour cette exportation collective' });
            return;
        }

        const filename = resolvePdfExportFilename(options.filename, 'absence-collective', 'collective');
        const baseUrl = route('surveillance.repartition-etudiants.export-pv-absence-collective', selectedExamenId);
        const params = new URLSearchParams();

        (options.repartitionIds ?? []).forEach((id) => params.append('ids[]', String(id)));
        if (filename?.trim()) {
            params.append('filename', filename.trim());
        }

        const fallbackBase =
            sanitizeFileName((filename || '').replace(/\.pdf$/i, '')) || 'pv-absence-collective';

        for (const salle of collectiveSalles) {
            const requestParams = new URLSearchParams(params.toString());
            requestParams.set('salle_id', String(salle.id_salle));

            try {
                const response = await fetch(`${baseUrl}?${requestParams.toString()}`, {
                    credentials: 'same-origin',
                });
                if (!response.ok) {
                    throw new Error(
                        await readFailedResponseMessage(
                            response,
                            `Erreur serveur (${response.status})`,
                        ),
                    );
                }

                const blob = await response.blob();
                const fallbackFilename =
                    collectiveSalles.length === 1
                        ? `${fallbackBase}.pdf`
                        : `${fallbackBase}-salle-${sanitizeFileName(salle.code_salle || salle.nom_salle || salle.id_salle)}.pdf`;
                const resolvedFilename = extractFilenameFromDisposition(
                    response.headers.get('Content-Disposition'),
                    fallbackFilename,
                );

                downloadBlob(blob, resolvedFilename);
                await new Promise((resolve) => setTimeout(resolve, 200));
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Echec du telechargement',
                    text: error?.message || "Impossible de telecharger les PV d'absence collectifs.",
                });
                break;
            }
        }
    };

    const handleSallesPlacesExport = async (options = {}) => {
        if (!selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }

        if (collectiveSalles.length === 0) {
            Swal.fire({ icon: 'info', title: 'Aucune salle trouvee pour cette exportation collective' });
            return;
        }

        const baseUrl = route('surveillance.repartition-etudiants.export-salles-places', selectedExamenId);
        const params = new URLSearchParams();
        (options.repartitionIds ?? []).forEach((id) => params.append('ids[]', String(id)));
        if (options.filename?.trim()) {
            params.append('filename', options.filename.trim());
        }

        const fallbackBase =
            sanitizeFileName((options.filename || '').replace(/\.pdf$/i, '')) || 'repartition-salles-places';

        for (const salle of collectiveSalles) {
            const requestParams = new URLSearchParams(params.toString());
            requestParams.set('salle_id', String(salle.id_salle));

            try {
                const response = await fetch(`${baseUrl}?${requestParams.toString()}`, {
                    credentials: 'same-origin',
                });
                if (!response.ok) {
                    throw new Error(
                        await readFailedResponseMessage(
                            response,
                            `Erreur serveur (${response.status})`,
                        ),
                    );
                }

                const blob = await response.blob();
                const fallbackFilename =
                    collectiveSalles.length === 1
                        ? `${fallbackBase}.pdf`
                        : `${fallbackBase}-salle-${sanitizeFileName(salle.code_salle || salle.nom_salle || salle.id_salle)}.pdf`;
                const resolvedFilename = extractFilenameFromDisposition(
                    response.headers.get('Content-Disposition'),
                    fallbackFilename,
                );

                downloadBlob(blob, resolvedFilename);
                await new Promise((resolve) => setTimeout(resolve, 200));
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Echec du telechargement',
                    text: error?.message || 'Impossible de telecharger les plans de salle.',
                });
                break;
            }
        }
    };

    const handleRepartitionExcelExport = (options = {}) => {
        if (!selectedExamen || !selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }

        const exportColumns = options.columns ?? columns;
        const exportPresenceFilled = options.presenceFilled ?? presenceFilled;
        const exportRows = resolveExportRows(options.repartitionIds);

        if (!exportRows.length) {
            Swal.fire({ icon: 'info', title: 'Aucune repartition pour cet examen' });
            return;
        }

        const selectedColumns = selectedExportColumns(exportColumns);
        if (selectedColumns.length === 0) {
            Swal.fire({ icon: 'info', title: 'Choisissez au moins une colonne' });
            return;
        }

        const orderedRows = [...exportRows].sort((left, right) => {
            const leftSalle = salleIndexFromGrille(left.code_grille);
            const rightSalle = salleIndexFromGrille(right.code_grille);
            if (leftSalle !== rightSalle) {
                return leftSalle - rightSalle;
            }

            const leftGrille = Number(left.code_grille ?? 0);
            const rightGrille = Number(right.code_grille ?? 0);
            if (leftGrille !== rightGrille) {
                return leftGrille - rightGrille;
            }

            return repartitionStudentName(left).localeCompare(repartitionStudentName(right));
        });

        const rows = orderedRows.map((repartition, index) => {
            const student = repartitionStudent(repartition);
            const row = {
                '#': index + 1,
            };

            if (selectedColumns.includes('cne')) {
                row.CNE = student.cne ?? '';
            }

            if (selectedColumns.includes('etudiant')) {
                row.Etudiant = repartitionStudentName(repartition);
            }

            if (selectedColumns.includes('nom')) {
                row.Nom = student.nom ?? '';
            }

            if (selectedColumns.includes('prenom')) {
                row.Prenom = student.prenom ?? '';
            }

            if (selectedColumns.includes('grille')) {
                row.Grille = repartition.code_grille ?? '';
            }

            if (selectedColumns.includes('place')) {
                row.Place = repartition.numero_place ?? '';
            }

            if (selectedColumns.includes('anonymat')) {
                row.Anonymat = repartition.code_anonymat ?? '';
            }

            if (selectedColumns.includes('presence')) {
                row.Presence = exportPresenceFilled
                    ? (repartition.present ? 'Present' : 'Absent')
                    : '';
            }

            row['Heure arrivee'] = formatTime(repartition.heure_arrivee);
            row['Heure sortie'] = formatTime(repartition.heure_sortie);
            row.Observation = repartition.observation ?? '';

            return row;
        });

        try {
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const headers = Object.keys(rows[0] ?? {});
            worksheet['!cols'] = headers.map((header) => ({
                wch: Math.max(
                    header.length,
                    ...rows.map((row) => String(row[header] ?? '').length),
                    10,
                ),
            }));

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName('Repartition'));

            const filename = ensureXlsxExtension(
                sanitizeFileName((options.filename || '').replace(/\.xlsx$/i, '')) ||
                    buildDefaultExportFilename(selectedExamen, 'excel', 'repartition'),
            );

            XLSX.writeFile(workbook, filename);

            Swal.fire({
                icon: 'success',
                title: 'Fichier Excel genere',
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Export Excel impossible',
                text: 'Le fichier de repartition n a pas pu etre genere.',
            });
        }
    };

    const handleCollectiveExcelExport = async (options = {}) => {
        if (!selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }

        const baseUrl = route('surveillance.repartition-etudiants.export-collective-excel', selectedExamenId);
        const params = new URLSearchParams();
        (options.repartitionIds ?? []).forEach((id) => params.append('ids[]', String(id)));
        if (options.filename?.trim()) {
            params.append('filename', options.filename.trim());
        }

        try {
            const response = await fetch(`${baseUrl}?${params.toString()}`, {
                credentials: 'same-origin',
            });
            if (!response.ok) {
                throw new Error(
                    await readFailedResponseMessage(
                        response,
                        `Erreur serveur (${response.status})`,
                    ),
                );
            }

            const blob = await response.blob();
            const fallbackFilename =
                ensureXlsxExtension(
                    sanitizeFileName((options.filename || '').replace(/\.xlsx$/i, '')) ||
                        buildDefaultExportFilename(selectedExamen, 'excel', 'collective'),
                );
            const filename = extractFilenameFromDisposition(
                response.headers.get('Content-Disposition'),
                fallbackFilename,
            );

            downloadBlob(blob, filename);
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Export Excel impossible',
                text: error?.message || 'Le classeur collectif n a pas pu etre genere.',
            });
            throw error;
        }
    };

    const handleExcelTemplates = async (options = {}) => {
        if (!selectedExamen || !selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }

        const exportRows = resolveExportRows(options.repartitionIds);

        if (!exportRows.length) {
            Swal.fire({ icon: 'info', title: 'Aucune repartition pour cet examen' });
            return;
        }

        try {
            const buffer =
                templateBuffer ??
                (await fetch(TEMPLATE_URL).then((response) => {
                    if (!response.ok) {
                        throw new Error('Modele Excel introuvable.');
                    }
                    return response.arrayBuffer();
                }));

            if (!templateBuffer) {
                setTemplateBuffer(buffer);
            }

            const moduleName = formatModuleName(selectedExamen.module);
            const sessionLabel = formatSessionLabel(selectedExamen.session_examen);
            const { semestreNom, niveauNom, filiereNom } = resolveExamMeta(selectedExamen);
            const filiereName = filiereNom;
            const shouldExportElements = selectedExamenUsesElements;
            const headerLine = [niveauNom, semestreNom, filiereName ? `Filiere ${filiereName}` : null]
                .filter(Boolean)
                .join(' - ');
            const noteScale = 20;
            const anonymatList = exportRows.map((rep) => rep.code_anonymat ?? rep.code_grille ?? '');

            const baseName =
                sanitizeFileName((options.filename || '').replace(/\.xlsx$/i, '')) ||
                sanitizeFileName(
                    [
                        sessionLabel,
                        selectedExamen.module?.code_module,
                        selectedExamen.module?.nom_module,
                    ]
                        .filter(Boolean)
                        .join('_'),
                ) || 'notes_module';

            const fillWorkbook = async ({ sheetTitle, primaryLabel, secondaryLabel }) => {
                const workbook = await XlsxPopulate.fromDataAsync(buffer.slice(0));
                const sheet = workbook.sheet(0);

                sheet.name(safeSheetName(sheetTitle || moduleName || 'RN'));

                sheet.cell('B3').value(sessionLabel || '');
                sheet.cell('B4').value(headerLine || '');
                sheet.cell('B6').value(primaryLabel || moduleName || '');
                sheet.cell('B7').value(secondaryLabel || primaryLabel || moduleName || '');
                sheet.cell('C9').value(`NOTE SUR ${noteScale}`);

                const templateEndRow = Math.max(sheet.usedRange()?.endCell().rowNumber() ?? TEMPLATE_START_ROW, TEMPLATE_START_ROW);
                const lastDataRow = TEMPLATE_START_ROW + anonymatList.length - 1;

                for (let rowNumber = TEMPLATE_START_ROW; rowNumber <= lastDataRow; rowNumber += 1) {
                    if (rowNumber > templateEndRow) {
                        cloneTemplateRow(sheet, TEMPLATE_REPEAT_ROW, rowNumber);
                    }

                    sheet.row(rowNumber).hidden(false);
                    sheet.cell(`B${rowNumber}`).value(anonymatList[rowNumber - TEMPLATE_START_ROW] ?? '');
                    sheet.cell(`C${rowNumber}`).value(undefined);
                }

                for (let rowNumber = lastDataRow + 1; rowNumber <= templateEndRow; rowNumber += 1) {
                    sheet.row(rowNumber).hidden(true);
                    sheet.cell(`B${rowNumber}`).value(undefined);
                    sheet.cell(`C${rowNumber}`).value(undefined);
                }

                await updateTemplateTableRange(workbook, lastDataRow);

                return workbook.outputAsync();
            };

            const moduleFilename = ensureXlsxExtension(`${baseName}_module`);
            const moduleBlob = await fillWorkbook({
                sheetTitle: moduleName,
                primaryLabel: moduleName,
                secondaryLabel: moduleName,
            });
            downloadBlob(moduleBlob, moduleFilename);

            const elements = shouldExportElements
                ? (selectedExamen.module?.elements || []).filter(
                      (element) => !isSelfReferencingElement(selectedExamen.module, element),
                  )
                : [];
            for (const [index, element] of elements.entries()) {
                const elementName = formatElementName(element) || moduleName;
                const elementBase =
                    sanitizeFileName(`${baseName}_${element.code_element || element.nom_element || `element_${index + 1}`}`) ||
                    `element_${index + 1}`;
                const filename = ensureXlsxExtension(elementBase);

                const blob = await fillWorkbook({
                    sheetTitle: elementName,
                    primaryLabel: moduleName,
                    secondaryLabel: elementName,
                });

                downloadBlob(blob, filename);
            }

            Swal.fire({
                icon: 'success',
                title: 'Fichier(s) Excel generes',
                text:
                    shouldExportElements && elements.length > 0
                        ? `1 module + ${elements.length} element(s) telecharges.`
                        : 'Fichier module telecharge.',
                timer: 1800,
                showConfirmButton: false,
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Echec du telechargement',
                text: error?.message || 'Impossible de generer les fichiers Excel.',
            });
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Repartition des etudiants</h2>}
        >
            <Head title="Repartition des examens" />

            <ExamHeader />

            {showExportModal && (
                <RepartitionExportModal
                    selectedExamen={selectedExamen}
                    selectedExamenUsesElements={selectedExamenUsesElements}
                    repartitions={repartitions}
                    filteredRepartitions={filteredRepartitions}
                    searchActive={searchActive}
                    collectiveModulesCount={collectiveExamens.length}
                    initialColumns={columns}
                    initialPresenceFilled={presenceFilled}
                    onClose={() => setShowExportModal(false)}
                    onPdfRepartition={async (options) => {
                        setColumns(options.columns);
                        setPresenceFilled(options.presenceFilled);
                        await handleExport(options);
                    }}
                    onPdfCollective={handleCollectiveExport}
                    onPdfAbsenceModule={handleModuleAbsenceExport}
                    onPdfAbsenceCollective={handleCollectiveAbsenceExport}
                    onPdfSallesPlaces={handleSallesPlacesExport}
                    onExcelRepartition={(options) => {
                        setColumns(options.columns);
                        setPresenceFilled(options.presenceFilled);
                        handleRepartitionExcelExport(options);
                    }}
                    onExcelCollective={handleCollectiveExcelExport}
                    onExcelTemplates={handleExcelTemplates}
                />
            )}

            <div className="mb-6 grid gap-4 rounded-xl border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 md:grid-cols-3">
                <div className="md:col-span-2 space-y-3">
                    <div className={`grid gap-3 sm:grid-cols-2 ${selectedExamenUsesElements ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Niveau</label>
                            <select
                                value={selectedNiveau}
                                onChange={(event) => {
                                    setSelectedNiveau(event.target.value);
                                    setSelectedSemestre('');
                                    setSelectedSection('');
                                    setSelectedElement('');
                                }}
                                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                            >
                                <option value="">Tous</option>
                                {availableNiveaux.map((niveau) => (
                                    <option key={niveau.id} value={niveau.id}>
                                        {niveau.nom}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Semestre</label>
                            <select
                                value={selectedSemestre}
                                onChange={(event) => {
                                    setSelectedSemestre(event.target.value);
                                    setSelectedElement('');
                                }}
                                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                            >
                                <option value="">Tous</option>
                                {availableSemestres.map((semestre) => (
                                    <option key={semestre.id} value={semestre.id}>
                                        {semestre.nom}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Section</label>
                            <select
                                value={selectedSection}
                                onChange={(event) => {
                                    setSelectedSection(event.target.value);
                                    setSelectedElement('');
                                }}
                                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                            >
                                <option value="">Toutes</option>
                                {availableSections.map((section) => (
                                    <option key={section.id} value={section.id}>
                                        {formatSectionLabel(section)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Selectionnez un examen</label>
                            <select
                                value={selectedExamenId ? String(selectedExamenId) : ''}
                                onChange={handleExamChange}
                                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                            >
                                <option value="">-- Choisir un examen --</option>
                                {filteredExamens.map((examen) => {
                                    const examMeta = resolveExamMeta(examen);

                                    return (
                                        <option key={examen.id_examen} value={examen.id_examen}>
                                            {[
                                                formatExamLabel(examen),
                                                examen.session_examen?.nom_session ?? 'Session',
                                                examMeta.sectionNom
                                                    ? formatSectionLabel({
                                                          nom_section: examMeta.sectionNom,
                                                          langue: examMeta.sectionLangue,
                                                      })
                                                    : null,
                                                new Date(examen.date_examen).toLocaleDateString(),
                                            ]
                                                .filter(Boolean)
                                                .join(' - ')}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        {selectedExamenUsesElements && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Element</label>
                                <select
                                    value={selectedElement}
                                    onChange={handleElementChange}
                                    disabled={!selectedExamenUsesElements || availableElements.length === 0}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                                >
                                    <option value="">Selectionner</option>
                                    {availableElements.map((element) => (
                                        <option key={element.id} value={element.id}>
                                            {element.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
                    {selectedExamen ? (
                        <>
                            <div className="font-semibold">{formatExamLabel(selectedExamen)}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {selectedExamen.session_examen?.nom_session} - {formatDateTime(selectedExamen.date_debut)} - {formatDateTime(selectedExamen.date_fin)}
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                                <div className="rounded-md bg-white/60 p-2 dark:bg-gray-800/60">
                                    <div className="text-gray-500 dark:text-gray-400">Etudiants inscrits</div>
                                    <div className="text-base font-semibold text-gray-800 dark:text-gray-100">{studentCount}</div>
                                </div>
                                <div className="rounded-md bg-white/60 p-2 dark:bg-gray-800/60">
                                    <div className="text-gray-500 dark:text-gray-400">Repartitions existantes</div>
                                    <div className="text-base font-semibold text-gray-800 dark:text-gray-100">
                                        {repartitions.length} / {studentCount}
                                    </div>
                                </div>
                            </div>
                            {salleUsage.length > 0 && (
                                <div className="mt-3 space-y-2 text-xs">
                                    <div className="text-gray-600 dark:text-gray-300 font-semibold">Salles &amp; capacites</div>
                                    {salleUsage.map((salle) => (
                                        <div key={salle.code} className="flex items-center justify-between rounded-md bg-white/70 p-2 dark:bg-gray-800/60">
                                            <div className="font-semibold">{salle.code}</div>
                                            <div className="text-gray-700 dark:text-gray-200">
                                                {salle.usage} / {salle.capacity || '--'}
                                                {salle.percent !== null && ` (${salle.percent}%)`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-3 space-y-2">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowExportModal(true)}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={!selectedExamenId || repartitions.length === 0}
                                    >
                                        <Download size={16} />
                                        Exporter
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowPvAbsenceSection((current) => !current)}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={!selectedExamenId || repartitions.length === 0}
                                    >
                                        <FileText size={16} />
                                        {showPvAbsenceSection ? 'Masquer le formulaire PV' : "PV d'absence"}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={handlePushPointage}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={!selectedExamenId || repartitions.length === 0 || isPushingPointage}
                                >
                                    <UploadCloud size={16} />
                                    {isPushingPointage ? 'Envoi en cours...' : 'Envoyer au pointage'}
                                </button>
                                <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                    Ouvrez la meme section que <code>/documents/proces-v</code> pour generer les PV d'absence, ou utilisez l export rapide / le pointage.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-xs text-gray-500 dark:text-gray-400">Choisissez un examen pour voir les details.</div>
                    )}
                </div>
            </div>

            {showPvAbsenceSection && selectedExamen && (
                <div className="mb-6">
                    <PvAbsenceSection
                        formKey={pvAbsenceFormKey}
                        documents={pvDocuments}
                        formProps={{
                            sessions: pvFormOptions.sessions || [],
                            niveaux: pvFormOptions.niveaux || [],
                            salles: pvFormOptions.salles || [],
                            modules: pvFormOptions.modules || [],
                            filieres: pvFormOptions.filieres || [],
                            sections: pvFormOptions.sections || [],
                            initialValues: selectedExamenPvInitialValues,
                            submitLabel: 'Generer les PV d\'absence',
                        }}
                    />
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <div className="rounded-xl border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                {editingId ? 'Modifier la repartition' : 'Nouvelle repartition'}
                            </h3>
                            {editingId && (
                                <button
                                    onClick={resetForm}
                                    className="text-sm text-indigo-600 hover:underline dark:text-indigo-300"
                                >
                                    Annuler l'edition
                                </button>
                            )}
                        </div>
                        <form onSubmit={submit} className="min-w-0 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Etudiant</label>
                                <select
                                    value={data.id_inscription_pedagogique}
                                    onChange={(e) => setData('id_inscription_pedagogique', e.target.value)}
                                    disabled={!selectedExamenId}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                                >
                                    <option value="">Selectionner</option>
                                    {availableInscriptions.map((inscription) => (
                                        <option key={inscription.id_inscription_pedagogique} value={inscription.id_inscription_pedagogique}>
                                            {inscription.etudiant?.cne} - {inscription.etudiant?.nom} {inscription.etudiant?.prenom}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.id_inscription_pedagogique} className="mt-1" />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Code grille</label>
                                    <input
                                        type="number"
                                        value={data.code_grille}
                                        onChange={(e) => setData('code_grille', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                        disabled={!selectedExamenId}
                                    />
                                    <InputError message={errors.code_grille} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Code anonymat</label>
                                    <input
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={data.code_anonymat}
                                        onChange={(e) => setData('code_anonymat', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                        placeholder="Ex: 101"
                                    />
                                    <InputError message={errors.code_anonymat} className="mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Numero de place</label>
                                <input
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={data.numero_place}
                                    onChange={(e) => setData('numero_place', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    placeholder="Ex: 1"
                                />
                                <InputError message={errors.numero_place} className="mt-1" />
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    id="present"
                                    type="checkbox"
                                    checked={data.present}
                                    onChange={(e) => setData('present', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="present" className="text-sm text-gray-700 dark:text-gray-200">
                                    Etudiant present
                                </label>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Heure d'arrivee</label>
                                    <input
                                        type="time"
                                        value={data.heure_arrivee}
                                        onChange={(e) => setData('heure_arrivee', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    />
                                    <InputError message={errors.heure_arrivee} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Heure de sortie</label>
                                    <input
                                        type="time"
                                        value={data.heure_sortie}
                                        onChange={(e) => setData('heure_sortie', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    />
                                    <InputError message={errors.heure_sortie} className="mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Observation</label>
                                <textarea
                                    rows={3}
                                    value={data.observation}
                                    onChange={(e) => setData('observation', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                />
                                <InputError message={errors.observation} className="mt-1" />
                            </div>
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    className="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 sm:w-auto"
                                    onClick={resetForm}
                                >
                                    Reinitialiser
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || !selectedExamenId}
                                    className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                                >
                                    {editingId ? 'Mettre a jour' : 'Affecter'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="rounded-xl border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Etudiants affectes</h3>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {searchActive ? (
                                        <>
                                            {filteredRepartitions.length} / {repartitions.length} lignes
                                        </>
                                    ) : (
                                        `${repartitions.length} lignes`
                                    )}
                                </span>
                            </div>
                            <div className="w-full md:w-72">
                                <label htmlFor="repartition-search" className="sr-only">
                                    Rechercher un etudiant
                                </label>
                                <input
                                    id="repartition-search"
                                    type="search"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Rechercher (nom, CNE, grille...)"
                                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    disabled={!selectedExamenId}
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
                                            Grille / Place
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Anonymat
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Presence
                                        </th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {paginatedRepartitions.map((repartition) => (
                                        <tr key={repartition.id_repartition} className="text-sm text-gray-700 dark:text-gray-200">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold">
                                                    {repartition.inscription_pedagogique?.etudiant?.nom}{' '}
                                                    {repartition.inscription_pedagogique?.etudiant?.prenom}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {repartition.inscription_pedagogique?.etudiant?.cne}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>Grille #{repartition.code_grille}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">Place {repartition.numero_place ?? '-'}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{repartition.code_anonymat ?? '-'}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatTime(repartition.heure_arrivee)}
                                                    {' -> '}
                                                    {formatTime(repartition.heure_sortie)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={badgeClasses(repartition.present)}>
                                                    {repartition.present ? (
                                                        <>
                                                            <CheckCircle2 size={14} />
                                                            Present
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle size={14} />
                                                            Absent
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => startEdit(repartition)}
                                                        className="rounded-full p-2 text-indigo-600 transition hover:bg-indigo-50 dark:hover:bg-gray-700"
                                                        title="Modifier"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(repartition.id_repartition, repartition.id_examen)}
                                                        className="rounded-full p-2 text-red-600 transition hover:bg-red-50 dark:hover:bg-gray-700"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredRepartitions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                                {searchActive
                                                    ? 'Aucun resultat ne correspond a cette recherche.'
                                                    : 'Aucune repartition pour cet examen.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {filteredRepartitions.length > 0 && (
                            <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300 sm:flex-row sm:items-center">
                                    <div className="flex items-center gap-2">
                                        <span>Afficher</span>
                                        <select
                                            value={rowsPerPage}
                                            onChange={(event) => {
                                                setRowsPerPage(Number(event.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                        >
                                            {PAGE_SIZE_OPTIONS.map((size) => (
                                                <option key={size} value={size}>
                                                    {size}
                                                </option>
                                            ))}
                                        </select>
                                        <span>lignes</span>
                                    </div>
                                    <span>
                                        {pageStart}-{pageEnd} sur {totalFilteredRepartitions}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                    >
                                        Premier
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                        disabled={currentPage === 1}
                                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                    >
                                        Precedent
                                    </button>
                                    <span className="px-1 text-sm text-gray-600 dark:text-gray-300">
                                        Page {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                        disabled={currentPage === totalPages}
                                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                    >
                                        Suivant
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                    >
                                        Dernier
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
