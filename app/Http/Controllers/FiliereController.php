<?php

namespace App\Http\Controllers;

use App\Models\Filiere;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FiliereController extends Controller
{
    public function index(): JsonResponse
    {
        $filieres = Filiere::with([
            'anneeUniversitaire:id_annee,annee_univ',
            'niveaux:id_niveau,id_filiere,nom_niveau',
        ])->orderBy('nom_filiere')->get();

        return response()->json($filieres);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom_filiere'  => ['required', 'string', 'max:100'],
            'code_filiere' => ['nullable', 'integer', 'unique:filieres,code_filiere'],
            'id_annee'     => ['nullable', 'exists:annees_universitaires,id_annee'],
        ]);

        $filiere = Filiere::create($validated);

        return response()->json($filiere->load('anneeUniversitaire'), 201);
    }

    public function show(int $id): JsonResponse
    {
        $filiere= Filiere::findorfail($id);
        $filiere->load(['anneeUniversitaire', 'niveaux.modules']);

        return response()->json($filiere);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $filiere= Filiere::findorfail($id);
        $validated = $request->validate([
            'nom_filiere'  => ['required', 'string', 'max:100'],
            'code_filiere' => [
                'nullable',
                'integer',
                Rule::unique('filieres', 'code_filiere')->ignore($filiere->id_filiere, 'id_filiere'),
            ],
            'id_annee'     => ['nullable', 'exists:annees_universitaires,id_annee'],
        ]);

        $filiere->update($validated);

        return response()->json($filiere->refresh()->load('anneeUniversitaire'));
    }

    public function destroy(int $id): JsonResponse
    {
        $filiere= Filiere::findorfail($id);
        $filiere->delete();

        return response()->json(null, 204);
    }
}