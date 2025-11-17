<?php

namespace App\Http\Controllers;

use App\Models\Faculte;
use App\Models\Filiere;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class FiliereController extends Controller
{
    public function index()
    {
        // $filieres = Filiere::with('faculte:id_faculte,nom_faculte')
        //     ->withCount('sections')
        //     ->orderBy('nom_filiere')
        //     ->get();

        //get filieres with section and sections count
       $filieres = Filiere::with('sections')->get();


        $facultes = Faculte::select('id_faculte', 'nom_faculte')->orderBy('nom_faculte')->get();

       return Inertia::render('Academique/Filieres/Index', [
            'filieres' => $filieres,
            'facultes' => $facultes,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom_filiere' => ['required', 'string', 'max:100', 'unique:filieres,nom_filiere'],
            'id_faculte'  => ['required', 'exists:facultes,id_faculte'],
        ]);
        
        $filiere = Filiere::create($validated);

       return Redirect()->route('academique.filieres.index');
    }

    public function show(int $id)
    {
        $filiere = Filiere::with([
                'faculte',
                'sections.offresFormation.module',
                'sections.offresFormation.semestre',
            ])
            ->findOrFail($id);

        return Inertia::render('Academique/Filieres/Show', [
            'filiere' => $filiere,
        ]);
    }

    public function update(Request $request, int $id)
    {
        $filiere= Filiere::findorfail($id);
        $validated = $request->validate([
            'nom_filiere' => ['required', 'string', 'max:100'],
            'id_faculte'  => ['required', 'exists:facultes,id_faculte'],
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
