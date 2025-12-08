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
        $examens = Examen::with([
                'sessionExamen:id_session_examen,nom_session,type_session',
                'module:id_module,nom_module,code_module',
                'salle:id_salle,code_salle,nom_salle,capacite_examens',
                'salles:id_salle,code_salle,nom_salle,capacite_examens',
            ])
            ->withCount('repartitions')
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
                'description',
            ]);

        $sessions = SessionExamen::select('id_session_examen', 'nom_session', 'type_session', 'date_session_examen')
            ->orderByDesc('date_session_examen')
            ->get();

        $modules = Module::select('id_module', 'nom_module', 'code_module')
            ->orderBy('nom_module')
            ->get();

        $salles = Salle::select('id_salle', 'code_salle', 'nom_salle', 'capacite_examens')
            ->orderBy('code_salle')
            ->get();

        return [
            'examens' => $examens,
            'sessions' => $sessions,
            'modules' => $modules,
            'salles' => $salles,
            'statuts' => Examen::STATUTS,
        ];
    }

    public function store(Request $request)
    {
        $validated = $this->validateExamen($request);

        $salles = collect($request->input('salles', []))
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $validated['id_salle'] = $validated['id_salle'] ?? $salles->first();

        // Ensure at least one salle is provided
        $allSalleIds = $salles;
        if ($validated['id_salle']) {
            $allSalleIds = $allSalleIds->push((int) $validated['id_salle'])->unique()->values();
        }
        if ($allSalleIds->isEmpty()) {
            return back()->with('error', 'Veuillez selectionner au moins une salle.');
        }

        // Validate capacity vs expected students
        $registrations = $this->registrationsForModule((int) $validated['id_module']);
        $studentCount = $registrations->count();
        $salleModels = Salle::whereIn('id_salle', $allSalleIds)->get(['id_salle', 'code_salle', 'capacite_examens', 'capacite']);
        $totalCapacity = $salleModels->sum(function ($salle) {
            return $salle->capacite_examens ?? $salle->capacite ?? 0;
        });

        if ($studentCount > $totalCapacity) {
            return back()
                ->withErrors(['salles' => 'Capacite des salles insuffisante pour le nombre d\'etudiants. Ajoutez une salle.'])
                ->withInput();
        }

        $examen = Examen::create($validated);
        $examen->salles()->sync($allSalleIds);
        $examen->load('salles:id_salle,code_salle,capacite_examens,capacite');

        $this->generateInitialRepartition($examen, $registrations);

        return redirect()
            ->route('examens.examens.index')
            ->with('success', 'Examen planifi?.');
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

        $salles = collect($request->input('salles', []))
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $validated['id_salle'] = $validated['id_salle'] ?? $salles->first();

        $examen->update($validated);
        $examen->salles()->sync($salles);

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
        ]);

        return $request->validate([
            'id_session_examen' => ['required', 'exists:sessions_examen,id_session_examen'],
            'id_module'         => ['required', 'exists:modules,id_module'],
            'id_salle'          => ['nullable', 'exists:salles,id_salle'],
            'salles'            => ['nullable', 'array'],
            'salles.*'          => ['nullable', 'exists:salles,id_salle'],
            'date_examen'       => ['required', 'date'],
            'date_debut'        => ['required', 'date'],
            'date_fin'          => ['required', 'date', 'after:date_debut'],
            'statut'            => ['required', Rule::in(Examen::STATUTS)],
            'description'       => ['nullable', 'string'],
        ]);
    }

    private function generateInitialRepartition(Examen $examen, $registrations = null): void
    {
        $registrations = $registrations ?? $this->registrationsForModule((int) $examen->id_module);

        if ($registrations->isEmpty()) {
            return;
        }

        $now = now();
        $seq = 1;
        $anonRows = [];
        $repartitionRows = [];

        $examen->loadMissing([
            'sessionExamen.filiere:id_filiere,nom_filiere',
            'module.offresFormation.semestre.niveau',
        ]);

        $salles = $examen->salles()->select('salles.id_salle', 'salles.code_salle', 'salles.capacite_examens', 'salles.capacite')->get();
        if ($salles->isEmpty() && $examen->id_salle) {
            $salle = Salle::find($examen->id_salle);
            if ($salle) {
                $salles = collect([$salle]);
            }
        }

        $registrations = $registrations->values();
        $remaining = $registrations->count();
        $rooms = $salles->values();
        $offset = 0;
        $totalStudents = $registrations->count();

        // Keep only as many salles as needed to cover everyone
        if ($rooms->count() > 1) {
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

        // If first salle is enough, stick to it
        if ($rooms->first()) {
            $firstCap = $rooms->first()->capacite_examens ?? $rooms->first()->capacite ?? 0;
            if ($firstCap >= $totalStudents) {
                $rooms = collect([$rooms->first()]);
            }
        }

        $roomCount = $rooms->count() ?: 1;
        $remaining = $totalStudents;
        $offset = 0;

        foreach ($rooms as $index => $salle) {
            $capacity = $salle->capacite_examens ?? $salle->capacite ?? $remaining;
            $roomsLeft = $roomCount - $index;
            $balancedTake = (int) ceil($remaining / max(1, $roomsLeft));
            $take = min($capacity > 0 ? $capacity : $remaining, $balancedTake, $remaining);

            $slice = $registrations->slice($offset, $take);
            $offset += $slice->count();
            $remaining -= $slice->count();

            $seat = 1;
            $seatPrefix = substr($salle->code_salle ?? 'S', 0, 4);
            $filiereCode = $this->filiereCode($examen);
            $niveauCode = $this->niveauCode($examen);
            $sessionCode = $this->sessionCode($examen);
            $salleCode = $index + 1;

            foreach ($slice as $ip) {
                $codeAnonymat = sprintf('ANON-%d-%03d', $examen->id_examen, $seq);
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

    private function registrationsForModule(int $moduleId)
    {
        $activeYearId = AnneeUniversitaire::where('est_active', true)->latest('date_debut')->value('id_annee');

        return InscriptionPedagogique::query()
            ->where('inscriptions_pedagogiques.id_module', $moduleId)
            ->when($activeYearId, function ($query) use ($activeYearId) {
                $query->join('inscriptions_administratives', 'inscriptions_administratives.id_inscription_admin', '=', 'inscriptions_pedagogiques.id_inscription_admin')
                    ->where('inscriptions_administratives.id_annee', $activeYearId);
            })
            ->orderBy('inscriptions_pedagogiques.id_inscription_pedagogique')
            ->get(['inscriptions_pedagogiques.id_inscription_pedagogique']);
    }

    private function filiereCode(Examen $examen): int
    {
        $filiere = $examen->sessionExamen->filiere ?? null;
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
        $module = $examen->module;
        if (! $module) {
            return 0;
        }

        $offre = $module->offresFormation->first();
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
