<?php

namespace App\Http\Controllers;

use App\Models\AnneeUniversitaire;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AnneeUniversitaireController extends Controller
{
    public function index()
    {
        $annees = AnneeUniversitaire::orderByDesc('date_debut')->get();
        // dd($annees);
        return Inertia::render('Academique/AnneesUniversitaires/Index', [
            'annees' => $annees,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'annee_univ' => ['required', 'string', 'max:9', 'unique:annees_universitaires,annee_univ'],
            'date_debut' => ['required', 'date'],
            'date_fin'     => ['required', 'date', 'after:date_debut'],
            'est_active' => ['sometimes', 'boolean'],
        ]);

        $annee = AnneeUniversitaire::create($validated);

        return Redirect()->route('academique.annees-universitaires.index');
    }

    public function show(int $id)
    {
        // $annee = AnneeUniversitaire::with('filieres.niveaux')
        $annee = AnneeUniversitaire::findOrFail($id);
        return Inertia::render('Academique/AnneesUniversitaires/Show', [
            'annee' => $annee,
        ]);
    }

    public function update(Request $request, AnneeUniversitaire $anneesUniversitaire)
    {
        $validated = $request->validate([
            'annee_univ' => [
                'required',
                'string',
                'max:9',
                Rule::unique('annees_universitaires', 'annee_univ')
                    ->ignore($anneesUniversitaire->getKey(), $anneesUniversitaire->getKeyName()),
            ],
            'date_debut' => ['required', 'date'],
            'date_fin'     => ['required', 'date', 'after:date_debut'],
            'est_active' => ['sometimes', 'boolean'],
        ]);

        $anneesUniversitaire->update($validated);

        return Redirect()->route('academique.annees-universitaires.index');
    }

    public function destroy(int $id)
    {
        $annee = AnneeUniversitaire::findOrFail($id);
        $annee->delete();
        return Redirect()->route('academique.annees-universitaires.index');
    }
}
