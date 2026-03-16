<?php

namespace App\Http\Controllers;

use App\Models\Absence;
use App\Models\AnneeUniversitaire;
use App\Models\Anonymat;
use App\Models\Capitalisation;
use App\Models\Commission;
use App\Models\Correcteur;
use App\Models\DecisionCommission;
use App\Models\Deliberation;
use App\Models\Document;
use App\Models\Enseignant;
use App\Models\EnseignantModule;
use App\Models\Etudiant;
use App\Models\Examen;
use App\Models\Faculte;
use App\Models\GrilleCorrection;
use App\Models\IncidentExamen;
use App\Models\InscriptionAdministrative;
use App\Models\InscriptionPedagogique;
use App\Models\MembreCommission;
use App\Models\Module;
use App\Models\Note;
use App\Models\OffreFormation;
use App\Models\PvExamen;
use App\Models\Reclamation;
use App\Models\RepartitionEtudiant;
use App\Models\ResultatElement;
use App\Models\ResultatModule;
use App\Models\Salle;
use App\Models\Section;
use App\Models\Semestre;
use App\Models\SessionExamen;
use App\Models\Stage;
use App\Models\SujetExamen;
use App\Models\Surveillance;
use App\Models\Surveillant;
use App\Models\TirageExamen;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $context = $this->context($request);
        $selectedFiliereId = $context['filiere_id'];
        $selectedAnneeId = $context['annee_id'];

        $examensQuery = $this->examensQuery($selectedFiliereId, $selectedAnneeId);
        $sessionsQuery = $this->sessionsQuery($selectedFiliereId, $selectedAnneeId);
        $modulesQuery = $this->modulesQuery($selectedFiliereId, $selectedAnneeId);
        $inscriptionsQuery = $this->inscriptionsQuery($selectedFiliereId, $selectedAnneeId);
        $offresQuery = $this->offresQuery($selectedFiliereId, $selectedAnneeId);
        $administrativesQuery = $this->administrativesQuery($selectedFiliereId, $selectedAnneeId);
        $etudiantsQuery = $this->etudiantsQuery($selectedFiliereId, $selectedAnneeId);
        $capitalisationsQuery = $this->capitalisationsQuery($selectedFiliereId, $selectedAnneeId);
        $stagesQuery = $this->stagesQuery($selectedFiliereId, $selectedAnneeId);
        $sujetsQuery = $this->sujetsQuery($selectedFiliereId, $selectedAnneeId);
        $grillesQuery = $this->grillesQuery($selectedFiliereId, $selectedAnneeId);
        $tiragesQuery = $this->tiragesQuery($selectedFiliereId, $selectedAnneeId);
        $surveillancesQuery = $this->surveillancesQuery($selectedFiliereId, $selectedAnneeId);
        $repartitionsQuery = $this->repartitionsQuery($selectedFiliereId, $selectedAnneeId);
        $anonymatsQuery = $this->anonymatsQuery($selectedFiliereId, $selectedAnneeId);
        $absencesQuery = $this->absencesQuery($selectedFiliereId, $selectedAnneeId);
        $incidentsQuery = $this->incidentsQuery($selectedFiliereId, $selectedAnneeId);
        $pvQuery = $this->pvQuery($selectedFiliereId, $selectedAnneeId);
        $correcteursQuery = $this->correcteursQuery($selectedFiliereId, $selectedAnneeId);
        $notesQuery = $this->notesQuery($selectedFiliereId, $selectedAnneeId);
        $resultatsElementsQuery = $this->resultatsElementsQuery($selectedFiliereId, $selectedAnneeId);
        $resultatsModulesQuery = $this->resultatsModulesQuery($selectedFiliereId, $selectedAnneeId);
        $reclamationsQuery = $this->reclamationsQuery($selectedFiliereId, $selectedAnneeId);
        $deliberationsQuery = $this->deliberationsQuery($selectedFiliereId, $selectedAnneeId);

        $availableRooms = Salle::query()->where('est_disponible', true)->count();
        $unavailableRooms = Salle::query()->where('est_disponible', false)->count();

        $stats = [
            'examens' => (clone $examensQuery)->count(),
            'sessions' => (clone $sessionsQuery)->count(),
            'modules' => (clone $modulesQuery)->count(),
            'inscriptions' => (clone $inscriptionsQuery)->count(),
            'etudiants' => (clone $etudiantsQuery)->count(),
            'salles' => Salle::count(),
            'enseignants' => Enseignant::count(),
        ];

        $overview = [
            'ready_repartitions' => (clone $examensQuery)->has('repartitions')->count(),
            'without_repartition' => (clone $examensQuery)->doesntHave('repartitions')->count(),
            'shared_sessions' => (clone $sessionsQuery)->whereNull('id_filiere')->count(),
            'credit_inscriptions' => (clone $inscriptionsQuery)->where('type_inscription', 'Credit')->count(),
            'today_exams' => (clone $examensQuery)->whereDate('date_examen', today())->count(),
        ];
        $overview['completion_rate'] = $stats['examens'] > 0
            ? (int) round(($overview['ready_repartitions'] / $stats['examens']) * 100)
            : 0;

        $statusBreakdown = collect(Examen::STATUTS)
            ->map(function (string $status) use ($examensQuery) {
                return [
                    'status' => $status,
                    'count' => (clone $examensQuery)->where('statut', $status)->count(),
                ];
            })
            ->values();

        $upcomingExams = (clone $examensQuery)
            ->with([
                'module:id_module,code_module,nom_module',
                'sessionExamen:id_session_examen,nom_session',
                'salle:id_salle,nom_salle',
                'salles:id_salle,nom_salle',
            ])
            ->whereDate('date_examen', '>=', today())
            ->orderBy('date_examen')
            ->orderBy('date_debut')
            ->take(6)
            ->get([
                'id_examen',
                'id_session_examen',
                'id_module',
                'id_salle',
                'date_examen',
                'date_debut',
                'date_fin',
                'statut',
            ])
            ->map(function (Examen $examen) {
                $salleLabel = $examen->salles
                    ->pluck('nom_salle')
                    ->filter()
                    ->unique()
                    ->implode(' / ');

                if ($salleLabel === '' && $examen->salle) {
                    $salleLabel = $examen->salle->nom_salle;
                }

                return [
                    'id' => $examen->id_examen,
                    'module' => trim(
                        ($examen->module?->code_module ?? '') .
                        (($examen->module?->code_module && $examen->module?->nom_module) ? ' - ' : '') .
                        ($examen->module?->nom_module ?? 'Module')
                    ),
                    'session' => $examen->sessionExamen?->nom_session ?? 'Session',
                    'status' => $examen->statut,
                    'date_label' => optional($examen->date_examen)->format('d M Y') ?? 'Date a confirmer',
                    'time_label' => trim(
                        (optional($examen->date_debut)->format('H:i') ?? '--') .
                        ' - ' .
                        (optional($examen->date_fin)->format('H:i') ?? '--')
                    ),
                    'salle_label' => $salleLabel !== '' ? $salleLabel : 'Salle a confirmer',
                ];
            })
            ->values();

        $nextExam = $upcomingExams->first();
        $withoutSurveillance = (clone $examensQuery)->doesntHave('surveillances')->count();
        $correctionBacklog = Anonymat::query()
            ->whereDoesntHave('notes')
            ->whereHas('examen', function (Builder $examenQuery) use ($selectedFiliereId, $selectedAnneeId) {
                $this->scopeExamens($examenQuery, $selectedFiliereId, $selectedAnneeId);
                $examenQuery->where('statut', 'Terminee');
            })
            ->count();
        $reclamationCount = (clone $reclamationsQuery)->count();

        $domainAreas = [
            [
                'id' => 'configuration',
                'scope' => 'Transversal',
                'title' => 'Configuration',
                'description' => 'Cadre institutionnel, annees ouvertes et capacite des salles.',
                'metrics' => [
                    $this->metric('Facultes', Faculte::count()),
                    $this->metric('Annees', AnneeUniversitaire::count()),
                    $this->metric('Salles dispo', $availableRooms),
                    $this->metric('Salles bloquees', $unavailableRooms),
                ],
            ],
            [
                'id' => 'academique',
                'scope' => $context['scope_label'],
                'title' => 'Structure academique',
                'description' => 'Sections, semestres, modules et offres visibles dans le scope actif.',
                'metrics' => [
                    $this->metric('Sections', $this->sectionsCount($selectedFiliereId, $selectedAnneeId)),
                    $this->metric('Semestres', $this->semestresCount($selectedFiliereId, $selectedAnneeId)),
                    $this->metric('Modules', (clone $modulesQuery)->count()),
                    $this->metric('Offres', (clone $offresQuery)->count()),
                ],
            ],
            [
                'id' => 'personnes',
                'scope' => $context['scope_label'],
                'title' => 'Personnes',
                'description' => 'Population et intervenants mobilises par la formation et les examens.',
                'metrics' => [
                    $this->metric('Etudiants', (clone $etudiantsQuery)->count()),
                    $this->metric('Enseignants', Enseignant::count()),
                    $this->metric('Surveillants', Surveillant::count()),
                    $this->metric('Affectations', $this->enseignantModulesCount($selectedFiliereId, $selectedAnneeId)),
                ],
            ],
            [
                'id' => 'inscriptions',
                'scope' => $context['scope_label'],
                'title' => 'Inscriptions',
                'description' => 'Vision des flux administratifs, pedagogiques, capitalisations et stages.',
                'metrics' => [
                    $this->metric('Administratives', (clone $administrativesQuery)->count()),
                    $this->metric('Pedagogiques', (clone $inscriptionsQuery)->count()),
                    $this->metric('Capitalisations', (clone $capitalisationsQuery)->count()),
                    $this->metric('Stages', (clone $stagesQuery)->count()),
                ],
            ],
            [
                'id' => 'examens',
                'scope' => $context['scope_label'],
                'title' => 'Examens',
                'description' => 'Sessions, planification, sujets et tirages relies aux campagnes en cours.',
                'metrics' => [
                    $this->metric('Sessions', (clone $sessionsQuery)->count()),
                    $this->metric('Examens', (clone $examensQuery)->count()),
                    $this->metric('Communes', $overview['shared_sessions']),
                    $this->metric('Tirages', (clone $tiragesQuery)->count()),
                ],
            ],
            [
                'id' => 'surveillance',
                'scope' => $context['scope_label'],
                'title' => 'Surveillance',
                'description' => 'Execution terrain: repartition, anonymat, absences, incidents et PV.',
                'metrics' => [
                    $this->metric('Repartitions', (clone $repartitionsQuery)->count()),
                    $this->metric('Surveillances', (clone $surveillancesQuery)->count()),
                    $this->metric('Anonymats', (clone $anonymatsQuery)->count()),
                    $this->metric('Incidents', (clone $incidentsQuery)->count()),
                ],
            ],
            [
                'id' => 'correction',
                'scope' => $context['scope_label'],
                'title' => 'Correction & resultats',
                'description' => 'Correcteurs, notes et resultats valides apres la passation.',
                'metrics' => [
                    $this->metric('Correcteurs', (clone $correcteursQuery)->count()),
                    $this->metric('Notes', (clone $notesQuery)->count()),
                    $this->metric('Res. element', (clone $resultatsElementsQuery)->count()),
                    $this->metric('Res. module', (clone $resultatsModulesQuery)->count()),
                ],
            ],
            [
                'id' => 'commissions',
                'scope' => 'Mixte',
                'title' => 'Commissions',
                'description' => 'Instances, membres, deliberations et decisions a coordonner.',
                'metrics' => [
                    $this->metric('Commissions', Commission::count()),
                    $this->metric('Membres', MembreCommission::count()),
                    $this->metric('Deliberations', (clone $deliberationsQuery)->count()),
                    $this->metric('Decisions', DecisionCommission::count()),
                ],
            ],
            [
                'id' => 'documents',
                'scope' => 'Mixte',
                'title' => 'Documents & traces',
                'description' => 'Pieces partagees, sujets, grilles et proces-verbaux produits.',
                'metrics' => [
                    $this->metric('Documents', Document::count()),
                    $this->metric('Sujets', (clone $sujetsQuery)->count()),
                    $this->metric('Grilles', (clone $grillesQuery)->count()),
                    $this->metric('PV', (clone $pvQuery)->count()),
                ],
            ],
        ];

        $attentionItems = collect([
            [
                'id' => 'repartition',
                'label' => 'Repartitions a finaliser',
                'value' => $overview['without_repartition'],
                'description' => 'Examens encore sans salle detaillee ni positions consolidees.',
                'tone' => $overview['without_repartition'] > 0 ? 'danger' : 'positive',
            ],
            [
                'id' => 'surveillance',
                'label' => 'Surveillances manquantes',
                'value' => $withoutSurveillance,
                'description' => 'Examens planifies sans equipe de surveillance rattachee.',
                'tone' => $withoutSurveillance > 0 ? 'warning' : 'positive',
            ],
            [
                'id' => 'correction',
                'label' => 'Copies sans note',
                'value' => $correctionBacklog,
                'description' => 'Anonymats termines qui attendent encore une note.',
                'tone' => $correctionBacklog > 0 ? 'warning' : 'positive',
            ],
            [
                'id' => 'reclamations',
                'label' => 'Reclamations a suivre',
                'value' => $reclamationCount,
                'description' => 'Cas a instruire entre resultats, commissions et decisions.',
                'tone' => $reclamationCount > 0 ? 'info' : 'positive',
            ],
            [
                'id' => 'rooms',
                'label' => 'Salles indisponibles',
                'value' => $unavailableRooms,
                'description' => 'Espaces bloques a rouvrir ou a contourner pour la planification.',
                'tone' => $unavailableRooms > 0 ? 'warning' : 'positive',
            ],
        ])->sortByDesc('value')->values();

        return Inertia::render('Dashboard', [
            'context' => [
                'filiere' => $context['filiere'],
                'annee' => $context['annee'],
                'scope_label' => $context['scope_label'],
            ],
            'stats' => $stats,
            'overview' => $overview,
            'statusBreakdown' => $statusBreakdown,
            'upcomingExams' => $upcomingExams,
            'domainAreas' => $domainAreas,
            'attentionItems' => $attentionItems,
            'spotlight' => [
                'next_exam_module' => $nextExam['module'] ?? null,
                'next_exam_session' => $nextExam['session'] ?? null,
                'next_exam_date' => $nextExam['date_label'] ?? null,
                'next_exam_time' => $nextExam['time_label'] ?? null,
                'next_exam_room' => $nextExam['salle_label'] ?? null,
            ],
            'generatedAt' => now()->format('d/m/Y H:i'),
        ]);
    }

    private function context(Request $request): array
    {
        $selection = $request->user()?->userFiliereAnnees()
            ->with(['filiere:id_filiere,nom_filiere', 'anneeUniv:id_annee,annee_univ'])
            ->first();

        $activeYear = AnneeUniversitaire::query()
            ->where('est_active', true)
            ->first(['id_annee', 'annee_univ']);

        $filiereId = $selection?->id_filiere;
        $anneeId = $selection?->id_annee ?? $activeYear?->id_annee;

        $filiereLabel = $selection?->filiere?->nom_filiere ?: 'Toutes les filieres';
        $anneeLabel = $selection?->anneeUniv?->annee_univ ?: ($activeYear?->annee_univ ?: 'Toutes les annees');

        return [
            'filiere_id' => $filiereId ? (int) $filiereId : null,
            'annee_id' => $anneeId ? (int) $anneeId : null,
            'filiere' => $filiereLabel,
            'annee' => $anneeLabel,
            'scope_label' => $selection?->id_filiere || $selection?->id_annee
                ? 'Vue contextualisee'
                : ($activeYear ? 'Vue annee active' : 'Vue globale'),
        ];
    }

    private function examensQuery(?int $filiereId, ?int $anneeId): Builder
    {
        $query = Examen::query();
        $this->scopeExamens($query, $filiereId, $anneeId);

        return $query;
    }

    private function sessionsQuery(?int $filiereId, ?int $anneeId): Builder
    {
        $query = SessionExamen::query();
        $this->scopeSessions($query, $filiereId, $anneeId);

        return $query;
    }

    private function modulesQuery(?int $filiereId, ?int $anneeId): Builder
    {
        $query = Module::query();

        if ($filiereId || $anneeId) {
            $query->whereHas('offresFormation', function (Builder $offreQuery) use ($filiereId, $anneeId) {
                $this->scopeOffres($offreQuery, $filiereId, $anneeId);
            });
        }

        return $query;
    }

    private function inscriptionsQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return InscriptionPedagogique::query()
            ->where('type_inscription', '!=', 'Capitalisation')
            ->whereHas('offreFormation', function (Builder $offreQuery) use ($filiereId, $anneeId) {
                $this->scopeOffres($offreQuery, $filiereId, $anneeId);
            });
    }

    private function offresQuery(?int $filiereId, ?int $anneeId): Builder
    {
        $query = OffreFormation::query();
        $this->scopeOffres($query, $filiereId, $anneeId);

        return $query;
    }

    private function administrativesQuery(?int $filiereId, ?int $anneeId): Builder
    {
        $query = InscriptionAdministrative::query();
        $this->scopeAdministratives($query, $filiereId, $anneeId);

        return $query;
    }

    private function etudiantsQuery(?int $filiereId, ?int $anneeId): Builder
    {
        $query = Etudiant::query();

        if ($anneeId) {
            $query->whereHas('inscriptionsAdministratives', function (Builder $administrativeQuery) use ($filiereId, $anneeId) {
                $this->scopeAdministratives($administrativeQuery, $filiereId, $anneeId);
            });
        } elseif ($filiereId) {
            $query->whereHas('section', function (Builder $sectionQuery) use ($filiereId) {
                $sectionQuery->where('id_filiere', $filiereId);
            });
        }

        return $query;
    }

    private function capitalisationsQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return Capitalisation::query()
            ->whereHas('offreFormation', function (Builder $offreQuery) use ($filiereId, $anneeId) {
                $this->scopeOffres($offreQuery, $filiereId, $anneeId);
            });
    }

    private function stagesQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return Stage::query()
            ->whereHas('inscriptionPedagogique.offreFormation', function (Builder $offreQuery) use ($filiereId, $anneeId) {
                $this->scopeOffres($offreQuery, $filiereId, $anneeId);
            });
    }

    private function sujetsQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return SujetExamen::query()
            ->whereHas('examen', function (Builder $examenQuery) use ($filiereId, $anneeId) {
                $this->scopeExamens($examenQuery, $filiereId, $anneeId);
            });
    }

    private function grillesQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return GrilleCorrection::query()
            ->whereHas('sujet.examen', function (Builder $examenQuery) use ($filiereId, $anneeId) {
                $this->scopeExamens($examenQuery, $filiereId, $anneeId);
            });
    }

    private function tiragesQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return TirageExamen::query()
            ->whereHas('sujet.examen', function (Builder $examenQuery) use ($filiereId, $anneeId) {
                $this->scopeExamens($examenQuery, $filiereId, $anneeId);
            });
    }

    private function surveillancesQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return Surveillance::query()
            ->whereHas('examen', function (Builder $examenQuery) use ($filiereId, $anneeId) {
                $this->scopeExamens($examenQuery, $filiereId, $anneeId);
            });
    }

    private function repartitionsQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return RepartitionEtudiant::query()
            ->whereHas('examen', function (Builder $examenQuery) use ($filiereId, $anneeId) {
                $this->scopeExamens($examenQuery, $filiereId, $anneeId);
            });
    }

    private function anonymatsQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return Anonymat::query()
            ->whereHas('examen', function (Builder $examenQuery) use ($filiereId, $anneeId) {
                $this->scopeExamens($examenQuery, $filiereId, $anneeId);
            });
    }

    private function absencesQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return Absence::query()
            ->whereHas('examen', function (Builder $examenQuery) use ($filiereId, $anneeId) {
                $this->scopeExamens($examenQuery, $filiereId, $anneeId);
            });
    }

    private function incidentsQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return IncidentExamen::query()
            ->where(function (Builder $query) use ($filiereId, $anneeId) {
                $query
                    ->whereHas('surveillance.examen', function (Builder $examenQuery) use ($filiereId, $anneeId) {
                        $this->scopeExamens($examenQuery, $filiereId, $anneeId);
                    })
                    ->orWhereHas('anonymat.examen', function (Builder $examenQuery) use ($filiereId, $anneeId) {
                        $this->scopeExamens($examenQuery, $filiereId, $anneeId);
                    });
            });
    }

    private function pvQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return PvExamen::query()
            ->whereHas('examen', function (Builder $examenQuery) use ($filiereId, $anneeId) {
                $this->scopeExamens($examenQuery, $filiereId, $anneeId);
            });
    }

    private function correcteursQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return Correcteur::query()
            ->whereHas('examen', function (Builder $examenQuery) use ($filiereId, $anneeId) {
                $this->scopeExamens($examenQuery, $filiereId, $anneeId);
            });
    }

    private function notesQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return Note::query()
            ->where(function (Builder $query) use ($filiereId, $anneeId) {
                $query
                    ->whereHas('correcteur.examen', function (Builder $examenQuery) use ($filiereId, $anneeId) {
                        $this->scopeExamens($examenQuery, $filiereId, $anneeId);
                    })
                    ->orWhereHas('anonymat.examen', function (Builder $examenQuery) use ($filiereId, $anneeId) {
                        $this->scopeExamens($examenQuery, $filiereId, $anneeId);
                    });
            });
    }

    private function resultatsElementsQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return ResultatElement::query()
            ->whereHas('sessionExamen', function (Builder $sessionQuery) use ($filiereId, $anneeId) {
                $this->scopeSessions($sessionQuery, $filiereId, $anneeId);
            });
    }

    private function resultatsModulesQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return ResultatModule::query()
            ->whereHas('inscriptionPedagogique.offreFormation', function (Builder $offreQuery) use ($filiereId, $anneeId) {
                $this->scopeOffres($offreQuery, $filiereId, $anneeId);
            });
    }

    private function reclamationsQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return Reclamation::query()
            ->whereHas('inscriptionPedagogique.offreFormation', function (Builder $offreQuery) use ($filiereId, $anneeId) {
                $this->scopeOffres($offreQuery, $filiereId, $anneeId);
            });
    }

    private function deliberationsQuery(?int $filiereId, ?int $anneeId): Builder
    {
        return Deliberation::query()
            ->whereHas('sessionExamen', function (Builder $sessionQuery) use ($filiereId, $anneeId) {
                $this->scopeSessions($sessionQuery, $filiereId, $anneeId);
            });
    }

    private function scopeExamens(Builder $query, ?int $filiereId, ?int $anneeId): void
    {
        if ($filiereId) {
            $query->where(function (Builder $builder) use ($filiereId) {
                $builder
                    ->whereHas('sessionExamen', function (Builder $sessionQuery) use ($filiereId) {
                        $sessionQuery->where('id_filiere', $filiereId);
                    })
                    ->orWhere(function (Builder $sharedQuery) use ($filiereId) {
                        $sharedQuery
                            ->whereHas('sessionExamen', function (Builder $sessionQuery) {
                                $sessionQuery->whereNull('id_filiere');
                            })
                            ->whereHas('module.offresFormation.section', function (Builder $moduleQuery) use ($filiereId) {
                                $moduleQuery->where('id_filiere', $filiereId);
                            });
                    });
            });
        }

        if ($anneeId) {
            $query->whereHas('sessionExamen', function (Builder $sessionQuery) use ($anneeId) {
                $sessionQuery->where('id_annee', $anneeId);
            });
        }
    }

    private function scopeSessions(Builder $query, ?int $filiereId, ?int $anneeId): void
    {
        if ($anneeId) {
            $query->where('id_annee', $anneeId);
        }

        if ($filiereId) {
            $query->where(function (Builder $builder) use ($filiereId) {
                $builder
                    ->where('id_filiere', $filiereId)
                    ->orWhereNull('id_filiere');
            });
        }
    }

    private function scopeOffres(Builder $query, ?int $filiereId, ?int $anneeId): void
    {
        if ($anneeId) {
            $query->where('id_annee', $anneeId);
        }

        if ($filiereId) {
            $query->whereHas('section', function (Builder $sectionQuery) use ($filiereId) {
                $sectionQuery->where('id_filiere', $filiereId);
            });
        }
    }

    private function scopeAdministratives(Builder $query, ?int $filiereId, ?int $anneeId): void
    {
        if ($anneeId) {
            $query->where('id_annee', $anneeId);
        }

        if ($filiereId) {
            $query->whereHas('section', function (Builder $sectionQuery) use ($filiereId) {
                $sectionQuery->where('id_filiere', $filiereId);
            });
        }
    }

    private function sectionsCount(?int $filiereId, ?int $anneeId): int
    {
        $query = Section::query();

        if ($filiereId) {
            $query->where('id_filiere', $filiereId);
        }

        if ($anneeId) {
            $query->whereHas('offresFormation', function (Builder $offreQuery) use ($filiereId, $anneeId) {
                $this->scopeOffres($offreQuery, $filiereId, $anneeId);
            });
        }

        return $query->count();
    }

    private function semestresCount(?int $filiereId, ?int $anneeId): int
    {
        $query = Semestre::query();

        if ($filiereId || $anneeId) {
            $query->whereHas('offresFormation', function (Builder $offreQuery) use ($filiereId, $anneeId) {
                $this->scopeOffres($offreQuery, $filiereId, $anneeId);
            });
        }

        return $query->count();
    }

    private function enseignantModulesCount(?int $filiereId, ?int $anneeId): int
    {
        if (! Schema::hasTable('enseignant_module')) {
            return 0;
        }

        $query = EnseignantModule::query();

        if ($filiereId || $anneeId) {
            $query->whereHas('module.offresFormation', function (Builder $offreQuery) use ($filiereId, $anneeId) {
                $this->scopeOffres($offreQuery, $filiereId, $anneeId);
            });
        }

        return $query->count();
    }

    private function metric(string $label, int $value): array
    {
        return [
            'label' => $label,
            'value' => $value,
        ];
    }
}
