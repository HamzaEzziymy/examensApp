import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    BookOpenCheck,
    Building2,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Clock3,
    FileText,
    GraduationCap,
    LayoutGrid,
    NotebookTabs,
    ShieldCheck,
    Sparkles,
    UsersRound,
} from 'lucide-react';

const numberFormatter = new Intl.NumberFormat('fr-FR');
const panelClass =
    'rounded-[28px] border border-white/60 bg-white/80 shadow-[0_28px_80px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60';

const statusMeta = {
    Planifiee: { bar: 'from-amber-400 to-orange-500', pill: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200' },
    'En cours': { bar: 'from-teal-400 to-cyan-500', pill: 'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200' },
    Terminee: { bar: 'from-slate-500 to-slate-700', pill: 'bg-slate-200 text-slate-800 dark:bg-slate-500/20 dark:text-slate-200' },
    Annulee: { bar: 'from-rose-400 to-rose-600', pill: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200' },
};

const areaMeta = {
    configuration: { icon: Building2, route: 'configuration.salles.index', action: 'Configuration', tone: 'from-slate-50 via-white to-slate-100', iconTone: 'from-slate-700 to-slate-900' },
    academique: { icon: GraduationCap, route: 'academique.modules.index', action: 'Structure', tone: 'from-emerald-50 via-white to-teal-50', iconTone: 'from-emerald-500 to-teal-600' },
    personnes: { icon: UsersRound, route: 'personnes.etudiants.index', action: 'Personnes', tone: 'from-sky-50 via-white to-cyan-50', iconTone: 'from-sky-500 to-cyan-600' },
    inscriptions: { icon: NotebookTabs, route: 'inscriptions.pedagogiques.index', action: 'Inscriptions', tone: 'from-indigo-50 via-white to-violet-50', iconTone: 'from-indigo-500 to-violet-600' },
    examens: { icon: CalendarDays, route: 'examens.examens.index', action: 'Examens', tone: 'from-orange-50 via-white to-amber-50', iconTone: 'from-orange-500 to-amber-500' },
    surveillance: { icon: ShieldCheck, route: 'surveillance.repartition-etudiants.index', action: 'Surveillance', tone: 'from-amber-50 via-white to-lime-50', iconTone: 'from-amber-500 to-lime-500' },
    correction: { icon: BookOpenCheck, route: 'correction.notes.index', action: 'Correction', tone: 'from-fuchsia-50 via-white to-pink-50', iconTone: 'from-fuchsia-500 to-pink-600' },
    commissions: { icon: ClipboardList, route: 'commissions.commissions.index', action: 'Commissions', tone: 'from-rose-50 via-white to-red-50', iconTone: 'from-rose-500 to-red-600' },
    documents: { icon: FileText, route: 'proces-v', action: 'Documents', tone: 'from-cyan-50 via-white to-slate-50', iconTone: 'from-cyan-500 to-sky-600' },
};

const attentionMeta = {
    rooms: { icon: Building2, route: 'configuration.salles.index' },
    repartition: { icon: LayoutGrid, route: 'surveillance.repartition-etudiants.index' },
    surveillance: { icon: ShieldCheck, route: 'surveillance.surveillances.index' },
    correction: { icon: BookOpenCheck, route: 'correction.notes.index' },
    reclamations: { icon: ClipboardList, route: 'commissions.reclamations.index' },
};

const toneClass = {
    positive: 'border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10',
    warning: 'border-amber-200/80 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10',
    danger: 'border-rose-200/80 bg-rose-50/80 dark:border-rose-500/20 dark:bg-rose-500/10',
    info: 'border-sky-200/80 bg-sky-50/80 dark:border-sky-500/20 dark:bg-sky-500/10',
};

const formatNumber = (value) => numberFormatter.format(value ?? 0);

export default function Dashboard({
    context,
    stats,
    overview,
    statusBreakdown = [],
    upcomingExams = [],
    domainAreas = [],
    attentionItems = [],
    spotlight,
    generatedAt,
}) {
    const user = usePage().props.auth.user;
    const maxStatusCount = Math.max(...statusBreakdown.map((item) => item.count), 1);
    const quickActions = [
        { label: 'Planifier', href: route('examens.examens.index'), icon: CalendarDays },
        { label: 'Inscriptions', href: route('inscriptions.pedagogiques.index'), icon: NotebookTabs },
        { label: 'Repartition', href: route('surveillance.repartition-etudiants.index'), icon: LayoutGrid },
        { label: 'Notes', href: route('correction.notes.index'), icon: BookOpenCheck },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.34em] text-slate-500 dark:text-slate-400">
                        Tour de controle
                    </span>
                    <h2 className="font-serif text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h2>
                </div>
            }
        >
            <Head title="Dashboard" />
            <div className="space-y-6">
                <section className="relative overflow-hidden rounded-[36px] border border-white/20 bg-[linear-gradient(135deg,#115e59_0%,#164e63_36%,#0f172a_100%)] px-6 py-7 text-white shadow-[0_34px_90px_-42px_rgba(15,23,42,0.8)] sm:px-8 sm:py-8">
                    <div className="absolute -left-12 top-12 h-40 w-40 rounded-full bg-sky-300/30 blur-2xl" />
                    <div className="absolute -right-10 top-0 h-52 w-52 rounded-full bg-orange-400/20 blur-3xl" />
                    <div className="relative grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
                        <div className="space-y-5">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    {context.scope_label}
                                </span>
                                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">{context.annee}</span>
                                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">{context.filiere}</span>
                            </div>
                            <div className="space-y-3">
                                <h1 className="max-w-3xl font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                                    Une vue unique pour piloter la structure, les examens, la surveillance et les resultats.
                                </h1>
                                <p className="max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
                                    Bonjour {user.name}. Cette page relie les grands domaines de l&apos;application avec les
                                    alertes utiles et les acces rapides vers les ecrans de travail.
                                </p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-[24px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                                    <div className="text-xs uppercase tracking-[0.22em] text-white/65">Examens du jour</div>
                                    <div className="mt-2 text-3xl font-semibold">{formatNumber(overview.today_exams)}</div>
                                </div>
                                <div className="rounded-[24px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                                    <div className="text-xs uppercase tracking-[0.22em] text-white/65">Etudiants visibles</div>
                                    <div className="mt-2 text-3xl font-semibold">{formatNumber(stats.etudiants)}</div>
                                </div>
                                <div className="rounded-[24px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                                    <div className="text-xs uppercase tracking-[0.22em] text-white/65">Credits visibles</div>
                                    <div className="mt-2 text-3xl font-semibold">{formatNumber(overview.credit_inscriptions)}</div>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-4">
                            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.26em] text-white/65">Spotlight</p>
                                        <h3 className="mt-2 text-xl font-semibold">Prochaine echeance</h3>
                                    </div>
                                    <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/80">
                                        {generatedAt}
                                    </span>
                                </div>
                                <div className="mt-5 rounded-[22px] bg-black/15 p-4">
                                    <p className="text-lg font-semibold">{spotlight.next_exam_module || 'Aucun examen planifie'}</p>
                                    <p className="mt-2 text-sm text-white/72">{spotlight.next_exam_session || 'Session a confirmer'}</p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-sm text-white/78">
                                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                                            <CalendarDays className="h-4 w-4" />
                                            {spotlight.next_exam_date || 'Date a confirmer'}
                                        </span>
                                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                                            <Clock3 className="h-4 w-4" />
                                            {spotlight.next_exam_time || '--'}
                                        </span>
                                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                                            <Building2 className="h-4 w-4" />
                                            {spotlight.next_exam_room || 'Salle a confirmer'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {quickActions.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            className="rounded-[22px] border border-white/12 bg-white/8 p-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/12"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <span>{item.label}</span>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    {attentionItems.map((item) => {
                        const meta = attentionMeta[item.id] || attentionMeta.repartition;
                        const Icon = meta.icon;
                        const ToneIcon = item.tone === 'positive' ? CheckCircle2 : AlertTriangle;
                        return (
                            <Link key={item.id} href={route(meta.route)} className={`${panelClass} p-4 transition hover:-translate-y-1`}>
                                <div className={`rounded-[22px] border p-4 ${toneClass[item.tone] || toneClass.info}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="rounded-2xl bg-white/70 p-2.5 shadow-sm dark:bg-slate-950/40">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <ToneIcon className="h-4 w-4 opacity-75" />
                                    </div>
                                    <div className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white">{formatNumber(item.value)}</div>
                                    <h3 className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{item.label}</h3>
                                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p>
                                </div>
                            </Link>
                        );
                    })}
                </section>

                <section className={`${panelClass} p-6`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Vue par domaine</p>
                            <h3 className="mt-2 font-serif text-2xl font-semibold text-slate-950 dark:text-white">Tous les aspects de l&apos;application</h3>
                        </div>
                        <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {domainAreas.length} espaces de pilotage
                        </div>
                    </div>
                    <div className="mt-6 grid gap-4 xl:grid-cols-3">
                        {domainAreas.map((area) => {
                            const meta = areaMeta[area.id] || areaMeta.examens;
                            const Icon = meta.icon;
                            return (
                                <div key={area.id} className={`rounded-[28px] border border-slate-200/80 bg-gradient-to-br ${meta.tone} p-5 dark:border-slate-700/80`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className={`rounded-2xl bg-gradient-to-br ${meta.iconTone} p-3 text-white shadow-lg`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                                            {area.scope}
                                        </span>
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{area.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{area.description}</p>
                                    <div className="mt-4 space-y-2">
                                        {area.metrics.map((metric) => (
                                            <div key={`${area.id}-${metric.label}`} className="flex items-center justify-between rounded-2xl bg-white/85 px-3 py-2.5 shadow-sm dark:bg-slate-950/55">
                                                <span className="text-sm text-slate-600 dark:text-slate-300">{metric.label}</span>
                                                <span className="text-sm font-semibold text-slate-950 dark:text-white">{formatNumber(metric.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <Link href={route(meta.route)} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                                        {meta.action}
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className={`${panelClass} p-6`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Etat des examens</p>
                                <h3 className="mt-2 font-serif text-2xl font-semibold text-slate-950 dark:text-white">Lecture rapide du pipeline</h3>
                            </div>
                            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                {formatNumber(stats.examens)} examens traces
                            </div>
                        </div>
                        <div className="mt-6 space-y-5">
                            {statusBreakdown.map((item) => {
                                const meta = statusMeta[item.status] || statusMeta.Planifiee;
                                const ratio = Math.max(6, Math.round((item.count / maxStatusCount) * 100));
                                return (
                                    <div key={item.status} className="space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.pill}`}>{item.status}</span>
                                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatNumber(item.count)}</span>
                                        </div>
                                        <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div className={`h-3 rounded-full bg-gradient-to-r ${meta.bar}`} style={{ width: `${ratio}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className={`${panelClass} p-6`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Prochains examens</p>
                                <h3 className="mt-2 font-serif text-2xl font-semibold text-slate-950 dark:text-white">Timeline operationnelle</h3>
                            </div>
                            <Link href={route('examens.calendar')} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                                Calendrier
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        {upcomingExams.length > 0 ? (
                            <div className="mt-6 space-y-3">
                                {upcomingExams.map((exam) => {
                                    const meta = statusMeta[exam.status] || statusMeta.Planifiee;
                                    return (
                                        <div key={exam.id} className="rounded-[24px] border border-slate-200/80 bg-slate-50/85 p-4 dark:border-slate-700/80 dark:bg-slate-800/55">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.pill}`}>{exam.status}</span>
                                                    <h4 className="mt-3 text-base font-semibold text-slate-950 dark:text-white">{exam.module}</h4>
                                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{exam.session}</p>
                                                </div>
                                                <div className="text-right text-sm font-semibold text-slate-900 dark:text-white">{exam.date_label}</div>
                                            </div>
                                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                <div className="rounded-2xl bg-white/90 p-3 dark:bg-slate-900/80">
                                                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Horaire</div>
                                                    <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{exam.time_label}</div>
                                                </div>
                                                <div className="rounded-2xl bg-white/90 p-3 dark:bg-slate-900/80">
                                                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Salle</div>
                                                    <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{exam.salle_label}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
                                <ClipboardList className="mx-auto h-10 w-10 text-slate-400" />
                                <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Aucun examen a venir dans ce scope.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
