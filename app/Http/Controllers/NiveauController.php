<?php

namespace App\Http\Controllers;

use App\Models\Filiere;
use App\Models\Niveau;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NiveauController extends Controller
{
    public function index(Filiere $filiere)
    {
        $niveaux = Niveau::with([
                'filiere:id_filiere,nom_filiere',
                'semestres:id_semestre,id_niveau,nom_semestre',
                'semestres.modules:id_module,id_semestre,id_niveau,code_module,nom_module',
                'semestres.modules.elements:id_element,id_module,nom_element',
            ])
            ->withCount(['semestres', 'modules'])
            ->where('id_filiere', $filiere->id_filiere)
            ->orderBy('nom_niveau')
            ->get();
        return response()->json($niveaux);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code_niveau'    => ['required', 'string', 'max:20'],
            'nom_niveau'     => ['required', 'string', 'max:100'],
            'semestre'       => ['required', 'integer', 'min:1'],
            'credits_requis' => ['required', 'integer', 'min:0'],
            'id_filiere'     => ['nullable', 'exists:filieres,id_filiere'],
        ]);

        $niveau = Niveau::create($validated);

        return Redirect()->route('academique.niveaux.index')
            ->with('success', 'Niveau créé.');
    }

    public function show(int $id)
    {
        $niveau= Niveau::findorfail($id);
        $niveau->load(['filiere', 'semestres.modules']);

         return Inertia::render('Academique/Niveaux/Show', [
            'niveau' => $niveau,
        ]);
    }

    public function update(Request $request,int $id)
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
