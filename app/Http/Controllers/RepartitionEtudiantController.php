<?php

namespace App\Http\Controllers;

use App\Models\Examen;
use App\Models\InscriptionPedagogique;
use App\Models\RepartitionEtudiant;
use Illuminate\Http\Request;
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
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->repartitionRules($request));
        $validated['present'] = $request->boolean('present');

        RepartitionEtudiant::create($validated);

        return $this->redirectToIndex((int) $validated['id_examen'])
            ->with('success', 'Étudiant assigné à l’examen.');
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
            ->with('success', 'Répartition mise à jour.');
    }

    public function destroy(RepartitionEtudiant $repartitionEtudiant)
    {
        $examenId = $repartitionEtudiant->id_examen;
        $repartitionEtudiant->delete();

        return $this->redirectToIndex($examenId)
            ->with('success', 'Répartition supprimée.');
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
}
