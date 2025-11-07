<?php

namespace App\Http\Controllers;

use App\Models\AnneeUniversitaire;
use App\Models\Filiere;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class FiliereController extends Controller
{
    public function index()
    {
        $filieres = Filiere::all();
        $anneesUniv = AnneeUniversitaire::all();

       return Inertia::render('Academique/Filieres/Index', [
            'filieres' => $filieres,
            'anneesUniv'=> $anneesUniv
        ]);
    }

    public function store(Request $request)
    {
        dd($request->all());
        $validated = $request->validate([
            'nom_filiere'  => ['required', 'string', 'max:100'],
            'code_filiere' => ['nullable', 'integer', 'unique:filieres,code_filiere'],
            'id_annee'     => ['nullable', 'exists:annees_universitaires,id_annee'],
        ]);

        $filiere = Filiere::create($validated);

       return Redirect()->route('academique.filieres.index')
            ->with('success', 'Filière créée.');
    }

    public function show(int $id)
    {
        $filiere= Filiere::findorfail($id);
        $filiere->load(['anneeUniversitaire', 'niveaux.modules']);

        return Inertia::render('Academique/Filieres/Show', [
            'filiere' => $filiere,
        ]);
    }

    public function update(Request $request, int $id)
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

       return Redirect()->route('academique.filieres.index');
    }

    public function destroy(int $id)
    {
        $filiere= Filiere::findorfail($id);
        $filiere->delete();

         return Redirect()->route('academique.filieres.index')
            ->with('success', 'Filière supprimée.');
    }
}