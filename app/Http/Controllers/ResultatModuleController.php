<?php

namespace App\Http\Controllers;

use App\Models\AnneeUniversitaire;
use App\Models\Filiere;
use App\Models\InscriptionAdministrative;
use App\Models\ModuleValidationRule;
use App\Models\OffreFormation;
use App\Services\ModuleValidationRuleService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Spatie\LaravelPdf\Facades\Pdf;

class ResultatModuleController extends Controller
{
    public function __construct(private ModuleValidationRuleService $moduleValidationRuleService)
    {
    }

    public function index(Request $request)
    {
        $scope = $this->resolveScope($request);
        $filters = $this->resolveRequestedFilters($request);
        $allStudents = $this->buildStudentReleves($scope['filiere_id'], $scope['annee_id']);
        $semesterOptions = $this->availableSemesters($allStudents);
        $studentsForOptions = $this->applyReleveFilters($allStudents, [
            'semester_id' => $filters['semester_id'],
            'student_id' => null,
        ]);
        $studentOptions = $this->availableStudents($studentsForOptions);
        $students = $this->applyReleveFilters($allStudents, $filters);

        $studentsSummary = $students
            ->map(function (array $student) {
                return [
                    'student_id' => $student['student_id'],
                    'cne' => $student['cne'],
                    'nom' => $student['nom'],
                    'prenom' => $student['prenom'],
                    'modules_count' => $student['modules_count'],
                    'elements_count' => $student['elements_count'],
                    'validated_modules_count' => $student['validated_modules_count'],
                ];
            })
            ->values();

        return Inertia::render('correction/ResultatsModules/Index', [
            'scope' => [
                'filiere' => $scope['filiere_name'],
                'annee' => $scope['annee_label'],
                'filiere_id' => $scope['filiere_id'],
            ],
            'filters' => $filters,
            'filterOptions' => [
                'semesters' => $semesterOptions->values(),
                'students' => $studentOptions->values(),
                'semesterSessions' => $this->semesterSessionOptions(),
                'modules' => $this->availableModulesForScope($scope['filiere_id'], $scope['annee_id'])->values(),
            ],
            'stats' => [
                'students' => $students->count(),
                'modules' => $students->sum('modules_count'),
                'elements' => $students->sum('elements_count'),
                'validated_modules' => $students->sum('validated_modules_count'),
            ],
            'validationRules' => $this->validationRulesForScope($scope['filiere_id'])->values(),
            'students' => $studentsSummary,
            'exportYearUrl' => route('correction.resultats-modules.export-releve-notes'),
            'exportSemesterUrl' => route('correction.resultats-modules.export-releve-semestre'),
        ]);
    }

    public function exportReleveNotes(Request $request)
    {
        $scope = $this->resolveScope($request);
        $filters = $this->resolveRequestedFilters($request);
        $allStudents = $this->buildStudentReleves($scope['filiere_id'], $scope['annee_id']);
        $students = $this->applyReleveFilters($allStudents, [
            'semester_id' => null,
            'student_id' => $filters['student_id'],
        ]);

        if ($students->isEmpty()) {
            return back()->with('error', 'Aucun resultat module/element trouve pour cette selection.');
        }

        $selectedStudent = $allStudents->firstWhere('student_id', $filters['student_id']);
        $isGroupedExport = empty($filters['student_id']);
        $scopeLabel = collect([
            $scope['filiere_name'],
            $scope['annee_label'],
            $selectedStudent['nom_complet'] ?? null,
        ])->filter()->implode(' - ');

        $filenameParts = [
            'releve-annee',
            $isGroupedExport ? 'groupe' : null,
            $scope['annee_slug'] !== '' ? $scope['annee_slug'] : 'global',
        ];

        if (! empty($selectedStudent['cne'])) {
            $filenameParts[] = $this->slug($selectedStudent['cne']);
        } elseif (! empty($selectedStudent['nom_complet'])) {
            $filenameParts[] = $this->slug($selectedStudent['nom_complet']);
        }

        $filename = implode('-', array_filter($filenameParts)).'.pdf';

        $pdf = Pdf::view($isGroupedExport ? 'pdfs.releve-notes-grouped' : 'pdfs.releve-notes', [
            'students' => $students,
            'generatedAt' => now(),
            'scopeLabel' => $scopeLabel,
            'filiereLabel' => $scope['filiere_name'],
            'anneeLabel' => $scope['annee_label'],
            'selectedSemesterLabel' => null,
            'selectedStudentLabel' => $selectedStudent['nom_complet'] ?? null,
        ]);

        if ($isGroupedExport) {
            return $pdf
                ->format('a3')
                ->landscape()
                ->margins(6, 6, 6, 6)
                ->download($filename);
        }

        return $pdf
            ->format('a4')
            ->portrait()
            ->margins(12, 10, 14, 10)
            ->footerView('pdfs.partials.footer', [
                'hideFooterMeta' => true,
            ])
            ->download($filename);
    }

    public function exportReleveSemestre(Request $request)
    {
        $scope = $this->resolveScope($request);
        $filters = $this->resolveRequestedFilters($request);
        $allStudents = $this->buildStudentReleves($scope['filiere_id'], $scope['annee_id']);
        $semesterOptions = $this->availableSemesters($allStudents);
        $releves = $this->buildSemesterReleves($allStudents, $filters);

        if ($releves->isEmpty()) {
            return back()->with('error', 'Aucun releve semestriel trouve pour cette selection.');
        }

        $selectedSemester = $semesterOptions->firstWhere('id', $filters['semester_id']);
        $selectedStudent = $allStudents->firstWhere('student_id', $filters['student_id']);
        $selectedSemesterSessionLabel = $this->semesterSessionLabel($filters['semester_session']);
        $scopeLabel = collect([
            $scope['filiere_name'],
            $scope['annee_label'],
            $selectedSemester['nom'] ?? null,
            $selectedSemesterSessionLabel,
            $selectedStudent['nom_complet'] ?? null,
        ])->filter()->implode(' - ');

        $filenameParts = [
            'releve-semestre',
            $scope['annee_slug'] !== '' ? $scope['annee_slug'] : 'global',
        ];

        if (! empty($selectedSemester['nom'])) {
            $filenameParts[] = $this->slug($selectedSemester['nom']);
        }

        if ($selectedSemesterSessionLabel) {
            $filenameParts[] = $this->slug($selectedSemesterSessionLabel);
        }

        if (! empty($selectedStudent['cne'])) {
            $filenameParts[] = $this->slug($selectedStudent['cne']);
        } elseif (! empty($selectedStudent['nom_complet'])) {
            $filenameParts[] = $this->slug($selectedStudent['nom_complet']);
        }

        $filename = implode('-', array_filter($filenameParts)).'.pdf';

        return Pdf::view('pdfs.releve-semestre', [
            'releves' => $releves,
            'generatedAt' => now(),
            'scopeLabel' => $scopeLabel,
            'filiereLabel' => $scope['filiere_name'],
            'anneeLabel' => $scope['annee_label'],
            'selectedSemesterLabel' => $selectedSemester['nom'] ?? null,
            'selectedStudentLabel' => $selectedStudent['nom_complet'] ?? null,
            'selectedSemesterSession' => $filters['semester_session'],
            'selectedSemesterSessionLabel' => $selectedSemesterSessionLabel,
            'includeSemesterSummaryBox' => $filters['include_semester_summary'],
        ])
            ->format('a4')
            ->portrait()
            ->margins(12, 10, 14, 10)
            ->footerView('pdfs.partials.footer', [
                'hideFooterMeta' => true,
            ])
            ->download($filename);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $scope = $this->resolveScope($request);

        if (! $scope['filiere_id']) {
            return back()->withErrors(['rules' => 'Aucune filiere de scope disponible pour enregistrer une regle.']);
        }

        $validated = $request->validate([
            'id_module' => ['required', 'integer', 'exists:modules,id_module'],
            'module_pass_threshold' => ['required', 'numeric', 'min:0', 'max:20'],
            'enforce_all_elements_threshold' => ['nullable', 'boolean'],
            'element_pass_threshold' => ['nullable', 'numeric', 'min:0', 'max:20'],
        ]);

        $this->assertModuleBelongsToScope((int) $validated['id_module'], $scope['filiere_id'], $scope['annee_id']);

        ModuleValidationRule::query()->updateOrCreate(
            [
                'id_filiere' => $scope['filiere_id'],
                'id_module' => (int) $validated['id_module'],
            ],
            [
                'module_pass_threshold' => (float) $validated['module_pass_threshold'],
                'enforce_all_elements_threshold' => (bool) ($validated['enforce_all_elements_threshold'] ?? false),
                'element_pass_threshold' => $this->normalizeOptionalThreshold($validated['element_pass_threshold'] ?? null),
            ]
        );

        return back()->with('success', 'Regle de validation enregistree.');
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit($id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $scope = $this->resolveScope($request);
        $rule = ModuleValidationRule::query()
            ->where('id_filiere', $scope['filiere_id'])
            ->findOrFail($id);

        $validated = $request->validate([
            'id_module' => ['required', 'integer', 'exists:modules,id_module'],
            'module_pass_threshold' => ['required', 'numeric', 'min:0', 'max:20'],
            'enforce_all_elements_threshold' => ['nullable', 'boolean'],
            'element_pass_threshold' => ['nullable', 'numeric', 'min:0', 'max:20'],
        ]);

        $this->assertModuleBelongsToScope((int) $validated['id_module'], $scope['filiere_id'], $scope['annee_id']);

        $rule->update([
            'id_module' => (int) $validated['id_module'],
            'module_pass_threshold' => (float) $validated['module_pass_threshold'],
            'enforce_all_elements_threshold' => (bool) ($validated['enforce_all_elements_threshold'] ?? false),
            'element_pass_threshold' => $this->normalizeOptionalThreshold($validated['element_pass_threshold'] ?? null),
        ]);

        return back()->with('success', 'Regle de validation mise a jour.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, $id)
    {
        $scope = $this->resolveScope($request);
        $rule = ModuleValidationRule::query()
            ->where('id_filiere', $scope['filiere_id'])
            ->findOrFail($id);

        $rule->delete();

        return back()->with('success', 'Regle de validation supprimee.');
    }

    private function resolveScope(Request $request): array
    {
        $userScope = auth()->user()?->userFiliereAnnees()->first();

        $filiereId = $request->integer('filiere_id');
        if (! $filiereId && $userScope?->id_filiere) {
            $filiereId = (int) $userScope->id_filiere;
        }

        $anneeId = $request->integer('annee_id');
        if (! $anneeId && $userScope?->id_annee) {
            $anneeId = (int) $userScope->id_annee;
        }

        if (! $anneeId) {
            $anneeId = AnneeUniversitaire::query()
                ->where('est_active', true)
                ->value('id_annee');
        }

        $filiere = $filiereId
            ? Filiere::query()->find($filiereId, ['id_filiere', 'nom_filiere'])
            : null;

        $annee = $anneeId
            ? AnneeUniversitaire::query()->find($anneeId, ['id_annee', 'annee_univ'])
            : null;

        return [
            'filiere_id' => $filiere?->id_filiere ? (int) $filiere->id_filiere : null,
            'annee_id' => $annee?->id_annee ? (int) $annee->id_annee : null,
            'filiere_name' => $filiere?->nom_filiere,
            'annee_label' => $annee?->annee_univ,
            'annee_slug' => $this->slug($annee?->annee_univ),
        ];
    }

    private function resolveRequestedFilters(Request $request): array
    {
        return [
            'semester_id' => $request->integer('semester_id') ?: null,
            'student_id' => $request->integer('student_id') ?: null,
            'semester_session' => $this->normalizeSemesterSession($request->input('semester_session')),
            'include_semester_summary' => $this->requestBoolean($request, 'include_semester_summary', true),
        ];
    }

    private function validationRulesForScope(?int $filiereId): Collection
    {
        return $this->moduleValidationRuleService
            ->rulesForFiliere($filiereId)
            ->values()
            ->map(function (ModuleValidationRule $rule) {
                $moduleLabel = trim(collect([
                    $rule->module?->code_module,
                    $rule->module?->nom_module,
                ])->filter()->implode(' - '));

                return [
                    'id' => $rule->id,
                    'id_module' => (int) $rule->id_module,
                    'module_label' => $moduleLabel !== '' ? $moduleLabel : 'Module',
                    'module_pass_threshold' => (float) $rule->module_pass_threshold,
                    'enforce_all_elements_threshold' => (bool) $rule->enforce_all_elements_threshold,
                    'element_pass_threshold' => $rule->element_pass_threshold !== null
                        ? (float) $rule->element_pass_threshold
                        : null,
                ];
            })
            ->sortBy('module_label')
            ->values();
    }

    private function availableModulesForScope(?int $filiereId, ?int $anneeId): Collection
    {
        return OffreFormation::query()
            ->with(['module:id_module,code_module,nom_module'])
            ->when($anneeId, function ($query) use ($anneeId) {
                $query->where('id_annee', $anneeId);
            })
            ->when($filiereId, function ($query) use ($filiereId) {
                $query->whereHas('section', function ($sectionQuery) use ($filiereId) {
                    $sectionQuery->where('id_filiere', $filiereId);
                });
            })
            ->get(['id_module'])
            ->pluck('module')
            ->filter()
            ->unique('id_module')
            ->map(function ($module) {
                return [
                    'id' => (int) $module->id_module,
                    'label' => trim(collect([
                        $module->code_module,
                        $module->nom_module,
                    ])->filter()->implode(' - ')),
                ];
            })
            ->sortBy('label')
            ->values();
    }

    private function assertModuleBelongsToScope(int $moduleId, ?int $filiereId, ?int $anneeId): void
    {
        $exists = OffreFormation::query()
            ->where('id_module', $moduleId)
            ->when($anneeId, function ($query) use ($anneeId) {
                $query->where('id_annee', $anneeId);
            })
            ->when($filiereId, function ($query) use ($filiereId) {
                $query->whereHas('section', function ($sectionQuery) use ($filiereId) {
                    $sectionQuery->where('id_filiere', $filiereId);
                });
            })
            ->exists();

        abort_unless($exists, 422, 'Le module selectionne ne correspond pas a la filiere courante.');
    }

    private function normalizeOptionalThreshold($value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return round((float) $value, 2);
    }

    private function normalizeSemesterSession($value): ?string
    {
        $normalized = strtolower(trim((string) $value));

        return in_array($normalized, ['normale', 'rattrapage'], true) ? $normalized : null;
    }

    private function semesterSessionOptions(): array
    {
        return [
            [
                'id' => 'normale',
                'label' => 'Session normale',
            ],
            [
                'id' => 'rattrapage',
                'label' => 'Session rattrapage',
            ],
        ];
    }

    private function semesterSessionLabel(?string $session): ?string
    {
        return match ($this->normalizeSemesterSession($session)) {
            'normale' => 'Session normale',
            'rattrapage' => 'Session rattrapage',
            default => null,
        };
    }

    private function requestBoolean(Request $request, string $key, bool $default): bool
    {
        if (! $request->has($key)) {
            return $default;
        }

        return filter_var($request->input($key), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $default;
    }

    private function buildStudentReleves(?int $filiereId, ?int $anneeId): Collection
    {
        $registrations = InscriptionAdministrative::query()
            ->with([
                'etudiant:id_etudiant,cne,nom,prenom',
                'niveau:id_niveau,nom_niveau',
                'section:id_section,id_filiere,nom_section',
                'inscriptionsPedagogiques:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                'inscriptionsPedagogiques.offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
                'inscriptionsPedagogiques.offreFormation.semestre:id_semestre,nom_semestre,ordre',
                'inscriptionsPedagogiques.offreFormation.module:id_module,code_module,nom_module',
                'inscriptionsPedagogiques.offreFormation.module.elements:id_element,id_module,code_element,nom_element,type_element,coefficient',
                'inscriptionsPedagogiques.resultatsModules:id_resultat_module,id_inscription_pedagogique,id_module,moyenne_module,statut,date_validation',
                'inscriptionsPedagogiques.resultatsElements:id_resultat_element,id_inscription_pedagogique,id_element,id_session_examen,moyenne_element,statut,date_validation',
                'inscriptionsPedagogiques.resultatsElements.element:id_element,id_module,code_element,nom_element,type_element,coefficient',
                'inscriptionsPedagogiques.resultatsElements.sessionExamen:id_session_examen,type_session,nom_session',
            ])
            ->when($anneeId, function ($query) use ($anneeId) {
                $query->where('id_annee', $anneeId);
            })
            ->when($filiereId, function ($query) use ($filiereId) {
                $query->whereHas('section', function ($sectionQuery) use ($filiereId) {
                    $sectionQuery->where('id_filiere', $filiereId);
                });
            })
            ->orderBy('id_inscription_admin')
            ->get([
                'id_inscription_admin',
                'id_etudiant',
                'id_annee',
                'id_niveau',
                'id_section',
            ]);

        $validationRules = $this->moduleValidationRuleService->rulesForFiliere($filiereId);

        return $registrations
            ->map(function ($registration) use ($validationRules) {
                $student = $registration->etudiant;
                $modules = collect($registration->inscriptionsPedagogiques ?? [])
                    ->map(function ($pedagogicalRegistration) use ($validationRules) {
                        $offre = $pedagogicalRegistration->offreFormation;
                        $module = $offre?->module;

                        if (! $module) {
                            return null;
                        }

                        $latestModuleResult = $this->latestResultsByKey(
                            collect($pedagogicalRegistration->resultatsModules ?? [])
                                ->filter(function ($result) use ($module) {
                                    return (int) ($result->id_module ?? 0) === (int) $module->id_module;
                                }),
                            'id_module',
                            'id_resultat_module'
                        )->get((int) $module->id_module);

                        $latestElementResults = $this->latestResultsByKey(
                            collect($pedagogicalRegistration->resultatsElements ?? [])
                                ->filter(function ($result) use ($module) {
                                    return (int) ($result->element?->id_module ?? 0) === (int) $module->id_module;
                                }),
                            'id_element',
                            'id_resultat_element'
                        );

                        $elementSessionResults = collect($pedagogicalRegistration->resultatsElements ?? [])
                            ->filter(function ($result) use ($module) {
                                return (int) ($result->element?->id_module ?? 0) === (int) $module->id_module;
                            })
                            ->sortByDesc(function ($row) {
                                return sprintf(
                                    '%s|%010d',
                                    (string) ($row->date_validation ?? ''),
                                    (int) ($row->id_resultat_element ?? 0)
                                );
                            })
                            ->groupBy(function ($row) {
                                return sprintf(
                                    '%d|%s',
                                    (int) ($row->id_element ?? 0),
                                    $this->sessionCategory($row)
                                );
                            })
                            ->map(function (Collection $group) {
                                return $group->first();
                            });

                        $moduleElements = collect($module->elements ?? [])->keyBy('id_element');
                        $resultElements = $latestElementResults
                            ->map(function ($result) {
                                return $result->element;
                            })
                            ->filter()
                            ->keyBy('id_element');
                        $allElements = $moduleElements
                            ->union($resultElements)
                            ->sortBy(function ($element) {
                                return sprintf(
                                    '%s|%s',
                                    strtolower((string) ($element->code_element ?? '')),
                                    strtolower((string) ($element->nom_element ?? ''))
                                );
                            })
                            ->values();

                        $totalCoefficient = (float) $allElements
                            ->sum(function ($element) {
                                return (float) ($element->coefficient ?? 0);
                            });

                        $elements = $allElements
                            ->map(function ($element) use ($latestElementResults, $elementSessionResults, $totalCoefficient) {
                                $elementResult = $latestElementResults->get((int) $element->id_element);
                                $normalResult = $elementSessionResults->get(sprintf('%d|normale', (int) $element->id_element));
                                $rattrapageResult = $elementSessionResults->get(sprintf('%d|rattrapage', (int) $element->id_element));
                                $typeElement = strtoupper((string) ($element->type_element ?? 'COURS'));
                                $isTpElement = $typeElement === 'TP';
                                $coefficient = (float) ($element->coefficient ?? 1);
                                $percentage = $totalCoefficient > 0
                                    ? round(($coefficient / $totalCoefficient) * 100, 2)
                                    : null;
                                $normalScore = $normalResult?->moyenne_element !== null
                                    ? (float) $normalResult->moyenne_element
                                    : null;
                                $rattrapageScore = $rattrapageResult?->moyenne_element !== null
                                    ? (float) $rattrapageResult->moyenne_element
                                    : null;

                                return [
                                    'element_id' => (int) $element->id_element,
                                    'code_element' => $element->code_element,
                                    'nom_element' => $element->nom_element,
                                    'type_element' => $typeElement,
                                    'coefficient' => $coefficient,
                                    'coefficient_percent' => $percentage,
                                    'moyenne_element' => $elementResult?->moyenne_element !== null
                                        ? (float) $elementResult->moyenne_element
                                        : null,
                                    'statut_element' => $elementResult?->statut,
                                    'session_normale_tp' => $isTpElement ? $normalScore : null,
                                    'session_normale_exam' => $isTpElement ? null : $normalScore,
                                    'session_normale_note' => $normalScore,
                                    'session_rattrapage_tp' => $isTpElement ? $rattrapageScore : null,
                                    'session_rattrapage_exam' => $isTpElement ? null : $rattrapageScore,
                                    'session_rattrapage_note' => $rattrapageScore,
                                ];
                            })
                            ->values();

                        $moduleNormalTp = $this->weightedSessionAverage($elements, 'session_normale_note', true);
                        $moduleNormalExam = $this->weightedSessionAverage($elements, 'session_normale_note', false);
                        $moduleNormalNote = $this->weightedSessionAverage($elements, 'session_normale_note');
                        $moduleRattrapageTp = $this->weightedSessionAverage($elements, 'session_rattrapage_note', true);
                        $moduleRattrapageExam = $this->weightedSessionAverage($elements, 'session_rattrapage_note', false);
                        $moduleRattrapageNote = $this->weightedSessionAverage($elements, 'session_rattrapage_note');
                        $moduleAverage = $latestModuleResult?->moyenne_module !== null
                            ? (float) $latestModuleResult->moyenne_module
                            : $this->weightedSessionAverage($elements, 'moyenne_element');
                        $evaluation = $this->moduleValidationRuleService->evaluate(
                            $moduleAverage,
                            $elements,
                            $validationRules->get((int) $module->id_module),
                            $latestModuleResult?->statut
                        );

                        return [
                            'module_id' => (int) $module->id_module,
                            'code_module' => $module->code_module,
                            'nom_module' => $module->nom_module,
                            'semestre_id' => (int) ($offre?->id_semestre ?? 0),
                            'semestre_nom' => $offre?->semestre?->nom_semestre,
                            'semestre_ordre' => (int) ($offre?->semestre?->ordre ?? 0),
                            'moyenne_module' => $moduleAverage,
                            'statut_module' => $evaluation['status'],
                            'statut_module_short' => $this->shortStatus($evaluation['status']),
                            'module_threshold' => $evaluation['module_threshold'],
                            'element_threshold' => $evaluation['element_threshold'],
                            'has_custom_validation_rule' => $evaluation['has_custom_rule'],
                            'session_normale_tp' => $moduleNormalTp,
                            'session_normale_exam' => $moduleNormalExam,
                            'session_normale_note' => $moduleNormalNote,
                            'session_rattrapage_tp' => $moduleRattrapageTp,
                            'session_rattrapage_exam' => $moduleRattrapageExam,
                            'session_rattrapage_note' => $moduleRattrapageNote,
                            'elements' => $elements,
                        ];
                    })
                    ->filter()
                    ->sortBy(function (array $module) {
                        return sprintf(
                            '%03d|%s|%s',
                            (int) ($module['semestre_ordre'] ?? 0),
                            strtolower((string) ($module['code_module'] ?? '')),
                            strtolower((string) ($module['nom_module'] ?? ''))
                        );
                    })
                    ->values();

                return [
                    'student_id' => (int) ($student?->id_etudiant ?? 0),
                    'cne' => $student?->cne,
                    'nom' => $student?->nom,
                    'prenom' => $student?->prenom,
                    'nom_complet' => trim(($student?->nom ?? '').' '.($student?->prenom ?? '')),
                    'niveau' => $registration->niveau?->nom_niveau,
                    'section' => $registration->section?->nom_section,
                    'modules_count' => $modules->count(),
                    'elements_count' => $modules->sum(function (array $module) {
                        return collect($module['elements'] ?? [])->count();
                    }),
                    'validated_modules_count' => $modules->filter(function (array $module) {
                        return $this->isValidatedModuleStatus($module['statut_module'] ?? null);
                    })->count(),
                    'modules' => $modules,
                ];
            })
            ->filter(function (array $student) {
                return $student['student_id'] > 0 && $student['modules_count'] > 0;
            })
            ->sortBy(function (array $student) {
                return sprintf(
                    '%s|%s|%s',
                    strtolower((string) ($student['nom'] ?? '')),
                    strtolower((string) ($student['prenom'] ?? '')),
                    strtolower((string) ($student['cne'] ?? ''))
                );
            })
            ->values();
    }

    private function applyReleveFilters(Collection $students, array $filters): Collection
    {
        $studentId = $filters['student_id'] ?? null;
        $semesterId = $filters['semester_id'] ?? null;

        return $students
            ->filter(function (array $student) use ($studentId) {
                return ! $studentId || (int) $student['student_id'] === (int) $studentId;
            })
            ->map(function (array $student) use ($semesterId) {
                $modules = collect($student['modules'] ?? []);

                if ($semesterId) {
                    $modules = $modules
                        ->filter(function (array $module) use ($semesterId) {
                            return (int) ($module['semestre_id'] ?? 0) === (int) $semesterId;
                        })
                        ->values();
                }

                $student['modules'] = $modules;
                $student['modules_count'] = $modules->count();
                $student['elements_count'] = $modules->sum(function (array $module) {
                    return collect($module['elements'] ?? [])->count();
                });
                $student['validated_modules_count'] = $modules->filter(function (array $module) {
                    return $this->isValidatedModuleStatus($module['statut_module'] ?? null);
                })->count();

                return $student;
            })
            ->filter(function (array $student) {
                return collect($student['modules'] ?? [])->isNotEmpty();
            })
            ->values();
    }

    private function availableSemesters(Collection $students): Collection
    {
        return $students
            ->flatMap(function (array $student) {
                return collect($student['modules'] ?? [])
                    ->map(function (array $module) {
                        return [
                            'id' => (int) ($module['semestre_id'] ?? 0),
                            'nom' => $module['semestre_nom'] ?? null,
                            'ordre' => (int) ($module['semestre_ordre'] ?? 0),
                        ];
                    });
            })
            ->filter(function (array $semester) {
                return $semester['id'] > 0 && ! empty($semester['nom']);
            })
            ->unique('id')
            ->sortBy(function (array $semester) {
                return sprintf(
                    '%03d|%s',
                    (int) ($semester['ordre'] ?? 0),
                    strtolower((string) ($semester['nom'] ?? ''))
                );
            })
            ->values()
            ->map(function (array $semester) {
                return [
                    'id' => $semester['id'],
                    'nom' => $semester['nom'],
                ];
            });
    }

    private function availableStudents(Collection $students): Collection
    {
        return $students
            ->map(function (array $student) {
                return [
                    'id' => $student['student_id'],
                    'cne' => $student['cne'],
                    'nom_complet' => $student['nom_complet'],
                    'label' => trim(collect([
                        $student['cne'],
                        $student['nom_complet'],
                    ])->filter()->implode(' - ')),
                ];
            })
            ->values();
    }

    private function buildSemesterReleves(Collection $students, array $filters): Collection
    {
        $studentId = $filters['student_id'] ?? null;
        $semesterId = $filters['semester_id'] ?? null;

        return $students
            ->filter(function (array $student) use ($studentId) {
                return ! $studentId || (int) $student['student_id'] === (int) $studentId;
            })
            ->flatMap(function (array $student) use ($semesterId) {
                return collect($student['modules'] ?? [])
                    ->groupBy(function (array $module) {
                        return (int) ($module['semestre_id'] ?? 0);
                    })
                    ->map(function (Collection $modules, $groupSemesterId) use ($student) {
                        $modules = $modules->values();
                        $firstModule = $modules->first();

                        return [
                            'student_id' => $student['student_id'],
                            'cne' => $student['cne'],
                            'nom' => $student['nom'],
                            'prenom' => $student['prenom'],
                            'nom_complet' => $student['nom_complet'],
                            'niveau' => $student['niveau'],
                            'section' => $student['section'],
                            'semestre_id' => (int) $groupSemesterId,
                            'semestre_nom' => $firstModule['semestre_nom'] ?? null,
                            'semestre_ordre' => (int) ($firstModule['semestre_ordre'] ?? 0),
                            'modules_count' => $modules->count(),
                            'elements_count' => $modules->sum(function (array $module) {
                                return collect($module['elements'] ?? [])->count();
                            }),
                            'validated_modules_count' => $modules->filter(function (array $module) {
                                return $this->isValidatedModuleStatus($module['statut_module'] ?? null);
                            })->count(),
                            'modules' => $modules,
                        ];
                    })
                    ->filter(function (array $releve) use ($semesterId) {
                        return ! $semesterId || (int) $releve['semestre_id'] === (int) $semesterId;
                    })
                    ->sortBy(function (array $releve) {
                        return sprintf(
                            '%03d|%s|%s|%s',
                            (int) ($releve['semestre_ordre'] ?? 0),
                            strtolower((string) ($releve['nom'] ?? '')),
                            strtolower((string) ($releve['prenom'] ?? '')),
                            strtolower((string) ($releve['cne'] ?? ''))
                        );
                    })
                    ->values();
            })
            ->values();
    }

    private function latestResultsByKey(Collection $rows, string $groupColumn, string $idColumn): Collection
    {
        return $rows
            ->sortByDesc(function ($row) use ($idColumn) {
                return sprintf(
                    '%s|%010d',
                    (string) ($row->date_validation ?? ''),
                    (int) ($row->{$idColumn} ?? 0)
                );
            })
            ->groupBy(function ($row) use ($groupColumn) {
                return (int) ($row->{$groupColumn} ?? 0);
            })
            ->map(function (Collection $group) {
                return $group->first();
            });
    }

    private function isValidatedModuleStatus(?string $status): bool
    {
        $value = strtolower(trim((string) $status));

        return in_array($value, ['valide', 'capitalise'], true);
    }

    private function sessionCategory($result): string
    {
        $value = strtolower(trim((string) ($result?->sessionExamen?->type_session ?? $result?->sessionExamen?->nom_session ?? '')));

        return str_contains($value, 'rattrap') ? 'rattrapage' : 'normale';
    }

    private function weightedSessionAverage(Collection $elements, string $scoreKey, ?bool $tpOnly = null): ?float
    {
        $weightedElements = $elements
            ->filter(function (array $element) use ($scoreKey, $tpOnly) {
                $score = $element[$scoreKey] ?? null;
                if ($score === null || $score === '') {
                    return false;
                }

                if ($tpOnly === null) {
                    return true;
                }

                $isTp = strtoupper((string) ($element['type_element'] ?? '')) === 'TP';

                return $tpOnly ? $isTp : ! $isTp;
            })
            ->values();

        if ($weightedElements->isEmpty()) {
            return null;
        }

        $totalCoefficient = (float) $weightedElements->sum(function (array $element) {
            return max((float) ($element['coefficient'] ?? 0), 0.0);
        });

        if ($totalCoefficient <= 0) {
            return null;
        }

        $weightedTotal = $weightedElements->sum(function (array $element) use ($scoreKey) {
            return ((float) ($element[$scoreKey] ?? 0)) * max((float) ($element['coefficient'] ?? 0), 0.0);
        });

        return round($weightedTotal / $totalCoefficient, 2);
    }

    private function shortStatus(?string $status): string
    {
        return match (strtolower(trim((string) $status))) {
            'valide', 'capitalise' => 'V',
            'rattrapage' => 'VAR',
            'non valide' => 'NV',
            'en dette' => 'DET',
            'en cours' => 'ENC',
            default => trim((string) $status) !== '' ? strtoupper(trim((string) $status)) : '-',
        };
    }

    private function slug(?string $value): string
    {
        $normalized = strtolower(trim((string) $value));
        $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized);

        return trim((string) $normalized, '-');
    }
}
