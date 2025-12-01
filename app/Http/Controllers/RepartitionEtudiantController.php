<?php

namespace App\Http\Controllers;

use App\Models\Examen;
use App\Models\InscriptionPedagogique;
use App\Models\OffreFormation;
use App\Models\Semestre;
use App\Models\RepartitionEtudiant;
use App\Models\Salle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique as UniqueRule;
use Inertia\Inertia;

class RepartitionEtudiantController extends Controller
{
    public function index(Request $request)
    {
        $selectedExamenId = $request->filled('examen') ? (int) $request->input('examen') : null;

        $examens = Examen::with([
                'module:id_module,nom_module,code_module',
                'sessionExamen:id_session_examen,nom_session,type_session',
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
            ]);

        $selectedExamen = $examens->firstWhere('id_examen', $selectedExamenId);
        $availableSalles = $this->availableSallesForExam($selectedExamen);

        $repartitions = RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_etudiant,id_module',
                'inscriptionPedagogique.etudiant:id_etudiant,nom,prenom,cne',
                'inscriptionPedagogique.module:id_module,nom_module,code_module',
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

        $inscriptions = InscriptionPedagogique::with([
                'etudiant:id_etudiant,nom,prenom,cne',
                'module:id_module,nom_module',
            ])
            ->when(
                $selectedExamen,
                fn ($query) => $query->where('id_module', $selectedExamen->id_module)
            )
            ->orderBy('id_inscription_pedagogique')
            ->get([
                'id_inscription_pedagogique',
                'id_etudiant',
                'id_module',
            ]);

        return Inertia::render('examens/Repartition/Index', [
            'examens'          => $examens,
            'repartitions'     => $repartitions,
            'inscriptions'     => $inscriptions,
            'selectedExamenId' => $selectedExamen?->id_examen,
            'salles'           => $availableSalles,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->repartitionRules($request));
        $validated['present'] = $request->boolean('present');

        RepartitionEtudiant::create($validated);

        return $this->redirectToIndex((int) $validated['id_examen'])
            ->with('success', 'Etudiant assigne a lexamen.');
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
        $validated = $request->validate($this->repartitionRules($request, $repartitionEtudiant->id_repartition));
        $validated['present'] = $request->boolean('present');

        $repartitionEtudiant->update($validated);

        return $this->redirectToIndex((int) $validated['id_examen'])
            ->with('success', 'Repartition mise a jour.');
    }

    public function destroy(RepartitionEtudiant $repartitionEtudiant)
    {
        $examenId = $repartitionEtudiant->id_examen;
        $repartitionEtudiant->delete();

        return $this->redirectToIndex($examenId)
            ->with('success', 'Repartition supprimee.');
    }

    public function autoAssign(Request $request)
    {
        $validated = $request->validate([
            'id_examen' => ['required', 'exists:examens,id_examen'],
            'salles'    => ['required', 'array', 'min:1'],
            'salles.*'  => ['exists:salles,id_salle'],
        ]);

        $examen = Examen::with(['module', 'sessionExamen'])->findOrFail($validated['id_examen']);

        $selectedSalleIds = collect($validated['salles'])->map(fn ($id) => (int) $id)->values();

        $salles = Salle::whereIn('id_salle', $selectedSalleIds)
            ->get(['id_salle', 'code_salle', 'capacite_examens'])
            ->sortBy(fn ($salle) => $selectedSalleIds->search($salle->id_salle))
            ->values();

        if ($salles->isEmpty()) {
            return back()->with('error', 'Aucune salle valide selectionnee.');
        }

        $activeYearId = \App\Models\AnneeUniversitaire::where('est_active', true)->latest('date_debut')->value('id_annee');

        // Persist selected rooms on the exam (main + pivot)
        $examen->salles()->sync($selectedSalleIds);
        if (! $examen->id_salle) {
            $examen->id_salle = $selectedSalleIds->first();
            $examen->save();
        }

        $filiereId = $examen->sessionExamen?->id_filiere;
        $allowedSectionIds = collect();
        $allowedNiveauIds = collect();

        if ($activeYearId) {
            $offres = OffreFormation::query()
                ->where('id_module', $examen->id_module)
                ->where('id_annee', $activeYearId)
                ->get(['id_section', 'id_semestre']);

            $allowedSectionIds = $offres->pluck('id_section')->filter()->unique();

            $semestreIds = $offres->pluck('id_semestre')->filter()->unique();
            if ($semestreIds->isNotEmpty()) {
                $allowedNiveauIds = Semestre::whereIn('id_semestre', $semestreIds)
                    ->pluck('id_niveau')
                    ->filter()
                    ->unique();
            }
        }

        $students = InscriptionPedagogique::with(['etudiant:id_etudiant,nom,prenom,cne'])
            ->where('inscriptions_pedagogiques.id_module', $examen->id_module)
            ->join('inscriptions_administratives', 'inscriptions_pedagogiques.id_inscription_admin', '=', 'inscriptions_administratives.id_inscription_admin')
            ->when($activeYearId, fn ($q) => $q->where('inscriptions_administratives.id_annee', $activeYearId))
            ->when($allowedNiveauIds->isNotEmpty(), fn ($q) => $q->whereIn('inscriptions_administratives.id_niveau', $allowedNiveauIds))
            ->when($allowedSectionIds->isNotEmpty(), fn ($q) => $q->whereIn('inscriptions_administratives.id_section', $allowedSectionIds))
            ->when($filiereId && $allowedSectionIds->isEmpty(), fn ($q) => $q->where('inscriptions_administratives.id_filiere', $filiereId))
            ->join('etudiants', 'inscriptions_pedagogiques.id_etudiant', '=', 'etudiants.id_etudiant')
            ->orderByRaw('LOWER(etudiants.nom)')
            ->orderByRaw('LOWER(etudiants.prenom)')
            ->orderBy('etudiants.cne')
            ->get(['inscriptions_pedagogiques.id_inscription_pedagogique', 'inscriptions_pedagogiques.id_etudiant', 'inscriptions_pedagogiques.id_module']);

        $totalStudents = $students->count();
        $totalCapacity = $salles->sum(fn ($salle) => max(0, (int) $salle->capacite_examens));

        if ($totalStudents === 0) {
            return back()->with('error', 'Aucun etudiant a affecter pour cet examen.');
        }

        // Detect students already planned on overlapping exams the same day
        $studentIds = $students->pluck('id_etudiant')->filter()->unique();
        if ($studentIds->isNotEmpty()) {
            $start = $examen->date_debut;
            $end   = $examen->date_fin;

            $conflicts = RepartitionEtudiant::query()
                ->join('inscriptions_pedagogiques as ip2', 'ip2.id_inscription_pedagogique', '=', 'repartition_etudiants.id_inscription_pedagogique')
                ->join('etudiants as etd', 'etd.id_etudiant', '=', 'ip2.id_etudiant')
                ->join('examens as ex', 'ex.id_examen', '=', 'repartition_etudiants.id_examen')
                ->whereIn('ip2.id_etudiant', $studentIds)
                ->where('repartition_etudiants.id_examen', '!=', $examen->id_examen)
                ->whereDate('ex.date_examen', $examen->date_examen)
                ->where(function ($query) use ($start, $end) {
                    $query->whereBetween('ex.date_debut', [$start, $end])
                        ->orWhereBetween('ex.date_fin', [$start, $end])
                        ->orWhere(function ($q) use ($start, $end) {
                            $q->where('ex.date_debut', '<=', $start)
                                ->where('ex.date_fin', '>=', $end);
                        });
                })
                ->select('etd.cne')
                ->distinct()
                ->get();

            if ($conflicts->isNotEmpty()) {
                $list = $conflicts->pluck('cne')->take(5)->implode(', ');
                $more = $conflicts->count() > 5 ? '...' : '';
                return back()->with('error', "Etudiants deja planifies sur un autre examen a ce creneau: {$list}{$more}");
            }
        }

        if ($totalCapacity < $totalStudents) {
            return back()->with('error', "Capacite insuffisante: {$totalStudents} etudiants pour {$totalCapacity} places. Ajoutez des salles.");
        }

        RepartitionEtudiant::where('id_examen', $examen->id_examen)->delete();

        $rows = [];
        $now = now();
        $grille = 1;
        $studentIndex = 0;

        foreach ($salles as $salle) {
            $capacity = max(0, (int) $salle->capacite_examens);
            if ($capacity === 0) {
                continue;
            }

            for ($seat = 1; $seat <= $capacity && $studentIndex < $totalStudents; $seat++) {
                $student = $students[$studentIndex];
                $rows[] = [
                    'id_examen'                  => $examen->id_examen,
                    'id_inscription_pedagogique' => $student->id_inscription_pedagogique,
                    'code_grille'                => $grille,
                    'code_anonymat'              => sprintf('ANON-%d-%03d', $examen->id_examen, $grille),
                    'numero_place'               => $this->seatLabel($salle->code_salle ?? (string) $salle->id_salle, $seat),
                    'present'                    => false,
                    'created_at'                 => $now,
                    'updated_at'                 => $now,
                ];
                $grille++;
                $studentIndex++;
            }

            if ($studentIndex >= $totalStudents) {
                break;
            }
        }

        if ($studentIndex < $totalStudents) {
            return back()->with('error', "Capacite insuffisante: {$totalStudents} etudiants pour {$totalCapacity} places. Ajoutez des salles.");
        }

        if (!empty($rows)) {
            RepartitionEtudiant::insert($rows);
        }

        return $this->redirectToIndex($examen->id_examen)
            ->with('success', 'Repartition automatique effectuee.');
    }

    private function repartitionRules(Request $request, ?int $repartitionId = null): array
    {
        $examenId = (int) $request->input('id_examen');

        return [
            'id_examen' => ['required', 'exists:examens,id_examen'],
            'id_inscription_pedagogique' => [
                'required',
                'exists:inscriptions_pedagogiques,id_inscription_pedagogique',
                $this->uniquePerExamen('id_inscription_pedagogique', $examenId, $repartitionId),
            ],
            'code_grille' => [
                'required',
                'integer',
                'min:1',
                $this->uniquePerExamen('code_grille', $examenId, $repartitionId),
            ],
            'code_anonymat' => [
                'nullable',
                'string',
                'max:20',
                $this->uniquePerExamen('code_anonymat', $examenId, $repartitionId),
            ],
            'numero_place' => [
                'nullable',
                'string',
                'max:10',
                $this->uniquePerExamen('numero_place', $examenId, $repartitionId),
            ],
            'present' => ['sometimes', 'boolean'],
            'heure_arrivee' => ['nullable'],
            'heure_sortie' => ['nullable', 'after_or_equal:heure_arrivee'],
            'observation' => ['nullable', 'string'],
        ];
    }

    private function uniquePerExamen(string $column, int $examenId, ?int $ignoreId = null): UniqueRule
    {
        return Rule::unique('repartition_etudiants', $column)
            ->where(fn ($query) => $query->where('id_examen', $examenId))
            ->ignore($ignoreId, 'id_repartition');
    }

    private function redirectToIndex(?int $examenId = null)
    {
        $params = [];

        if ($examenId) {
            $params['examen'] = $examenId;
        }

        return redirect()->route('surveillance.repartition-etudiants.index', $params);
    }

    private function availableSallesForExam(?Examen $examen)
    {
        $baseQuery = Salle::orderBy('code_salle')
            ->select(['id_salle', 'code_salle', 'nom_salle', 'capacite_examens']);

        if (! $examen) {
            return $baseQuery->get();
        }

        $start = $examen->date_debut;
        $end   = $examen->date_fin;

        $overlap = function ($query) use ($start, $end) {
            $query->whereBetween('examens.date_debut', [$start, $end])
                ->orWhereBetween('examens.date_fin', [$start, $end])
                ->orWhere(function ($q) use ($start, $end) {
                    $q->where('examens.date_debut', '<=', $start)
                        ->where('examens.date_fin', '>=', $end);
                });
        };

        $occupiedDirect = Examen::query()
            ->where('id_examen', '!=', $examen->id_examen)
            ->whereDate('date_examen', $examen->date_examen)
            ->where($overlap)
            ->pluck('id_salle');

        $occupiedPivot = DB::table('exam_salle')
            ->join('examens', 'examens.id_examen', '=', 'exam_salle.id_examen')
            ->where('examens.id_examen', '!=', $examen->id_examen)
            ->whereDate('examens.date_examen', $examen->date_examen)
            ->where($overlap)
            ->pluck('exam_salle.id_salle');

        $occupiedIds = $occupiedDirect->merge($occupiedPivot)->filter()->unique();
        $currentExamSalleIds = collect([$examen->id_salle])
            ->merge($examen->salles->pluck('id_salle') ?? collect())
            ->filter()
            ->unique();

        return $baseQuery
            ->where(function ($query) use ($occupiedIds, $currentExamSalleIds) {
                $query->whereNotIn('id_salle', $occupiedIds)
                    ->orWhereIn('id_salle', $currentExamSalleIds);
            })
            ->get();
    }

    private function seatLabel(string $codeSalle, int $seat): string
    {
        $roomPart = substr($codeSalle, 0, 6);
        $label = sprintf('%s-%03d', $roomPart, $seat);

        return substr($label, 0, 10);
    }
}
