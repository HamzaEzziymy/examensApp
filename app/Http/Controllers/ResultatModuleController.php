<?php

namespace App\Http\Controllers;

use App\Models\AnneeUniversitaire;
use App\Models\Filiere;
use App\Models\InscriptionAdministrative;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Spatie\LaravelPdf\Facades\Pdf;

class ResultatModuleController extends Controller
{
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
            ],
            'filters' => $filters,
            'filterOptions' => [
                'semesters' => $semesterOptions->values(),
                'students' => $studentOptions->values(),
            ],
            'stats' => [
                'students' => $students->count(),
                'modules' => $students->sum('modules_count'),
                'elements' => $students->sum('elements_count'),
                'validated_modules' => $students->sum('validated_modules_count'),
            ],
            'students' => $studentsSummary,
            'exportUrl' => route('correction.resultats-modules.export-releve-notes'),
        ]);
    }

    public function exportReleveNotes(Request $request)
    {
        $scope = $this->resolveScope($request);
        $filters = $this->resolveRequestedFilters($request);
        $allStudents = $this->buildStudentReleves($scope['filiere_id'], $scope['annee_id']);
        $semesterOptions = $this->availableSemesters($allStudents);
        $students = $this->applyReleveFilters($allStudents, $filters);

        if ($students->isEmpty()) {
            return back()->with('error', 'Aucun resultat module/element trouve pour cette selection.');
        }

        $selectedSemester = $semesterOptions->firstWhere('id', $filters['semester_id']);
        $selectedStudent = $allStudents->firstWhere('student_id', $filters['student_id']);
        $isGroupedExport = empty($filters['student_id']);
        $scopeLabel = collect([
            $scope['filiere_name'],
            $scope['annee_label'],
            $selectedSemester['nom'] ?? null,
            $selectedStudent['nom_complet'] ?? null,
        ])->filter()->implode(' - ');

        $filenameParts = [
            'releve-notes',
            $isGroupedExport ? 'groupe' : null,
            $scope['annee_slug'] !== '' ? $scope['annee_slug'] : 'global',
        ];

        if (! empty($selectedSemester['nom'])) {
            $filenameParts[] = $this->slug($selectedSemester['nom']);
        }

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
            'selectedSemesterLabel' => $selectedSemester['nom'] ?? null,
            'selectedStudentLabel' => $selectedStudent['nom_complet'] ?? null,
        ]);

        $pdf = $isGroupedExport
            ? $pdf->format('a3')->landscape()->margins(10, 10, 14, 10)
            : $pdf->format('a4')->portrait()->margins(12, 10, 14, 10);

        return $pdf
            ->footerView('pdfs.partials.footer', [
                'sessionName' => 'Releve des notes',
                'niveauFiliere' => $scopeLabel !== '' ? $scopeLabel : '-',
                'footerSalleLabel' => $scope['filiere_name'] ?: 'Filiere',
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
        //
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
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        //
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
        ];
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
                'inscriptionsPedagogiques.offreFormation.module.elements:id_element,id_module,code_element,nom_element',
                'inscriptionsPedagogiques.resultatsModules:id_resultat_module,id_inscription_pedagogique,id_module,moyenne_module,statut,date_validation',
                'inscriptionsPedagogiques.resultatsElements:id_resultat_element,id_inscription_pedagogique,id_element,moyenne_element,statut,date_validation',
                'inscriptionsPedagogiques.resultatsElements.element:id_element,id_module,code_element,nom_element',
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

        return $registrations
            ->map(function ($registration) {
                $student = $registration->etudiant;
                $modules = collect($registration->inscriptionsPedagogiques ?? [])
                    ->map(function ($pedagogicalRegistration) {
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

                        $elements = $allElements
                            ->map(function ($element) use ($latestElementResults) {
                                $elementResult = $latestElementResults->get((int) $element->id_element);

                                return [
                                    'element_id' => (int) $element->id_element,
                                    'code_element' => $element->code_element,
                                    'nom_element' => $element->nom_element,
                                    'moyenne_element' => $elementResult?->moyenne_element !== null
                                        ? (float) $elementResult->moyenne_element
                                        : null,
                                    'statut_element' => $elementResult?->statut,
                                ];
                            })
                            ->values();

                        return [
                            'module_id' => (int) $module->id_module,
                            'code_module' => $module->code_module,
                            'nom_module' => $module->nom_module,
                            'semestre_id' => (int) ($offre?->id_semestre ?? 0),
                            'semestre_nom' => $offre?->semestre?->nom_semestre,
                            'semestre_ordre' => (int) ($offre?->semestre?->ordre ?? 0),
                            'moyenne_module' => $latestModuleResult?->moyenne_module !== null
                                ? (float) $latestModuleResult->moyenne_module
                                : null,
                            'statut_module' => $latestModuleResult?->statut,
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

    private function slug(?string $value): string
    {
        $normalized = strtolower(trim((string) $value));
        $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized);

        return trim((string) $normalized, '-');
    }
}
