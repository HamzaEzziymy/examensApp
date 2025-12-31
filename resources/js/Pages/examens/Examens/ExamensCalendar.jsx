import { useMemo, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import InputError from '@/Components/InputError';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';

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

const toInputDate = (value) => (value ? value.substring(0, 10) : '');

const toInputDateTime = (value) => (value ? formatLocalDateTime(new Date(value)) : '');

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

const buildPayload = (source, overrides = {}) => ({
    id_session_examen: overrides.id_session_examen ?? source.id_session_examen ?? '',
    id_module: overrides.id_module ?? source.id_module ?? '',
    id_salle: overrides.id_salle ?? source.id_salle ?? '',
    salles: overrides.salles ?? source.salles ?? [],
    date_examen: overrides.date_examen ?? toInputDate(source.date_examen ?? source.date_debut),
    date_debut: overrides.date_debut ?? source.date_debut ?? source.date_examen,
    date_fin: overrides.date_fin ?? source.date_fin ?? source.date_debut,
    statut: overrides.statut ?? source.statut ?? 'Planifiee',
    description: overrides.description ?? source.description ?? '',
});

export default function ExamensCalendar({ examens, sessions, modules, salles, statuts }) {
    const [editorOpen, setEditorOpen] = useState(false);
    const [selectedExam, setSelectedExam] = useState(null);
    const { data, setData, put, errors, processing, reset } = useForm({
        id_examen: null,
        id_session_examen: '',
        id_module: '',
        id_salle: '',
        salles: [],
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
            const moduleName = examen.module?.nom_module ?? 'Module';
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

    const openEditor = (examen) => {
        setData({
            id_examen: examen.id_examen,
            id_session_examen: examen.id_session_examen ?? '',
            id_module: examen.id_module ?? '',
            id_salle: examen.id_salle ?? '',
            salles: (examen.salles || []).map((s) => String(s.id_salle)),
            date_examen: toInputDate(examen.date_examen ?? examen.date_debut),
            date_debut: toInputDateTime(examen.date_debut),
            date_fin: toInputDateTime(examen.date_fin),
            statut: examen.statut ?? statuts[0],
            description: examen.description ?? '',
        });
        setSelectedExam(examen);
        setEditorOpen(true);
    };

    const closeEditor = () => {
        setEditorOpen(false);
        setSelectedExam(null);
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
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Details / modification</h3>
                                {selectedExam && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {selectedExam.module?.code_module} - {selectedExam.module?.nom_module} - {selectedExam.session_examen?.nom_session}
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

                        {selectedExam && (
                            <div className="mb-4 grid gap-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-700/40 dark:text-gray-200 lg:grid-cols-3">
                                <div>
                                    <p className="font-semibold">Session</p>
                                    <p>{selectedExam.session_examen?.nom_session ?? '-'}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Module</p>
                                    <p>{selectedExam.module?.nom_module ?? '-'}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Salle</p>
                                    <p>{selectedExam.salle?.nom_salle ?? 'Non assignee'}</p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
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
                                <InputError message={errors.id_session_examen} className="mt-1" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Module</label>
                                <select
                                    value={data.id_module}
                                    onChange={(event) => setData('id_module', event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                >
                                    <option value="">Selectionner</option>
                                    {modules.map((module) => (
                                        <option key={module.id_module} value={module.id_module}>
                                            {module.code_module} - {module.nom_module}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.id_module} className="mt-1" />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Salles (multi)</label>
                                <select
                                    multiple
                                    value={data.salles}
                                    onChange={(event) =>
                                        setData('salles', Array.from(event.target.selectedOptions).map((opt) => opt.value))
                                    }
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                >
                                    {salles.map((salle) => (
                                        <option key={salle.id_salle} value={String(salle.id_salle)}>
                                            {salle.code_salle} - {salle.nom_salle}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.salles} className="mt-1" />
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
                                    type="datetime-local"
                                    value={data.date_debut}
                                    onChange={(event) => setData('date_debut', event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                />
                                <InputError message={errors.date_debut} className="mt-1" />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Fin</label>
                                <input
                                    type="datetime-local"
                                    value={data.date_fin}
                                    onChange={(event) => setData('date_fin', event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                />
                                <InputError message={errors.date_fin} className="mt-1" />
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

                            <div className="lg:col-span-2 flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10"
                                >
                                    Supprimer
                                </button>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={closeEditor}
                                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        Mettre a jour
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
