import { useEffect, useMemo, useState } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import InputError from '@/Components/InputError';
import { studentOrderOptions } from './studentOrderOptions';
import { combineDateAndTime } from './dateTimeFields';

export default function PlanifierForm({
    sessions,
    modules,
    salles,
    statuts,
    semestres = [],
    niveaux = [],
    onSuccess,
    onCancel,
    asCard = true,
    hideTitle = false,
}) {
    const formatSessionLabel = (session) => {
        const parts = [session.nom_session];

        if (session.type_session) {
            parts.push(session.type_session);
        }

        parts.push(
            session.date_session_examen
                ? new Date(session.date_session_examen).toLocaleDateString()
                : 'Date a confirmer',
        );

        return parts.join(' - ');
    };
    const formatModuleLabel = (module) => [module.code_module, module.nom_module].filter(Boolean).join(' - ');

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        id_session_examen: '',
        id_module: '',
        id_element: '',
        plan_all_filtered_modules: false,
        module_ids: [],
        module_plannings: [],
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
    const [selectedNiveau, setSelectedNiveau] = useState('');
    const [selectedSemestre, setSelectedSemestre] = useState('');
    const [allocations, setAllocations] = useState({});
    const [pendingSalleId, setPendingSalleId] = useState('');
    const [eligibleStudentCount, setEligibleStudentCount] = useState(null);
    const [studentCountLoading, setStudentCountLoading] = useState(false);
    const [studentCountError, setStudentCountError] = useState('');
    const [studentCountCache, setStudentCountCache] = useState({});
    const [bulkStudentStats, setBulkStudentStats] = useState(null);
    const [bulkStudentCountLoading, setBulkStudentCountLoading] = useState(false);
    const [bulkStudentCountError, setBulkStudentCountError] = useState('');
    const [bulkStudentCountCache, setBulkStudentCountCache] = useState({});

    const filteredSemestres = useMemo(
        () => semestres.filter((sem) => !selectedNiveau || String(sem.id_niveau) === String(selectedNiveau)),
        [semestres, selectedNiveau],
    );

    const filteredModules = useMemo(() => {
        return modules.filter((module) => {
            const sems = module.semestres || [];
            const matchesNiveau =
                !selectedNiveau || sems.some((sem) => String(sem.id_niveau) === String(selectedNiveau));
            const matchesSemestre =
                !selectedSemestre || sems.some((sem) => String(sem.id_semestre) === String(selectedSemestre));
            return matchesNiveau && matchesSemestre;
        });
    }, [modules, selectedNiveau, selectedSemestre]);
    const isBulkPlanning = Boolean(data.plan_all_filtered_modules);
    const canPlanFilteredModules = Boolean(selectedNiveau && selectedSemestre && filteredModules.length > 0);
    const bulkModulePreview = useMemo(() => filteredModules.slice(0, 4), [filteredModules]);
    const bulkStudentCountModuleIds = useMemo(
        () =>
            filteredModules
                .map((module) => Number(module.id_module))
                .filter((moduleId) => Number.isInteger(moduleId) && moduleId > 0)
                .sort((left, right) => left - right),
        [filteredModules],
    );
    const totalBulkExamCount = filteredModules.length;
    const bulkStudentCountsByModuleId = useMemo(() => {
        const counts = {};

        (bulkStudentStats?.modules || []).forEach((entry) => {
            counts[String(entry.id_module)] = Number(entry.count ?? 0);
        });

        return counts;
    }, [bulkStudentStats]);
    const bulkAffectedStudentCount = bulkStudentStats?.unique_count ?? null;
    const bulkMaxStudentCount = useMemo(
        () =>
            Object.values(bulkStudentCountsByModuleId).reduce(
                (max, current) => Math.max(max, Number(current) || 0),
                0,
            ),
        [bulkStudentCountsByModuleId],
    );
    const bulkMinStudentCount = useMemo(() => {
        const counts = Object.values(bulkStudentCountsByModuleId)
            .map((count) => Number(count) || 0)
            .filter((count) => count > 0);

        if (!counts.length) {
            return null;
        }

        return counts.reduce((min, current) => Math.min(min, current), counts[0]);
    }, [bulkStudentCountsByModuleId]);
    const selectedSalles = useMemo(
        () => salles.filter((salle) => data.salles.includes(String(salle.id_salle))),
        [salles, data.salles],
    );
    const availableSalles = useMemo(
        () => salles.filter((salle) => !data.salles.includes(String(salle.id_salle))),
        [salles, data.salles],
    );
    const selectedSession = useMemo(
        () => sessions.find((session) => String(session.id_session_examen) === String(data.id_session_examen)),
        [sessions, data.id_session_examen],
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
        const moduleExists = filteredModules.some((mod) => String(mod.id_module) === String(data.id_module));
        if (!moduleExists) {
            setData('id_module', '');
        }
    }, [filteredModules, data.id_module, setData]);

    useEffect(() => {
        if (data.plan_all_filtered_modules && !canPlanFilteredModules) {
            setData('plan_all_filtered_modules', false);
        }
    }, [canPlanFilteredModules, data.plan_all_filtered_modules, setData]);

    useEffect(() => {
        if (!data.plan_all_filtered_modules) {
            return;
        }

        const planningByModule = new Map(
            (data.module_plannings || []).map((planning) => [String(planning.id_module), planning]),
        );
        const nextPlannings = filteredModules.map((module) => {
            const existing = planningByModule.get(String(module.id_module));

            return {
                id_module: Number(module.id_module),
                date_examen: existing?.date_examen ?? data.date_examen ?? '',
                date_debut: existing?.date_debut ?? data.date_debut ?? '',
                date_fin: existing?.date_fin ?? data.date_fin ?? '',
            };
        });

        if (JSON.stringify(nextPlannings) !== JSON.stringify(data.module_plannings || [])) {
            setData('module_plannings', nextPlannings);
        }
    }, [
        data.date_debut,
        data.date_examen,
        data.date_fin,
        data.module_plannings,
        data.plan_all_filtered_modules,
        filteredModules,
        setData,
    ]);

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
        if (isBulkPlanning) {
            setEligibleStudentCount(null);
            setStudentCountLoading(false);
            setStudentCountError('');
            return;
        }

        if (!data.id_session_examen || !data.id_module) {
            setEligibleStudentCount(null);
            setStudentCountLoading(false);
            setStudentCountError('');
            return;
        }

        const cacheKey = `${data.id_session_examen}:${data.id_module}`;
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
    }, [data.id_module, data.id_session_examen, isBulkPlanning, studentCountCache]);

    useEffect(() => {
        if (!isBulkPlanning) {
            setBulkStudentStats(null);
            setBulkStudentCountLoading(false);
            setBulkStudentCountError('');
            return;
        }

        if (!data.id_session_examen || bulkStudentCountModuleIds.length === 0) {
            setBulkStudentStats(null);
            setBulkStudentCountLoading(false);
            setBulkStudentCountError('');
            return;
        }

        const cacheKey = `${data.id_session_examen}:${bulkStudentCountModuleIds.join(',')}`;
        if (bulkStudentCountCache[cacheKey] !== undefined) {
            setBulkStudentStats(bulkStudentCountCache[cacheKey]);
            setBulkStudentCountLoading(false);
            setBulkStudentCountError('');
            return;
        }

        const controller = new AbortController();
        setBulkStudentCountLoading(true);
        setBulkStudentCountError('');

        fetch(
            route('examens.planning.student-count', {
                id_session_examen: data.id_session_examen,
                module_ids: bulkStudentCountModuleIds,
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
                    throw new Error('bulk-count-fetch-failed');
                }

                return response.json();
            })
            .then((payload) => {
                setBulkStudentStats(payload);
                setBulkStudentCountCache((current) => ({
                    ...current,
                    [cacheKey]: payload,
                }));
            })
            .catch((error) => {
                if (error.name === 'AbortError') {
                    return;
                }

                setBulkStudentStats(null);
                setBulkStudentCountError('Impossible de charger l effectif pour les modules selectionnes.');
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setBulkStudentCountLoading(false);
                }
            });

        return () => controller.abort();
    }, [bulkStudentCountCache, bulkStudentCountModuleIds, data.id_session_examen, isBulkPlanning]);

    useEffect(() => {
        transform((currentData) => ({
            ...currentData,
            id_module: currentData.plan_all_filtered_modules ? '' : currentData.id_module,
            id_element: '',
            module_ids: currentData.plan_all_filtered_modules
                ? (currentData.module_plannings || []).map((planning) => Number(planning.id_module))
                : [],
            module_plannings: currentData.plan_all_filtered_modules
                ? (currentData.module_plannings || []).map((planning) => ({
                      id_module: Number(planning.id_module),
                      date_examen: planning.date_examen || '',
                      date_debut: combineDateAndTime(planning.date_examen, planning.date_debut),
                      date_fin: combineDateAndTime(planning.date_examen, planning.date_fin),
                  }))
                : [],
            anonymat_start: currentData.anonymat_start,
            anonymat_end: '',
            date_debut: combineDateAndTime(currentData.date_examen, currentData.date_debut),
            date_fin: combineDateAndTime(currentData.date_examen, currentData.date_fin),
            repartition_salles: currentData.plan_all_filtered_modules
                ? []
                : (currentData.salles || [])
                      .map((id) => {
                          const value = allocations[id];
                          return {
                              id_salle: Number(id),
                              nombre: value ? Number(value) : null,
                          };
                      })
                      .filter((row) => row.nombre),
        }));
    }, [allocations, data.plan_all_filtered_modules, data.salles, filteredModules, transform]);

    const updateModulePlanning = (index, field, value) => {
        setData(
            'module_plannings',
            data.module_plannings.map((planning, planningIndex) =>
                planningIndex === index
                    ? {
                          ...planning,
                          [field]: value,
                      }
                    : planning,
            ),
        );
    };

    const planningFieldError = (index, field) => errors[`module_plannings.${index}.${field}`];

    const handleSemestreChange = (value) => {
        setSelectedSemestre(value);
        if (value && !selectedNiveau) {
            const sem = semestres.find((s) => String(s.id_semestre) === value);
            if (sem?.id_niveau) {
                setSelectedNiveau(String(sem.id_niveau));
            }
        }
    };

    const autoDistribute = () => {
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

    const submit = (event) => {
        event.preventDefault();
        const successTitle =
            data.plan_all_filtered_modules && totalBulkExamCount > 1
                ? `${totalBulkExamCount} examens planifies`
                : 'Examen planifie';

        post(route('examens.examens.store'), {
            onSuccess: () => {
                reset();
                setPendingSalleId('');
                onSuccess?.();
                Swal.fire({
                    icon: 'success',
                    title: successTitle,
                    timer: 1500,
                    showConfirmButton: false,
                });
            },
        });
    };

    const formBody = (
        <form onSubmit={submit} className="mt-4 min-w-0 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Session</label>
                    <select
                        value={data.id_session_examen}
                        onChange={(e) => setData('id_session_examen', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                    >
                        <option value="">Selectionner</option>
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Niveau</label>
                        <select
                            value={selectedNiveau}
                            onChange={(e) => {
                                setSelectedNiveau(e.target.value);
                                setSelectedSemestre('');
                            }}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Semestre</label>
                        <select
                            value={selectedSemestre}
                            onChange={(e) => handleSemestreChange(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        >
                            <option value="">Tous</option>
                            {filteredSemestres.map((semestre) => (
                                <option key={semestre.id_semestre} value={semestre.id_semestre}>
                                    {semestre.nom_niveau ? `${semestre.nom_niveau} - ` : ''}
                                    {semestre.nom_semestre}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Module</label>
                    <select
                        value={data.id_module}
                        onChange={(e) => setData('id_module', e.target.value)}
                        disabled={isBulkPlanning}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                    >
                        <option value="">Selectionner</option>
                        {filteredModules.map((module) => (
                            <option key={module.id_module} value={module.id_module}>
                                {formatModuleLabel(module)}
                            </option>
                        ))}
                    </select>
                    {!isBulkPlanning && <InputError message={errors.id_module} className="mt-1" />}
                    {!isBulkPlanning && data.id_session_examen && data.id_module && (
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
                    <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-500/30 dark:bg-indigo-950/30">
                        <label className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={isBulkPlanning}
                                disabled={!canPlanFilteredModules}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setData('plan_all_filtered_modules', checked);
                                    if (checked) {
                                        setData('id_module', '');
                                    }
                                }}
                                className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900"
                            />
                            <span>
                                <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                                    Planifier tous les modules du niveau et du semestre
                                </span>
                                <span className="mt-1 block text-xs text-gray-600 dark:text-gray-300">
                                    {canPlanFilteredModules
                                        ? `${filteredModules.length} modules seront planifies en une seule action.`
                                        : 'Choisissez d abord un niveau et un semestre contenant des modules.'}
                                </span>
                            </span>
                        </label>
                        {isBulkPlanning && (
                            <div className="mt-3 space-y-2">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-lg border border-indigo-200 bg-white px-3 py-2 dark:border-indigo-500/30 dark:bg-gray-900">
                                        <div className="text-[11px] font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                                            Etudiants concernes
                                        </div>
                                        <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
                                            {bulkStudentCountLoading ? '...' : bulkAffectedStudentCount ?? '--'}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-indigo-200 bg-white px-3 py-2 dark:border-indigo-500/30 dark:bg-gray-900">
                                        <div className="text-[11px] font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                                            Module le plus charge
                                        </div>
                                        <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
                                            {bulkStudentCountLoading
                                                ? '...'
                                                : bulkStudentStats
                                                  ? bulkMaxStudentCount
                                                  : '--'}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-indigo-200 bg-white px-3 py-2 dark:border-indigo-500/30 dark:bg-gray-900">
                                        <div className="text-[11px] font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                                            Examens generes
                                        </div>
                                        <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
                                            {totalBulkExamCount}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className={`text-xs ${
                                        bulkStudentCountError
                                            ? 'text-red-600 dark:text-red-300'
                                            : 'text-gray-600 dark:text-gray-300'
                                    }`}
                                >
                                    {!data.id_session_examen
                                        ? 'Selectionnez d abord une session pour calculer l effectif concerne.'
                                        : bulkStudentCountError
                                          ? bulkStudentCountError
                                          : 'Les effectifs ci-dessous sont calcules pour tous les modules du niveau, du semestre et de la filiere en cours.'}
                                </div>
                                <div className="text-xs font-medium text-indigo-700 dark:text-indigo-200">
                                    Modules concernes
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {bulkModulePreview.map((module) => (
                                        <span
                                            key={module.id_module}
                                            className="rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/40 dark:bg-gray-900 dark:text-indigo-100"
                                        >
                                            {formatModuleLabel(module)}
                                            {bulkStudentCountsByModuleId[String(module.id_module)] !== undefined
                                                ? ` - ${bulkStudentCountsByModuleId[String(module.id_module)]} etudiant(s)`
                                                : ''}
                                        </span>
                                    ))}
                                    {filteredModules.length > bulkModulePreview.length && (
                                        <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                            +{filteredModules.length - bulkModulePreview.length} autres
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <InputError message={errors.module_ids} className="mt-1" />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Ordre des etudiants
                    </label>
                    <select
                        value={data.student_order}
                        onChange={(e) => setData('student_order', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
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

            <div className="grid gap-4 sm:grid-cols-1">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        {isBulkPlanning ? 'Anonymat debut commun' : 'Anonymat debut'}
                    </label>
                    <input
                        type="number"
                        min="1"
                        max={!isBulkPlanning ? eligibleStudentCount || undefined : undefined}
                        value={data.anonymat_start}
                        onChange={(e) => setData('anonymat_start', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        placeholder="Ex: 1"
                    />
                    <InputError message={errors.anonymat_start} className="mt-1" />
                </div>
                <div>
                    {isBulkPlanning ? (
                        <>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Ce numero de debut sera applique a chaque examen cree pour les modules du semestre selectionne.
                            </p>
                            {bulkMinStudentCount !== null && (
                                <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-300">
                                    Pour rester valide sur tous les modules, choisissez une valeur entre 1 et {bulkMinStudentCount}.
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Choisissez seulement le numero de debut. La numerotation couvrira tous les etudiants du module puis reviendra aux numeros laisses de cote.
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
                        </>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Salles</label>
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

                    {!isBulkPlanning && (
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
                    )}

                    {!isBulkPlanning && (
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
                    )}

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
                                        {targetStudentCount !== null && (
                                            <div className="md:col-span-2 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-950/30 dark:text-indigo-100">
                                                {(() => {
                                                    const coveredAfterSalle = selectedSalles
                                                        .slice(0, index + 1)
                                                        .reduce(
                                                            (sum, currentSalle) =>
                                                                sum + Number(currentSalle.capacite_examens ?? currentSalle.capacite ?? 0),
                                                            0,
                                                        );
                                                    const remainingAfterSalle = Math.max(targetStudentCount - coveredAfterSalle, 0);

                                                    return `Apres cette salle: capacite cumulee ${coveredAfterSalle} • restant ${remainingAfterSalle}`;
                                                })()}
                                            </div>
                                        )}
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
                            Aucune salle ajoutee. Selectionnez une salle dans la liste ci-dessus pour l&apos;ajouter.
                        </div>
                    )}
                </div>
                <InputError message={errors.salles} className="mt-1" />
                {isBulkPlanning && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Les memes salles seront utilisees pour chaque examen cree. La repartition sera calculee separement pour chaque module.
                    </p>
                )}
            </div>

            {isBulkPlanning && (
                <div className="rounded-lg border border-dashed border-indigo-200 p-4 dark:border-indigo-500/40">
                    <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Dates par module</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Renseignez la date, l&apos;heure de debut et l&apos;heure de fin pour chaque module.
                        </p>
                    </div>

                    <div className="mt-3 space-y-3">
                        {data.module_plannings.map((planning, index) => {
                            const module = filteredModules.find(
                                (currentModule) => String(currentModule.id_module) === String(planning.id_module),
                            );

                            return (
                                <div
                                    key={planning.id_module}
                                    className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                                >
                                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        {module ? formatModuleLabel(module) : `Module ${planning.id_module}`}
                                    </div>
                                    {bulkStudentCountsByModuleId[String(planning.id_module)] !== undefined && (
                                        <div className="mt-1 text-xs text-indigo-600 dark:text-indigo-300">
                                            {bulkStudentCountsByModuleId[String(planning.id_module)]} etudiant(s) concernes
                                            pour ce module.
                                            {(() => {
                                                const moduleStudentCount = Number(
                                                    bulkStudentCountsByModuleId[String(planning.id_module)] ?? 0,
                                                );

                                                if (moduleStudentCount < 1) {
                                                    return '';
                                                }

                                                const moduleAnonymatEnd =
                                                    ((normalizedAnonymatStart + moduleStudentCount - 2) % moduleStudentCount) + 1;

                                                return ` Anonymats: debut ${normalizedAnonymatStart}, fin ${moduleAnonymatEnd}.`;
                                            })()}
                                        </div>
                                    )}
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        <div>
                                            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Date
                                            </label>
                                            <input
                                                type="date"
                                                value={planning.date_examen}
                                                onChange={(e) => updateModulePlanning(index, 'date_examen', e.target.value)}
                                                className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                            />
                                            <InputError message={planningFieldError(index, 'date_examen')} className="mt-1" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Debut
                                            </label>
                                            <input
                                                type="time"
                                                value={planning.date_debut}
                                                onChange={(e) => updateModulePlanning(index, 'date_debut', e.target.value)}
                                                className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                            />
                                            <InputError message={planningFieldError(index, 'date_debut')} className="mt-1" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Fin
                                            </label>
                                            <input
                                                type="time"
                                                value={planning.date_fin}
                                                onChange={(e) => updateModulePlanning(index, 'date_fin', e.target.value)}
                                                className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                            />
                                            <InputError message={planningFieldError(index, 'date_fin')} className="mt-1" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <InputError message={errors.module_plannings} className="mt-3" />
                </div>
            )}

            {!isBulkPlanning && (
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
                                onClick={autoDistribute}
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
                                        className="mt-2 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                        placeholder="Ex: 80"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Choisissez des salles pour definir la repartition.</p>
                    )}
                    <InputError message={errors.repartition_salles} className="mt-2" />
                </div>
            )}

            {!isBulkPlanning && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Date</label>
                        <input
                            type="date"
                            value={data.date_examen}
                            onChange={(e) => setData('date_examen', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        />
                        <InputError message={errors.date_examen} className="mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Debut</label>
                        <input
                            type="time"
                            value={data.date_debut}
                            onChange={(e) => setData('date_debut', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        />
                        <InputError message={errors.date_debut} className="mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Fin</label>
                        <input
                            type="time"
                            value={data.date_fin}
                            onChange={(e) => setData('date_fin', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        />
                        <InputError message={errors.date_fin} className="mt-1" />
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Statut</label>
                <select
                    value={data.statut}
                    onChange={(e) => setData('statut', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                >
                    {statuts.map((statut) => (
                        <option key={statut} value={statut}>
                            {statut}
                        </option>
                    ))}
                </select>
                <InputError message={errors.statut} className="mt-1" />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Notes</label>
                <textarea
                    rows={3}
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                    placeholder="Consignes, materiel requis, etc."
                />
                <InputError message={errors.description} className="mt-1" />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 sm:w-auto"
                    >
                        Annuler
                    </button>
                )}
                <button
                    type="submit"
                    disabled={processing}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                >
                    Programmer
                </button>
            </div>
        </form>
    );

    if (!asCard) {
        return (
            <div className="space-y-2">
                {!hideTitle && (
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Planifier un examen</h2>
                )}
                {formBody}
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800 sm:p-6">
            {!hideTitle && <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Planifier un examen</h2>}
            {formBody}
        </div>
    );
}
