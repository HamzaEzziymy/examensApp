<?php

namespace App\Http\Controllers;

use App\Models\AnneeUniversitaire;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AnneeUniversitaireController extends Controller
{
    public function index(): JsonResponse
    {
        $annees = AnneeUniversitaire::with('filieres:id_filiere,id_annee,nom_filiere')
            ->orderByDesc('date_debut')
            ->get();

        return response()->json($annees);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'annee_univ'   => ['required', 'string', 'max:9', 'unique:annees_universitaires,annee_univ'],
            'date_debut'   => ['required', 'date'],
            'date_cloture' => ['required', 'date', 'after:date_debut'],
            'est_active'   => ['sometimes', 'boolean'],
        ]);

        $annee = AnneeUniversitaire::create($validated);

        return response()->json($annee, 201);
    }

    public function show(int $id): JsonResponse
    {
        // $annee = AnneeUniversitaire::with('filieres.niveaux')
        $annee = AnneeUniversitaire::with('filieres')
            ->findOrFail($id);

        return response()->json($annee);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $anneeUniversitaire = AnneeUniversitaire::findorfail($id);
        $validated = $request->validate([
          'annee_univ'   => ['required', 'string', 'max:9', 'unique:annees_universitaires,annee_univ'],
            'date_debut'   => ['required'],
            'date_cloture' => ['required'],
            'est_active'   => ['sometimes', 'boolean'],
        ]);

        $anneeUniversitaire->update($validated);

        return response()->json($anneeUniversitaire->refresh());
    }

    public function destroy(int $id): JsonResponse
    {
        $annee = AnneeUniversitaire::findOrFail($id);
        $annee->delete();
        return response()->json("deleted", 204);
    }
}
