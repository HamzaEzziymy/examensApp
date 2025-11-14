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
        return Inertia::render('Configuration/AnneesUniversitaires/Index', [
            'annees' => $annees,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'annee_univ' => ['required', 'string', 'max:9', 'unique:annees_universitaires,annee_univ'],
            'date_debut' => ['required', 'date'],
            'date_fin'     => ['required', 'date', 'after:date_debut'],
            'est_active' => [
                'sometimes',
                'boolean',
                function ($attribute, $value, $fail) {
                    if ($value && AnneeUniversitaire::where('est_active', true)->exists()) {
                        $fail('Il existe déjà une année universitaire active. Désactivez-la d\'abord.');
                    }
                },
            ],
        ]);

        $annee = AnneeUniversitaire::create($validated);

        // If this new year is set active, ensure all others are unset (defensive)
        if (!empty($validated['est_active']) && $validated['est_active']) {
            AnneeUniversitaire::where('id_annee', '!=', $annee->id_annee)->update(['est_active' => false]);
        }

        return Redirect()->route('configuration.annees-universitaires.index');
    }

    public function show(int $id)
    {
        // $annee = AnneeUniversitaire::with('filieres.niveaux')
        $annee = AnneeUniversitaire::findOrFail($id);
        return Inertia::render('Configuration/AnneesUniversitaires/Show', [
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
            'est_active' => [
                'sometimes',
                'boolean',
                function ($attribute, $value, $fail) use ($anneesUniversitaire) {
                    if ($value && AnneeUniversitaire::where('est_active', true)
                        ->where('id_annee', '!=', $anneesUniversitaire->getKey())
                        ->exists()) {
                        $fail('Il existe déjà une autre année universitaire active. Désactivez-la d\'abord.');
                    }
                },
            ],
        ]);

        $anneesUniversitaire->update($validated);

        // If this year is now active, unset est_active on all other years
        if (!empty($validated['est_active']) && $validated['est_active']) {
            AnneeUniversitaire::where('id_annee', '!=', $anneesUniversitaire->id_annee)->update(['est_active' => false]);
        }

        return Redirect()->route('configuration.annees-universitaires.index');
    }

    public function destroy(int $id)
    {
        $annee = AnneeUniversitaire::findOrFail($id);
        $annee->delete();
        return Redirect()->route('configuration.annees-universitaires.index');
    }
}
