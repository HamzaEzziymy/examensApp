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
        $annees = AnneeUniversitaire::with('filieres:id_filiere,id_annee,nom_filiere')
            ->orderByDesc('date_debut')
            ->get();

        return Inertia::render('Academique/AnneesUniversitaires/Index', [
            'annees' => $annees,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'annee_univ'   => ['required', 'string', 'max:9', 'unique:annees_universitaires,annee_univ'],
            'date_debut'   => ['required', 'date'],
            'date_cloture' => ['required', 'date', 'after:date_debut'],
            'est_active'   => ['sometimes', 'boolean'],
        ]);

        $annee = AnneeUniversitaire::create($validated);

       return Redirect()->route('academique.annees-universitaires.index')
            ->with('success', 'Année universitaire créée.');
    }

    public function show(int $id)
    {
        // $annee = AnneeUniversitaire::with('filieres.niveaux')
        $annee = AnneeUniversitaire::with('filieres')
            ->findOrFail($id);
  return Inertia::render('Academique/AnneesUniversitaires/Show', [
            'annee' => $annee,
        ]);
    }

    public function update(Request $request, $id)
    {
        $anneeUniversitaire = AnneeUniversitaire::findorfail($id);
        $validated = $request->validate([
          'annee_univ'   => ['required', 'string', 'max:9', 'unique:annees_universitaires,annee_univ'],
            'date_debut'   => ['required'],
            'date_cloture' => ['required'],
            'est_active'   => ['sometimes', 'boolean'],
        ]);

        $anneeUniversitaire->update($validated);

       return Redirect()->route('academique.annees-universitaires.index')
            ->with('success', 'Année universitaire mise à jour.');
    }

    public function destroy(int $id)
    {
        $annee = AnneeUniversitaire::findOrFail($id);
        $annee->delete();
       return Redirect()->route('academique.annees-universitaires.index')
            ->with('success', 'Année universitaire supprimée.');
    }
}
