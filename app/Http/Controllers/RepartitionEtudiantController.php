<?php

namespace App\Http\Controllers;

use App\Models\AnneeUniversitaire as AnneeUniversitaireModel;
use App\Models\Examen;
use App\Models\InscriptionPedagogique;
use App\Models\RepartitionEtudiant;
use App\Models\Salle;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\LaravelPdf\Facades\Pdf;

class RepartitionEtudiantController extends Controller
{
    public function index(Request $request)
    {
        $userFiliereAnnee = auth()->user()?->userFiliereAnnees()->first();
        $selectedFiliere = $userFiliereAnnee?->id_filiere;
        $selectedAnnee = $userFiliereAnnee?->id_annee;

        $selectedExamenId = $request->integer('examen');

        $examensQuery = Examen::with([
                'module:id_module,nom_module,code_module',
                'module.elements:id_element,id_module,code_element,nom_element',
                'sessionExamen:id_session_examen,nom_session,type_session,id_filiere,id_annee',
                'salle:id_salle,code_salle,nom_salle,capacite_examens',
                'salles:id_salle,code_salle,nom_salle,capacite_examens',
                'module.offresFormation:id_offre,id_module,id_semestre,id_section,id_annee',
                'module.offresFormation.semestre:id_semestre,nom_semestre,id_niveau',
                'module.offresFormation.semestre.niveau:id_niveau,nom_niveau',
                'module.offresFormation.section:id_section,id_filiere',
                'module.offresFormation.section.filiere:id_filiere,nom_filiere',
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
                            ->whereHas('module.offresFormation.section', function ($moduleQuery) use ($selectedFiliere) {
                                $moduleQuery->where('id_filiere', $selectedFiliere);
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
                'id_module',
                'id_salle',
                'date_examen',
                'date_debut',
                'date_fin',
                'statut',
            ]);

        $examens->each(function ($examen) use ($selectedFiliere) {
            $session = $examen->sessionExamen;
            $offres = collect($examen->module?->offresFormation ?? []);
            $preferredFiliereId = $session?->id_filiere ?: (($selectedFiliere && $selectedFiliere !== 'all') ? (int) $selectedFiliere : null);
            $offre = $offres->first(function ($item) use ($session, $preferredFiliereId) {
                $matchFiliere = $preferredFiliereId
                    ? $item->section?->id_filiere == $preferredFiliereId
                    : true;
                $matchAnnee = $session?->id_annee
                    ? $item->id_annee == $session->id_annee
                    : true;

                return $matchFiliere && $matchAnnee;
            }) ?? $offres->first(function ($item) use ($session) {
                return $session?->id_annee
                    ? $item->id_annee == $session->id_annee
                    : true;
            }) ?? $offres->first();

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
                'module.elements:id_element,id_module,code_element,nom_element',
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

    private function uniquePerExam(string $column, int $examenId, ?int $ignoreId = null): Rule
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
            'module:id_module,nom_module,code_module',
            'sessionExamen:id_session_examen,nom_session',
            'salle:id_salle,code_salle,nom_salle',
            'salles:id_salle,code_salle,nom_salle,capacite_examens,capacite',
            'module.offresFormation.section.filiere',
            'module.offresFormation.semestre.niveau',
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

        $payload = [
            'examen'         => $examen,
            'repartitions'   => $repartitions,
            'presentCount'   => $presentCount,
            'absentCount'    => $total - $presentCount,
            'total'          => $total,
            'generatedAt'    => now(),
            'niveauFiliere'  => $this->niveauFiliereLabel($examen),
            'columns'        => $columns,
            'presenceFilled' => $presenceFilled,
            'salleGroups'    => $salleGroups,
        ];

        $footerSalleLabel = $salles->pluck('nom_salle')->filter()->unique()->implode(' | ');
        if (empty($footerSalleLabel) && $examen->salle) {
            $footerSalleLabel = $examen->salle->nom_salle;
        }

        $filename = sprintf('repartition-%s-%s.pdf', $examen->module->code_module ?? 'examen', $examen->id_examen);

        return Pdf::view('pdfs.repartition', $payload)
            ->format('a4')
            ->margins(12, 10, 14, 10)
            ->footerView('pdfs.partials.footer', ['footerSalleLabel' => $footerSalleLabel])
            ->download($filename);
    }

    public function exportCollective(Request $request, Examen $examen)
    {
        $examen->load([
            'module:id_module,nom_module,code_module',
            'sessionExamen:id_session_examen,nom_session',
            'salle:id_salle,code_salle,nom_salle,capacite_examens,capacite',
            'salles:id_salle,code_salle,nom_salle,capacite_examens,capacite',
            'module.offresFormation.section.filiere',
            'module.offresFormation.semestre.niveau',
        ]);

        $referenceOffre = $examen->module->offresFormation
            ->first(fn ($offre) => $offre->semestre !== null)
            ?? $examen->module->offresFormation->first();

        $targetSemestreId = $referenceOffre?->id_semestre;
        $targetNiveauId = $referenceOffre?->semestre?->id_niveau;

        $examensQuery = Examen::with([
                'module:id_module,nom_module,code_module',
                'module.offresFormation:id_offre,id_module,id_semestre,id_section',
                'module.offresFormation.semestre:id_semestre,nom_semestre,id_niveau',
            ])
            ->where('id_session_examen', $examen->id_session_examen);

        if ($targetSemestreId || $targetNiveauId) {
            $examensQuery->whereHas('module.offresFormation', function ($query) use ($targetSemestreId, $targetNiveauId) {
                if ($targetSemestreId) {
                    $query->where('id_semestre', $targetSemestreId);
                }
                if ($targetNiveauId) {
                    $query->whereHas('semestre', function ($semestreQuery) use ($targetNiveauId) {
                        $semestreQuery->where('id_niveau', $targetNiveauId);
                    });
                }
            });
        }

        $examens = $examensQuery
            ->orderBy('date_examen')
            ->orderBy('id_examen')
            ->get(['id_examen', 'id_session_examen', 'id_module', 'date_examen']);

        if ($examens->isEmpty()) {
            return back()->with('error', 'Aucun examen trouve pour cette session.');
        }

        $modules = $examens
            ->sortBy(fn ($exam) => $exam->date_examen)
            ->map(function ($exam) use ($targetSemestreId) {
                $offre = $targetSemestreId
                    ? $exam->module->offresFormation->firstWhere('id_semestre', $targetSemestreId)
                    : $exam->module->offresFormation->first();

                return [
                    'id_examen' => $exam->id_examen,
                    'id_module' => $exam->id_module,
                    'code'      => $exam->module->code_module ?? 'Module',
                    'name'      => $exam->module->nom_module ?? 'Module',
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
                    'offreFormation:id_offre,id_module,id_semestre',
                ])
                ->whereHas('inscriptionAdministrative', function ($query) use ($studentIds) {
                    $query->whereIn('id_etudiant', $studentIds);
                })
                ->whereHas('offreFormation', function ($query) use ($moduleIds, $targetSemestreId, $targetNiveauId) {
                    $query->whereIn('id_module', $moduleIds);
                    if ($targetSemestreId) {
                        $query->where('id_semestre', $targetSemestreId);
                    }
                    if ($targetNiveauId) {
                        $query->whereHas('semestre', function ($semestreQuery) use ($targetNiveauId) {
                            $semestreQuery->where('id_niveau', $targetNiveauId);
                        });
                    }
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
            'module:id_module,nom_module,code_module',
            'sessionExamen:id_session_examen,nom_session',
            'salles:id_salle,nom_salle,code_salle,capacite_examens,capacite',
            'salle:id_salle,nom_salle,code_salle,capacite_examens,capacite',
            'module.offresFormation.section.filiere',
            'module.offresFormation.semestre.niveau',
        ]);

        $salles = $examen->salles->values();
        if ($salles->isEmpty() && $examen->salle) {
            $salles = collect([$examen->salle]);
        }

        $rows = $repartitions
            ->map(function ($rep) use ($salles) {
                $salleIndex = $this->salleIndexFromGrille($rep->code_grille);
                $salle = $salles[$salleIndex - 1] ?? null;

                return [
                    'cne'          => $rep->inscriptionPedagogique->inscriptionAdministrative->etudiant->cne ?? '',
                    'nom'          => $rep->inscriptionPedagogique->inscriptionAdministrative->etudiant->nom ?? '',
                    'prenom'       => $rep->inscriptionPedagogique->inscriptionAdministrative->etudiant->prenom ?? '',
                    'is_credit'    => strtolower((string) ($rep->inscriptionPedagogique->type_inscription ?? '')) === 'credit',
                    'salle'        => $salle->nom_salle ?? ('Salle '.$salleIndex),
                    'code_salle'   => $salle->code_salle ?? null,
                    'numero_place' => $rep->numero_place,
                    'code_grille'  => $rep->code_grille,
                    'salle_index'  => $salleIndex,
                ];
            })
            ->sortBy(function ($row) {
                return sprintf(
                    '%03d-%05s-%s-%s',
                    $row['salle_index'] ?? 0,
                    $row['numero_place'] ?? '',
                    $row['nom'] ?? '',
                    $row['prenom'] ?? ''
                );
            })
            ->values();

        $payload = [
            'examen'       => $examen,
            'rows'         => $rows,
            'generatedAt'  => now(),
            'niveauFiliere'=> $this->niveauFiliereLabel($examen),
        ];

        $footerSalleLabel = $salles->pluck('nom_salle')->filter()->unique()->implode(' | ');
        if (empty($footerSalleLabel) && $examen->salle) {
            $footerSalleLabel = $examen->salle->nom_salle;
        }

        $filename = sprintf(
            'repartition-salles-places-%s-%s.pdf',
            $examen->module->code_module ?? 'examen',
            $examen->id_examen
        );

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

    private function eligibleInscriptionsForExam(Examen $examen)
    {
        $examen->loadMissing([
            'sessionExamen:id_session_examen,id_filiere,id_annee',
            'module.offresFormation:id_offre,id_module,id_annee,id_section',
        ]);

        $anneeId = $examen->sessionExamen?->id_annee
            ?: AnneeUniversitaireModel::where('est_active', true)->latest('date_debut')->value('id_annee');
        $preferredFiliereId = $examen->sessionExamen?->id_filiere ?: $this->currentUserFiliereId();
        $filiereIds = $this->resolvedModuleFiliereIds(
            (int) $examen->id_module,
            $anneeId,
            $preferredFiliereId
        );

        return InscriptionPedagogique::with([
                'inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
                'offreFormation.module:id_module,nom_module,code_module',
            ])
            ->whereHas('offreFormation', function ($query) use ($examen, $anneeId, $filiereIds) {
                $query->where('id_module', $examen->id_module);

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
    }

    private function referenceOffre(Examen $examen, ?int $preferredFiliereId = null)
    {
        $examen->loadMissing([
            'sessionExamen:id_session_examen,id_filiere,id_annee',
            'module.offresFormation:id_offre,id_module,id_semestre,id_section,id_annee',
            'module.offresFormation.section:id_section,id_filiere',
            'module.offresFormation.section.filiere:id_filiere,nom_filiere',
            'module.offresFormation.semestre:id_semestre,nom_semestre,id_niveau',
            'module.offresFormation.semestre.niveau:id_niveau,nom_niveau',
        ]);

        $session = $examen->sessionExamen;
        $effectiveFiliereId = $session?->id_filiere ?: $preferredFiliereId ?: $this->currentUserFiliereId();
        $offres = collect($examen->module?->offresFormation ?? []);

        return $offres->first(function ($offre) use ($session, $effectiveFiliereId) {
            $matchFiliere = $effectiveFiliereId
                ? $offre->section?->id_filiere == $effectiveFiliereId
                : true;
            $matchAnnee = $session?->id_annee
                ? $offre->id_annee == $session->id_annee
                : true;

            return $matchFiliere && $matchAnnee;
        }) ?? $offres->first(function ($offre) use ($session) {
            return $session?->id_annee
                ? $offre->id_annee == $session->id_annee
                : true;
        }) ?? $offres->first();
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

        $examen->loadMissing('module.offresFormation.semestre.niveau', 'module.offresFormation.section');

        $referenceOffre = $examen->module->offresFormation
            ->first(fn ($offre) => $offre->semestre !== null)
            ?? $examen->module->offresFormation->first();

        $targetSemestreId = $referenceOffre?->id_semestre;
        $targetNiveauId = $referenceOffre?->semestre?->id_niveau;

        $examensQuery = Examen::with([
                'module:id_module',
                'module.offresFormation:id_offre,id_module,id_semestre,id_section',
                'module.offresFormation.semestre:id_semestre,id_niveau',
            ])
            ->where('id_session_examen', $examen->id_session_examen);

        if ($targetSemestreId || $targetNiveauId) {
            $examensQuery->whereHas('module.offresFormation', function ($query) use ($targetSemestreId, $targetNiveauId) {
                if ($targetSemestreId) {
                    $query->where('id_semestre', $targetSemestreId);
                }
                if ($targetNiveauId) {
                    $query->whereHas('semestre', function ($semestreQuery) use ($targetNiveauId) {
                        $semestreQuery->where('id_niveau', $targetNiveauId);
                    });
                }
            });
        }

        $examens = $examensQuery
            ->orderBy('date_examen')
            ->orderBy('id_examen')
            ->get(['id_examen']);

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
