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

const toInputDate = (value) => (value ? value.substring(0, 10) : '');

const toInputDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    const pad = (num) => `${num}`.padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
        date.getMinutes(),
    )}`;
};

const buildPayload = (source, overrides = {}) => ({
    id_session_examen: overrides.id_session_examen ?? source.id_session_examen ?? '',
    id_module: overrides.id_module ?? source.id_module ?? '',
    id_salle: overrides.id_salle ?? source.id_salle ?? '',
    date_examen: overrides.date_examen ?? toInputDate(source.date_examen ?? source.date_debut),
    date_debut: overrides.date_debut ?? source.date_debut ?? source.date_examen,
    date_fin: overrides.date_fin ?? source.date_fin ?? source.date_debut,
    statut: overrides.statut ?? source.statut ?? 'Planifiee',
    description: overrides.description ?? source.description ?? '',
});

export default function ExamensCalendar({ examens, sessions, modules, salles, statuts }) {
    const [editorOpen, setEditorOpen] = useState(false);
    const { data, setData, put, errors, processing, reset } = useForm({
        id_examen: null,
        id_session_examen: '',
        id_module: '',
        id_salle: '',
        date_examen: '',
        date_debut: '',
        date_fin: '',
        statut: statuts[0],
        description: '',
    });

    const calendarEvents = useMemo(
        () =>
            examens.map((examen) => {
                const color = statusColors[examen.statut] ?? '#4b5563';
                return {
                    id: examen.id_examen,
                    title: `${examen.module?.code_module ?? 'Module'} • ${examen.session_examen?.nom_session ?? ''}`.trim(),
                    start: examen.date_debut ?? examen.date_examen,
                    end: examen.date_fin ?? examen.date_debut,
                    backgroundColor: color,
                    borderColor: color,
                    textColor: '#fff',
                    extendedProps: {
                        examen,
                    },
                };
            }),
        [examens],
    );

    const openEditor = (examen) => {
        setData({
            id_examen: examen.id_examen,
            id_session_examen: examen.id_session_examen ?? '',
            id_module: examen.id_module ?? '',
            id_salle: examen.id_salle ?? '',
            date_examen: toInputDate(examen.date_examen ?? examen.date_debut),
            date_debut: toInputDateTime(examen.date_debut),
            date_fin: toInputDateTime(examen.date_fin),
            statut: examen.statut ?? statuts[0],
            description: examen.description ?? '',
        });
        setEditorOpen(true);
    };

    const closeEditor = () => {
        setEditorOpen(false);
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
                    title: 'Examen mis à jour',
                    timer: 1200,
                    showConfirmButton: false,
                });
            },
        });
    };

    const persistChange = (info) => {
        const examen = info.event.extendedProps.examen;
        if (!examen) {
            info.revert();
            return;
        }

        const start = info.event.start;
        const end = info.event.end ?? start;

        const payload = buildPayload(examen, {
            date_examen: start ? toInputDate(start.toISOString()) : buildPayload(examen).date_examen,
            date_debut: start?.toISOString(),
            date_fin: end?.toISOString(),
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
                    title: 'Horaire mis à jour',
                });
            },
        });
    };

    return (
        <div id="examens-calendar" className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Calendrier des examens </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Faites glisser les examens pour ajuster leurs créneaux ou cliquez pour modifier les détails.
                    </p>
                </div>
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
                eventClick={(info) => openEditor(info.event.extendedProps.examen)}
                eventDrop={persistChange}
                eventResize={persistChange}
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                dayMaxEventRows
            />

            {editorOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Modifier l’examen</h3>
                            <button
                                type="button"
                                onClick={closeEditor}
                                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Session</label>
                                <select
                                    value={data.id_session_examen}
                                    onChange={(event) => setData('id_session_examen', event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                >
                                    <option value="">Sélectionner</option>
                                    {sessions.map((session) => (
                                        <option key={session.id_session_examen} value={session.id_session_examen}>
                                            {session.nom_session} • {session.type_session}
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
                                    <option value="">Sélectionner</option>
                                    {modules.map((module) => (
                                        <option key={module.id_module} value={module.id_module}>
                                            {module.code_module} • {module.nom_module}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.id_module} className="mt-1" />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Salle</label>
                                <select
                                    value={data.id_salle}
                                    onChange={(event) => setData('id_salle', event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                                >
                                    <option value="">Non assignée</option>
                                    {salles.map((salle) => (
                                        <option key={salle.id_salle} value={salle.id_salle}>
                                            {salle.code_salle} • {salle.nom_salle}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.id_salle} className="mt-1" />
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
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Début</label>
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

                            <div className="lg:col-span-2 flex items-center justify-end gap-3">
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
                                    Mettre à jour
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
