import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import ExamHeader from '../Header';
import { useEffect, useMemo, useState } from 'react';
import Dropdown from '@/Components/Dropdown';
import InputError from '@/Components/InputError';
import Swal from 'sweetalert2';
import { CheckCircle2, ChevronDown, Edit3, FileSpreadsheet, Trash2, XCircle } from 'lucide-react';
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

const safeSheetName = (value) => {
    const name = (value || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').trim() || 'Sheet';
    return name.slice(0, 31);
};

const formatModuleLabel = (module) => {
    const parts = [module?.code_module, module?.nom_module].filter(Boolean);
    return parts.length ? parts.join(' - ') : 'Module';
};

const formatElementLabel = (element) => {
    const parts = [element?.code_element, element?.nom_element].filter(Boolean);
    return parts.length ? parts.join(' - ') : 'Element';
};

const formatSessionLabel = (session) => {
    if (!session) return null;
    const parts = [session.nom_session, session.type_session].filter(Boolean);
    return parts.join(' - ') || null;
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

    return {
        semestreId: semestre?.id_semestre,
        semestreNom: semestre?.nom_semestre,
        niveauId: niveau?.id_niveau,
        niveauNom: niveau?.nom_niveau,
        filiereNom: matchedOffre?.section?.filiere?.nom_filiere,
    };
};

export default function RepartitionIndex({ examens, repartitions, inscriptions, selectedExamenId, salles }) {
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedNiveau, setSelectedNiveau] = useState('');
    const [selectedSemestre, setSelectedSemestre] = useState('');
    const [columns, setColumns] = useState({
        cne: true,
        etudiant: true,
        grille: true,
        place: true,
        anonymat: true,
        presence: true,
    });
    const [presenceFilled, setPresenceFilled] = useState(true);
    const [templateBuffer, setTemplateBuffer] = useState(null);
    const { data, setData, post, put, delete: destroy, processing, errors } = useForm(defaultFormState(selectedExamenId));

    const selectedExamen = useMemo(
        () => examens.find((examen) => examen.id_examen === selectedExamenId),
        [examens, selectedExamenId],
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
        const salleFromGrille = (code) => {
            if (code === null || code === undefined) return null;
            const str = String(code).padStart(7, '0'); // f n s salle + seat(3)
            const digit = Number(str.charAt(3));
            return Number.isNaN(digit) ? null : digit;
        };
        return (selectedExamen.salles || []).map((salle, index) => {
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

    const filteredExamens = useMemo(() => {
        return examensWithMeta
            .filter(({ niveauId, semestreId }) => {
                if (selectedNiveau && String(niveauId) !== String(selectedNiveau)) {
                    return false;
                }
                if (selectedSemestre && String(semestreId) !== String(selectedSemestre)) {
                    return false;
                }
                return true;
            })
            .map(({ examen }) => examen);
    }, [examensWithMeta, selectedNiveau, selectedSemestre]);

    useEffect(() => {
        if (filteredExamens.length === 0) return;

        const selectedId = selectedExamenId ? String(selectedExamenId) : '';
        const exists = filteredExamens.some((examen) => String(examen.id_examen) === selectedId);
        if (!exists) {
            handleExamChange(String(filteredExamens[0].id_examen));
        }
    }, [filteredExamens, selectedExamenId]);

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

    const downloadPdfPerSalle = async (baseUrl, requestParams, fallbackPrefix) => {
        if (salleIndices.length === 0) {
            Swal.fire({ icon: 'info', title: 'Aucune repartition pour cet examen' });
            return;
        }

        for (const index of salleIndices) {
            const params = new URLSearchParams(requestParams.toString());
            params.set('salle_index', String(index));
            const url = `${baseUrl}?${params.toString()}`;

            try {
                const response = await fetch(url, { credentials: 'same-origin' });
                if (!response.ok) {
                    throw new Error(`Erreur serveur (${response.status})`);
                }

                const blob = await response.blob();
                const filename = extractFilenameFromDisposition(
                    response.headers.get('Content-Disposition'),
                    `${fallbackPrefix}-salle-${index}.pdf`,
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

    const handleExport = async () => {
        if (!selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }
        const selectedColumns = Object.entries(columns)
            .filter(([, checked]) => checked)
            .map(([key]) => key);

        if (selectedColumns.length === 0) {
            Swal.fire({ icon: 'info', title: 'Choisissez au moins une colonne' });
            return;
        }

        const baseUrl = route('surveillance.repartition-etudiants.export', selectedExamenId);
        const params = new URLSearchParams();
        selectedColumns.forEach((col) => params.append('columns[]', col));
        params.append('presence_filled', presenceFilled ? '1' : '0');
        await downloadPdfPerSalle(baseUrl, params, 'repartition');
    };

    const handleCollectiveExport = async () => {
        if (!selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }

        const baseUrl = route('surveillance.repartition-etudiants.export-collective', selectedExamenId);
        await downloadPdfPerSalle(baseUrl, new URLSearchParams(), 'presence-collective');
    };

    const handleSallesPlacesExport = async () => {
        if (!selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }

        const baseUrl = route('surveillance.repartition-etudiants.export-salles-places', selectedExamenId);
        await downloadPdfPerSalle(baseUrl, new URLSearchParams(), 'repartition-salles-places');
    };

    const handleExcelTemplates = async () => {
        if (!selectedExamen || !selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }

        if (!repartitions.length) {
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

            const moduleLabel = formatModuleLabel(selectedExamen.module);
            const sessionLabel = formatSessionLabel(selectedExamen.session_examen);
            const { semestreNom, niveauNom, filiereNom } = resolveExamMeta(selectedExamen);
            const filiereName = filiereNom;
            const headerLine = [niveauNom, semestreNom, filiereName ? `Filiere ${filiereName}` : null]
                .filter(Boolean)
                .join(' - ');
            const noteScale = 20;
            const anonymatList = repartitions.map((rep) => rep.code_anonymat ?? rep.code_grille ?? '');

            const baseName =
                sanitizeFileName(
                    [sessionLabel, selectedExamen.module?.code_module, selectedExamen.module?.nom_module]
                        .filter(Boolean)
                        .join('_'),
                ) || 'notes_module';

            const fillWorkbook = async ({ sheetTitle, moduleName, secondaryLabel }) => {
                const workbook = await XlsxPopulate.fromDataAsync(buffer.slice(0));
                const sheet = workbook.sheet(0);

                sheet.name(safeSheetName(sheetTitle || moduleLabel || 'RN'));

                sheet.cell('B3').value(sessionLabel || '');
                sheet.cell('B4').value(headerLine || '');
                sheet.cell('B6').value(moduleName || moduleLabel || '');
                sheet.cell('B7').value(secondaryLabel || '');
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
                sheetTitle: 'Module',
                moduleName: selectedExamen.module?.nom_module,
                secondaryLabel: selectedExamen.module?.code_module,
            });
            downloadBlob(moduleBlob, moduleFilename);

            const elements = selectedExamen.module?.elements || [];
            for (const [index, element] of elements.entries()) {
                const elementLabel = formatElementLabel(element);
                const elementBase =
                    sanitizeFileName(`${baseName}_${element.code_element || element.nom_element || `element_${index + 1}`}`) ||
                    `element_${index + 1}`;
                const filename = ensureXlsxExtension(elementBase);

                const blob = await fillWorkbook({
                    sheetTitle: elementLabel,
                    moduleName: selectedExamen.module?.nom_module || moduleLabel,
                    secondaryLabel: element?.nom_element || element?.code_element || elementLabel,
                });

                downloadBlob(blob, filename);
            }

            Swal.fire({
                icon: 'success',
                title: 'Fichier(s) Excel generes',
                text:
                    elements.length > 0
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

            <div className="mb-6 grid gap-4 rounded-xl border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 md:grid-cols-3">
                <div className="md:col-span-2 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Niveau</label>
                            <select
                                value={selectedNiveau}
                                onChange={(event) => {
                                    setSelectedNiveau(event.target.value);
                                    setSelectedSemestre('');
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
                                onChange={(event) => setSelectedSemestre(event.target.value)}
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
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Selectionnez un examen</label>
                        <select
                            value={selectedExamenId ? String(selectedExamenId) : ''}
                            onChange={handleExamChange}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                        >
                            <option value="">-- Choisir un examen --</option>
                            {filteredExamens.map((examen) => (
                                <option key={examen.id_examen} value={examen.id_examen}>
                                    {examen.module?.nom_module ?? 'Module'} - {examen.session_examen?.nom_session ?? 'Session'} - {new Date(examen.date_examen).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
                    {selectedExamen ? (
                        <>
                            <div className="font-semibold">{selectedExamen.module?.nom_module}</div>
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
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <button
                                            type="button"
                                            disabled={!selectedExamenId}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                        >
                                            Exports PDF
                                            <ChevronDown size={16} />
                                        </button>
                                    </Dropdown.Trigger>
                                    <Dropdown.Content
                                        align="left"
                                        width="48"
                                        contentClasses="py-2 bg-white dark:bg-gray-800"
                                    >
                                        <button
                                            type="button"
                                            onClick={handleExport}
                                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                        >
                                            Exporter la repartition
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCollectiveExport}
                                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                        >
                                            Presence collective
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSallesPlacesExport}
                                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                        >
                                            Plan salles / places
                                        </button>
                                    </Dropdown.Content>
                                </Dropdown>
                                <button
                                    type="button"
                                    onClick={handleExcelTemplates}
                                    className="inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                    disabled={!selectedExamenId || repartitions.length === 0}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <FileSpreadsheet size={16} />
                                        Excel correcteurs (module + elements)
                                    </span>
                                </button>
                            </div>
                            <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                                <div className="font-semibold text-gray-700 dark:text-gray-100">Colonnes</div>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { key: 'cne', label: 'CNE' },
                                        { key: 'etudiant', label: 'Etudiant' },
                                        { key: 'grille', label: 'Grille' },
                                        { key: 'place', label: 'Place' },
                                        { key: 'anonymat', label: 'Anonymat' },
                                        { key: 'presence', label: 'Presence' },
                                    ].map(({ key, label }) => (
                                        <label key={key} className="inline-flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={columns[key]}
                                                onChange={() =>
                                                    setColumns((prev) => ({ ...prev, [key]: !prev[key] }))
                                                }
                                            />
                                            <span>{label}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={presenceFilled}
                                        onChange={() => setPresenceFilled((prev) => !prev)}
                                    />
                                    <span>Remplir la colonne presence</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-xs text-gray-500 dark:text-gray-400">Choisissez un examen pour voir les details.</div>
                    )}
                </div>
            </div>

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
                                    value={data.numero_place}
                                    onChange={(e) => setData('numero_place', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
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
