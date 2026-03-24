import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import ExamHeader from '../Header';
import { useEffect, useMemo, useState } from 'react';
import InputError from '@/Components/InputError';
import Swal from 'sweetalert2';
import { CheckCircle2, Edit3, FileSpreadsheet, Trash2, XCircle } from 'lucide-react';
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
    }, [selectedExamenId]);

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

    const handleExport = () => {
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
        const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

        window.open(url, '_blank');
    };

    const handleCollectiveExport = async () => {
        if (!selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }

        const salleIndices = Array.from(
            new Set(
                repartitions.map((item) => {
                    const str = String(item.code_grille ?? '').padStart(7, '0');
                    const digit = Number(str.charAt(3));
                    return Number.isNaN(digit) || digit < 1 ? 1 : digit;
                }),
            ),
        ).sort((a, b) => a - b);

        if (salleIndices.length === 0) {
            Swal.fire({ icon: 'info', title: 'Aucune repartition pour cet examen' });
            return;
        }

        const baseUrl = route('surveillance.repartition-etudiants.export-collective', selectedExamenId);
        for (const index of salleIndices) {
            const url = `${baseUrl}?salle_index=${index}`;
            try {
                const response = await fetch(url, { credentials: 'same-origin' });
                if (!response.ok) {
                    throw new Error(`Erreur serveur (${response.status})`);
                }

                const blob = await response.blob();
                const disposition = response.headers.get('Content-Disposition') || '';
                const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i.exec(disposition);
                const filename = match
                    ? match[1].replace(/['"]/g, '')
                    : `presence-collective-salle-${index}.pdf`;

                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(blobUrl);

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

    const handleSallesPlacesExport = () => {
        if (!selectedExamenId) {
            Swal.fire({ icon: 'info', title: 'Choisissez un examen' });
            return;
        }

        const url = route('surveillance.repartition-etudiants.export-salles-places', selectedExamenId);
        window.open(url, '_blank');
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

            const fillWorkbook = async ({ sheetTitle, moduleName, moduleCode }) => {
                const workbook = await XlsxPopulate.fromDataAsync(buffer.slice(0));
                const sheet = workbook.sheet(0);

                sheet.name(safeSheetName(sheetTitle || moduleLabel || 'RN'));

                sheet.cell('B3').value(sessionLabel || '');
                sheet.cell('B4').value(headerLine || '');
                sheet.cell('B6').value(moduleName || moduleLabel || '');
                sheet.cell('B7').value(moduleCode || '');
                sheet.cell('C9').value(`NOTE SUR ${noteScale}`);

                const startRow = 10;
                const minimumRows = 103;
                const targetRows = Math.max(anonymatList.length, minimumRows);

                for (let index = 0; index < targetRows; index += 1) {
                    const value = anonymatList[index] ?? '';
                    sheet.cell(`B${startRow + index}`).value(value);
                }

                return workbook.outputAsync();
            };

            const moduleFilename = ensureXlsxExtension(`${baseName}_module`);
            const moduleBlob = await fillWorkbook({
                sheetTitle: 'Module',
                moduleName: selectedExamen.module?.nom_module,
                moduleCode: selectedExamen.module?.code_module,
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
                    moduleName: element?.nom_element || elementLabel,
                    moduleCode: element?.code_element || elementLabel,
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
                            <div className="mt-3">
                                <button
                                    type="button"
                                    onClick={handleExport}
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={!selectedExamenId}
                                >
                                    Exporter en PDF
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCollectiveExport}
                                    className="ml-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={!selectedExamenId}
                                >
                                    Presence collective (PDF)
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSallesPlacesExport}
                                    className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 md:ml-2 md:mt-0"
                                    disabled={!selectedExamenId}
                                >
                                    Plan salles / places (PDF)
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExcelTemplates}
                                    className="mt-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60 md:ml-2 md:mt-0"
                                    disabled={!selectedExamenId || repartitions.length === 0}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <FileSpreadsheet size={16} />
                                        Excel correcteurs (module + elements)
                                    </span>
                                </button>
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
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-xs text-gray-500 dark:text-gray-400">Choisissez un examen pour voir les details.</div>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <div className="rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
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
                        <form onSubmit={submit} className="space-y-4">
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
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                    onClick={resetForm}
                                >
                                    Reinitialiser
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || !selectedExamenId}
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
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
                                    {filteredRepartitions.map((repartition) => (
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
                                                    {formatTime(repartition.heure_arrivee)} -> {formatTime(repartition.heure_sortie)}
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
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
