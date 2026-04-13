import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import {
    BarChart3,
    BookOpen,
    Download,
    Filter,
    GraduationCap,
    Pencil,
    Plus,
    ShieldCheck,
    Trash2,
    Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import CorrectionHeader from '../Header';

const defaultRuleForm = {
    id_module: '',
    module_pass_threshold: '10',
    enforce_all_elements_threshold: false,
    element_pass_threshold: null,
};

const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

function StatCard({ icon: Icon, label, value, hint, tone }) {
    return (
        <div className={`rounded-3xl border p-4 ${tone}`}>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                        {label}
                    </div>
                    <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                        {value}
                    </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-slate-700 shadow-sm dark:bg-slate-900/60 dark:text-slate-100">
                    <Icon size={20} />
                </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{hint}</p>
        </div>
    );
}

function FilterField({ label, children, className = '' }) {
    return (
        <div className={className}>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                {label}
            </label>
            {children}
        </div>
    );
}

function MetricRow({ label, value, subtle = false }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/50">
            <span className={`text-sm ${subtle ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {label}
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{value}</span>
        </div>
    );
}

export default function ResultatsModulesIndex({
    scope = {},
    filters = {},
    filterOptions = {},
    stats = {},
    validationRules = [],
    students = [],
    exportYearUrl = '',
    exportSemesterUrl = '',
}) {
    const [selectedSemesterId, setSelectedSemesterId] = useState(filters.semester_id ? String(filters.semester_id) : '');
    const [selectedStudentId, setSelectedStudentId] = useState(filters.student_id ? String(filters.student_id) : '');
    const [selectedSemesterSession, setSelectedSemesterSession] = useState(filters.semester_session || '');
    const [includeSemesterSummary, setIncludeSemesterSummary] = useState(filters.include_semester_summary !== false);
    const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
    const [editingRuleId, setEditingRuleId] = useState(null);
    const studentDropdownRef = useRef(null);
    const ruleForm = useForm(defaultRuleForm);

    const semesters = filterOptions.semesters || [];
    const studentOptions = filterOptions.students || [];
    const moduleOptions = filterOptions.modules || [];
    const semesterSessionOptions = filterOptions.semesterSessions || [
        { id: 'normale', label: 'Session normale' },
        { id: 'rattrapage', label: 'Session rattrapage' },
    ];
    const selectedStudentOption = studentOptions.find((student) => String(student.id) === selectedStudentId);
    const selectedSemesterOption = semesters.find((semester) => String(semester.id) === selectedSemesterId);
    const selectedSessionOption = semesterSessionOptions.find((session) => session.id === selectedSemesterSession);
    const selectedModuleOption = moduleOptions.find((module) => String(module.id) === String(ruleForm.data.id_module));
    const normalizeText = (value) =>
        String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    const filteredStudentOptions = studentOptions.filter((student) => {
        const query = normalizeText(studentSearch);
        return !query || normalizeText(student.label || '').includes(query);
    });
    const strictRulesCount = validationRules.filter((rule) => rule.enforce_all_elements_threshold).length;
    const studentPreview = students.slice(0, 6);
    const cohortPreview = students.slice(0, 12);
    const activeFilters = [
        selectedSemesterOption ? `Semestre: ${selectedSemesterOption.nom}` : null,
        selectedStudentOption ? `Etudiant: ${selectedStudentOption.label}` : null,
        selectedSessionOption ? `Session: ${selectedSessionOption.label}` : null,
        includeSemesterSummary ? 'Case generale visible' : 'Case generale masquee',
    ].filter(Boolean);
    const effectiveElementThreshold =
        ruleForm.data.element_pass_threshold && ruleForm.data.element_pass_threshold !== ''
            ? ruleForm.data.element_pass_threshold
            : ruleForm.data.module_pass_threshold;

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target)) {
                setStudentDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, []);

    const currentQuery = () => {
        const params = {};
        if (selectedSemesterId) params.semester_id = selectedSemesterId;
        if (selectedStudentId) params.student_id = selectedStudentId;
        if (selectedSemesterSession) params.semester_session = selectedSemesterSession;
        params.include_semester_summary = includeSemesterSummary ? '1' : '0';
        return params;
    };

    const buildYearExportHref = () => {
        const params = new URLSearchParams(selectedStudentId ? { student_id: selectedStudentId } : {}).toString();
        const baseUrl = exportYearUrl || route('correction.resultats-modules.export-releve-notes');
        return params ? `${baseUrl}?${params}` : baseUrl;
    };

    const buildSemesterExportHref = () => {
        const params = new URLSearchParams(currentQuery()).toString();
        const baseUrl = exportSemesterUrl || route('correction.resultats-modules.export-releve-semestre');
        return params ? `${baseUrl}?${params}` : baseUrl;
    };

    const applyFilters = () => {
        router.get(route('correction.resultats-modules.index'), currentQuery(), {
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setSelectedSemesterId('');
        setSelectedStudentId('');
        setSelectedSemesterSession('');
        setIncludeSemesterSummary(true);
        setStudentSearch('');
        setStudentDropdownOpen(false);

        router.get(route('correction.resultats-modules.index'), {}, {
            preserveScroll: true,
            replace: true,
        });
    };

    const resetRuleForm = () => {
        setEditingRuleId(null);
        ruleForm.clearErrors();
        ruleForm.setData(defaultRuleForm);
    };

    const startEditingRule = (rule) => {
        setEditingRuleId(rule.id);
        ruleForm.clearErrors();
        ruleForm.setData({
            id_module: String(rule.id_module || ''),
            module_pass_threshold: String(rule.module_pass_threshold ?? 10),
            enforce_all_elements_threshold: Boolean(rule.enforce_all_elements_threshold),
            element_pass_threshold: rule.element_pass_threshold !== null ? String(rule.element_pass_threshold) : null,
        });
    };

    const submitRule = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => resetRuleForm() };

        if (editingRuleId) {
            ruleForm.put(route('correction.resultats-modules.update', editingRuleId), options);
            return;
        }

        ruleForm.post(route('correction.resultats-modules.store'), options);
    };

    const deleteRule = (rule) => {
        if (!window.confirm(`Supprimer la regle du module ${rule.module_label} ?`)) {
            return;
        }

        router.delete(route('correction.resultats-modules.destroy', rule.id), {
            preserveScroll: true,
            onSuccess: () => {
                if (editingRuleId === rule.id) {
                    resetRuleForm();
                }
            },
        });
    };

    const renderFieldError = (field) =>
        ruleForm.errors[field] ? <p className="mt-2 text-xs text-red-600 dark:text-red-300">{ruleForm.errors[field]}</p> : null;

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Resultats des modules</h2>}>
            <Head title="Resultats des modules" />
            <CorrectionHeader />
            <div className="space-y-5">
                <section className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.22),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.10),_transparent_28%)]" />
                    <div className="relative space-y-6 p-6 lg:p-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-3xl">
                                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">
                                    Correction
                                </p>
                                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                                    Resultats modules et regles de validation
                                </h3>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                                    Cette page sert a filtrer les releves, exporter les PDF et controler les regles de validation
                                    par filiere quand une moyenne module ne suffit plus.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                                        {scope.filiere || 'Filiere non definie'}
                                    </span>
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                                        {scope.annee || 'Annee non definie'}
                                    </span>
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                                        {validationRules.length} regle{validationRules.length > 1 ? 's' : ''} active{validationRules.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:w-[380px]">
                                <a
                                    href={buildYearExportHref()}
                                    className="group rounded-3xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Releve annee</div>
                                        <Download size={18} className="text-slate-500 transition group-hover:translate-x-0.5 dark:text-slate-300" />
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                        Export global de l annee, pour un etudiant ou pour toute la cohorte.
                                    </p>
                                </a>
                                <a
                                    href={buildSemesterExportHref()}
                                    className="group rounded-3xl border border-blue-200 bg-blue-50/80 p-4 transition hover:border-blue-300 hover:bg-white dark:border-blue-900/60 dark:bg-blue-950/30 dark:hover:border-blue-800"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Releve semestre</div>
                                        <Download size={18} className="text-blue-600 transition group-hover:translate-x-0.5 dark:text-blue-300" />
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                        Export cible avec semestre, session et case de note generale.
                                    </p>
                                </a>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            <StatCard icon={GraduationCap} label="Filiere" value={scope.filiere || '-'} hint="Contexte academique courant" tone="border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50" />
                            <StatCard icon={BookOpen} label="Annee" value={scope.annee || '-'} hint="Cadre de calcul et d export" tone="border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50" />
                            <StatCard icon={Users} label="Etudiants" value={stats.students || 0} hint="Etudiants visibles apres filtres" tone="border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/20" />
                            <StatCard icon={BarChart3} label="Modules valides" value={stats.validated_modules || 0} hint="Statuts recalcules sur la selection" tone="border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20" />
                            <StatCard icon={ShieldCheck} label="Regles strictes" value={strictRulesCount} hint="Modules avec seuil par element" tone="border-blue-200 bg-blue-50/80 dark:border-blue-900/40 dark:bg-blue-950/20" />
                        </div>
                    </div>
                </section>

                <section className="sticky top-4 z-20 rounded-[26px] border border-slate-200/90 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/95">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-100">
                                <Filter size={18} />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">Barre de pilotage</div>
                                <div className="text-sm text-slate-600 dark:text-slate-300">Filtrez la cohorte avant d exporter ou de verifier les regles.</div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={applyFilters} className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
                                Appliquer les filtres
                            </button>
                            <button type="button" onClick={clearFilters} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                                Reinitialiser
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <FilterField label="Semestre">
                            <select
                                value={selectedSemesterId}
                                onChange={(event) => {
                                    setSelectedSemesterId(event.target.value);
                                    setSelectedStudentId('');
                                    setStudentSearch('');
                                    setStudentDropdownOpen(false);
                                }}
                                className={inputClass}
                            >
                                <option value="">Tous les semestres</option>
                                {semesters.map((semester) => (
                                    <option key={semester.id} value={semester.id}>
                                        {semester.nom}
                                    </option>
                                ))}
                            </select>
                        </FilterField>

                        <FilterField label="Etudiant">
                            <div className="relative" ref={studentDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStudentSearch('');
                                        setStudentDropdownOpen((open) => !open);
                                    }}
                                    className={`${inputClass} flex items-center justify-between text-left`}
                                    aria-expanded={studentDropdownOpen}
                                >
                                    <span className="truncate">{selectedStudentOption?.label || 'Tous les etudiants'}</span>
                                    <span className="ml-3 text-xs text-slate-500 dark:text-slate-400">Rechercher</span>
                                </button>

                                {studentDropdownOpen ? (
                                    <div className="absolute z-30 mt-2 w-full rounded-3xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                        <input
                                            type="text"
                                            value={studentSearch}
                                            onChange={(event) => setStudentSearch(event.target.value)}
                                            placeholder="Rechercher par CNE ou nom"
                                            className={inputClass}
                                        />
                                        <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedStudentId('');
                                                    setStudentSearch('');
                                                    setStudentDropdownOpen(false);
                                                }}
                                                className={`block w-full px-3 py-3 text-left text-sm transition ${selectedStudentId === '' ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                                            >
                                                Tous les etudiants
                                            </button>
                                            {filteredStudentOptions.length > 0 ? (
                                                filteredStudentOptions.map((student) => (
                                                    <button
                                                        key={student.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedStudentId(String(student.id));
                                                            setStudentSearch('');
                                                            setStudentDropdownOpen(false);
                                                        }}
                                                        className={`block w-full px-3 py-3 text-left text-sm transition ${selectedStudentId === String(student.id) ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                                                    >
                                                        {student.label || student.nom_complet || student.cne || student.id}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
                                                    Aucun etudiant ne correspond a cette recherche.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </FilterField>

                        <FilterField label="Session semestre">
                            <select
                                value={selectedSemesterSession}
                                onChange={(event) => setSelectedSemesterSession(event.target.value)}
                                className={inputClass}
                            >
                                <option value="">Toutes les sessions</option>
                                {semesterSessionOptions.map((sessionOption) => (
                                    <option key={sessionOption.id} value={sessionOption.id}>
                                        {sessionOption.label}
                                    </option>
                                ))}
                            </select>
                        </FilterField>

                        <FilterField label="Affichage PDF semestre">
                            <label className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100">
                                <input
                                    type="checkbox"
                                    checked={includeSemesterSummary}
                                    onChange={(event) => setIncludeSemesterSummary(event.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                                />
                                <span>Afficher la case note generale</span>
                            </label>
                        </FilterField>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {activeFilters.map((filterLabel) => (
                            <span
                                key={filterLabel}
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                            >
                                {filterLabel}
                            </span>
                        ))}
                    </div>
                </section>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
                    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                                    Workspace
                                </p>
                                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                                    Regles de validation des modules
                                </h3>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                                    Chaque carte definit une exception de filiere. Sans regle, la validation repose seulement
                                    sur la moyenne du module.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                                <ShieldCheck size={16} />
                                {validationRules.length} regle{validationRules.length > 1 ? 's' : ''} configuree{validationRules.length > 1 ? 's' : ''}
                            </div>
                        </div>

                        <div className="mt-5 rounded-[26px] border border-dashed border-slate-300 bg-slate-50/70 p-5 dark:border-slate-600 dark:bg-slate-900/40">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Politique par defaut</div>
                                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                        Aucun blocage par element tant qu une regle specifique n est pas ajoutee pour le module.
                                    </p>
                                </div>
                                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                    Moyenne module seule
                                </div>
                            </div>
                        </div>

                        {validationRules.length === 0 ? (
                            <div className="mt-5 rounded-[26px] border border-slate-200 bg-slate-50/60 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-100">
                                    <Plus size={20} />
                                </div>
                                <h4 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Aucune regle personnalisee</h4>
                                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                    Ajoutez une premiere regle depuis le panneau droit pour imposer un seuil minimal sur
                                    tous les elements d un module.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                {validationRules.map((rule) => (
                                    <article
                                        key={rule.id}
                                        className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-5 shadow-sm transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600"
                                    >
                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                                                        Module
                                                    </div>
                                                    <h4 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                                                        {rule.module_label}
                                                    </h4>
                                                </div>
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${rule.enforce_all_elements_threshold ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}
                                                >
                                                    {rule.enforce_all_elements_threshold ? 'Regle stricte' : 'Moyenne seule'}
                                                </span>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                                                        Seuil module
                                                    </div>
                                                    <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                                                        {Number(rule.module_pass_threshold || 0).toFixed(2)}
                                                    </div>
                                                </div>
                                                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                                                        Elements
                                                    </div>
                                                    <div className="mt-2 text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                                                        {rule.enforce_all_elements_threshold
                                                            ? `Tous les elements >= ${Number(rule.element_pass_threshold ?? rule.module_pass_threshold ?? 0).toFixed(2)}`
                                                            : 'Aucun seuil element impose'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => startEditingRule(rule)}
                                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                                >
                                                    <Pencil size={15} />
                                                    Modifier
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteRule(rule)}
                                                    className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                                                >
                                                    <Trash2 size={15} />
                                                    Supprimer
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
                        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-100">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Vue d ensemble</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">Resume rapide de la cohorte affichee.</p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3">
                                <MetricRow label="Etudiants visibles" value={stats.students || 0} />
                                <MetricRow label="Modules affiches" value={stats.modules || 0} />
                                <MetricRow label="Elements affiches" value={stats.elements || 0} />
                                <MetricRow label="Modules valides" value={stats.validated_modules || 0} />
                                <MetricRow label="Regles strictes" value={strictRulesCount} subtle />
                            </div>

                            <div className="mt-5">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                                    Cohorte
                                </div>
                                {studentPreview.length === 0 ? (
                                    <div className="mt-3 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
                                        Aucun etudiant dans la selection courante.
                                    </div>
                                ) : (
                                    <div className="mt-3 space-y-2">
                                        {studentPreview.map((student) => (
                                            <div key={student.student_id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/50">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                                        {`${student.nom || ''} ${student.prenom || ''}`.trim() || '-'}
                                                    </div>
                                                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                                                        {student.cne || 'Sans CNE'}
                                                    </div>
                                                </div>
                                                <div className="text-right text-xs text-slate-600 dark:text-slate-300">
                                                    <div>{student.validated_modules_count || 0}/{student.modules_count || 0} valides</div>
                                                    <div>{student.elements_count || 0} elements</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                        {editingRuleId ? 'Modifier la regle' : 'Nouvelle regle'}
                                    </h3>
                                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                        Exemple: moyenne module {'>='} 10 mais module non valide si un element descend sous 10.
                                    </p>
                                </div>
                                {editingRuleId ? (
                                    <button
                                        type="button"
                                        onClick={resetRuleForm}
                                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                    >
                                        Nouvelle
                                    </button>
                                ) : null}
                            </div>

                            <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                                    Apercu de la regle
                                </div>
                                <div className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
                                    {selectedModuleOption?.label || 'Choisir un module'}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                    Validation module a partir de {ruleForm.data.module_pass_threshold || '0'}.
                                    {ruleForm.data.enforce_all_elements_threshold
                                        ? ` Tous les elements doivent rester >= ${effectiveElementThreshold || '0'}.`
                                        : ' Aucun blocage supplementaire par element.'}
                                </p>
                            </div>

                            <form onSubmit={submitRule} className="mt-4 space-y-4">
                                <FilterField label="Module">
                                    <select
                                        value={ruleForm.data.id_module}
                                        onChange={(event) => ruleForm.setData('id_module', event.target.value)}
                                        className={inputClass}
                                        disabled={ruleForm.processing || moduleOptions.length === 0}
                                    >
                                        <option value="">Choisir un module</option>
                                        {moduleOptions.map((module) => (
                                            <option key={module.id} value={module.id}>
                                                {module.label}
                                            </option>
                                        ))}
                                    </select>
                                    {renderFieldError('id_module')}
                                </FilterField>

                                <FilterField label="Seuil validation module">
                                    <input
                                        type="number"
                                        min="0"
                                        max="20"
                                        step="0.01"
                                        value={ruleForm.data.module_pass_threshold}
                                        onChange={(event) => ruleForm.setData('module_pass_threshold', event.target.value)}
                                        className={inputClass}
                                        disabled={ruleForm.processing}
                                    />
                                    {renderFieldError('module_pass_threshold')}
                                </FilterField>

                                <label className="flex items-start gap-3 rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={ruleForm.data.enforce_all_elements_threshold}
                                        onChange={(event) => ruleForm.setData('enforce_all_elements_threshold', event.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                                        disabled={ruleForm.processing}
                                    />
                                    <span>Exiger que tous les elements du module respectent un seuil minimal.</span>
                                </label>

                                <FilterField label="Seuil elements">
                                    <input
                                        type="number"
                                        min="0"
                                        max="20"
                                        step="0.01"
                                        value={ruleForm.data.element_pass_threshold ?? ''}
                                        onChange={(event) => ruleForm.setData('element_pass_threshold', event.target.value === '' ? null : event.target.value)}
                                        placeholder="Vide = reutiliser le seuil module"
                                        className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900`}
                                        disabled={ruleForm.processing || !ruleForm.data.enforce_all_elements_threshold}
                                    />
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                        Si ce champ reste vide, le seuil module sera applique aux elements.
                                    </p>
                                    {renderFieldError('element_pass_threshold')}
                                </FilterField>

                                {ruleForm.errors.rules ? (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                                        {ruleForm.errors.rules}
                                    </div>
                                ) : null}

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="submit"
                                        disabled={ruleForm.processing || !scope.filiere_id}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                                    >
                                        <Plus size={16} />
                                        {ruleForm.processing
                                            ? 'Enregistrement...'
                                            : editingRuleId
                                              ? 'Mettre a jour la regle'
                                              : 'Ajouter la regle'}
                                    </button>
                                    {editingRuleId ? (
                                        <button
                                            type="button"
                                            onClick={resetRuleForm}
                                            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                            Annuler
                                        </button>
                                    ) : null}
                                </div>
                            </form>
                        </section>
                    </aside>
                </div>

                <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                                Cohorte
                            </p>
                            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                                Apercu etudiants
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                Lecture rapide des premiers etudiants affiches. Utilisez les filtres ci dessus pour isoler un cas.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                            {students.length} etudiant{students.length > 1 ? 's' : ''} apres filtres
                        </div>
                    </div>

                    {cohortPreview.length === 0 ? (
                        <div className="mt-5 rounded-[26px] border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
                            Aucun resultat disponible pour la selection courante.
                        </div>
                    ) : (
                        <>
                            <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                                {cohortPreview.map((student) => (
                                    <article
                                        key={student.student_id}
                                        className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-base font-semibold text-slate-900 dark:text-white">
                                                    {`${student.nom || ''} ${student.prenom || ''}`.trim() || '-'}
                                                </div>
                                                <div className="truncate text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                                                    {student.cne || 'Sans CNE'}
                                                </div>
                                            </div>
                                            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                                {student.validated_modules_count || 0}/{student.modules_count || 0}
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-3 gap-2">
                                            <MetricRow label="Modules" value={student.modules_count || 0} />
                                            <MetricRow label="Elements" value={student.elements_count || 0} />
                                            <MetricRow label="Valides" value={student.validated_modules_count || 0} />
                                        </div>
                                    </article>
                                ))}
                            </div>

                            {students.length > cohortPreview.length ? (
                                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                                    Affichage des {cohortPreview.length} premiers etudiants sur {students.length}. Le filtre etudiant
                                    permet de cibler un dossier precis.
                                </p>
                            ) : null}
                        </>
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
