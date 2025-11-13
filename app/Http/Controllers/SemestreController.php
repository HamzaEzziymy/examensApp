<?php

namespace App\Http\Controllers;

use App\Models\Semestre;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SemestreController extends Controller
{
    public function index()
    {
        $semestres = Semestre::with('niveau:id_niveau,nom_niveau')
            ->withCount('offresFormation')
            ->orderBy('code_semestre')
            ->get();

         return Inertia::render('Academique/Semestres/Index', [
            'semestres' => $semestres,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code_semestre' => ['required', 'string', 'max:20'],
            'nom_semestre'  => ['required', 'string', 'max:100'],
            'ordre'         => ['required', 'integer', 'min:1'],
            'id_niveau'     => ['required', 'exists:niveaux,id_niveau'],
        ]);

        Semestre::create($validated);

        return Redirect()->route('academique.niveaux.index');
    }

    public function show(int $id)
    {
         $semestre= Semestre::findorfail($id);
        $semestre->load(['niveau', 'offresFormation.module']);

        return Inertia::render('Academique/Semestres/Show', [
            'semestre' => $semestre,
        ]);
    }

    public function update(Request $request, int $id)
    {
        $semestre= Semestre::findorfail($id);
        $validated = $request->validate([
            'code_semestre' => ['required', 'string', 'max:20'],
            'nom_semestre'  => ['required', 'string', 'max:100'],
            'ordre'         => ['required', 'integer', 'min:1'],
            'id_niveau'     => ['required', 'exists:niveaux,id_niveau'],
        ]);

        $semestre->update($validated);

        return Redirect()->route('academique.niveaux.index');
    }

    public function destroy(int $id)
    {
        $semestre= Semestre::findorfail($id);
        $semestre->delete();

       return Redirect()->route('academique.niveaux.index');
    }
}
