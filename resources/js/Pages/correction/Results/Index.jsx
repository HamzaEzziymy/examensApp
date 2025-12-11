import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import CorrectionHeader from '../Header';
import { Edit3, Layers, Medal } from 'lucide-react';

const statusClass = (status) => {
    const value = (status || '').toLowerCase();
    if (value.includes('valide')) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200';
    if (value.includes('rattrap')) return 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200';
    if (value.includes('dette')) return 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100';
};

const normalize = (value) =>
    (value || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '--');
const formatNote = (value) => (value !== null && value !== undefined ? Number(value).toFixed(2) : '--');

const moduleStatuses = ['En cours', 'Valide', 'Non Valide', 'Rattrapage', 'Capitalise', 'En dette'];
const elementStatuses = ['En cours', 'Valide', 'Non Valide', 'Rattrapage'];

const defaultModuleState = (row = null) => ({
    moyenne_module: row?.moyenne_module ?? '',
    statut: row?.statut ?? 'En cours',
    date_validation: row?.date_validation ?? '',
    est_anticipe: Boolean(row?.est_anticipe),
});

const defaultElementState = (row = null, sessionId = null) => ({
    moyenne_element: row?.moyenne_element ?? '',
    statut: row?.statut ?? 'En cours',
    date_validation: row?.date_validation ?? '',
    id_session_examen: row?.id_session_examen ? String(row.id_session_examen) : sessionId ? String(sessionId) : '',
});

export default function ResultsIndex({
    moduleResults = [],
    elementResults = [],
    modules = [],
    sessions = [],
    filters = {},
    stats = {},
}) {
    const [activeTab, setActiveTab] = useState(filters.view ?? 'modules');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingModule, setEditingModule] = useState(null);
    const [editingElement, setEditingElement] = useState(null);
    const moduleForm = useForm(defaultModuleState());
    const elementForm = useForm(defaultElementState(null, filters.session));

    useEffect(() => {
        setActiveTab(filters.view ?? 'modules');
    }, [filters.view]);

    const handleModuleChange = (event) => {
        const module = event.target.value;
        const params = {
            ...cleanFilters(filters),
            module: module || undefined,
            view: activeTab,
        };

        router.get(route('correction.resultats-modules.index'), params, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const handleSessionChange = (event) => {
        const session = event.target.value;
        const params = {
            ...cleanFilters(filters),
            session: session || undefined,
            view: activeTab,
        };

        router.get(route('correction.resultats-modules.index'), params, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const switchTab = (tab) => {
        setActiveTab(tab);
        const params = {
            ...cleanFilters(filters),
            view: tab,
        };
        router.get(route('correction.resultats-modules.index'), params, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const moduleRows = useMemo(() => {
        const query = normalize(searchTerm);
        if (!query) return moduleResults;

        return moduleResults.filter((row) => {
            const student = row.inscription_pedagogique?.etudiant;
            const module = row.module;
            const values = [
                student?.nom,
                student?.prenom,
                student?.cne,
                module?.nom_module,
                module?.code_module,
                row.statut,
            ];

            return values.some((value) => normalize(value).includes(query));
        });
    }, [moduleResults, searchTerm]);

    const elementRows = useMemo(() => {
        const query = normalize(searchTerm);
        if (!query) return elementResults;

        return elementResults.filter((row) => {
            const student = row.inscription_pedagogique?.etudiant;
            const module = row.element?.module;
            const values = [
                student?.nom,
                student?.prenom,
                student?.cne,
                module?.nom_module,
                module?.code_module,
                row.element?.nom_element,
                row.statut,
                row.session_examen?.nom_session,
            ];

            return values.some((value) => normalize(value).includes(query));
        });
    }, [elementResults, searchTerm]);

    const startEditModule = (row) => {
        setEditingModule(row);
        moduleForm.setData(defaultModuleState(row));
    };

    const startEditElement = (row) => {
        setEditingElement(row);
        elementForm.setData(defaultElementState(row, filters.session));
    };

    const resetModuleForm = () => {
        setEditingModule(null);
        moduleForm.reset();
        moduleForm.setData(defaultModuleState());
    };

    const resetElementForm = () => {
        setEditingElement(null);
        elementForm.reset();
        elementForm.setData(defaultElementState(null, filters.session));
    };

    const submitModule = (event) => {
        event.preventDefault();
        if (!editingModule) return;

        moduleForm.put(route('correction.resultats-modules.update', editingModule.id_resultat_module), {
            preserveScroll: true,
            onSuccess: resetModuleForm,
        });
    };

    const submitElement = (event) => {
        event.preventDefault();
        if (!editingElement) return;

        elementForm.put(route('correction.resultats-elements.update', editingElement.id_resultat_element), {
            preserveScroll: true,
            onSuccess: resetElementForm,
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Resultats</h2>}
        >
            <Head title="Resultats" />

            <CorrectionHeader />

            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SummaryCard
                    title="Resultats modules"
                    subtitle={`${stats.modules?.validated ?? 0} valides`}
                    value={stats.modules?.average !== null && stats.modules?.average !== undefined ? stats.modules.average.toFixed(2) : '--'}
                    icon={<Layers size={18} />}
                />
                <SummaryCard
                    title="Resultats elements"
                    subtitle={`${stats.elements?.validated ?? 0} valides`}
                    value={stats.elements?.average !== null && stats.elements?.average !== undefined ? stats.elements.average.toFixed(2) : '--'}
                    icon={<Medal size={18} />}
                />
            </div>

            <div className="my-4 flex flex-wrap gap-3 rounded-xl bg-white p-4 shadow dark:bg-gray-800">
                <div className="w-full sm:w-56">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Module</label>
                    <select
                        value={filters.module ?? ''}
                        onChange={handleModuleChange}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                    >
                        <option value="">Tous les modules</option>
                        {modules.map((module) => (
                            <option key={module.id_module} value={module.id_module}>
                                {module.code_module} - {module.nom_module}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="w-full sm:w-56">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Session d'examen</label>
                    <select
                        value={filters.session ?? ''}
                        onChange={handleSessionChange}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                    >
                        <option value="">Toutes les sessions</option>
                        {sessions.map((session) => (
                            <option key={session.id_session_examen} value={session.id_session_examen}>
                                {session.nom_session} - {session.type_session}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="sr-only" htmlFor="result-search">
                        Rechercher
                    </label>
                    <input
                        id="result-search"
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Filtrer (nom, CNE, module, statut)"
                        className="mt-6 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700"
                    />
                </div>
            </div>

            <div className="mb-6 flex gap-2">
                <button
                    type="button"
                    onClick={() => switchTab('modules')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        activeTab === 'modules'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                >
                    Modules ({stats.modules?.count ?? 0})
                </button>
                <button
                    type="button"
                    onClick={() => switchTab('elements')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        activeTab === 'elements'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                >
                    Elements ({stats.elements?.count ?? 0})
                </button>
            </div>

            {activeTab === 'modules' ? (
                <div className="grid gap-4 lg:grid-cols-3">
                    <ModuleForm
                        form={moduleForm}
                        editing={editingModule}
                        onSubmit={submitModule}
                        onReset={resetModuleForm}
                    />
                    <div className="lg:col-span-2">
                        <TableModules rows={moduleRows} onEdit={startEditModule} />
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-3">
                    <ElementForm
                        form={elementForm}
                        editing={editingElement}
                        onSubmit={submitElement}
                        onReset={resetElementForm}
                        sessions={sessions}
                    />
                    <div className="lg:col-span-2">
                        <TableElements rows={elementRows} onEdit={startEditElement} />
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}

function ModuleForm({ form, editing, onSubmit, onReset }) {
    return (
        <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {editing ? 'Modifier le resultat' : 'Selectionnez une ligne'}
                </div>
                {editing && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="text-xs text-indigo-600 hover:underline dark:text-indigo-300"
                    >
                        Annuler
                    </button>
                )}
            </div>
            <form className="space-y-3" onSubmit={onSubmit}>
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Moyenne /20</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="20"
                        value={form.data.moyenne_module}
                        onChange={(e) => form.setData('moyenne_module', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        disabled={!editing || form.processing}
                    />
                    <InputError message={form.errors.moyenne_module} className="mt-1" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Statut</label>
                    <select
                        value={form.data.statut}
                        onChange={(e) => form.setData('statut', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        disabled={!editing || form.processing}
                    >
                        {moduleStatuses.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                    <InputError message={form.errors.statut} className="mt-1" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Date de validation</label>
                    <input
                        type="date"
                        value={form.data.date_validation ?? ''}
                        onChange={(e) => form.setData('date_validation', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        disabled={!editing || form.processing}
                    />
                    <InputError message={form.errors.date_validation} className="mt-1" />
                </div>
                <div className="flex items-center gap-2">
                    <input
                        id="est_anticipe"
                        type="checkbox"
                        checked={Boolean(form.data.est_anticipe)}
                        onChange={(e) => form.setData('est_anticipe', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        disabled={!editing || form.processing}
                    />
                    <label htmlFor="est_anticipe" className="text-sm text-gray-700 dark:text-gray-200">
                        Anticipe
                    </label>
                </div>
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onReset}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        disabled={form.processing}
                    >
                        Reinitialiser
                    </button>
                    <button
                        type="submit"
                        disabled={!editing || form.processing}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        Mettre a jour
                    </button>
                </div>
            </form>
        </div>
    );
}

function ElementForm({ form, editing, onSubmit, onReset, sessions }) {
    return (
        <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {editing ? 'Modifier le resultat' : 'Selectionnez une ligne'}
                </div>
                {editing && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="text-xs text-indigo-600 hover:underline dark:text-indigo-300"
                    >
                        Annuler
                    </button>
                )}
            </div>
            <form className="space-y-3" onSubmit={onSubmit}>
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Moyenne /20</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="20"
                        value={form.data.moyenne_element}
                        onChange={(e) => form.setData('moyenne_element', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        disabled={!editing || form.processing}
                    />
                    <InputError message={form.errors.moyenne_element} className="mt-1" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Statut</label>
                    <select
                        value={form.data.statut}
                        onChange={(e) => form.setData('statut', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        disabled={!editing || form.processing}
                    >
                        {elementStatuses.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                    <InputError message={form.errors.statut} className="mt-1" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Session</label>
                    <select
                        value={form.data.id_session_examen ?? ''}
                        onChange={(e) => form.setData('id_session_examen', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        disabled={!editing || form.processing}
                    >
                        <option value="">-- Session --</option>
                        {sessions.map((session) => (
                            <option key={session.id_session_examen} value={session.id_session_examen}>
                                {session.nom_session} - {session.type_session}
                            </option>
                        ))}
                    </select>
                    <InputError message={form.errors.id_session_examen} className="mt-1" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Date de validation</label>
                    <input
                        type="date"
                        value={form.data.date_validation ?? ''}
                        onChange={(e) => form.setData('date_validation', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700"
                        disabled={!editing || form.processing}
                    />
                    <InputError message={form.errors.date_validation} className="mt-1" />
                </div>
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onReset}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        disabled={form.processing}
                    >
                        Reinitialiser
                    </button>
                    <button
                        type="submit"
                        disabled={!editing || form.processing}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        Mettre a jour
                    </button>
                </div>
            </form>
        </div>
    );
}

function SummaryCard({ title, subtitle, value, icon }) {
    return (
        <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <div>
                    <div className="font-semibold text-gray-800 dark:text-gray-100">{title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
                </div>
                <span className="text-indigo-600 dark:text-indigo-300">{icon}</span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-800 dark:text-gray-100">{value}</div>
        </div>
    );
}

const cleanFilters = (filters = {}) =>
    Object.fromEntries(
        Object.entries(filters).filter(
            ([, value]) => value !== null && value !== undefined && String(value).length > 0,
        ),
    );
function TableModules({ rows, onEdit }) {
    return (
        <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
            <div className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-100">Resultats par module</div>
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
                                Moyenne
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Statut
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Validation
                            </th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {rows.map((row) => {
                            const student = row.inscription_pedagogique?.etudiant;
                            return (
                                <tr key={row.id_resultat_module} className="text-sm text-gray-700 dark:text-gray-200">
                                    <td className="px-4 py-3">
                                        <div className="font-semibold">
                                            {student ? `${student.nom} ${student.prenom}` : '--'}
                                        </div>
                                        <div className="text-xs text-gray-500">{student?.cne ?? ''}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold">{row.module?.nom_module ?? '--'}</div>
                                        <div className="text-xs text-gray-500">{row.module?.code_module ?? ''}</div>
                                        {row.est_anticipe && (
                                            <div className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                                                Anticipe
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-base font-semibold">
                                        {formatNote(row.moyenne_module)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(row.statut)}`}>
                                            {row.statut ?? 'En cours'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {formatDate(row.date_validation)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(row)}
                                            className="rounded-full p-2 text-indigo-600 transition hover:bg-indigo-50 dark:hover:bg-gray-700"
                                            title="Modifier"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                    Aucun resultat module pour ces filtres.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TableElements({ rows, onEdit }) {
    return (
        <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
            <div className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-100">Resultats par element</div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/40">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Etudiant
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Element
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Session
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Moyenne
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Statut
                            </th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {rows.map((row) => {
                            const student = row.inscription_pedagogique?.etudiant;
                            return (
                                <tr key={row.id_resultat_element} className="text-sm text-gray-700 dark:text-gray-200">
                                    <td className="px-4 py-3">
                                        <div className="font-semibold">
                                            {student ? `${student.nom} ${student.prenom}` : '--'}
                                        </div>
                                        <div className="text-xs text-gray-500">{student?.cne ?? ''}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold">{row.element?.nom_element ?? '--'}</div>
                                        <div className="text-xs text-gray-500">{row.element?.module?.code_module ?? ''}</div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                                        {row.session_examen?.nom_session ?? '--'}
                                    </td>
                                    <td className="px-4 py-3 text-base font-semibold">{formatNote(row.moyenne_element)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(row.statut)}`}>
                                            {row.statut ?? 'En cours'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(row)}
                                            className="rounded-full p-2 text-indigo-600 transition hover:bg-indigo-50 dark:hover:bg-gray-700"
                                            title="Modifier"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                    Aucun resultat element pour ces filtres.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
