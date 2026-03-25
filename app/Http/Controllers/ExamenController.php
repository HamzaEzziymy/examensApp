<?php

namespace App\Http\Controllers;

use App\Models\Examen;
use App\Models\Module;
use App\Models\AnneeUniversitaire;
use App\Models\InscriptionPedagogique;
use App\Models\Anonymat;
use App\Models\RepartitionEtudiant;
use App\Models\Salle;
use App\Models\SessionExamen;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ExamenController extends Controller
{
    public function index()
    {
        return Inertia::render('examens/Examens/Index', $this->indexData());
    }

    public function calendar()
    {
        $payload = $this->indexData();

        return Inertia::render('examens/Examens/Calendar', $payload);
    }

    private function indexData(): array
    {
        $userFiliereAnnee = auth()->user()?->userFiliereAnnees()->first();
        $selectedFiliere = $userFiliereAnnee?->id_filiere;
        $selectedAnnee = $userFiliereAnnee?->id_annee;

        $examensQuery = Examen::with([
                'sessionExamen:id_session_examen,nom_session,type_session,id_filiere,id_annee',
                'module:id_module,nom_module,code_module',
                'salle:id_salle,code_salle,nom_salle,capacite_examens',
                'salles:id_salle,code_salle,nom_salle,capacite_examens',
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
                'anonymat_start',
                'anonymat_end',
                'date_examen',
                'date_debut',
                'date_fin',
                'statut',
                'description',
            ]);

        $sessionsQuery = SessionExamen::select('id_session_examen', 'nom_session', 'type_session', 'date_session_examen', 'id_filiere', 'id_annee')
            ->orderByDesc('date_session_examen');

        if ($selectedAnnee && $selectedAnnee !== 'all') {
            $sessionsQuery->where('id_annee', $selectedAnnee);
        }

        $sessions = $sessionsQuery->get();

        $modulesQuery = Module::select('id_module', 'nom_module', 'code_module')
            ->with([
                'offresFormation' => function ($query) use ($selectedFiliere, $selectedAnnee) {
                    if ($selectedFiliere && $selectedFiliere !== 'all') {
                        $query->whereHas('section', fn ($q) => $q->where('id_filiere', $selectedFiliere));
                    }
                    if ($selectedAnnee && $selectedAnnee !== 'all') {
                        $query->where('id_annee', $selectedAnnee);
                    }
                },
                'offresFormation.semestre:id_semestre,nom_semestre,id_niveau',
                'offresFormation.semestre.niveau:id_niveau,nom_niveau',
            ])
            ->orderBy('nom_module')
            ->whereHas('offresFormation', function ($query) use ($selectedFiliere, $selectedAnnee) {
                if ($selectedFiliere && $selectedFiliere !== 'all') {
                    $query->whereHas('section', fn ($q) => $q->where('id_filiere', $selectedFiliere));
                }
                if ($selectedAnnee && $selectedAnnee !== 'all') {
                    $query->where('id_annee', $selectedAnnee);
                }
            });

        $modules = $modulesQuery->get()->map(function ($module) {
            $semestres = $module->offresFormation
                ->map(fn ($offre) => $offre->semestre)
                ->filter()
                ->unique('id_semestre')
                ->values()
                ->map(function ($semestre) {
                    return [
                        'id_semestre' => $semestre->id_semestre,
                        'nom_semestre' => $semestre->nom_semestre,
                        'id_niveau' => $semestre->id_niveau,
                        'nom_niveau' => $semestre->niveau?->nom_niveau,
                    ];
                })
                ->values();

            return [
                'id_module' => $module->id_module,
                'nom_module' => $module->nom_module,
                'code_module' => $module->code_module,
                'semestres' => $semestres,
            ];
        });

        $semestres = $modules
            ->flatMap(fn ($module) => $module['semestres'])
            ->unique('id_semestre')
            ->values();

        $niveaux = $semestres
            ->map(fn ($semestre) => [
                'id_niveau' => $semestre['id_niveau'] ?? null,
                'nom_niveau' => $semestre['nom_niveau'] ?? null,
            ])
            ->filter(fn ($niveau) => $niveau['id_niveau'])
            ->unique('id_niveau')
            ->values();

        $salles = Salle::select('id_salle', 'code_salle', 'nom_salle', 'capacite_examens')
            ->orderBy('code_salle')
            ->get();

        return [
            'examens' => $examens,
            'sessions' => $sessions,
            'modules' => $modules,
            'salles' => $salles,
            'statuts' => Examen::STATUTS,
            'semestres' => $semestres,
            'niveaux' => $niveaux,
        ];
    }

    public function store(Request $request)
    {
        $validated = $this->validateExamen($request);
        $planAllFilteredModules = (bool) ($validated['plan_all_filtered_modules'] ?? false);
        $manualSplit = collect($validated['repartition_salles'] ?? []);
        $modulePlannings = $this->normalizedBulkModulePlannings($validated);
        unset($validated['repartition_salles']);
        $moduleIds = $this->resolvePlanningModuleIds($validated);

        if ($moduleIds->isEmpty()) {
            return back()
                ->withErrors([
                    $planAllFilteredModules
                        ? 'module_ids'
                        : 'id_module' => $planAllFilteredModules
                            ? 'Choisissez un niveau et un semestre contenant des modules a planifier.'
                            : 'Veuillez selectionner un module.',
                ])
                ->withInput();
        }

        $session = SessionExamen::find((int) $validated['id_session_examen'], ['id_session_examen', 'id_annee', 'id_filiere']);
        $preferredFiliereId = $session?->id_filiere ?: $this->currentUserFiliereId();
        $salles = collect($request->input('salles', []))
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        // Prefer the first selected salle as the primary one to avoid keeping stale values
        $primarySalleId = $salles->first() ?: ($validated['id_salle'] ?? null);
        $validated['id_salle'] = $primarySalleId ? (int) $primarySalleId : null;

        // Ensure at least one salle is provided
        $allSalleIds = $salles->isNotEmpty()
            ? $salles
            : collect([$validated['id_salle']])->filter()->values();
        if ($allSalleIds->isEmpty()) {
            return back()->with('error', 'Veuillez selectionner au moins une salle.');
        }

        $manualSplit = $planAllFilteredModules
            ? collect()
            : $this->normalizeManualSplit($manualSplit, $allSalleIds);
        $salleModels = $this->orderedSalles($allSalleIds);
        $totalCapacity = $salleModels->sum(function ($salle) {
            return $salle->capacite_examens ?? $salle->capacite ?? 0;
        });

        if (! $planAllFilteredModules && ($capacityError = $this->validateManualCapacities($manualSplit, $salleModels))) {
            return back()->withErrors(['repartition_salles' => $capacityError])->withInput();
        }

        $moduleCatalog = Module::query()
            ->whereIn('id_module', $moduleIds)
            ->get(['id_module', 'code_module', 'nom_module'])
            ->keyBy('id_module');

        $plans = [];
        foreach ($moduleIds as $moduleId) {
            $moduleValidated = $validated;
            $moduleValidated['id_module'] = $moduleId;

            if ($planAllFilteredModules) {
                $modulePlanning = $modulePlannings->get($moduleId, []);
                $moduleValidated['anonymat_start'] = null;
                $moduleValidated['anonymat_end'] = null;
                $moduleValidated['date_examen'] = $modulePlanning['date_examen'] ?? null;
                $moduleValidated['date_debut'] = $modulePlanning['date_debut'] ?? null;
                $moduleValidated['date_fin'] = $modulePlanning['date_fin'] ?? null;
            }

            $registrations = $this->registrationsForModule(
                $moduleId,
                $session?->id_annee,
                $preferredFiliereId
            );

            if ($registrations->isEmpty()) {
                return back()
                    ->withErrors([
                        $planAllFilteredModules
                            ? 'module_ids'
                            : 'id_module' => $this->planningModuleMessage(
                                $moduleCatalog->get($moduleId),
                                $moduleId,
                                'Aucun etudiant inscrit pour ce module dans l\'annee academique de la session choisie. Creez les inscriptions pedagogiques avant de planifier cet examen.',
                                $planAllFilteredModules
                            ),
                    ])
                    ->withInput();
            }

            $studentCount = $registrations->count();
            [$expectedCount, $rangeErrors] = $planAllFilteredModules
                ? [$studentCount, null]
                : $this->resolveExpectedCount($moduleValidated, $studentCount, (int) $manualSplit->sum('nombre'));

            if ($rangeErrors) {
                return back()->withErrors($rangeErrors)->withInput();
            }

            if ($creditAllocationError = $this->validateCreditAllocation($registrations, $salleModels, $manualSplit, $expectedCount)) {
                return back()
                    ->withErrors([
                        'salles' => $this->planningModuleMessage(
                            $moduleCatalog->get($moduleId),
                            $moduleId,
                            $creditAllocationError,
                            $planAllFilteredModules
                        ),
                    ])
                    ->withInput();
            }

            if ($expectedCount > $totalCapacity) {
                return back()
                    ->withErrors([
                        'salles' => $this->planningModuleMessage(
                            $moduleCatalog->get($moduleId),
                            $moduleId,
                            'Capacite des salles insuffisante pour les etudiants a repartir. Ajoutez une salle ou ajustez la repartition.',
                            $planAllFilteredModules
                        ),
                    ])
                    ->withInput();
            }

            $plans[] = [
                'validated' => $moduleValidated,
                'registrations' => $registrations,
                'expectedCount' => $expectedCount,
                'manualSplit' => $manualSplit,
            ];
        }

        $createdCount = 0;
        DB::transaction(function () use ($plans, $allSalleIds, $salleModels, &$createdCount) {
            foreach ($plans as $plan) {
                $attributes = $plan['validated'];
                unset($attributes['plan_all_filtered_modules'], $attributes['module_ids'], $attributes['module_plannings']);

                $examen = Examen::create($attributes);
                $examen->salles()->sync($allSalleIds);
                $examen->load('salles:id_salle,code_salle,capacite_examens,capacite');

                $this->generateInitialRepartition(
                    $examen,
                    $plan['registrations'],
                    $plan['expectedCount'],
                    $plan['manualSplit'],
                    $salleModels
                );

                $createdCount++;
            }
        });

        return redirect()
            ->route('examens.examens.index')
            ->with('success', $createdCount > 1 ? sprintf('%d examens planifies.', $createdCount) : 'Examen planifie.');
    }

    public function show(Examen $examen)
    {
        return redirect()->route('examens.examens.index');
    }

    public function edit(Examen $examen)
    {
        return redirect()->route('examens.examens.index');
    }

    public function update(Request $request, Examen $examen)
    {
        $validated = $this->validateExamen($request);
        $manualSplit = collect($validated['repartition_salles'] ?? []);
        unset($validated['repartition_salles']);
        unset($validated['plan_all_filtered_modules'], $validated['module_ids'], $validated['module_plannings']);

        if (! ($validated['id_module'] ?? null)) {
            return back()->withErrors(['id_module' => 'Veuillez selectionner un module.'])->withInput();
        }

        $session = SessionExamen::find((int) $validated['id_session_examen'], ['id_session_examen', 'id_annee', 'id_filiere']);
        $preferredFiliereId = $session?->id_filiere ?: $this->currentUserFiliereId();
        $salles = collect($request->input('salles', []))
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        // Prefer the first selected salle as the primary one to avoid keeping stale values
        $primarySalleId = $salles->first() ?: ($validated['id_salle'] ?? null);
        $validated['id_salle'] = $primarySalleId ? (int) $primarySalleId : null;

        // Ensure at least one salle is provided
        $allSalleIds = $salles->isNotEmpty()
            ? $salles
            : collect([$validated['id_salle']])->filter()->values();
        if ($allSalleIds->isEmpty()) {
            return back()->with('error', 'Veuillez selectionner au moins une salle.');
        }

        // Validate capacity vs expected students
        $registrations = $this->registrationsForModule(
            (int) $validated['id_module'],
            $session?->id_annee,
            $preferredFiliereId
        );
        if ($registrations->isEmpty()) {
            return back()
                ->withErrors([
                    'id_module' => 'Aucun etudiant inscrit pour ce module dans l\'annee academique de la session choisie. Creez les inscriptions pedagogiques avant de planifier cet examen.',
                ])
                ->withInput();
        }
        $studentCount = $registrations->count();
        $manualSplit = $this->normalizeManualSplit($manualSplit, $allSalleIds);
        [$expectedCount, $rangeErrors] = $this->resolveExpectedCount($validated, $studentCount, (int) $manualSplit->sum('nombre'));
        if ($rangeErrors) {
            return back()->withErrors($rangeErrors)->withInput();
        }
        $salleModels = $this->orderedSalles($allSalleIds);
        $totalCapacity = $salleModels->sum(function ($salle) {
            return $salle->capacite_examens ?? $salle->capacite ?? 0;
        });

        if ($capacityError = $this->validateManualCapacities($manualSplit, $salleModels)) {
            return back()->withErrors(['repartition_salles' => $capacityError])->withInput();
        }

        if ($creditAllocationError = $this->validateCreditAllocation($registrations, $salleModels, $manualSplit, $expectedCount)) {
            return back()->withErrors(['salles' => $creditAllocationError])->withInput();
        }

        if ($expectedCount > $totalCapacity) {
            return back()
                ->withErrors(['salles' => 'Capacite des salles insuffisante pour les etudiants a repartir. Ajoutez une salle ou ajustez la repartition.'])
                ->withInput();
        }

        $examen->update($validated);
        $examen->salles()->sync($allSalleIds);

        RepartitionEtudiant::where('id_examen', $examen->id_examen)->delete();
        Anonymat::where('id_examen', $examen->id_examen)->delete();

        $this->generateInitialRepartition($examen, $registrations, $expectedCount, $manualSplit, $salleModels);

        return redirect()
            ->route('examens.examens.index')
            ->with('success', 'Examen mis ? jour.');
    }

    public function destroy(Examen $examen)
    {
        $examen->delete();

        return redirect()
            ->route('examens.examens.index')
            ->with('success', 'Examen supprim?.');
    }

    private function validateExamen(Request $request): array
    {
        // Normalize salles to a flat list of IDs (handles array-of-objects input)
        $request->merge([
            'salles' => collect($request->input('salles', []))
                ->map(function ($salle) {
                    if (is_array($salle)) {
                        return $salle['id_salle'] ?? $salle['id'] ?? $salle['value'] ?? null;
                    }
                    return $salle;
                })
                ->filter()
                ->values()
                ->all(),
            'module_plannings' => collect($request->input('module_plannings', []))
                ->map(function ($planning) {
                    if (! is_array($planning)) {
                        return null;
                    }

                    return [
                        'id_module' => $planning['id_module'] ?? $planning['module_id'] ?? null,
                        'date_examen' => $planning['date_examen'] ?? null,
                        'date_debut' => $planning['date_debut'] ?? null,
                        'date_fin' => $planning['date_fin'] ?? null,
                    ];
                })
                ->filter()
                ->values()
                ->all(),
        ]);

        $planAllFilteredModules = $request->boolean('plan_all_filtered_modules');

        $validator = validator($request->all(), [
            'id_session_examen' => ['required', 'exists:sessions_examen,id_session_examen'],
            'id_module'         => [Rule::requiredIf(! $planAllFilteredModules), 'nullable', 'exists:modules,id_module'],
            'plan_all_filtered_modules' => ['sometimes', 'boolean'],
            'module_ids'        => ['nullable', 'array'],
            'module_ids.*'      => ['nullable', 'exists:modules,id_module'],
            'module_plannings'  => ['nullable', 'array'],
            'module_plannings.*.id_module' => ['nullable', 'exists:modules,id_module'],
            'module_plannings.*.date_examen' => ['nullable', 'date'],
            'module_plannings.*.date_debut' => ['nullable', 'date'],
            'module_plannings.*.date_fin' => ['nullable', 'date'],
            'id_salle'          => ['nullable', 'exists:salles,id_salle'],
            'salles'            => ['nullable', 'array'],
            'salles.*'          => ['nullable', 'exists:salles,id_salle'],
            'repartition_salles'            => ['nullable', 'array'],
            'repartition_salles.*.id_salle' => ['required_with:repartition_salles.*.nombre', 'exists:salles,id_salle'],
            'repartition_salles.*.nombre'   => ['nullable', 'integer', 'min:1'],
            'anonymat_start'    => ['nullable', 'integer', 'min:1', 'required_with:anonymat_end'],
            'anonymat_end'      => ['nullable', 'integer', 'min:1', 'gte:anonymat_start', 'required_with:anonymat_start'],
            'date_examen'       => [Rule::requiredIf(! $planAllFilteredModules), 'nullable', 'date'],
            'date_debut'        => [Rule::requiredIf(! $planAllFilteredModules), 'nullable', 'date'],
            'date_fin'          => [Rule::requiredIf(! $planAllFilteredModules), 'nullable', 'date', 'after:date_debut'],
            'statut'            => ['required', Rule::in(Examen::STATUTS)],
            'description'       => ['nullable', 'string'],
        ]);

        $validator->after(function ($validator) use ($planAllFilteredModules, $request) {
            if (! $planAllFilteredModules) {
                return;
            }

            $plannings = collect($request->input('module_plannings', []));
            if ($plannings->isEmpty()) {
                $validator->errors()->add('module_plannings', 'Renseignez les dates de chaque module a planifier.');
                return;
            }

            $seenModules = [];
            foreach ($plannings as $index => $planning) {
                $moduleId = (int) ($planning['id_module'] ?? 0);
                $dateExamen = $planning['date_examen'] ?? null;
                $dateDebut = $planning['date_debut'] ?? null;
                $dateFin = $planning['date_fin'] ?? null;

                if (! $moduleId) {
                    $validator->errors()->add("module_plannings.$index.id_module", 'Module invalide.');
                } elseif (isset($seenModules[$moduleId])) {
                    $validator->errors()->add("module_plannings.$index.id_module", 'Ce module est present plusieurs fois.');
                }

                $seenModules[$moduleId] = true;

                if (! $dateExamen) {
                    $validator->errors()->add("module_plannings.$index.date_examen", 'La date de l\'examen est obligatoire.');
                }

                if (! $dateDebut) {
                    $validator->errors()->add("module_plannings.$index.date_debut", 'L\'heure de debut est obligatoire.');
                }

                if (! $dateFin) {
                    $validator->errors()->add("module_plannings.$index.date_fin", 'L\'heure de fin est obligatoire.');
                }

                if ($dateDebut && $dateFin && strtotime((string) $dateFin) <= strtotime((string) $dateDebut)) {
                    $validator->errors()->add("module_plannings.$index.date_fin", 'L\'heure de fin doit etre apres l\'heure de debut.');
                }
            }
        });

        return $validator->validate();
    }

    private function generateInitialRepartition(
        Examen $examen,
        $registrations = null,
        ?int $limitCount = null,
        ?Collection $manualSplit = null,
        ?Collection $orderedSalles = null
    ): void
    {
        $registrations = $registrations ?? $this->registrationsForModule(
            (int) $examen->id_module,
            $examen->sessionExamen?->id_annee,
            $this->preferredExamFiliereId($examen)
        );
        $limitCount ??= $this->anonymatRangeCount(
            $examen->anonymat_start ? (int) $examen->anonymat_start : null,
            $examen->anonymat_end ? (int) $examen->anonymat_end : null
        );
        $registrations = $this->orderRegistrationsForRepartition(collect($registrations));
        if ($registrations->isEmpty()) {
            return;
        }

        $normalRegistrations = $registrations
            ->reject(fn ($registration) => $this->isCreditRegistration($registration))
            ->values();
        $creditRegistrations = $registrations
            ->filter(fn ($registration) => $this->isCreditRegistration($registration))
            ->values();

        if ($limitCount !== null) {
            $plannedCreditCount = min($creditRegistrations->count(), max(0, $limitCount));
            $creditRegistrations = $creditRegistrations->take($plannedCreditCount)->values();
            $remainingNormalSlots = max(0, $limitCount - $plannedCreditCount);
            $normalRegistrations = $normalRegistrations->take($remainingNormalSlots)->values();
        }

        $totalStudents = $normalRegistrations->count() + $creditRegistrations->count();
        if ($totalStudents === 0) {
            return;
        }

        $now = now();
        $seq = $examen->anonymat_start ? (int) $examen->anonymat_start : 1;
        $anonRows = [];
        $repartitionRows = [];

        $examen->loadMissing([
            'sessionExamen:id_session_examen,id_annee,id_filiere,type_session,nom_session',
            'module.offresFormation:id_offre,id_module,id_semestre,id_section,id_annee',
            'module.offresFormation.section:id_section,id_filiere',
            'module.offresFormation.section.filiere:id_filiere,nom_filiere',
            'module.offresFormation.semestre:id_semestre,id_niveau',
            'module.offresFormation.semestre.niveau:id_niveau,nom_niveau,ordre',
        ]);

        $allRooms = $orderedSalles?->values() ?? collect();
        if ($allRooms->isEmpty()) {
            $allRooms = $examen->salles()->select('salles.id_salle', 'salles.code_salle', 'salles.capacite_examens', 'salles.capacite')->get();
        }
        if ($allRooms->isEmpty() && $examen->id_salle) {
            $salle = Salle::find($examen->id_salle);
            if ($salle) {
                $allRooms = collect([$salle]);
            }
        }

        if ($allRooms->isEmpty()) {
            return;
        }

        $rooms = $allRooms->values();
        $creditCount = $creditRegistrations->count();
        $manualTargets = collect($manualSplit)
            ->filter(fn ($row) => isset($row['id_salle'], $row['nombre']) && $row['nombre'] > 0)
            ->mapWithKeys(fn ($row) => [(int) $row['id_salle'] => (int) $row['nombre']]);

        // Keep only as many salles as needed to cover everyone
        if ($manualTargets->isEmpty() && $rooms->count() > 1) {
            if ($creditCount > 0) {
                $lastRoom = $rooms->last();
                $ordered = collect();
                $remainingSeats = $normalRegistrations->count();

                if ($remainingSeats > 0) {
                    foreach ($rooms->slice(0, -1) as $room) {
                        $ordered->push($room);
                        $cap = $room->capacite_examens ?? $room->capacite ?? 0;
                        $remainingSeats -= $cap;
                        if ($remainingSeats <= 0) {
                            break;
                        }
                    }
                }

                $rooms = $ordered->push($lastRoom)->unique('id_salle')->values();
            } else {
                $ordered = collect();
                $remainingSeats = $totalStudents;
                foreach ($rooms as $room) {
                    $ordered->push($room);
                    $cap = $room->capacite_examens ?? $room->capacite ?? 0;
                    $remainingSeats -= $cap;
                    if ($remainingSeats <= 0) {
                        break;
                    }
                }
                $rooms = $ordered;
            }
        }

        // If first salle is enough, stick to it
        if ($creditCount === 0 && $manualTargets->isEmpty() && $rooms->first()) {
            $firstCap = $rooms->first()->capacite_examens ?? $rooms->first()->capacite ?? 0;
            if ($firstCap >= $totalStudents) {
                $rooms = collect([$rooms->first()]);
            }
        }

        if ($rooms->isEmpty()) {
            return;
        }

        $roomPositions = $allRooms
            ->pluck('id_salle')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->flip();
        $normalRemaining = $normalRegistrations->count();
        $normalOffset = 0;
        $lastRoomId = $rooms->last()?->id_salle;

        foreach ($rooms as $index => $salle) {
            $capacity = (int) ($salle->capacite_examens ?? $salle->capacite ?? 0);
            $manualTarget = $manualTargets->get((int) $salle->id_salle);
            $reservedCreditSeats = $creditCount > 0 && $salle->id_salle === $lastRoomId
                ? $creditCount
                : 0;
            $roomLimit = $manualTarget ?? ($capacity > 0 ? $capacity : $normalRemaining + $reservedCreditSeats);
            $normalCapacity = max(0, $roomLimit - $reservedCreditSeats);
            $normalRoomsLeft = $rooms
                ->slice($index)
                ->filter(function ($room) use ($manualTargets, $creditCount, $lastRoomId, $normalRemaining) {
                    $roomCapacity = (int) ($room->capacite_examens ?? $room->capacite ?? 0);
                    $roomTarget = $manualTargets->get((int) $room->id_salle) ?? ($roomCapacity > 0 ? $roomCapacity : $normalRemaining);
                    $reservedSeats = $creditCount > 0 && $room->id_salle === $lastRoomId
                        ? $creditCount
                        : 0;

                    return ($roomTarget - $reservedSeats) > 0;
                })
                ->count();
            $balancedTake = (int) ceil($normalRemaining / max(1, $normalRoomsLeft));
            if ($manualTarget !== null) {
                $target = $normalCapacity;
            } elseif ($creditCount > 0) {
                $target = $salle->id_salle === $lastRoomId
                    ? $normalRemaining
                    : $normalCapacity;
            } else {
                $target = $balancedTake;
            }
            $take = min($normalCapacity, $target, $normalRemaining);

            $slice = $normalRegistrations->slice($normalOffset, $take)->values();
            $normalOffset += $slice->count();
            $normalRemaining -= $slice->count();

            if ($reservedCreditSeats > 0) {
                $slice = $slice->concat($creditRegistrations)->values();
            }

            $seat = 1;
            $seatPrefix = substr($salle->code_salle ?? 'S', 0, 4);
            $filiereCode = $this->filiereCode($examen);
            $niveauCode = $this->niveauCode($examen);
            $sessionCode = $this->sessionCode($examen);
            $salleCode = $roomPositions->has((int) $salle->id_salle)
                ? ((int) $roomPositions->get((int) $salle->id_salle) + 1)
                : ($index + 1);

            foreach ($slice as $ip) {
                $codeAnonymat = (string) $seq;
                $grilleCode = (int) sprintf(
                    '%d%d%d%d%03d',
                    $filiereCode,
                    $niveauCode,
                    $sessionCode,
                    $salleCode,
                    $seat
                );

                $anonRows[] = [
                    'id_examen'                  => $examen->id_examen,
                    'id_inscription_pedagogique' => $ip->id_inscription_pedagogique,
                    'code_anonymat'              => $codeAnonymat,
                    'created_at'                 => $now,
                    'updated_at'                 => $now,
                ];

                $repartitionRows[] = [
                    'id_examen'                  => $examen->id_examen,
                    'id_inscription_pedagogique' => $ip->id_inscription_pedagogique,
                    'code_grille'                => $grilleCode,
                    'code_anonymat'              => $codeAnonymat,
                    'numero_place'               => sprintf('%s-%03d', $seatPrefix, $seat), // max ~8 chars to fit column
                    'present'                    => false,
                    'created_at'                 => $now,
                    'updated_at'                 => $now,
                ];

                $seq++;
                $seat++;
            }
        }

        if ($anonRows) {
            Anonymat::insert($anonRows);
        }

        if ($repartitionRows) {
            RepartitionEtudiant::insert($repartitionRows);
        }
    }

    private function resolveExpectedCount(array $validated, int $studentCount, int $manualTotal = 0): array
    {
        $anonymatStart = isset($validated['anonymat_start']) ? (int) $validated['anonymat_start'] : null;
        $anonymatEnd = isset($validated['anonymat_end']) ? (int) $validated['anonymat_end'] : null;
        $rangeCount = $this->anonymatRangeCount($anonymatStart, $anonymatEnd);

        if ($rangeCount === null) {
            return [$manualTotal > 0 ? $manualTotal : $studentCount, null];
        }

        if ($rangeCount > $studentCount) {
            return [
                null,
                [
                    'anonymat_end' => sprintf(
                        'La plage d\'anonymats demandee couvre %d etudiants, mais seulement %d inscriptions sont disponibles pour ce module.',
                        $rangeCount,
                        $studentCount
                    ),
                ],
            ];
        }

        if ($manualTotal > 0 && $manualTotal !== $rangeCount) {
            return [
                null,
                [
                    'repartition_salles' => sprintf(
                        'La repartition manuelle doit couvrir exactement %d anonymats pour correspondre a la plage %d-%d.',
                        $rangeCount,
                        $anonymatStart,
                        $anonymatEnd
                    ),
                ],
            ];
        }

        return [$rangeCount, null];
    }

    private function resolvePlanningModuleIds(array $validated): Collection
    {
        if (! empty($validated['plan_all_filtered_modules'])) {
            $moduleIds = collect($validated['module_plannings'] ?? [])
                ->pluck('id_module')
                ->filter();

            if ($moduleIds->isEmpty()) {
                $moduleIds = collect($validated['module_ids'] ?? []);
            }

            return $moduleIds
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values();
        }

        return collect([$validated['id_module'] ?? null])
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
    }

    private function normalizedBulkModulePlannings(array $validated): Collection
    {
        return collect($validated['module_plannings'] ?? [])
            ->map(function ($planning) {
                if (! is_array($planning) || empty($planning['id_module'])) {
                    return null;
                }

                return [
                    'id_module' => (int) $planning['id_module'],
                    'date_examen' => $planning['date_examen'] ?? null,
                    'date_debut' => $planning['date_debut'] ?? null,
                    'date_fin' => $planning['date_fin'] ?? null,
                ];
            })
            ->filter()
            ->keyBy('id_module');
    }

    private function planningModuleMessage(?Module $module, int $moduleId, string $message, bool $prefixModule = false): string
    {
        if (! $prefixModule) {
            return $message;
        }

        $label = $module
            ? trim(($module->code_module ? $module->code_module.' - ' : '').($module->nom_module ?? ''))
            : 'Module '.$moduleId;

        return sprintf('%s: %s', $label, $message);
    }

    private function anonymatRangeCount(?int $anonymatStart, ?int $anonymatEnd): ?int
    {
        if ($anonymatStart === null || $anonymatEnd === null) {
            return null;
        }

        return ($anonymatEnd - $anonymatStart) + 1;
    }

    private function normalizeManualSplit(Collection $manualSplit, Collection $allowedSalleIds): Collection
    {
        return $manualSplit
            ->map(function ($row) {
                if (is_array($row)) {
                    return [
                        'id_salle' => (int) ($row['id_salle'] ?? $row['id'] ?? $row['value'] ?? 0),
                        'nombre' => isset($row['nombre']) ? (int) $row['nombre'] : null,
                    ];
                }

                return null;
            })
            ->filter(fn ($row) => $row && $row['id_salle'] && $row['nombre'])
            ->filter(fn ($row) => $allowedSalleIds->contains((int) $row['id_salle']))
            ->map(function ($row) {
                $row['nombre'] = (int) $row['nombre'];
                $row['id_salle'] = (int) $row['id_salle'];
                return $row;
            })
            ->keyBy('id_salle');
    }

    private function validateManualCapacities(Collection $manualSplit, Collection $salles): ?string
    {
        if ($manualSplit->isEmpty()) {
            return null;
        }

        $salleById = $salles->keyBy('id_salle');

        foreach ($manualSplit as $idSalle => $row) {
            $salle = $salleById->get($idSalle);
            if (! $salle) {
                continue;
            }

            $capacity = (int) ($salle->capacite_examens ?? $salle->capacite ?? 0);
            if ($capacity && $row['nombre'] > $capacity) {
                $label = $salle->code_salle ?? $salle->nom_salle ?? ('Salle '.$idSalle);
                return sprintf(
                    'La salle %s ne peut pas accueillir %d etudiants (capacite %d).',
                    $label,
                    $row['nombre'],
                    $capacity
                );
            }
        }

        return null;
    }

    private function validateCreditAllocation(Collection $registrations, Collection $salles, Collection $manualSplit, ?int $expectedCount = null): ?string
    {
        $creditCount = $registrations
            ->filter(fn ($registration) => $this->isCreditRegistration($registration))
            ->count();

        if ($creditCount === 0 || $salles->isEmpty()) {
            return null;
        }

        if ($expectedCount !== null && $expectedCount < $creditCount) {
            return sprintf(
                'La repartition doit prevoir au moins %d places pour les etudiants en credit.',
                $creditCount
            );
        }

        $lastSalle = $salles->last();
        $lastSalleCapacity = (int) ($lastSalle->capacite_examens ?? $lastSalle->capacite ?? 0);
        $lastSalleTarget = $manualSplit->get($lastSalle->id_salle)['nombre'] ?? null;
        $availableForCredits = $lastSalleTarget !== null
            ? (int) $lastSalleTarget
            : $lastSalleCapacity;

        if ($availableForCredits >= $creditCount) {
            return null;
        }

        $label = $lastSalle->code_salle ?? $lastSalle->nom_salle ?? 'la derniere salle';

        return sprintf(
            'La derniere salle (%s) doit pouvoir accueillir tous les etudiants en credit (%d).',
            $label,
            $creditCount
        );
    }

    private function registrationsForModule(int $moduleId, ?int $anneeId = null, ?int $filiereId = null)
    {
        $activeYearId = $anneeId
            ?: AnneeUniversitaire::where('est_active', true)->latest('date_debut')->value('id_annee');
        $resolvedFiliereIds = $this->resolvedModuleFiliereIds($moduleId, $activeYearId, $filiereId);

        return InscriptionPedagogique::query()
            ->whereHas('offreFormation', function ($query) use ($moduleId, $activeYearId, $resolvedFiliereIds) {
                $query->where('id_module', $moduleId);

                if ($activeYearId) {
                    $query->where('id_annee', $activeYearId);
                }

                if ($resolvedFiliereIds !== []) {
                    $query->whereHas('section', function ($sectionQuery) use ($resolvedFiliereIds) {
                        $sectionQuery->whereIn('id_filiere', $resolvedFiliereIds);
                    });
                }
            })
            ->when($activeYearId, function ($query) use ($activeYearId) {
                $query->whereHas('inscriptionAdministrative', function ($adminQuery) use ($activeYearId) {
                    $adminQuery->where('id_annee', $activeYearId);
                });
            })
            ->where('type_inscription', '!=', 'Capitalisation')
            ->orderBy('id_inscription_pedagogique')
            ->get(['id_inscription_pedagogique', 'type_inscription']);
    }

    private function filiereCode(Examen $examen): int
    {
        $filiere = $this->referenceOffre($examen)?->section?->filiere;
        $name = strtolower($filiere->nom_filiere ?? '');

        $byName = match (true) {
            str_contains($name, 'med')  => 1,
            str_contains($name, 'phar') => 2,
            str_contains($name, 'dent') => 3,
            default                     => null,
        };

        if ($byName !== null) {
            return $byName;
        }

        return match ($filiere->id_filiere ?? null) {
            1 => 1,
            2 => 2,
            3 => 3,
            default => 0,
        };
    }

    private function niveauCode(Examen $examen): int
    {
        $offre = $this->referenceOffre($examen);
        $niveau = $offre?->semestre?->niveau;

        if (! $niveau) {
            return 0;
        }

        if (is_numeric($niveau->ordre)) {
            $ord = (int) $niveau->ordre;
            return ($ord >= 1 && $ord <= 5) ? $ord : 0;
        }

        return 0;
    }

    private function referenceOffre(Examen $examen)
    {
        $session = $examen->sessionExamen;
        $offres = $examen->module?->offresFormation ?? collect();
        $effectiveFiliereId = $session?->id_filiere ?: $this->currentUserFiliereId();

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

        $module = Module::with([
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

    private function preferredExamFiliereId(Examen $examen): ?int
    {
        return $examen->sessionExamen?->id_filiere ?: $this->currentUserFiliereId();
    }

    private function orderedSalles(Collection $salleIds): Collection
    {
        $orderedIds = $salleIds->values()->map(fn ($id) => (int) $id);
        $positions = $orderedIds->flip();

        return Salle::whereIn('id_salle', $orderedIds)
            ->get(['id_salle', 'code_salle', 'nom_salle', 'capacite_examens', 'capacite'])
            ->sortBy(fn ($salle) => $positions->get((int) $salle->id_salle, PHP_INT_MAX))
            ->values();
    }

    private function orderRegistrationsForRepartition(Collection $registrations): Collection
    {
        return $registrations
            ->sortBy(function ($registration) {
                return sprintf(
                    '%d-%010d',
                    $this->isCreditRegistration($registration) ? 1 : 0,
                    (int) ($registration->id_inscription_pedagogique ?? 0)
                );
            })
            ->values();
    }

    private function isCreditRegistration($registration): bool
    {
        return strtolower((string) ($registration->type_inscription ?? '')) === 'credit';
    }

    private function currentUserFiliereId(): ?int
    {
        $filiereId = auth()->user()?->userFiliereAnnees()->first()?->id_filiere;

        return $filiereId && $filiereId !== 'all'
            ? (int) $filiereId
            : null;
    }

    private function sessionCode(Examen $examen): int
    {
        $session = $examen->sessionExamen;
        $value = strtolower($session->type_session ?? $session->nom_session ?? '');

        if (str_contains($value, 'ratt')) {
            return 2;
        }

        return 1;
    }
}
