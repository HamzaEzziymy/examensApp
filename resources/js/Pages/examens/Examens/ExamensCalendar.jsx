import { useMemo, useState, useEffect } from 'react';
import { router, useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import InputError from '@/Components/InputError';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { studentOrderOptions } from './studentOrderOptions';
import { combineDateAndTime, toInputDate, toInputTime } from './dateTimeFields';

const statusColors = {
    Planifiee: '#4f46e5',
    'En cours': '#d97706',
    Terminee: '#059669',
    Annulee: '#e11d48',
};

const pad = (num) => `${num}`.padStart(2, '0');

const formatLocalDate = (date) =>
    date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : '';

const formatLocalDateTime = (date) =>
    date ? `${formatLocalDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}` : '';

const formatTimeRange = (start, end) => {
    if (!start) return '';
    const startLabel = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
    if (!end) return startLabel;
    const endLabel = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
    if (startLabel === endLabel) return startLabel;
    return `${startLabel} - ${endLabel}`;
};

const getPrimarySalleLabel = (examen) => {
    if (!examen) return '';
    if (examen.salle?.code_salle || examen.salle?.nom_salle) {
        return examen.salle.code_salle ?? examen.salle.nom_salle ?? '';
    }
    const firstSalle = Array.isArray(examen.salles) ? examen.salles[0] : null;
    return firstSalle?.code_salle ?? firstSalle?.nom_salle ?? '';
};

const formatModuleLabel = (module) =>
    [module?.code_module, module?.nom_module].filter(Boolean).join(' - ');

const formatExamLabel = (examen) => formatModuleLabel(examen?.module) || 'Module';

const buildPayload = (source, overrides = {}) => ({
    id_session_examen: overrides.id_session_examen ?? source.id_session_examen ?? '',
    id_module: overrides.id_module ?? source.id_module ?? '',
    id_element: '',
    id_salle: overrides.id_salle ?? source.id_salle ?? '',
    salles: overrides.salles ?? source.salles ?? [],
    repartition_salles: overrides.repartition_salles ?? source.repartition_salles ?? [],
    anonymat_start: overrides.anonymat_start ?? source.anonymat_start ?? '',
    anonymat_end: '',
    student_order: overrides.student_order ?? source.student_order ?? 'alphabetic',
    date_examen: overrides.date_examen ?? toInputDate(source.date_examen ?? source.date_debut),
    date_debut: overrides.date_debut ?? source.date_debut ?? source.date_examen,
    date_fin: overrides.date_fin ?? source.date_fin ?? source.date_debut,
    statut: overrides.statut ?? source.statut ?? 'Planifiee',
    description: overrides.description ?? source.description ?? '',
});

export default function ExamensCalendar({
    examens,
    sessions,
    modules,
    salles,
    statuts,
    semestres = [],
    niveaux = [],
}) {
    const [editorOpen, setEditorOpen] = useState(false);
    const [selectedExam, setSelectedExam] = useState(null);
    const [allocations, setAllocations] = useState({});
    const [editSelectedNiveau, setEditSelectedNiveau] = useState('');
    const [editSelectedSemestre, setEditSelectedSemestre] = useState('');
    const [pendingSalleId, setPendingSalleId] = useState('');
    const [eligibleStudentCount, setEligibleStudentCount] = useState(null);
    const [studentCountLoading, setStudentCountLoading] = useState(false);
    const [studentCountError, setStudentCountError] = useState('');
    const [studentCountCache, setStudentCountCache] = useState({});
    const { data, setData, put, errors, processing, reset, transform } = useForm({
        id_examen: null,
        id_session_examen: '',
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
    const calendarEvents = useMemo(() => {
        const semesterByModule = new Map(
            (modules ?? []).map((module) => [
                String(module.id_module),
                module.semestres?.[0]?.nom_semestre ?? '',
            ]),
        );

        return examens.map((examen) => {
            const color = statusColors[examen.statut] ?? '#4b5563';
            const moduleName = formatExamLabel(examen);
            const semesterName = semesterByModule.get(String(examen.id_module)) || '';
            const title = [moduleName, semesterName].filter(Boolean).join(' - ');

            return {
                id: examen.id_examen,
                title,
                start: examen.date_debut ?? examen.date_examen,
                end: examen.date_fin ?? examen.date_debut,
                backgroundColor: color,
                borderColor: color,
                textColor: '#fff',
                extendedProps: {
                    examen,
                },
            };
        });
    }, [examens, modules]);
    const filteredEditSemestres = useMemo(
        () => semestres.filter((sem) => !editSelectedNiveau || String(sem.id_niveau) === String(editSelectedNiveau)),
        [semestres, editSelectedNiveau],
    );
    const filteredEditModules = useMemo(() => {
        return modules.filter((module) => {
            const sems = module.semestres || [];
            const matchesNiveau =
                !editSelectedNiveau || sems.some((sem) => String(sem.id_niveau) === String(editSelectedNiveau));
            const matchesSemestre =
                !editSelectedSemestre || sems.some((sem) => String(sem.id_semestre) === String(editSelectedSemestre));
            return matchesNiveau && matchesSemestre;
        });
    }, [modules, editSelectedNiveau, editSelectedSemestre]);

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
        const exists = filteredEditModules.some((module) => String(module.id_module) === String(data.id_module));
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

    useEffect(() => {
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
    }, [data.id_module, data.id_session_examen, studentCountCache]);

    const openEditor = (examen) => {
        const moduleData = modules.find((module) => String(module.id_module) === String(examen.id_module));
        const firstSem = moduleData?.semestres?.[0];
        setEditSelectedNiveau(firstSem?.id_niveau ? String(firstSem.id_niveau) : '');
        setEditSelectedSemestre(firstSem?.id_semestre ? String(firstSem.id_semestre) : '');
        setData({
            id_examen: examen.id_examen,
            id_session_examen: examen.id_session_examen ?? '',
            id_module: examen.id_module ?? '',
            id_element: '',
            id_salle: examen.id_salle ?? '',
            salles: (examen.salles || []).map((s) => String(s.id_salle)),
            anonymat_start: examen.anonymat_start ?? '',
            anonymat_end: '',
            student_order: examen.student_order ?? 'alphabetic',
            date_examen: toInputDate(examen.date_examen ?? examen.date_debut),
            date_debut: toInputTime(examen.date_debut),
            date_fin: toInputTime(examen.date_fin),
            statut: examen.statut ?? statuts[0],
            description: examen.description ?? '',
        });
        setAllocations({});
        setPendingSalleId('');
        setSelectedExam(examen);
        setEditorOpen(true);
    };

    const closeEditor = () => {
        setEditorOpen(false);
        setSelectedExam(null);
        setEditSelectedNiveau('');
        setEditSelectedSemestre('');
        setAllocations({});
        setPendingSalleId('');
        reset();
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!data.id_examen) return;

        put(route('examens.examens.update', data.id_examen), {
            preserveScroll: true,
            onSuccess: () => {
                closeEditor();
                Swal.fire({
                    icon: 'success',
                    title: 'Examen mis a jour',
                    timer: 1200,
                    showConfirmButton: false,
                });
            },
        });
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

    const handleDelete = () => {
        if (!selectedExam) return;
        Swal.fire({
            icon: 'warning',
            title: 'Supprimer cet examen ?',
            text: 'Les surveillances et repartitions associees seront aussi supprimees.',
            showCancelButton: true,
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler',
        }).then((result) => {
            if (!result.isConfirmed) return;
            router.delete(route('examens.examens.destroy', selectedExam.id_examen), {
                preserveScroll: true,
                onSuccess: () => {
                    closeEditor();
                    Swal.fire({
                        icon: 'success',
                        title: 'Examen supprime',
                        timer: 1200,
                        showConfirmButton: false,
                    });
                },
            });
        });
    };

    const persistChange = (info) => {
        const examen = info.event.extendedProps.examen;
        if (!examen) {
            info.revert();
            return;
        }

        const start = info.event.start;
        const end = info.event.end;
        let adjustedEnd = end;

        if (!adjustedEnd && start && examen?.date_debut && examen?.date_fin) {
            const originalStart = new Date(examen.date_debut);
            const originalEnd = new Date(examen.date_fin);
            const durationMs = originalEnd.getTime() - originalStart.getTime();

            if (Number.isFinite(durationMs) && durationMs > 0) {
                adjustedEnd = new Date(start.getTime() + durationMs);
            }
        }

        if (!adjustedEnd) {
            adjustedEnd = start;
        }

        const payload = buildPayload(examen, {
            date_examen: start ? formatLocalDate(start) : undefined,
            date_debut: start ? formatLocalDateTime(start) : undefined,
            date_fin: adjustedEnd ? formatLocalDateTime(adjustedEnd) : undefined,
        });

        router.put(route('examens.examens.update', examen.id_examen), payload, {
            preserveScroll: true,
            onError: () => {
                info.revert();
            },
            onSuccess: () => {
                Swal.fire({
                    toast: true,
                    timer: 1500,
                    showConfirmButton: false,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Horaire mis a jour',
                });
            },
        });
    };

    const renderEventContent = (info) => {
        const examen = info.event.extendedProps.examen;
        const timeRange = formatTimeRange(info.event.start, info.event.end);
        const salleLabel = getPrimarySalleLabel(examen);
        const statusLabel = examen?.statut ?? '';
        const metaText = [timeRange, salleLabel, statusLabel].filter(Boolean).join(' | ');

        return (
            <div className="min-w-0 px-1 py-0.5">
                <div className="truncate text-xs font-semibold leading-tight">{info.event.title || 'Examen'}</div>
                {metaText && <div className="mt-0.5 text-[11px] leading-tight opacity-90">{metaText}</div>}
            </div>
        );
    };

    const handleEventDidMount = (info) => {
        const examen = info.event.extendedProps.examen;
        const timeRange = formatTimeRange(info.event.start, info.event.end);
        const salleLabel = getPrimarySalleLabel(examen);
        const statusLabel = examen?.statut ?? '';
        const metaText = [timeRange, salleLabel, statusLabel].filter(Boolean).join(' | ');
        info.el.title = [info.event.title, metaText].filter(Boolean).join(' - ');
    };

    return (
        <div id="examens-calendar" className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Calendrier des examens </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Faites glisser les examens pour ajuster leurs creneaux ou cliquez pour consulter.
                    </p>
                </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span className="font-semibold text-gray-700 dark:text-gray-200">Statuts</span>
                {Object.entries(statusColors).map(([status, color]) => (
                    <span
                        key={status}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-2 py-0.5 dark:border-gray-700 dark:bg-gray-800/60"
                    >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-gray-700 dark:text-gray-200">{status}</span>
                    </span>
                ))}
            </div>

            <FullCalendar
                initialView="dayGridMonth"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}
                height="auto"
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                locale={frLocale}
                events={calendarEvents}
                editable
                selectable
                droppable={false}
                eventDisplay="block"
                eventClassNames={() => ['rounded-md', 'shadow-sm', 'ring-1', 'ring-white/30']}
                eventContent={renderEventContent}
                eventClick={(info) => openEditor(info.event.extendedProps.examen)}
                eventDrop={persistChange}
                eventResize={persistChange}
                eventDidMount={handleEventDidMount}
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                dayMaxEventRows
                nowIndicator
            />

            {editorOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
                    <div className="flex min-h-full items-start justify-center p-3 sm:p-4 lg:p-6">
                    <div className="my-3 flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800 sm:my-6 sm:max-h-[calc(100vh-3rem)]">
                        <div className="mb-0 flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-gray-700 sm:px-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Details / modification</h3>
                                {selectedExam && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {formatExamLabel(selectedExam)} - {selectedExam.session_examen?.nom_session}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={closeEditor}
                                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                x
                            </button>
                        </div>

                        <div className="overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
                        {selectedExam && (
                            <div className="mb-4 mt-4 grid gap-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-700/40 dark:text-gray-200 sm:grid-cols-2 xl:grid-cols-3">
                                <div>
                                    <p className="font-semibold">Session</p>
                                    <p>{selectedExam.session_examen?.nom_session ?? '-'}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Module</p>
                                    <p>{formatExamLabel(selectedExam)}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Salle</p>
                                    <p>{selectedExam.salle?.nom_salle ?? 'Non assignee'}</p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="grid min-w-0 gap-4 lg:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Session</label>
                                <select
                                    value={data.id_session_examen}
                                    onChange={(event) => setData('id_session_examen', event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                >
                                    <option value="">Selectionner</option>
                                    {sessions.map((session) => (
                                        <option key={session.id_session_examen} value={session.id_session_examen}>
                                            {session.nom_session} - {session.type_session}
                                        </option>
                                    ))}
                                </select>
                                {selectedSession && (
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Type de session :{' '}
                                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                                            {selectedSession.type_session}
                                        </span>
                                    </p>
                                )}
                                <InputError message={errors.id_session_examen} className="mt-1" />
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Niveau</label>
                                    <select
                                        value={editSelectedNiveau}
                                        onChange={(event) => {
                                            setEditSelectedNiveau(event.target.value);
                                            setEditSelectedSemestre('');
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
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Semestre</label>
                                    <select
                                        value={editSelectedSemestre}
                                        onChange={(event) => {
                                            const value = event.target.value;
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
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
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
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Module</label>
                                <select
                                    value={data.id_module}
                                    onChange={(event) => {
                                        setData('id_module', event.target.value);
                                    }}
                                    className="mt-1 min-h-[8rem] w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                >
                                    <option value="">Selectionner</option>
                                    {filteredEditModules.map((module) => (
                                        <option key={module.id_module} value={module.id_module}>
                                            {module.code_module} - {module.nom_module}
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
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Statut</label>
                                <select
                                    value={data.statut}
                                    onChange={(event) => setData('statut', event.target.value)}
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

                            <div className="lg:col-span-2 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Anonymat debut</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={eligibleStudentCount || undefined}
                                        value={data.anonymat_start}
                                        onChange={(event) => setData('anonymat_start', event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                        placeholder="Ex: 1"
                                    />
                                    <InputError message={errors.anonymat_start} className="mt-1" />
                                </div>
                                <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/70 p-3 text-xs text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-950/30 dark:text-indigo-100">
                                    <p>
                                        Choisissez seulement le numero de debut. La numerotation couvrira tous les etudiants du module puis reviendra aux numeros laisses de cote.
                                    </p>
                                    {eligibleStudentCount !== null && anonymatPreviewEnd !== null && (
                                        <p className="mt-1 font-medium text-indigo-700 dark:text-indigo-200">
                                            {eligibleStudentCount} anonymats seront generes: debut {normalizedAnonymatStart}, fin {anonymatPreviewEnd}
                                            {normalizedAnonymatStart > 1 ? ', avec retour a 1 apres le dernier numero.' : '.'}
                                        </p>
                                    )}
                                    {anonymatPreviewSequence.length > 0 && (
                                        <p className="mt-1 text-gray-600 dark:text-gray-300">
                                            Apercu: {anonymatPreviewSequence.join(', ')}
                                            {eligibleStudentCount > anonymatPreviewSequence.length ? ', ...' : ''}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    Ordre des etudiants
                                </label>
                                <select
                                    value={data.student_order}
                                    onChange={(event) => setData('student_order', event.target.value)}
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

                            <div className="lg:col-span-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Salles</label>
                                <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-900/40">
                                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                                        <div>
                                            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Ajouter une salle
                                            </label>
                                            <select
                                                value={pendingSalleId}
                                                onChange={(event) => {
                                                    const value = event.target.value;
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

                            <div className="lg:col-span-2 rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
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
                                                    onChange={(event) =>
                                                        setAllocations((prev) => ({
                                                            ...prev,
                                                            [String(salle.id_salle)]: event.target.value,
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

                            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 xl:grid-cols-3">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Date</label>
                                    <input
                                        type="date"
                                        value={data.date_examen}
                                        onChange={(event) => setData('date_examen', event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    />
                                    <InputError message={errors.date_examen} className="mt-1" />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Debut</label>
                                    <input
                                        type="time"
                                        value={data.date_debut}
                                        onChange={(event) => setData('date_debut', event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    />
                                    <InputError message={errors.date_debut} className="mt-1" />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Fin</label>
                                    <input
                                        type="time"
                                        value={data.date_fin}
                                        onChange={(event) => setData('date_fin', event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                    />
                                    <InputError message={errors.date_fin} className="mt-1" />
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Notes</label>
                                <textarea
                                    rows={3}
                                    value={data.description}
                                    onChange={(event) => setData('description', event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                />
                                <InputError message={errors.description} className="mt-1" />
                            </div>

                            <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10 sm:w-auto"
                                >
                                    Supprimer
                                </button>
                                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                                    <button
                                        type="button"
                                        onClick={closeEditor}
                                        className="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 sm:w-auto"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                                    >
                                        Mettre a jour
                                    </button>
                                </div>
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
