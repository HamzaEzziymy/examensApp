<?php

namespace App\Http\Controllers;

use App\Models\Niveau;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NiveauController extends Controller
{
    public function index(): JsonResponse
    {
        $niveaux = Niveau::with('filiere:id_filiere,nom_filiere')
            ->withCount(['semestres', 'modules'])
            ->orderBy('nom_niveau')
            ->get();

        return response()->json($niveaux);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code_niveau'    => ['required', 'string', 'max:20'],
            'nom_niveau'     => ['required', 'string', 'max:100'],
            'semestre'       => ['required', 'integer', 'min:1'],
            'credits_requis' => ['required', 'integer', 'min:0'],
            'id_filiere'     => ['nullable', 'exists:filieres,id_filiere'],
        ]);

        $niveau = Niveau::create($validated);

        return response()->json($niveau->load('filiere'), 201);
    }

    public function show(int $id): JsonResponse
    {
        $niveau= Niveau::findorfail($id);
        $niveau->load(['filiere', 'semestres.modules']);

        return response()->json($niveau);
    }

    public function update(Request $request,int $id): JsonResponse
    {
        $niveau= Niveau::findorfail($id);
        $validated = $request->validate([
            'code_niveau'    => ['required', 'string', 'max:20'],
            'nom_niveau'     => ['required', 'string', 'max:100'],
            'semestre'       => ['required', 'integer', 'min:1'],
            'credits_requis' => ['required', 'integer', 'min:0'],
            'id_filiere'     => ['nullable', 'exists:filieres,id_filiere'],
        ]);

        $niveau->update($validated);

        return response()->json($niveau->refresh()->load('filiere'));
    }

    public function destroy(int $id): JsonResponse
    {
        $niveau= Niveau::findorfail($id);
        $niveau->delete();

        return response()->json(null, 204);
    }
}