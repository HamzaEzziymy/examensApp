<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ElementModule;
use App\Models\ResultatElement;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;

class ResultatElementController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $params = array_filter([
            'module'  => $request->input('module'),
            'session' => $request->input('session'),
            'view'    => 'elements',
        ], fn ($value) => $value !== null && $value !== '');

        return redirect()->route('correction.resultats-modules.index', $params);
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
        $validated = $this->validateElementResult($request);

        $element = ElementModule::select('id_element', 'id_module')->find($validated['id_element'] ?? null);
        $moduleId = $element?->id_module;

        ResultatElement::create($validated);

        return $this->redirectToIndex($moduleId, $validated['id_session_examen'] ?? null)
            ->with('success', 'Resultat element ajoute.');
    }

    /**
     * Display the specified resource.
     */
    public function show(ResultatElement $resultatsElement)
    {
        return redirect()->route('correction.resultats-modules.index');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(ResultatElement $resultatsElement)
    {
        return redirect()->route('correction.resultats-modules.index');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ResultatElement $resultatsElement): RedirectResponse
    {
        $validated = $this->validateElementResult($request, $resultatsElement);

        $resultatsElement->update($validated);
        $moduleId = $resultatsElement->element?->id_module
            ?? ElementModule::where('id_element', $resultatsElement->id_element)->value('id_module');

        return $this->redirectToIndex($moduleId, $validated['id_session_examen'] ?? $resultatsElement->id_session_examen)
            ->with('success', 'Resultat element mis a jour.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ResultatElement $resultatsElement): RedirectResponse
    {
        $moduleId = $resultatsElement->element?->id_module
            ?? ElementModule::where('id_element', $resultatsElement->id_element)->value('id_module');
        $sessionId = $resultatsElement->id_session_examen;

        $resultatsElement->delete();

        return $this->redirectToIndex($moduleId, $sessionId)
            ->with('success', 'Resultat element supprime.');
    }

    private function validateElementResult(Request $request, ?ResultatElement $result = null): array
    {
        $rules = [
            'id_inscription_pedagogique' => [
                $result ? 'sometimes' : 'required',
                'exists:inscriptions_pedagogiques,id_inscription_pedagogique',
            ],
            'id_element' => [
                $result ? 'sometimes' : 'required',
                'exists:elements_module,id_element',
            ],
            'id_session_examen' => ['nullable', 'exists:sessions_examen,id_session_examen'],
            'moyenne_element' => ['nullable', 'numeric', 'min:0', 'max:20'],
            'statut' => ['required', Rule::in(['En cours', 'Valide', 'Non Valide', 'Rattrapage'])],
            'date_validation' => ['nullable', 'date'],
        ];

        return $request->validate($rules);
    }

    private function redirectToIndex(?int $moduleId = null, ?int $sessionId = null): RedirectResponse
    {
        $params = array_filter([
            'module' => $moduleId,
            'session' => $sessionId,
            'view' => 'elements',
        ], fn ($value) => $value !== null && $value !== '');

        return redirect()->route('correction.resultats-modules.index', $params);
    }
}
