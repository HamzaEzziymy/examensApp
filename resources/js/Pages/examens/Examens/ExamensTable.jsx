import { useEffect, useMemo, useState } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import InputError from '@/Components/InputError';
import { Edit3, Trash2 } from 'lucide-react';
import { studentOrderOptions } from './studentOrderOptions';
import { combineDateAndTime, toInputDate, toInputTime } from './dateTimeFields';

const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
};

const formatDateTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString();
};

const formatSessionLabel = (session) => {
    const parts = [session.nom_session];

    if (session.type_session) {
        parts.push(session.type_session);
    }

    parts.push(
        session.date_session_examen ? new Date(session.date_session_examen).toLocaleDateString() : 'Date a confirmer',
    );

    return parts.join(' - ');
};

const formatModuleLabel = (module) =>
    [module?.code_module, module?.nom_module].filter(Boolean).join(' - ');
const formatSectionLabel = (section) =>
    [section?.nom_section, section?.langue].filter(Boolean).join(' - ');

const formatExamLabel = (examen) => formatModuleLabel(examen?.module) || 'Module';

const statusTone = {
    Planifiee: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-200',
    'En cours': 'bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-200',
    Terminee: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200',
    Annulee: 'bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-200',
};

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

export default function ExamensTable({ examens, sessions, modules, salles, statuts, semestres = [], niveaux = [], sections = [] }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sessionFilter, setSessionFilter] = useState('');
    const [niveauFilter, setNiveauFilter] = useState('');
    const [semestreFilter, setSemestreFilter] = useState('');
    const [sectionFilter, setSectionFilter] = useState('');
    const [moduleFilter, setModuleFilter] = useState('');
    const [editSelectedNiveau, setEditSelectedNiveau] = useState('');
    const [editSelectedSemestre, setEditSelectedSemestre] = useState('');
    const [allocations, setAllocations] = useState({});
    const [pendingSalleId, setPendingSalleId] = useState('');
    const [eligibleStudentCount, setEligibleStudentCount] = useState(null);
    const [studentCountLoading, setStudentCountLoading] = useState(false);
    const [studentCountError, setStudentCountError] = useState('');
    const [studentCountCache, setStudentCountCache] = useState({});

    const { data, setData, put, delete: destroy, errors, processing, reset, transform } = useForm({
        id_examen: null,
        id_session_examen: '',
        section_id: '',
        id_module: '',
        id_element: '',
        id_salle: '',
        salles: [],
        repartition_salles: [],
        anonymat_start: '',
        anonymat_end: '',
        student_order: 'alphabetic',
        date_examen: '',
        date_debut: '',
        date_fin: '',
        statut: statuts[0],
        description: '',
    });

    const modulesById = useMemo(
        () => new Map(modules.map((module) => [String(module.id_module), module])),
        [modules],
    );

    const filteredListSemestres = useMemo(
        () => semestres.filter((sem) => !niveauFilter || String(sem.id_niveau) === String(niveauFilter)),
        [semestres, niveauFilter],
    );
    const selectedListSession = useMemo(
        () => sessions.find((session) => String(session.id_session_examen) === String(sessionFilter)),
        [sessions, sessionFilter],
    );
    const selectedListSessionFiliereId = selectedListSession?.id_filiere ? String(selectedListSession.id_filiere) : '';
    const filteredListSections = useMemo(
        () =>
            sections.filter(
                (section) =>
                    !selectedListSessionFiliereId
                    || String(section.id_filiere) === String(selectedListSessionFiliereId),
            ),
        [sections, selectedListSessionFiliereId],
    );

    const filteredListModules = useMemo(() => {
        return modules.filter((module) => {
            const sems = module.semestres || [];
            const moduleSectionIds = module.section_ids || [];
            const moduleFiliereIds = module.filiere_ids || [];
            const matchesNiveau =
                !niveauFilter || sems.some((sem) => String(sem.id_niveau) === String(niveauFilter));
            const matchesSemestre =
                !semestreFilter || sems.some((sem) => String(sem.id_semestre) === String(semestreFilter));
            const matchesSection =
                !sectionFilter || moduleSectionIds.includes(Number(sectionFilter));
            const matchesSessionFiliere =
                !selectedListSessionFiliereId || moduleFiliereIds.includes(Number(selectedListSessionFiliereId));
            return matchesNiveau && matchesSemestre && matchesSection && matchesSessionFiliere;
        });
    }, [modules, niveauFilter, sectionFilter, selectedListSessionFiliereId, semestreFilter]);
    const selectedSession = useMemo(
        () => sessions.find((session) => String(session.id_session_examen) === String(data.id_session_examen)),
        [sessions, data.id_session_examen],
    );
    const selectedSessionFiliereId = selectedSession?.id_filiere ? String(selectedSession.id_filiere) : '';
    const filteredEditSections = useMemo(
        () =>
            sections.filter(
                (section) =>
                    !selectedSessionFiliereId
                    || String(section.id_filiere) === String(selectedSessionFiliereId),
            ),
        [sections, selectedSessionFiliereId],
    );

    const filteredEditModules = useMemo(() => {
        return modules.filter((module) => {
            const sems = module.semestres || [];
            const moduleSectionIds = module.section_ids || [];
            const moduleFiliereIds = module.filiere_ids || [];
            const matchesNiveau =
                !editSelectedNiveau || sems.some((sem) => String(sem.id_niveau) === String(editSelectedNiveau));
            const matchesSemestre =
                !editSelectedSemestre || sems.some((sem) => String(sem.id_semestre) === String(editSelectedSemestre));
            const matchesSection =
                !data.section_id || moduleSectionIds.includes(Number(data.section_id));
            const matchesSessionFiliere =
                !selectedSessionFiliereId || moduleFiliereIds.includes(Number(selectedSessionFiliereId));
            return matchesNiveau && matchesSemestre && matchesSection && matchesSessionFiliere;
        });
    }, [data.section_id, editSelectedNiveau, editSelectedSemestre, modules, selectedSessionFiliereId]);
    const filteredEditSemestres = useMemo(
        () => semestres.filter((sem) => !editSelectedNiveau || String(sem.id_niveau) === String(editSelectedNiveau)),
        [semestres, editSelectedNiveau],
    );
    const sallesById = useMemo(
        () =>
            new Map(
                salles.map((salle) => [String(salle.id_salle), salle]),
            ),
        [salles],
    );
    const selectedSalles = useMemo(
        () =>
            data.salles
                .map((id) => sallesById.get(String(id)))
                .filter(Boolean),
        [data.salles, sallesById],
    );
    const availableSalles = useMemo(
        () => salles.filter((salle) => !data.salles.includes(String(salle.id_salle))),
        [salles, data.salles],
    );
    const anonymatStartValue = Number.parseInt(data.anonymat_start, 10);
    const hasCustomAnonymatStart = Number.isInteger(anonymatStartValue) && anonymatStartValue > 0;
    const normalizedAnonymatStart = hasCustomAnonymatStart ? anonymatStartValue : 1;
    const anonymatPreviewEnd = useMemo(() => {
        if (!eligibleStudentCount || eligibleStudentCount < 1) {
            return null;
        }

        return ((normalizedAnonymatStart + eligibleStudentCount - 2) % eligibleStudentCount) + 1;
    }, [eligibleStudentCount, normalizedAnonymatStart]);
    const anonymatPreviewSequence = useMemo(() => {
        if (!eligibleStudentCount || eligibleStudentCount < 1) {
            return [];
        }

        if (hasCustomAnonymatStart && anonymatStartValue > eligibleStudentCount) {
            return [];
        }

        return Array.from({ length: Math.min(6, eligibleStudentCount) }, (_, index) =>
            ((normalizedAnonymatStart + index - 1) % eligibleStudentCount) + 1,
        );
    }, [anonymatStartValue, eligibleStudentCount, hasCustomAnonymatStart, normalizedAnonymatStart]);
    const targetStudentCount = eligibleStudentCount;
    const totalSelectedCapacity = useMemo(
        () =>
            selectedSalles.reduce(
                (sum, salle) => sum + Number(salle.capacite_examens ?? salle.capacite ?? 0),
                0,
            ),
        [selectedSalles],
    );
    const remainingStudentsForCapacity = useMemo(() => {
        if (targetStudentCount === null) {
            return null;
        }

        return Math.max(targetStudentCount - totalSelectedCapacity, 0);
    }, [targetStudentCount, totalSelectedCapacity]);
    const spareSelectedCapacity = useMemo(() => {
        if (targetStudentCount === null) {
            return null;
        }

        return Math.max(totalSelectedCapacity - targetStudentCount, 0);
    }, [targetStudentCount, totalSelectedCapacity]);
    useEffect(() => {
        const exists = filteredEditModules.some((mod) => String(mod.id_module) === String(data.id_module));
        if (!exists) {
            setData('id_module', '');
        }
    }, [filteredEditModules, data.id_module, setData]);

    useEffect(() => {
        const semestreExists = filteredEditSemestres.some(
            (sem) => String(sem.id_semestre) === String(editSelectedSemestre),
        );
        if (!semestreExists && editSelectedSemestre) {
            setEditSelectedSemestre('');
        }
    }, [filteredEditSemestres, editSelectedSemestre]);

    useEffect(() => {
        const sectionExists = filteredEditSections.some(
            (section) => String(section.id_section) === String(data.section_id),
        );
        if (!sectionExists && data.section_id) {
            setData('section_id', '');
        }
    }, [data.section_id, filteredEditSections, setData]);

    useEffect(() => {
        const semestreExists = filteredListSemestres.some((sem) => String(sem.id_semestre) === String(semestreFilter));
        if (!semestreExists && semestreFilter) {
            setSemestreFilter('');
        }
    }, [filteredListSemestres, semestreFilter]);

    useEffect(() => {
        const sectionExists = filteredListSections.some(
            (section) => String(section.id_section) === String(sectionFilter),
        );
        if (!sectionExists && sectionFilter) {
            setSectionFilter('');
        }
    }, [filteredListSections, sectionFilter]);

    useEffect(() => {
        const moduleExists = filteredListModules.some((module) => String(module.id_module) === String(moduleFilter));
        if (!moduleExists && moduleFilter) {
            setModuleFilter('');
        }
    }, [filteredListModules, moduleFilter]);

    useEffect(() => {
        setAllocations((current) => {
            const next = {};
            data.salles.forEach((id) => {
                if (current[id] !== undefined) {
                    next[id] = current[id];
                }
            });
            return next;
        });
    }, [data.salles]);

    useEffect(() => {
        if (!data.id_session_examen || !data.id_module) {
            setEligibleStudentCount(null);
            setStudentCountLoading(false);
            setStudentCountError('');
            return;
        }

        const cacheKey = `${data.id_session_examen}:${data.id_module}:${data.section_id || 'all'}`;
        if (studentCountCache[cacheKey] !== undefined) {
            setEligibleStudentCount(studentCountCache[cacheKey]);
            setStudentCountLoading(false);
            setStudentCountError('');
            return;
        }

        const controller = new AbortController();
        setStudentCountLoading(true);
        setStudentCountError('');

        fetch(
            route('examens.planning.student-count', {
                id_session_examen: data.id_session_examen,
                id_module: data.id_module,
                ...(data.section_id ? { section_id: data.section_id } : {}),
            }),
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                signal: controller.signal,
            },
        )
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('count-fetch-failed');
                }

                return response.json();
            })
            .then((payload) => {
                const nextCount = Number(payload?.count ?? 0);
                setEligibleStudentCount(nextCount);
                setStudentCountCache((current) => ({
                    ...current,
                    [cacheKey]: nextCount,
                }));
            })
            .catch((error) => {
                if (error.name === 'AbortError') {
                    return;
                }

                setEligibleStudentCount(null);
                setStudentCountError('Impossible de charger l effectif pour ce module.');
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setStudentCountLoading(false);
                }
            });

        return () => controller.abort();
    }, [data.id_module, data.id_session_examen, data.section_id, studentCountCache]);

    useEffect(() => {
        transform((currentData) => ({
            ...currentData,
            id_element: '',
            anonymat_end: '',
            date_debut: combineDateAndTime(currentData.date_examen, currentData.date_debut),
            date_fin: combineDateAndTime(currentData.date_examen, currentData.date_fin),
            repartition_salles: (currentData.salles || [])
                .map((id) => {
                    const value = allocations[id];
                    return {
                        id_salle: Number(id),
                        nombre: value ? Number(value) : null,
                    };
                })
                .filter((row) => row.nombre),
        }));
    }, [allocations, data.salles, transform]);

    const autoDistributeSelectedSalles = () => {
        if (!selectedSalles.length) return;

        const totalStudents =
            targetStudentCount ??
            selectedSalles.reduce((sum, salle) => sum + (salle.capacite_examens ?? salle.capacite ?? 0), 0);
        let remaining = totalStudents;
        const next = {};

        selectedSalles.forEach((salle, index) => {
            const roomsLeft = selectedSalles.length - index;
            const capacity = salle.capacite_examens ?? salle.capacite ?? remaining;
            const target = Math.ceil(remaining / Math.max(1, roomsLeft));
            const take = Math.min(capacity > 0 ? capacity : remaining, target, remaining);
            next[String(salle.id_salle)] = remaining > 0 ? take : '';
            remaining -= take;
        });

        setAllocations(next);
    };

    const addSalle = (salleId) => {
        if (!salleId || data.salles.includes(salleId)) {
            return;
        }

        setData('salles', [...data.salles, salleId]);
        setPendingSalleId('');
    };

    const removeSalle = (salleId) => {
        setData(
            'salles',
            data.salles.filter((currentSalleId) => currentSalleId !== salleId),
        );
    };

    const openModal = (examen) => {
        const moduleData = modules.find((m) => String(m.id_module) === String(examen.id_module));
        const firstSem = moduleData?.semestres?.[0];
        setEditSelectedNiveau(firstSem?.id_niveau ? String(firstSem.id_niveau) : '');
        setEditSelectedSemestre(firstSem?.id_semestre ? String(firstSem.id_semestre) : '');
        const savedAllocations = (examen.salles || []).reduce((carry, salle) => {
            const value = Number(salle?.pivot?.nombre_affecte ?? 0);

            if (value > 0) {
                carry[String(salle.id_salle)] = value;
            }

            return carry;
        }, {});

        setData({
            id_examen: examen.id_examen,
            id_session_examen: examen.id_session_examen ?? '',
            section_id: examen.offre_formation?.id_section ? String(examen.offre_formation.id_section) : '',
            id_module: examen.id_module ?? '',
            id_element: '',
            id_salle: examen.id_salle ?? '',
            salles: (examen.salles || []).map((s) => String(s.id_salle)),
            anonymat_start: examen.anonymat_start ?? '',
            anonymat_end: '',
            student_order: examen.student_order ?? 'alphabetic',
            date_examen: toInputDate(examen.date_examen),
            date_debut: toInputTime(examen.date_debut),
            date_fin: toInputTime(examen.date_fin),
            statut: examen.statut,
            description: examen.description ?? '',
        });
        setAllocations(savedAllocations);
        setPendingSalleId('');
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditSelectedNiveau('');
        setEditSelectedSemestre('');
        setAllocations({});
        setPendingSalleId('');
        reset();
    };

    const handleUpdate = (event) => {
        event.preventDefault();
        if (!data.id_examen) return;

        put(route('examens.examens.update', data.id_examen), {
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
                Swal.fire({
                    icon: 'success',
                    title: 'Examen mis à jour',
                    timer: 1500,
                    showConfirmButton: false,
                });
            },
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            icon: 'warning',
            title: 'Supprimer cet examen ?',
            text: 'Les surveillances et répartitions associées seront également supprimées.',
            showCancelButton: true,
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler',
        }).then((result) => {
            if (!result.isConfirmed) return;
            destroy(route('examens.examens.destroy', id), {
                onSuccess: () =>
                    Swal.fire({
                        icon: 'success',
                        title: 'Examen supprimé',
                        timer: 1200,
                        showConfirmButton: false,
                    }),
            });
        });
    };

    const filteredExamens = useMemo(() => {
        const query = normalizeText(searchTerm.trim());

        return examens.filter((examen) => {
            const moduleData = modulesById.get(String(examen.id_module));
            const moduleSemestres = moduleData?.semestres || [];
            const searchableValues = [
                examen.module?.nom_module,
                examen.module?.code_module,
                examen.element?.nom_element,
                examen.element?.code_element,
                examen.session_examen?.nom_session,
                examen.session_examen?.type_session,
                examen.offre_formation?.section?.nom_section,
                examen.offre_formation?.section?.langue,
                examen.salle?.nom_salle,
                examen.salle?.code_salle,
                examen.statut,
                examen.description,
                examen.date_examen,
                examen.date_debut,
                examen.date_fin,
            ];

            const matchesSearch =
                !query || searchableValues.some((value) => normalizeText(value).includes(query));
            const matchesSession =
                !sessionFilter || String(examen.id_session_examen) === String(sessionFilter);
            const matchesNiveau =
                !niveauFilter || moduleSemestres.some((sem) => String(sem.id_niveau) === String(niveauFilter));
            const matchesSemestre =
                !semestreFilter || moduleSemestres.some((sem) => String(sem.id_semestre) === String(semestreFilter));
            const matchesSection =
                !sectionFilter
                || String(examen.offre_formation?.id_section ?? examen.offre_formation?.section?.id_section ?? '') === String(sectionFilter);
            const matchesModule =
                !moduleFilter || String(examen.id_module) === String(moduleFilter);

            return matchesSearch && matchesSession && matchesNiveau && matchesSemestre && matchesSection && matchesModule;
        });
    }, [examens, moduleFilter, modulesById, niveauFilter, searchTerm, sectionFilter, semestreFilter, sessionFilter]);

    const hasActiveFilters =
        searchTerm.trim().length > 0 ||
        sessionFilter ||
        niveauFilter ||
        semestreFilter ||
        sectionFilter ||
        moduleFilter;

    return (
        <div className="rounded-xl border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-gray-700 dark:text-white dark:bg-gray-900">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Examens programmés</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {hasActiveFilters ? (
                            <>
                                {filteredExamens.length} / {examens.length} examens
                            </>
                        ) : (
                            `${examens.length} examens`
                        )}
                    </span>
                </div>
                <div className="w-full md:w-64">
                    <label htmlFor="examens-search" className="sr-only">
                        Rechercher un examen
                    </label>
                    <input
                        id="examens-search"
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Rechercher (module, session, salle...)"
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                    />
                </div>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <div>
                    <label
                        htmlFor="examens-session-filter"
                        className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                        Session
                    </label>
                    <select
                        id="examens-session-filter"
                        value={sessionFilter}
                        onChange={(event) => setSessionFilter(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                    >
                        <option value="">Toutes les sessions</option>
                        {sessions.map((session) => (
                            <option key={session.id_session_examen} value={session.id_session_examen}>
                                {formatSessionLabel(session)}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label
                        htmlFor="examens-niveau-filter"
                        className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                        Niveau
                    </label>
                    <select
                        id="examens-niveau-filter"
                        value={niveauFilter}
                        onChange={(event) => setNiveauFilter(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                    >
                        <option value="">Tous les niveaux</option>
                        {niveaux.map((niveau) => (
                            <option key={niveau.id_niveau} value={niveau.id_niveau}>
                                {niveau.nom_niveau}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label
                        htmlFor="examens-semestre-filter"
                        className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                        Semestre
                    </label>
                    <select
                        id="examens-semestre-filter"
                        value={semestreFilter}
                        onChange={(event) => setSemestreFilter(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                    >
                        <option value="">Tous les semestres</option>
                        {filteredListSemestres.map((semestre) => (
                            <option key={semestre.id_semestre} value={semestre.id_semestre}>
                                {semestre.nom_semestre}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label
                        htmlFor="examens-section-filter"
                        className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                        Section
                    </label>
                    <select
                        id="examens-section-filter"
                        value={sectionFilter}
                        onChange={(event) => setSectionFilter(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                    >
                        <option value="">Toutes les sections</option>
                        {filteredListSections.map((section) => (
                            <option key={section.id_section} value={section.id_section}>
                                {formatSectionLabel(section)}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label
                        htmlFor="examens-module-filter"
                        className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                        Module
                    </label>
                    <select
                        id="examens-module-filter"
                        value={moduleFilter}
                        onChange={(event) => setModuleFilter(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                    >
                        <option value="">Tous les modules</option>
                        {filteredListModules.map((module) => (
                            <option key={module.id_module} value={module.id_module}>
                                {formatModuleLabel(module)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-end">
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            setSessionFilter('');
                            setNiveauFilter('');
                            setSemestreFilter('');
                            setSectionFilter('');
                            setModuleFilter('');
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                        Reinitialiser
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/40">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Module
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Session
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Salle
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Horaires
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Statut
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Répartitions
                            </th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredExamens.map((examen) => (
                            <tr key={examen.id_examen} className="text-sm text-gray-700 dark:text-gray-200">
                                <td className="px-4 py-3 font-medium">
                                    <div>{formatExamLabel(examen)}</div>
                                    <div className="text-xs text-gray-500">
                                        {examen.element ? 'Examen par element' : (examen.module?.code_module ?? '')}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div>{examen.session_examen?.nom_session ?? '—'}</div>
                                    <div className="text-xs text-gray-500">{examen.session_examen?.type_session}</div>
                                </td>
                                <td className="px-4 py-3">
                                    {examen.salle ? (
                                        <>
                                            <div>{examen.salle.nom_salle}</div>
                                            <div className="text-xs text-gray-500">
                                                {examen.salle.code_salle} • {examen.salle.capacite_examens} places
                                            </div>
                                        </>
                                    ) : (
                                        <span className="text-xs text-gray-500">Non assignée</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div>{formatDate(examen.date_examen)}</div>
                                    <div className="text-xs text-gray-500">
                                        {formatDateTime(examen.date_debut)} → {formatDateTime(examen.date_fin)}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                            statusTone[examen.statut] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700'
                                        }`}
                                    >
                                        {examen.statut}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {examen.repartitions_count}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openModal(examen)}
                                            className="rounded-full p-2 text-indigo-600 transition hover:bg-indigo-50 dark:hover:bg-gray-700"
                                            title="Modifier"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(examen.id_examen)}
                                            className="rounded-full p-2 text-red-600 transition hover:bg-red-50 dark:hover:bg-gray-700"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredExamens.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                    {hasActiveFilters
                                        ? 'Aucun examen ne correspond aux filtres selectionnes.'
                                        : 'Aucun examen planifie pour l\'instant.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-4">
                    <div className="flex min-h-full items-start justify-center">
                        <div className="my-3 flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800 dark:text-white sm:my-6 sm:max-h-[calc(100vh-3rem)]">
                        <div className="mb-0 flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-gray-700 sm:px-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Modifier l’examen</h3>
                            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-200">
                                ×
                            </button>
                        </div>

                        <div className="overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
                        <form onSubmit={handleUpdate} className="min-w-0 space-y-4 pt-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Session</label>
                                    <select
                                        value={data.id_session_examen}
                                        onChange={(e) => setData('id_session_examen', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    >
                                        <option value="">Sélectionner</option>
                                        {sessions.map((session) => (
                                            <option key={session.id_session_examen} value={session.id_session_examen}>
                                                {formatSessionLabel(session)}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedSession && (
                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            Type de session : <span className="font-semibold text-gray-700 dark:text-gray-200">{selectedSession.type_session}</span>
                                        </p>
                                    )}
                                    <InputError message={errors.id_session_examen} className="mt-1" />
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Niveau</label>
                                        <select
                                            value={editSelectedNiveau}
                                            onChange={(e) => {
                                                setEditSelectedNiveau(e.target.value);
                                                setEditSelectedSemestre('');
                                            }}
                                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                        >
                                            <option value="">Tous</option>
                                            {niveaux.map((niveau) => (
                                                <option key={niveau.id_niveau} value={niveau.id_niveau}>
                                                    {niveau.nom_niveau}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Semestre</label>
                                        <select
                                            value={editSelectedSemestre}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setEditSelectedSemestre(value);
                                                if (value && !editSelectedNiveau) {
                                                    const sem = semestres.find(
                                                        (item) => String(item.id_semestre) === value,
                                                    );
                                                    if (sem?.id_niveau) {
                                                        setEditSelectedNiveau(String(sem.id_niveau));
                                                    }
                                                }
                                            }}
                                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                        >
                                            <option value="">Tous</option>
                                            {filteredEditSemestres.map((semestre) => (
                                                <option key={semestre.id_semestre} value={semestre.id_semestre}>
                                                    {semestre.nom_niveau ? `${semestre.nom_niveau} - ` : ''}
                                                    {semestre.nom_semestre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Section</label>
                                        <select
                                            value={data.section_id}
                                            onChange={(e) => setData('section_id', e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                        >
                                            <option value="">Toutes</option>
                                            {filteredEditSections.map((section) => (
                                                <option key={section.id_section} value={section.id_section}>
                                                    {formatSectionLabel(section)}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError message={errors.section_id} className="mt-1" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Module</label>
                                    <select
                                        value={data.id_module}
                                        onChange={(e) => {
                                            setData('id_module', e.target.value);
                                        }}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    >
                                        <option value="">Sélectionner</option>
                                        {filteredEditModules.map((module) => (
                                            <option key={module.id_module} value={module.id_module}>
                                                {formatModuleLabel(module)}
                                            </option>
                                        ))}
                                    </select>
                                    {data.id_session_examen && data.id_module && (
                                        <p
                                            className={`mt-2 text-xs ${
                                                studentCountError ? 'text-red-600 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'
                                            }`}
                                        >
                                            {studentCountLoading
                                                ? "Chargement de l'effectif..."
                                                : studentCountError
                                                  ? studentCountError
                                                  : `${eligibleStudentCount ?? 0} etudiant(s) concernes par cet examen.`}
                                        </p>
                                    )}
                                    <InputError message={errors.id_module} className="mt-1" />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-1">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Anonymat debut</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={eligibleStudentCount || undefined}
                                        value={data.anonymat_start}
                                        onChange={(e) => setData('anonymat_start', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                        placeholder="Ex: 1"
                                    />
                                    <InputError message={errors.anonymat_start} className="mt-1" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Laissez vide pour commencer a 1. La numerotation couvrira tous les etudiants du module puis reviendra aux numeros laisses de cote.
                                    </p>
                                    {eligibleStudentCount !== null && anonymatPreviewEnd !== null && (
                                        <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-300">
                                            {eligibleStudentCount} anonymats seront generes: debut {normalizedAnonymatStart}, fin {anonymatPreviewEnd}
                                            {normalizedAnonymatStart > 1 ? ', avec retour a 1 apres le dernier numero.' : '.'}
                                        </p>
                                    )}
                                    {anonymatPreviewSequence.length > 0 && (
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Apercu: {anonymatPreviewSequence.join(', ')}
                                            {eligibleStudentCount > anonymatPreviewSequence.length ? ', ...' : ''}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">
                                        Ordre des etudiants
                                    </label>
                                    <select
                                        value={data.student_order}
                                        onChange={(e) => setData('student_order', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    >
                                        {studentOrderOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.student_order} className="mt-1" />
                                </div>
                                <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/70 p-3 text-xs text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-950/30 dark:text-indigo-100">
                                    {studentOrderOptions.find((option) => option.value === data.student_order)?.description}
                                    <div className="mt-1 text-indigo-700/90 dark:text-indigo-200/90">
                                        Les etudiants en credit restent regroupes dans la derniere salle pour respecter la logique actuelle.
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Salles</label>
                                <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-900/40">
                                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                                        <div>
                                            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Ajouter une salle
                                            </label>
                                            <select
                                                value={pendingSalleId}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setPendingSalleId(value);
                                                    addSalle(value);
                                                }}
                                                disabled={!availableSalles.length}
                                                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                                            >
                                                <option value="">
                                                    {availableSalles.length ? 'Selectionnez une salle' : 'Toutes les salles sont deja ajoutees'}
                                                </option>
                                                {availableSalles.map((salle) => (
                                                    <option key={salle.id_salle} value={String(salle.id_salle)}>
                                                        {(salle.code_salle || salle.nom_salle) +
                                                            (salle.nom_salle && salle.code_salle ? ` - ${salle.nom_salle}` : '') +
                                                            ` - Capacite ${salle.capacite_examens ?? salle.capacite ?? 0}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm dark:border-indigo-500/40 dark:bg-gray-800">
                                            <div className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                                                Salles selectionnees
                                            </div>
                                            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                                {selectedSalles.length}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-gray-800">
                                            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Etudiants eligibles
                                            </div>
                                            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                                {studentCountLoading ? '...' : eligibleStudentCount ?? '--'}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-gray-800">
                                            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Etudiants a couvrir
                                            </div>
                                            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                                {targetStudentCount ?? '--'}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm dark:border-emerald-500/40 dark:bg-gray-800">
                                            <div className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                                                Capacite selectionnee
                                            </div>
                                            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                                {totalSelectedCapacity}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm dark:border-amber-500/40 dark:bg-gray-800">
                                            <div className="text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-300">
                                                Restant a couvrir
                                            </div>
                                            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                                {remainingStudentsForCapacity ?? '--'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                        {!data.id_session_examen || !data.id_module ? (
                                            <p>Selectionnez d abord une session et un module pour charger l effectif reel.</p>
                                        ) : studentCountError ? (
                                            <p className="text-red-500 dark:text-red-300">{studentCountError}</p>
                                        ) : (
                                            <>
                                                <p>La capacite des salles est soustraite automatiquement du nombre d etudiants a couvrir.</p>
                                                {eligibleStudentCount !== null && anonymatPreviewEnd !== null && (
                                                    <p>
                                                        Numerotation active: {normalizedAnonymatStart} jusqu a {anonymatPreviewEnd}
                                                        {normalizedAnonymatStart > anonymatPreviewEnd ? ', puis retour a 1.' : '.'}
                                                    </p>
                                                )}
                                                {spareSelectedCapacity > 0 && (
                                                    <p className="text-emerald-600 dark:text-emerald-300">
                                                        {spareSelectedCapacity} place(s) restent libres avec les salles actuelles.
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {selectedSalles.length > 0 ? (
                                        <div className="mt-4 grid gap-3">
                                            {selectedSalles.map((salle, index) => (
                                                <div
                                                    key={salle.id_salle}
                                                    className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:grid-cols-[40px_minmax(0,1fr)_auto]"
                                                >
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-100">
                                                        {index + 1}
                                                    </div>
                                                    <div className="grid gap-2 md:grid-cols-2">
                                                        <div>
                                                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                                Salle
                                                            </label>
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value={salle.nom_salle || salle.code_salle || `Salle ${salle.id_salle}`}
                                                                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                                Details
                                                            </label>
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value={`${salle.code_salle || 'Sans code'} • Capacite ${salle.capacite_examens ?? salle.capacite ?? 'N/C'}`}
                                                                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSalle(String(salle.id_salle))}
                                                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-950/30"
                                                        >
                                                            Retirer
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white/70 px-4 py-5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
                                            Aucune salle ajoutee. Selectionnez une salle dans la liste ci-dessus pour l ajouter.
                                        </div>
                                    )}
                                </div>
                                <InputError message={errors.salles} className="mt-1" />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Date</label>
                                    <input
                                        type="date"
                                        value={data.date_examen}
                                        onChange={(e) => setData('date_examen', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    />
                                    <InputError message={errors.date_examen} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Statut</label>
                                    <select
                                        value={data.statut}
                                        onChange={(e) => setData('statut', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    >
                                        {statuts.map((statut) => (
                                            <option key={statut} value={statut}>
                                                {statut}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.statut} className="mt-1" />
                                </div>
                            </div>

                            <div className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Repartition par salle (optionnel)</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Laissez vide pour l&apos;equilibrage automatique. Renseignez un nombre pour imposer l&apos;effectif par salle.
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={autoDistributeSelectedSalles}
                                            disabled={!selectedSalles.length}
                                            className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/40 dark:text-indigo-100 dark:hover:bg-indigo-900/40"
                                        >
                                            Equilibrer
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAllocations({})}
                                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                        >
                                            Vider
                                        </button>
                                    </div>
                                </div>

                                {selectedSalles.length > 0 ? (
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        {selectedSalles.map((salle) => (
                                            <div key={salle.id_salle} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                                    {salle.nom_salle} ({salle.code_salle})
                                                </div>
                                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    Capacite : {salle.capacite_examens ?? salle.capacite ?? 'N/C'}
                                                </div>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={allocations[String(salle.id_salle)] ?? ''}
                                                    onChange={(e) =>
                                                        setAllocations((prev) => ({
                                                            ...prev,
                                                            [String(salle.id_salle)]: e.target.value,
                                                        }))
                                                    }
                                                    className="mt-2 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                                    placeholder="Ex: 80"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                        Choisissez des salles pour definir la repartition.
                                    </p>
                                )}
                                <InputError message={errors.repartition_salles} className="mt-2" />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Début</label>
                                    <input
                                        type="time"
                                        value={data.date_debut}
                                        onChange={(e) => setData('date_debut', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    />
                                    <InputError message={errors.date_debut} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Fin</label>
                                    <input
                                        type="time"
                                        value={data.date_fin}
                                        onChange={(e) => setData('date_fin', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                    />
                                    <InputError message={errors.date_fin} className="mt-1" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Notes</label>
                                <textarea
                                    rows={3}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:text-white"
                                />
                                <InputError message={errors.description} className="mt-1" />
                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 sm:w-auto"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-70 sm:w-auto"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                        </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
