<?php

namespace App\Http\Controllers;

use App\Models\Niveau;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NiveauController extends Controller
{
    public function index()
    {
        $niveaux = Niveau::with([
                'semestres:id_semestre,id_niveau,nom_semestre,code_semestre,ordre',
                'semestres.offresFormation.module:id_module,code_module,nom_module,type_module',
                'semestres.offresFormation.section:id_section,nom_section,langue',
                'semestres.offresFormation.anneeUniversitaire:id_annee,annee_univ',
                'semestres.offresFormation.coordinateur:id_enseignant,nom,prenom',
            ])
            ->withCount('semestres')
            ->orderBy('ordre')
            ->get();

        return Inertia::render('Academique/Niveaux/Index', [
            'niveaux' => $niveaux,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code_niveau'    => ['required', 'string', 'max:20'],
            'nom_niveau'     => ['required', 'string', 'max:100'],
            'ordre'       => ['required', 'integer', 'min:1'],
        ]);

        $niveau = Niveau::create($validated);

        return Redirect()->route('academique.niveaux.index')
            ->with('success', 'Niveau créé.');
    }

    public function show(int $id)
    {
        $niveau = Niveau::with('semestres.offresFormation.module')->findOrFail($id);

         return Inertia::render('Academique/Niveaux/Show', [
            'niveau' => $niveau,
        ]);
    }

    public function update(Request $request,int $id)
    {
        $niveau= Niveau::findorfail($id);
        $validated = $request->validate([
            'code_niveau' => ['required', 'string', 'max:20'],
            'nom_niveau'  => ['required', 'string', 'max:100'],
            'ordre'       => ['required', 'integer', 'min:1'],
        ]);

        $niveau->update($validated);

        return Redirect()->route('academique.niveaux.index')
            ->with('success', 'Niveau mis à jour.');
    }

    public function destroy(int $id)
    {
        $niveau= Niveau::findorfail($id);
        $niveau->delete();

      return Redirect()->route('academique.niveaux.index')
            ->with('success', 'Niveau supprimé.');
    }
}
