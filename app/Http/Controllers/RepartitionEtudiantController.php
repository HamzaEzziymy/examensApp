<?php

namespace App\Http\Controllers;

use App\Models\Examen;
use App\Models\InscriptionPedagogique;
use App\Models\RepartitionEtudiant;
use App\Models\Salle;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\LaravelPdf\Facades\Pdf;

class RepartitionEtudiantController extends Controller
{
    public function index(Request $request)
    {
        $selectedExamenId = $request->integer('examen');

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

        $selectedExamen = $examens->firstWhere('id_examen', $selectedExamenId) ?? $examens->first();

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

        $inscriptions = $selectedExamen
            ? InscriptionPedagogique::with([
                    'etudiant:id_etudiant,nom,prenom,cne',
                    'module:id_module,nom_module,code_module',
                ])
                ->where('id_module', $selectedExamen->id_module)
                ->orderBy('id_inscription_pedagogique')
                ->get([
                    'id_inscription_pedagogique',
                    'id_etudiant',
                    'id_module',
                ])
            : collect();

        $salles = Salle::orderBy('code_salle')
            ->get(['id_salle', 'code_salle', 'nom_salle', 'capacite_examens']);

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
                'inscriptionPedagogique:id_inscription_pedagogique,id_etudiant',
                'inscriptionPedagogique.etudiant:id_etudiant,nom,prenom,cne',
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
            'module.offresFormation.section.filiere',
            'module.offresFormation.semestre.niveau',
        ]);

        $offre = $examen->module->offresFormation->first();
        $niveauName = $offre?->semestre?->niveau?->nom_niveau;
        $filiereName = $offre?->section?->filiere?->nom_filiere;
        $niveauFiliere = trim(
            ($niveauName ?? '') .
            ($niveauName && $filiereName ? ' - ' : '') .
            ($filiereName ?? '')
        );

        $allowedColumns = ['cne', 'etudiant', 'grille', 'place', 'anonymat', 'presence'];
        $columns = $request->input('columns', $allowedColumns);
        $columns = array_values(array_intersect($allowedColumns, (array) $columns));
        if (empty($columns)) {
            $columns = $allowedColumns;
        }

        $presenceFilled = $request->boolean('presence_filled', true);

        $payload = [
            'examen'         => $examen,
            'repartitions'   => $repartitions,
            'presentCount'   => $presentCount,
            'absentCount'    => $total - $presentCount,
            'total'          => $total,
            'generatedAt'    => now(),
            'niveauFiliere'  => $niveauFiliere,
            'columns'        => $columns,
            'presenceFilled' => $presenceFilled,
        ];

        $filename = sprintf('repartition-%s-%s.pdf', $examen->module->code_module ?? 'examen', $examen->id_examen);

        return Pdf::view('pdfs.repartition', $payload)
            ->format('a4')
            ->download($filename);
    }
}
