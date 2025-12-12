<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Module;
use App\Models\ResultatElement;
use App\Models\ResultatModule;
use App\Models\SessionExamen;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ResultatModuleController extends Controller
{
    public function index(Request $request)
    {
        $moduleId = $request->integer('module');
        $sessionId = $request->integer('session');
        $view = $request->input('view', 'modules');

        $modules = Module::select('id_module', 'nom_module', 'code_module')
            ->orderBy('nom_module')
            ->get();

        $sessions = SessionExamen::with(['filiere:id_filiere,nom_filiere'])
            ->orderByDesc('date_session_examen')
            ->get([
                'id_session_examen',
                'id_filiere',
                'nom_session',
                'type_session',
                'date_session_examen',
            ]);

        $moduleResults = ResultatModule::with([
                'module:id_module,nom_module,code_module',
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
            ])
            ->when($moduleId, fn ($query) => $query->where('id_module', $moduleId))
            ->orderByDesc('id_resultat_module')
            ->get([
                'id_resultat_module',
                'id_inscription_pedagogique',
                'id_module',
                'moyenne_module',
                'statut',
                'date_validation',
                'est_anticipe',
            ]);

        $elementResults = ResultatElement::with([
                'element:id_element,id_module,code_element,nom_element',
                'element.module:id_module,nom_module,code_module',
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
                'sessionExamen:id_session_examen,nom_session,type_session,date_session_examen',
            ])
            ->when($moduleId, fn ($query) => $query->whereHas('element', fn ($q) => $q->where('id_module', $moduleId)))
            ->when($sessionId, fn ($query) => $query->where('id_session_examen', $sessionId))
            ->orderByDesc('id_resultat_element')
            ->get([
                'id_resultat_element',
                'id_inscription_pedagogique',
                'id_element',
                'id_session_examen',
                'moyenne_element',
                'statut',
                'date_validation',
            ]);

        $stats = [
            'modules' => [
                'count'     => $moduleResults->count(),
                'average'   => $moduleResults->avg('moyenne_module') !== null ? round((float) $moduleResults->avg('moyenne_module'), 2) : null,
                'validated' => $moduleResults->where('statut', 'Valide')->count(),
                'anticipes' => $moduleResults->where('est_anticipe', true)->count(),
            ],
            'elements' => [
                'count'     => $elementResults->count(),
                'average'   => $elementResults->avg('moyenne_element') !== null ? round((float) $elementResults->avg('moyenne_element'), 2) : null,
                'validated' => $elementResults->where('statut', 'Valide')->count(),
            ],
        ];

        return Inertia::render('correction/Results/Index', [
            'moduleResults' => $moduleResults,
            'elementResults'=> $elementResults,
            'modules'       => $modules,
            'sessions'      => $sessions,
            'filters'       => [
                'module'  => $moduleId,
                'session' => $sessionId,
                'view'    => $view ?: 'modules',
            ],
            'stats'         => $stats,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return redirect()->route('correction.resultats-modules.index');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateModuleResult($request);
        $validated['est_anticipe'] = $request->boolean('est_anticipe');

        $result = ResultatModule::create($validated);

        return $this->redirectToIndex($result->id_module, null, 'modules')
            ->with('success', 'Resultat module ajoute.');
    }

    /**
     * Display the specified resource.
     */
    public function show(ResultatModule $resultatsModule)
    {
        return redirect()->route('correction.resultats-modules.index');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(ResultatModule $resultatsModule)
    {
        return redirect()->route('correction.resultats-modules.index');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ResultatModule $resultatsModule): RedirectResponse
    {
        $validated = $this->validateModuleResult($request, $resultatsModule);
        $validated['est_anticipe'] = $request->boolean('est_anticipe');

        $resultatsModule->update($validated);

        return $this->redirectToIndex($resultatsModule->id_module, null, 'modules')
            ->with('success', 'Resultat module mis a jour.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ResultatModule $resultatsModule): RedirectResponse
    {
        $moduleId = $resultatsModule->id_module;
        $resultatsModule->delete();

        return $this->redirectToIndex($moduleId, null, 'modules')
            ->with('success', 'Resultat module supprime.');
    }

    private function validateModuleResult(Request $request, ?ResultatModule $resultatsModule = null): array
    {
        $rules = [
            'id_inscription_pedagogique' => [
                $resultatsModule ? 'sometimes' : 'required',
                'exists:inscriptions_pedagogiques,id_inscription_pedagogique',
            ],
            'id_module' => [
                $resultatsModule ? 'sometimes' : 'required',
                'exists:modules,id_module',
            ],
            'moyenne_module' => ['nullable', 'numeric', 'min:0', 'max:20'],
            'statut' => ['required', Rule::in(['En cours', 'Valide', 'Non Valide', 'Rattrapage', 'Capitalise', 'En dette'])],
            'date_validation' => ['nullable', 'date'],
            'est_anticipe' => ['sometimes', 'boolean'],
        ];

        return $request->validate($rules);
    }

    private function redirectToIndex(?int $moduleId = null, ?int $sessionId = null, string $view = 'modules'): RedirectResponse
    {
        $params = array_filter([
            'module' => $moduleId,
            'session' => $sessionId,
            'view' => $view,
        ], fn ($value) => $value !== null && $value !== '');

        return redirect()->route('correction.resultats-modules.index', $params);
    }
}
