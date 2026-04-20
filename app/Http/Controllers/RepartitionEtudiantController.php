<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\FiltersEligibleExamRegistrations;
use App\Models\AnneeUniversitaire as AnneeUniversitaireModel;
use App\Models\Examen;
use App\Models\InscriptionPedagogique;
use App\Models\OffreFormation;
use App\Models\RepartitionEtudiant;
use App\Models\Salle;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;
use Inertia\Inertia;
use Spatie\LaravelPdf\Facades\Pdf;

class RepartitionEtudiantController extends Controller
{
    use FiltersEligibleExamRegistrations;

    public function index(Request $request)
    {
        $userFiliereAnnee = auth()->user()?->userFiliereAnnees()->first();
        $selectedFiliere = $userFiliereAnnee?->id_filiere;
        $selectedAnnee = $userFiliereAnnee?->id_annee;

        $selectedExamenId = $request->integer('examen');

        $examensQuery = Examen::with([
                'module' => fn ($query) => $query->select('modules.id_module', 'modules.nom_module', 'modules.code_module'),
                'element:id_element,id_module,code_element,nom_element',
                'module.elements:id_element,id_module,code_element,nom_element',
                'sessionExamen:id_session_examen,nom_session,type_session,id_filiere,id_annee',
                'salle:id_salle,code_salle,nom_salle,capacite_examens',
                'salles:id_salle,code_salle,nom_salle,capacite_examens',
                'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
                'offreFormation.semestre:id_semestre,nom_semestre,id_niveau',
                'offreFormation.semestre.niveau:id_niveau,nom_niveau',
                'offreFormation.section:id_section,id_filiere',
                'offreFormation.section.filiere:id_filiere,nom_filiere',
            ])
            ->withCount('repartitions');

        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $examensQuery->where(function ($query) use ($selectedFiliere) {
                $query
                    ->whereHas('sessionExamen', function ($sessionQuery) use ($selectedFiliere) {
                        $sessionQuery->where('id_filiere', $selectedFiliere);
                    })
                    ->orWhere(function ($sharedQuery) use ($selectedFiliere) {
                        $sharedQuery
                            ->whereHas('sessionExamen', function ($sessionQuery) {
                                $sessionQuery->whereNull('id_filiere');
                            })
                            ->whereHas('offreFormation.section', function ($offreQuery) use ($selectedFiliere) {
                                $offreQuery->where('id_filiere', $selectedFiliere);
                            });
                    });
            });
        }

        if ($selectedAnnee && $selectedAnnee !== 'all') {
            $examensQuery->whereHas('sessionExamen', function ($query) use ($selectedAnnee) {
                $query->where('id_annee', $selectedAnnee);
            });
        }

        $examens = $examensQuery
            ->orderByDesc('date_examen')
            ->get([
                'id_examen',
                'id_session_examen',
                'id_offre',
                'id_module',
                'id_element',
                'id_salle',
                'date_examen',
                'date_debut',
                'date_fin',
                'statut',
            ]);

        $examens->each(function ($examen) use ($selectedFiliere) {
            $session = $examen->sessionExamen;
            $preferredFiliereId = $session?->id_filiere ?: (($selectedFiliere && $selectedFiliere !== 'all') ? (int) $selectedFiliere : null);
            $offre = $this->referenceOffre($examen, $preferredFiliereId);

            $semestre = $offre?->semestre;
            $niveau = $semestre?->niveau;

            $examen->setAttribute('semestre_id', $semestre?->id_semestre);
            $examen->setAttribute('semestre_nom', $semestre?->nom_semestre);
            $examen->setAttribute('niveau_id', $niveau?->id_niveau);
            $examen->setAttribute('niveau_nom', $niveau?->nom_niveau);
            $examen->setAttribute('filiere_nom', $offre?->section?->filiere?->nom_filiere);
        });

        $selectedExamen = $examens->firstWhere('id_examen', $selectedExamenId) ?? $examens->first();
        if ($selectedExamen) {
            $selectedExamen->loadMissing([
                'sessionExamen.filiere:id_filiere,nom_filiere',
                'element:id_element,id_module,code_element,nom_element',
                'module.elements:id_element,id_module,code_element,nom_element',
                'offreFormation.section.filiere:id_filiere,nom_filiere',
                'offreFormation.semestre.niveau:id_niveau,nom_niveau',
            ]);
        }

        $repartitions = RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
                'inscriptionPedagogique.offreFormation.module:id_module,nom_module,code_module',
            ])
            ->when($selectedExamen, fn ($query) => $query->where('id_examen', $selectedExamen->id_examen))
            ->orderBy('code_grille')
            ->get([
                'id_repartition',
                'id_examen',
                'id_inscription_pedagogique',
                'code_grille',
                'code_anonymat',
                'numero_place',
                'present',
                'heure_arrivee',
                'heure_sortie',
                'observation',
            ]);

        $inscriptions = $selectedExamen
            ? $this->eligibleInscriptionsForExam($selectedExamen)
            : collect();

        $salles = $selectedExamen
            ? $selectedExamen->salles
            : collect();

        return Inertia::render('examens/Repartition/Index', [
            'examens'          => $examens,
            'repartitions'     => $repartitions,
            'inscriptions'     => $inscriptions,
            'selectedExamenId' => $selectedExamen?->id_examen,
            'salles'           => $salles,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules($request));
        $validated['present'] = $request->boolean('present');

        RepartitionEtudiant::create($validated);

        return $this->redirectToIndex((int) $validated['id_examen'])
            ->with('success', 'Ligne ajoutee.');
    }

    public function show(RepartitionEtudiant $repartitionEtudiant)
    {
        return $this->redirectToIndex($repartitionEtudiant->id_examen);
    }

    public function edit(RepartitionEtudiant $repartitionEtudiant)
    {
        return $this->redirectToIndex($repartitionEtudiant->id_examen);
    }

    public function update(Request $request, RepartitionEtudiant $repartitionEtudiant)
    {
        $validated = $request->validate($this->rules($request, $repartitionEtudiant->id_repartition));
        $validated['present'] = $request->boolean('present');

        $repartitionEtudiant->update($validated);

        return $this->redirectToIndex((int) $validated['id_examen'])
            ->with('success', 'Ligne mise a jour.');
    }

    public function destroy(RepartitionEtudiant $repartitionEtudiant)
    {
        $examenId = $repartitionEtudiant->id_examen;
        $repartitionEtudiant->delete();

        return $this->redirectToIndex($examenId)
            ->with('success', 'Ligne supprimee.');
    }

    private function rules(Request $request, ?int $ignoreId = null): array
    {
        $examenId = (int) $request->input('id_examen');

        return [
            'id_examen' => ['required', 'exists:examens,id_examen'],
            'id_inscription_pedagogique' => [
                'required',
                'exists:inscriptions_pedagogiques,id_inscription_pedagogique',
                $this->uniquePerExam('id_inscription_pedagogique', $examenId, $ignoreId),
            ],
            'code_grille' => [
                'required',
                'integer',
                'min:1',
                $this->uniquePerExam('code_grille', $examenId, $ignoreId),
            ],
            'code_anonymat' => [
                'nullable',
                'string',
                'max:20',
                'regex:/^\d+$/',
                $this->uniquePerExam('code_anonymat', $examenId, $ignoreId),
            ],
            'numero_place' => [
                'nullable',
                'string',
                'max:20',
                $this->uniquePerExam('numero_place', $examenId, $ignoreId),
            ],
            'present' => ['sometimes', 'boolean'],
            'heure_arrivee' => ['nullable'],
            'heure_sortie' => ['nullable', 'after_or_equal:heure_arrivee'],
            'observation' => ['nullable', 'string'],
        ];
    }

    private function uniquePerExam(string $column, int $examenId, ?int $ignoreId = null): Unique
    {
        return Rule::unique('repartition_etudiants', $column)
            ->where(fn ($query) => $query->where('id_examen', $examenId))
            ->ignore($ignoreId, 'id_repartition');
    }

    private function redirectToIndex(?int $examenId = null)
    {
        $params = $examenId ? ['examen' => $examenId] : [];

        return redirect()->route('surveillance.repartition-etudiants.index', $params);
    }

    public function export(Request $request, Examen $examen)
    {
        $repartitions = RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
            ])
            ->where('id_examen', $examen->id_examen)
            ->orderBy('code_grille')
            ->orderBy('numero_place')
            ->get();

        if ($repartitions->isEmpty()) {
            return back()->with('error', 'Aucune repartition pour cet examen.');
        }

        $presentCount = $repartitions->where('present', true)->count();
        $total = $repartitions->count();

        $examen->load([
            'module' => fn ($query) => $query->select('modules.id_module', 'modules.nom_module', 'modules.code_module'),
            'element:id_element,id_module,code_element,nom_element',
            'sessionExamen:id_session_examen,nom_session,type_session',
            'salle:id_salle,code_salle,nom_salle',
            'salles:id_salle,code_salle,nom_salle,capacite_examens,capacite',
            'offreFormation.section.filiere',
            'offreFormation.semestre.niveau',
        ]);

        $allowedColumns = ['cne', 'etudiant', 'grille', 'place', 'anonymat', 'presence'];
        $columns = $request->input('columns', $allowedColumns);
        $columns = array_values(array_intersect($allowedColumns, (array) $columns));
        if (empty($columns)) {
            $columns = $allowedColumns;
        }

        $presenceFilled = $request->boolean('presence_filled', true);

        $salles = $examen->salles->values();
        if ($salles->isEmpty() && $examen->salle) {
            $salles = collect([$examen->salle]);
        }

        $orderedSalleGroups = $this->buildSalleGroupsWithCollectiveOrder($examen, $repartitions, $salles);
        if ($orderedSalleGroups && $orderedSalleGroups->isNotEmpty()) {
            $salleGroups = $orderedSalleGroups;
        } else {
            $salleGroups = $repartitions
                ->groupBy(fn ($rep) => $this->salleIndexFromGrille($rep->code_grille))
                ->map(function ($rows, $salleIndex) use ($salles) {
                    $salle = $salles[$salleIndex - 1] ?? null;
                    return [
                        'salle'       => $salle,
                        'rows'        => $rows,
                        'present'     => $rows->where('present', true)->count(),
                        'total'       => $rows->count(),
                        'absent'      => $rows->count() - $rows->where('present', true)->count(),
                        'salle_index' => (int) $salleIndex,
                    ];
                })
                ->values();
        }

        $footerSalleLabel = $salles->pluck('nom_salle')->filter()->unique()->implode(' | ');
        if (empty($footerSalleLabel) && $examen->salle) {
            $footerSalleLabel = $examen->salle->nom_salle;
        }

        $requestedSalleIndex = $request->integer('salle_index');
        $exportRepartitions = $repartitions;
        $exportPresentCount = $presentCount;
        $exportTotal = $total;
        $exportSalleGroups = $salleGroups;
        $filename = sprintf('repartition-%s-%s.pdf', $this->examFileCode($examen), $examen->id_examen);

        if ($requestedSalleIndex) {
            $targetGroup = $salleGroups->firstWhere('salle_index', $requestedSalleIndex);
            if (! $targetGroup) {
                return back()->with('error', 'Aucune repartition pour cette salle.');
            }

            $exportRepartitions = collect($targetGroup['rows'] ?? [])->values();
            $exportPresentCount = (int) ($targetGroup['present'] ?? $exportRepartitions->where('present', true)->count());
            $exportTotal = (int) ($targetGroup['total'] ?? $exportRepartitions->count());
            $exportSalleGroups = collect([$targetGroup]);
            $footerSalleLabel = $targetGroup['salle']->nom_salle ?? ('Salle '.$targetGroup['salle_index']);
            $filename = sprintf(
                'repartition-%s-%s-salle-%s.pdf',
                $this->examFileCode($examen),
                $examen->id_examen,
                $targetGroup['salle_index']
            );
        }

        $payload = [
            'examen'         => $examen,
            'repartitions'   => $exportRepartitions,
            'presentCount'   => $exportPresentCount,
            'absentCount'    => $exportTotal - $exportPresentCount,
            'total'          => $exportTotal,
            'generatedAt'    => now(),
            'niveauFiliere'  => $this->niveauFiliereLabel($examen),
            'columns'        => $columns,
            'presenceFilled' => $presenceFilled,
            'salleGroups'    => $exportSalleGroups,
            'sessionLabel'   => $this->sessionLabel($examen),
            'examLabel'      => $this->examLabel($examen),
            'displayLabel'   => $this->displayLabel($examen),
            'moduleLabel'    => $this->moduleLabel($examen),
            'elementLabel'   => $this->elementLabel($examen),
        ];

        return Pdf::view('pdfs.repartition', $payload)
            ->format('a4')
            ->margins(12, 10, 14, 10)
            ->footerView('pdfs.partials.footer', ['footerSalleLabel' => $footerSalleLabel])
            ->download($filename);
    }

    public function exportCollective(Request $request, Examen $examen)
    {
        $examen->load([
            'module' => fn ($query) => $query->select('modules.id_module', 'modules.nom_module', 'modules.code_module'),
            'element:id_element,id_module,code_element,nom_element',
            'sessionExamen:id_session_examen,nom_session,id_filiere,id_annee',
            'salle:id_salle,code_salle,nom_salle,capacite_examens,capacite',
            'salles:id_salle,code_salle,nom_salle,capacite_examens,capacite',
            'offreFormation.section.filiere',
            'offreFormation.semestre.niveau',
        ]);

        $collectiveFilters = $this->collectiveOffreFilters($examen);

        $examensQuery = Examen::with([
                'module' => fn ($query) => $query->select('modules.id_module', 'modules.nom_module', 'modules.code_module'),
                'element:id_element,id_module,code_element,nom_element',
                'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
                'offreFormation.section:id_section,id_filiere',
                'offreFormation.semestre:id_semestre,nom_semestre,id_niveau',
            ])
            ->where('id_session_examen', $examen->id_session_examen);

        if ($this->hasCollectiveOffreFilters($collectiveFilters)) {
            $examensQuery->whereHas('offreFormation', function (Builder $query) use ($collectiveFilters) {
                $this->applyCollectiveOffreFilters($query, $collectiveFilters);
            });
        }

        $examens = $examensQuery
            ->orderBy('date_examen')
            ->orderBy('id_examen')
            ->get(['id_examen', 'id_session_examen', 'id_offre', 'id_module', 'id_element', 'date_examen']);

        if ($examens->isEmpty()) {
            return back()->with('error', 'Aucun examen trouve pour cette session.');
        }

        $modules = $examens
            ->sortBy(fn ($exam) => $exam->date_examen)
            ->map(function ($exam) use ($collectiveFilters) {
                $offre = $this->matchingCollectiveOffre($exam, $collectiveFilters);

                return [
                    'id_examen' => $exam->id_examen,
                    'id_module' => $exam->id_module,
                    'code'      => $this->examFileCode($exam),
                    'name'      => $this->displayLabel($exam),
                    'date'      => optional($exam->date_examen)->format('d/m'),
                    'semestre'  => $offre?->semestre?->nom_semestre,
                ];
            })
            ->values();

        $firstExamDate = $examens->pluck('date_examen')->filter()->min();

        $allRepartitions = RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
            ])
            ->whereIn('id_examen', $examens->pluck('id_examen'))
            ->orderBy('id_inscription_pedagogique')
            ->get([
                'id_repartition',
                'id_examen',
                'id_inscription_pedagogique',
            ]);

        if ($allRepartitions->isEmpty()) {
            return back()->with('error', 'Aucune repartition pour ces examens.');
        }

        $studentIds = $allRepartitions
            ->map(fn ($rep) => $rep->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant)
            ->filter()
            ->unique()
            ->values();

        $moduleIds = $modules
            ->pluck('id_module')
            ->filter()
            ->unique()
            ->values();

        $capByStudentModule = [];
        if ($studentIds->isNotEmpty() && $moduleIds->isNotEmpty()) {
            $capIps = InscriptionPedagogique::with([
                    'inscriptionAdministrative:id_inscription_admin,id_etudiant',
                    'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
                    'offreFormation.section:id_section,id_filiere',
                    'offreFormation.semestre:id_semestre,id_niveau',
                ])
                ->whereHas('inscriptionAdministrative', function ($query) use ($studentIds) {
                    $query->whereIn('id_etudiant', $studentIds);
                })
                ->whereHas('offreFormation', function (Builder $query) use ($moduleIds, $collectiveFilters) {
                    $query->whereIn('id_module', $moduleIds);
                    $this->applyCollectiveOffreFilters($query, $collectiveFilters);
                })
                ->get([
                    'id_inscription_pedagogique',
                    'id_inscription_admin',
                    'id_offre',
                    'type_inscription',
                ])
                ->filter(function ($ip) {
                    return strtolower($ip->type_inscription ?? '') === 'capitalisation';
                });

            foreach ($capIps as $ip) {
                $studentKey = $ip->inscriptionAdministrative?->id_etudiant ?? $ip->id_inscription_pedagogique;
                $moduleId = $ip->offreFormation?->id_module;
                if ($studentKey && $moduleId) {
                    $capByStudentModule[$studentKey][$moduleId] = true;
                }
            }
        }

        $selectedRepartitions = RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
            ])
            ->where('id_examen', $examen->id_examen)
            ->orderBy('code_grille')
            ->orderBy('numero_place')
            ->get([
                'id_repartition',
                'id_examen',
                'id_inscription_pedagogique',
                'code_grille',
                'numero_place',
                'code_anonymat',
            ]);

        if ($selectedRepartitions->isEmpty()) {
            return back()->with('error', 'Aucune repartition pour cet examen.');
        }

        $creditStatusByStudent = $allRepartitions->reduce(function ($carry, $rep) {
            $key = $rep->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant
                ?? $rep->id_inscription_pedagogique;
            $type = strtolower($rep->inscriptionPedagogique?->type_inscription ?? '');

            if (!array_key_exists($key, $carry)) {
                $carry[$key] = false;
            }

            if ($type === 'credit') {
                $carry[$key] = true;
            }

            return $carry;
        }, []);

        $studentsById = $allRepartitions
            ->groupBy(function ($rep) {
                return $rep->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant ?? $rep->id_inscription_pedagogique;
            })
            ->map(function ($rows, $studentKey) use ($modules, $capByStudentModule) {
                $ip = $rows->first()->inscriptionPedagogique;
                $rowsByExam = $rows->groupBy('id_examen');
                $statuses = [];

                foreach ($modules as $module) {
                    $examRows = $rowsByExam->get($module['id_examen'], collect());
                    $hasCap = $capByStudentModule[$studentKey][$module['id_module']] ?? false;
                    if ($examRows->isNotEmpty()) {
                        $hasCap = $hasCap || $examRows->contains(function ($rep) {
                            $type = strtolower($rep->inscriptionPedagogique?->type_inscription ?? '');
                            return $type === 'capitalisation';
                        });
                    }

                    if ($hasCap) {
                        $statuses[$module['id_examen']] = 'cap';
                    } elseif ($examRows->isNotEmpty()) {
                        $statuses[$module['id_examen']] = 'pass';
                    } else {
                        $statuses[$module['id_examen']] = 'none';
                    }
                }

                return [
                    'cne'     => $ip?->inscriptionAdministrative?->etudiant?->cne,
                    'nom'     => $ip?->inscriptionAdministrative?->etudiant?->nom,
                    'prenom'  => $ip?->inscriptionAdministrative?->etudiant?->prenom,
                    'modules' => $statuses,
                ];
            });

        $studentsWithSeats = $studentsById
            ->map(function ($student, $key) use ($creditStatusByStudent) {
                return [
                    'cne'       => $student['cne'],
                    'nom'       => $student['nom'],
                    'prenom'    => $student['prenom'],
                    'modules'   => $student['modules'],
                    'is_credit' => $creditStatusByStudent[$key] ?? false,
                ];
            })
            ->sortBy(function ($student) {
                $creditRank = $student['is_credit'] ? 1 : 0;
                return sprintf(
                    '%d|%s|%s|%s',
                    $creditRank,
                    strtolower($student['nom'] ?? ''),
                    strtolower($student['prenom'] ?? ''),
                    strtolower($student['cne'] ?? '')
                );
            })
            ->values()
            ->map(function ($student, $index) {
                $student['global_index'] = $index + 1;
                return $student;
            })
            ->values();

        $salles = $examen->salles->values();
        if ($salles->isEmpty() && $examen->salle) {
            $salles = collect([$examen->salle]);
        }

        // Preserve original counts per salle while keeping a single alphabetical ordering across salles
        $salleCounts = $this->salleCountsByIndex($selectedRepartitions);
        $studentsWithSeats = $this->assignStudentsToSalleIndices($studentsWithSeats, $salleCounts);

        $groups = $studentsWithSeats
            ->groupBy(fn ($student) => $student['salle_index'] ?? 1)
            ->sortKeys()
            ->map(function ($rows, $salleIndex) use ($salles) {
                $salle = $salles[$salleIndex - 1] ?? null;
                $rows = $rows->values()->map(function ($student, $index) {
                    $student['global_index'] = $index + 1;
                    return $student;
                });

                return [
                    'salle'       => $salle,
                    'rows'        => $rows,
                    'total'       => $rows->count(),
                    'salle_index' => (int) $salleIndex,
                ];
            })
            ->values();

        $sessionName = $examen->sessionExamen->nom_session ?? 'session';

        $payload = [
            'examen'        => $examen,
            'modules'       => $modules,
            'groups'        => $groups,
            'studentsTotal' => $studentsWithSeats->count(),
            'generatedAt'   => now(),
            'niveauFiliere' => $this->niveauFiliereLabel($examen),
            'sessionName'   => $sessionName,
            'firstExamDate' => $firstExamDate,
            'examLabel'     => $this->examLabel($examen),
        ];

        $footerData = [
            'examen'        => $examen,
            'modules'       => $modules,
            'sessionName'   => $sessionName,
            'firstExamDate' => $firstExamDate,
            'niveauFiliere' => $payload['niveauFiliere'],
            'footerSalleLabel' => $salles->pluck('nom_salle')->filter()->unique()->implode(' | ') ?: $examen->salle?->nom_salle,
        ];

        $filename = sprintf(
            'presence-collective-%s-%s.pdf',
            $sessionName,
            $examen->id_session_examen
        );

        $requestedSalleIndex = $request->integer('salle_index');
        if ($requestedSalleIndex) {
            $targetGroup = $groups->firstWhere('salle_index', $requestedSalleIndex);
            if (!$targetGroup) {
                return back()->with('error', 'Aucune repartition pour cette salle.');
            }

            $payload['groups'] = collect([$targetGroup]);
            $payload['studentsTotal'] = $targetGroup['total'];
            $footerData['footerSalleLabel'] = $targetGroup['salle']->nom_salle ?? ('Salle ' . $targetGroup['salle_index']);
            $filename = sprintf(
                'presence-collective-%s-%s-salle-%s.pdf',
                $sessionName,
                $examen->id_session_examen,
                $targetGroup['salle_index']
            );
        }

        return Pdf::view('pdfs.repartition-collective', $payload)
            ->format('a4')
            ->margins(12, 10, 14, 10)
            ->footerView('pdfs.partials.footer', $footerData)
            ->download($filename);
    }

    public function exportSallesPlaces(Request $request, Examen $examen)
    {
        $repartitions = RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
            ])
            ->where('id_examen', $examen->id_examen)
            ->orderBy('code_grille')
            ->orderBy('numero_place')
            ->get([
                'id_repartition',
                'id_examen',
                'id_inscription_pedagogique',
                'code_grille',
                'numero_place',
            ]);

        if ($repartitions->isEmpty()) {
            return back()->with('error', 'Aucune repartition pour cet examen.');
        }

        $examen->load([
            'module' => fn ($query) => $query->select('modules.id_module', 'modules.nom_module', 'modules.code_module'),
            'element:id_element,id_module,code_element,nom_element',
            'sessionExamen:id_session_examen,nom_session,type_session',
            'salles:id_salle,nom_salle,code_salle,capacite_examens,capacite',
            'salle:id_salle,nom_salle,code_salle,capacite_examens,capacite',
            'offreFormation.section.filiere',
            'offreFormation.semestre.niveau',
        ]);

        $salles = $examen->salles->values();
        if ($salles->isEmpty() && $examen->salle) {
            $salles = collect([$examen->salle]);
        }

        $salleGroups = $repartitions
            ->groupBy(fn ($rep) => $this->salleIndexFromGrille($rep->code_grille))
            ->sortKeys()
            ->map(function ($groupRows, $salleIndex) use ($salles) {
                $salle = $salles[$salleIndex - 1] ?? null;
                $rows = $groupRows->map(function ($rep) use ($salle, $salleIndex) {
                    return [
                        'cne'          => $rep->inscriptionPedagogique->inscriptionAdministrative->etudiant->cne ?? '',
                        'nom'          => $rep->inscriptionPedagogique->inscriptionAdministrative->etudiant->nom ?? '',
                        'prenom'       => $rep->inscriptionPedagogique->inscriptionAdministrative->etudiant->prenom ?? '',
                        'is_credit'    => strtolower((string) ($rep->inscriptionPedagogique->type_inscription ?? '')) === 'credit',
                        'salle'        => $salle->nom_salle ?? ('Salle '.$salleIndex),
                        'code_salle'   => $salle->code_salle ?? null,
                        'numero_place' => $rep->numero_place,
                        'code_grille'  => $rep->code_grille,
                        'salle_index'  => (int) $salleIndex,
                    ];
                })->values();

                return [
                    'salle' => $salle,
                    'rows' => $rows,
                    'total' => $rows->count(),
                    'salle_index' => (int) $salleIndex,
                ];
            })
            ->values();

        $footerSalleLabel = $salles->pluck('nom_salle')->filter()->unique()->implode(' | ');
        if (empty($footerSalleLabel) && $examen->salle) {
            $footerSalleLabel = $examen->salle->nom_salle;
        }

        $exportGroups = $salleGroups;
        $filename = sprintf(
            'repartition-salles-places-%s-%s.pdf',
            $this->examFileCode($examen),
            $examen->id_examen
        );

        $requestedSalleIndex = $request->integer('salle_index');
        if ($requestedSalleIndex) {
            $targetGroup = $salleGroups->firstWhere('salle_index', $requestedSalleIndex);
            if (! $targetGroup) {
                return back()->with('error', 'Aucune repartition pour cette salle.');
            }

            $exportGroups = collect([$targetGroup]);
            $footerSalleLabel = $targetGroup['salle']->nom_salle ?? ('Salle '.$targetGroup['salle_index']);
            $filename = sprintf(
                'repartition-salles-places-%s-%s-salle-%s.pdf',
                $this->examFileCode($examen),
                $examen->id_examen,
                $targetGroup['salle_index']
            );
        }

        $payload = [
            'examen'       => $examen,
            'rows'         => $exportGroups->flatMap(fn ($group) => $group['rows'] ?? collect())->values(),
            'groups'       => $exportGroups,
            'generatedAt'  => now(),
            'niveauFiliere'=> $this->niveauFiliereLabel($examen),
            'sessionLabel' => $this->sessionLabel($examen),
            'examLabel'    => $this->examLabel($examen),
            'displayLabel' => $this->displayLabel($examen),
            'moduleLabel'  => $this->moduleLabel($examen),
            'elementLabel' => $this->elementLabel($examen),
        ];

        return Pdf::view('pdfs.repartition-salles-places', $payload)
            ->format('a4')
            ->margins(12, 10, 14, 10)
            ->footerView('pdfs.partials.footer', ['footerSalleLabel' => $footerSalleLabel])
            ->download($filename);
    }

    private function niveauFiliereLabel(Examen $examen): string
    {
        $offre = $this->referenceOffre($examen);
        $niveauName = $offre?->semestre?->niveau?->nom_niveau;
        $filiereName = $offre?->section?->filiere?->nom_filiere;

        return trim(
            ($niveauName ?? '') .
            ($niveauName && $filiereName ? ' - ' : '') .
            ($filiereName ?? '')
        );
    }

    private function isDentaireExam(Examen $examen): bool
    {
        $filiereName = trim((string) ($this->referenceOffre($examen)?->section?->filiere?->nom_filiere ?? ''));

        return $filiereName !== '' && str_contains(strtolower($filiereName), 'dent');
    }

    private function moduleLabel(Examen $examen): string
    {
        $code = trim((string) ($examen->module?->code_module ?? ''));
        $name = trim((string) ($examen->module?->nom_module ?? ''));

        if ($code === '' && $name === '') {
            return 'Module';
        }

        if ($code === '') {
            return $name;
        }

        if ($name === '') {
            return $code;
        }

        return sprintf('%s - %s', $code, $name);
    }

    private function elementLabel(Examen $examen): ?string
    {
        if (! $this->isDentaireExam($examen)) {
            return null;
        }

        $code = trim((string) ($examen->element?->code_element ?? ''));
        $name = trim((string) ($examen->element?->nom_element ?? ''));

        if ($code === '' && $name === '') {
            return null;
        }

        if ($code === '') {
            return $name;
        }

        if ($name === '') {
            return $code;
        }

        return sprintf('%s - %s', $code, $name);
    }

    private function examLabel(Examen $examen): string
    {
        $elementLabel = $this->elementLabel($examen);

        return $elementLabel
            ? sprintf('%s / %s', $this->moduleLabel($examen), $elementLabel)
            : $this->moduleLabel($examen);
    }

    private function displayLabel(Examen $examen): string
    {
        if ($this->isDentaireExam($examen)) {
            $elementName = trim((string) ($examen->element?->nom_element ?? ''));
            if ($elementName !== '') {
                return $elementName;
            }
        }

        $moduleName = trim((string) ($examen->module?->nom_module ?? ''));
        if ($moduleName !== '') {
            return $moduleName;
        }

        if ($this->isDentaireExam($examen)) {
            $elementCode = trim((string) ($examen->element?->code_element ?? ''));
            if ($elementCode !== '') {
                return $elementCode;
            }
        }

        $moduleCode = trim((string) ($examen->module?->code_module ?? ''));

        return $moduleCode !== '' ? $moduleCode : 'Examen';
    }

    private function examFileCode(Examen $examen): string
    {
        $moduleCode = trim((string) ($examen->module?->code_module ?? ''));
        $elementCode = trim((string) ($examen->element?->code_element ?? ''));
        $canUseElementCode = $this->isDentaireExam($examen);

        if ($canUseElementCode && $elementCode !== '' && strcasecmp($moduleCode, $elementCode) !== 0) {
            return trim($moduleCode !== '' ? $moduleCode.'-'.$elementCode : $elementCode, '-');
        }

        return $moduleCode !== ''
            ? $moduleCode
            : ($canUseElementCode && $elementCode !== '' ? $elementCode : 'examen');
    }

    private function sessionLabel(Examen $examen): string
    {
        $session = $examen->sessionExamen;
        $sessionId = $examen->getAttribute('id_session_examen');

        if (
            (! $session || (
                trim((string) ($session->nom_session ?? '')) === '' &&
                trim((string) ($session->type_session ?? '')) === ''
            )) &&
            $sessionId
        ) {
            $session = \App\Models\SessionExamen::query()
                ->find($sessionId, ['id_session_examen', 'nom_session', 'type_session']);
        }

        $name = trim((string) ($session?->nom_session ?? ''));
        $type = trim((string) ($session?->type_session ?? ''));

        if ($name === '' && $type === '') {
            return '-';
        }

        if ($name === '') {
            return $type;
        }

        if ($type === '' || str_contains(strtolower($name), strtolower($type))) {
            return $name;
        }

        return sprintf('%s (%s)', $name, $type);
    }

    private function eligibleInscriptionsForExam(Examen $examen)
    {
        $examen->loadMissing([
            'sessionExamen:id_session_examen,id_filiere,id_annee,type_session,nom_session',
            'offreFormation:id_offre,id_module,id_annee,id_section',
            'offreFormation.section:id_section,id_filiere',
        ]);

        $referenceOffre = $this->referenceOffre($examen, $examen->sessionExamen?->id_filiere ?: $this->currentUserFiliereId());
        $moduleId = (int) ($referenceOffre?->id_module ?: $examen->id_module);
        $anneeId = $examen->sessionExamen?->id_annee
            ?: AnneeUniversitaireModel::where('est_active', true)->latest('date_debut')->value('id_annee');
        $preferredFiliereId = $examen->sessionExamen?->id_filiere ?: $this->currentUserFiliereId();
        $filiereIds = $referenceOffre?->section?->id_filiere
            ? [(int) $referenceOffre->section->id_filiere]
            : $this->resolvedModuleFiliereIds($moduleId, $anneeId, $preferredFiliereId);

        $session = $examen->sessionExamen;
        $isRattrapageSession = $this->isRattrapageSession($session);

        $registrations = InscriptionPedagogique::query()
            ->when($isRattrapageSession, function ($query) use ($moduleId) {
                $query->with(['resultatsModules' => function ($resultQuery) use ($moduleId) {
                    $resultQuery
                        ->select([
                            'id_resultat_module',
                            'id_inscription_pedagogique',
                            'id_module',
                            'statut',
                            'date_validation',
                        ])
                        ->where('id_module', $moduleId)
                        ->orderByDesc('date_validation')
                        ->orderByDesc('id_resultat_module');
                }]);
            })
            ->with([
                'inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
                'offreFormation.module:id_module,nom_module,code_module',
            ])
            ->whereHas('offreFormation', function ($query) use ($referenceOffre, $moduleId, $anneeId, $filiereIds) {
                if ($referenceOffre?->id_offre) {
                    $query->where('id_offre', $referenceOffre->id_offre);
                    return;
                }

                $query->where('id_module', $moduleId);

                if ($anneeId) {
                    $query->where('id_annee', $anneeId);
                }

                if ($filiereIds !== []) {
                    $query->whereHas('section', function ($sectionQuery) use ($filiereIds) {
                        $sectionQuery->whereIn('id_filiere', $filiereIds);
                    });
                }
            })
            ->when($anneeId, function ($query) use ($anneeId) {
                $query->whereHas('inscriptionAdministrative', function ($adminQuery) use ($anneeId) {
                    $adminQuery->where('id_annee', $anneeId);
                });
            })
            ->where('type_inscription', '!=', 'Capitalisation')
            ->orderBy('id_inscription_pedagogique')
            ->get([
                'id_inscription_pedagogique',
                'id_inscription_admin',
                'id_offre',
            ]);

        return $this->filterRegistrationsForSession($registrations, $moduleId, $session);
    }

    private function referenceOffre(Examen $examen, ?int $preferredFiliereId = null)
    {
        $examen->loadMissing([
            'sessionExamen:id_session_examen,id_filiere,id_annee',
            'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
            'offreFormation.section:id_section,id_filiere',
            'offreFormation.section.filiere:id_filiere,nom_filiere',
            'offreFormation.semestre:id_semestre,nom_semestre,id_niveau',
            'offreFormation.semestre.niveau:id_niveau,nom_niveau',
        ]);

        if ($examen->offreFormation) {
            return $examen->offreFormation;
        }

        $session = $examen->sessionExamen;
        $effectiveFiliereId = $session?->id_filiere ?: $preferredFiliereId ?: $this->currentUserFiliereId();
        $moduleId = (int) $examen->id_module;
        if (! $moduleId) {
            return null;
        }

        $query = OffreFormation::query()
            ->with([
                'section:id_section,id_filiere,nom_section',
                'section.filiere:id_filiere,nom_filiere',
                'semestre:id_semestre,nom_semestre,id_niveau',
                'semestre.niveau:id_niveau,nom_niveau',
            ])
            ->where('id_module', $moduleId);

        $offre = (clone $query)
            ->when($session?->id_annee, fn ($offreQuery) => $offreQuery->where('id_annee', $session->id_annee))
            ->when($effectiveFiliereId, function ($offreQuery) use ($effectiveFiliereId) {
                $offreQuery->whereHas('section', function ($sectionQuery) use ($effectiveFiliereId) {
                    $sectionQuery->where('id_filiere', $effectiveFiliereId);
                });
            })
            ->orderBy('id_offre')
            ->first();

        if (! $offre && $session?->id_annee) {
            $offre = (clone $query)
                ->where('id_annee', $session->id_annee)
                ->orderBy('id_offre')
                ->first();
        }

        $offre = $offre ?: $query->orderBy('id_offre')->first();

        if ($offre) {
            $examen->setRelation('offreFormation', $offre);
            if (! $examen->id_offre) {
                $examen->id_offre = $offre->id_offre;
            }
        }

        return $offre;
    }

    private function collectiveOffreFilters(Examen $examen): array
    {
        $examen->loadMissing([
            'sessionExamen:id_session_examen,nom_session,id_filiere,id_annee',
            'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
            'offreFormation.section:id_section,id_filiere',
            'offreFormation.section.filiere:id_filiere,nom_filiere',
            'offreFormation.semestre:id_semestre,nom_semestre,id_niveau',
            'offreFormation.semestre.niveau:id_niveau,nom_niveau',
        ]);

        $referenceOffre = $this->referenceOffre($examen);

        return [
            'annee_id' => $examen->sessionExamen?->id_annee ? (int) $examen->sessionExamen->id_annee : null,
            'semestre_id' => $referenceOffre?->id_semestre ? (int) $referenceOffre->id_semestre : null,
            'niveau_id' => $referenceOffre?->semestre?->id_niveau ? (int) $referenceOffre->semestre->id_niveau : null,
            'filiere_id' => $referenceOffre?->section?->id_filiere
                ? (int) $referenceOffre->section->id_filiere
                : ($examen->sessionExamen?->id_filiere ? (int) $examen->sessionExamen->id_filiere : $this->currentUserFiliereId()),
        ];
    }

    private function hasCollectiveOffreFilters(array $filters): bool
    {
        return collect([
            $filters['annee_id'] ?? null,
            $filters['semestre_id'] ?? null,
            $filters['niveau_id'] ?? null,
            $filters['filiere_id'] ?? null,
        ])->filter()->isNotEmpty();
    }

    private function applyCollectiveOffreFilters(Builder $query, array $filters): Builder
    {
        $anneeId = $filters['annee_id'] ?? null;
        $semestreId = $filters['semestre_id'] ?? null;
        $niveauId = $filters['niveau_id'] ?? null;
        $filiereId = $filters['filiere_id'] ?? null;

        if ($anneeId) {
            $query->where('id_annee', $anneeId);
        }

        if ($semestreId) {
            $query->where('id_semestre', $semestreId);
        }

        if ($niveauId) {
            $query->whereHas('semestre', function (Builder $semestreQuery) use ($niveauId) {
                $semestreQuery->where('id_niveau', $niveauId);
            });
        }

        if ($filiereId) {
            $query->whereHas('section', function (Builder $sectionQuery) use ($filiereId) {
                $sectionQuery->where('id_filiere', $filiereId);
            });
        }

        return $query;
    }

    private function matchingCollectiveOffre(Examen $examen, array $filters)
    {
        $offre = $this->referenceOffre($examen, $filters['filiere_id'] ?? null);
        if (! $offre) {
            return null;
        }

        $anneeId = $filters['annee_id'] ?? null;
        $semestreId = $filters['semestre_id'] ?? null;
        $niveauId = $filters['niveau_id'] ?? null;
        $filiereId = $filters['filiere_id'] ?? null;

        if ($anneeId && (int) $offre->id_annee !== (int) $anneeId) {
            return null;
        }

        if ($semestreId && (int) $offre->id_semestre !== (int) $semestreId) {
            return null;
        }

        if ($niveauId && (int) $offre->semestre?->id_niveau !== (int) $niveauId) {
            return null;
        }

        if ($filiereId && (int) $offre->section?->id_filiere !== (int) $filiereId) {
            return null;
        }

        return $offre;
    }

    private function resolvedModuleFiliereIds(int $moduleId, ?int $anneeId = null, ?int $preferredFiliereId = null): array
    {
        if ($preferredFiliereId) {
            return [(int) $preferredFiliereId];
        }

        $module = \App\Models\Module::with([
            'offresFormation' => function ($query) use ($anneeId) {
                if ($anneeId) {
                    $query->where('id_annee', $anneeId);
                }
            },
            'offresFormation.section:id_section,id_filiere',
        ])->find($moduleId, ['id_module']);

        if (! $module) {
            return [];
        }

        $filiereIds = $module->offresFormation
            ->pluck('section.id_filiere')
            ->filter()
            ->unique()
            ->values();

        if ($filiereIds->count() === 1) {
            return [(int) $filiereIds->first()];
        }

        return [];
    }

    private function currentUserFiliereId(): ?int
    {
        $filiereId = auth()->user()?->userFiliereAnnees()->first()?->id_filiere;

        return $filiereId && $filiereId !== 'all'
            ? (int) $filiereId
            : null;
    }

    private function salleIndexFromGrille($codeGrille): int
    {
        $str = str_pad((string) ($codeGrille ?? ''), 7, '0', STR_PAD_LEFT);
        $digit = (int) ($str[3] ?? 1);

        return $digit >= 1 ? $digit : 1;
    }

    private function salleCountsByIndex(Collection $repartitions): Collection
    {
        return $repartitions
            ->map(fn ($rep) => $this->salleIndexFromGrille($rep->code_grille))
            ->countBy()
            ->sortKeys();
    }

    private function assignStudentsToSalleIndices(Collection $students, Collection $salleCounts): Collection
    {
        $students = $students->values();
        $salleIndices = $salleCounts
            ->keys()
            ->map(fn ($index) => (int) $index)
            ->values();

        if ($students->isEmpty() || $salleIndices->isEmpty()) {
            return $students;
        }

        $currentSallePosition = 0;
        $currentSalleIndex = (int) $salleIndices->first();
        $currentSalleFilled = 0;
        $currentSalleCap = (int) $salleCounts->get($currentSalleIndex, $students->count());

        return $students->map(function ($student) use (&$currentSallePosition, &$currentSalleIndex, &$currentSalleFilled, &$currentSalleCap, $salleIndices, $salleCounts, $students) {
            if ($currentSalleFilled >= $currentSalleCap && $currentSallePosition < $salleIndices->count() - 1) {
                $currentSallePosition++;
                $currentSalleIndex = (int) $salleIndices->get($currentSallePosition, $currentSalleIndex);
                $currentSalleFilled = 0;
                $currentSalleCap = (int) $salleCounts->get($currentSalleIndex, $students->count());
            }

            $student['salle_index'] = $currentSalleIndex;
            $currentSalleFilled++;

            return $student;
        });
    }

    private function buildSalleGroupsWithCollectiveOrder(Examen $examen, Collection $repartitions, Collection $salles): ?Collection
    {
        if ($repartitions->isEmpty()) {
            return null;
        }

        $collectiveFilters = $this->collectiveOffreFilters($examen);

        $examensQuery = Examen::with([
                'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
                'offreFormation.section:id_section,id_filiere',
                'offreFormation.semestre:id_semestre,id_niveau',
            ])
            ->where('id_session_examen', $examen->id_session_examen);

        if ($this->hasCollectiveOffreFilters($collectiveFilters)) {
            $examensQuery->whereHas('offreFormation', function (Builder $query) use ($collectiveFilters) {
                $this->applyCollectiveOffreFilters($query, $collectiveFilters);
            });
        }

        $examens = $examensQuery
            ->orderBy('date_examen')
            ->orderBy('id_examen')
            ->get(['id_examen', 'id_offre']);

        if ($examens->isEmpty()) {
            return null;
        }

        $allRepartitions = RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
            ])
            ->whereIn('id_examen', $examens->pluck('id_examen'))
            ->orderBy('id_inscription_pedagogique')
            ->get([
                'id_repartition',
                'id_examen',
                'id_inscription_pedagogique',
            ]);

        if ($allRepartitions->isEmpty()) {
            return null;
        }

        $creditStatusByStudent = $allRepartitions->reduce(function ($carry, $rep) {
            $key = $rep->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant
                ?? $rep->id_inscription_pedagogique;
            $type = strtolower($rep->inscriptionPedagogique?->type_inscription ?? '');

            if (!array_key_exists($key, $carry)) {
                $carry[$key] = false;
            }

            if ($type === 'credit') {
                $carry[$key] = true;
            }

            return $carry;
        }, []);

        $studentsById = $allRepartitions
            ->groupBy(function ($rep) {
                return $rep->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant ?? $rep->id_inscription_pedagogique;
            })
            ->map(function ($rows, $studentKey) {
                $ip = $rows->first()->inscriptionPedagogique;

                return [
                    'student_key' => $studentKey,
                    'cne'        => $ip?->inscriptionAdministrative?->etudiant?->cne,
                    'nom'        => $ip?->inscriptionAdministrative?->etudiant?->nom,
                    'prenom'     => $ip?->inscriptionAdministrative?->etudiant?->prenom,
                ];
            });

        $studentsWithSeats = $studentsById
            ->map(function ($student) use ($creditStatusByStudent) {
                $key = $student['student_key'];

                return [
                    'student_key' => $key,
                    'cne'         => $student['cne'],
                    'nom'         => $student['nom'],
                    'prenom'      => $student['prenom'],
                    'is_credit'   => $creditStatusByStudent[$key] ?? false,
                ];
            })
            ->sortBy(function ($student) {
                $creditRank = $student['is_credit'] ? 1 : 0;
                return sprintf(
                    '%d|%s|%s|%s',
                    $creditRank,
                    strtolower($student['nom'] ?? ''),
                    strtolower($student['prenom'] ?? ''),
                    strtolower($student['cne'] ?? '')
                );
            })
            ->values()
            ->map(function ($student, $index) {
                $student['global_index'] = $index + 1;
                return $student;
            })
            ->values();

        $salleCounts = $this->salleCountsByIndex($repartitions);
        $studentsWithSeats = $this->assignStudentsToSalleIndices($studentsWithSeats, $salleCounts);

        $repartitionsByStudent = $repartitions->keyBy(function ($rep) {
            return $rep->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant ?? $rep->id_inscription_pedagogique;
        });

        $orderedRows = $studentsWithSeats
            ->map(function ($student) use ($repartitionsByStudent) {
                $rep = $repartitionsByStudent->get($student['student_key']);
                if (! $rep) {
                    return null;
                }

                return [
                    'salle_index' => $student['salle_index'] ?? 1,
                    'rep'         => $rep,
                ];
            })
            ->filter()
            ->values();

        if ($orderedRows->isEmpty()) {
            return null;
        }

        return $orderedRows
            ->groupBy('salle_index')
            ->sortKeys()
            ->map(function ($rows, $salleIndex) use ($salles) {
                $orderedReps = $rows->map(fn ($row) => $row['rep'])->values();

                return [
                    'salle'       => $salles[$salleIndex - 1] ?? null,
                    'rows'        => $orderedReps,
                    'present'     => $orderedReps->where('present', true)->count(),
                    'total'       => $orderedReps->count(),
                    'absent'      => $orderedReps->count() - $orderedReps->where('present', true)->count(),
                    'salle_index' => (int) $salleIndex,
                ];
            })
            ->values();
    }
}
