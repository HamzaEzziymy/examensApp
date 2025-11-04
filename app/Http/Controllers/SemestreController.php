<?php

namespace App\Http\Controllers;

use App\Models\Semestre;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SemestreController extends Controller
{
    public function index(): JsonResponse
    {
        $semestres = Semestre::with('niveau:id_niveau,nom_niveau')
            ->withCount('modules')
            ->orderBy('code_semestre')
            ->get();

        return response()->json($semestres);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code_semestre'  => ['required', 'string', 'max:20'],
            'nom_semestre'   => ['required', 'string', 'max:100'],
            'credits_requis' => ['nullable', 'integer', 'min:0'],
            'id_niveau'      => ['nullable', 'exists:niveaux,id_niveau'],
        ]);

        $semestre = Semestre::create($validated);

        return response()->json($semestre->load('niveau'), 201);
    }

    public function show(int $id): JsonResponse
    {
         $semestre= Semestre::findorfail($id);
        $semestre->load(['niveau', 'modules']);

        return response()->json($semestre);
    }

    public function update(Request $request, int $id): JsonResponse
    {
         $semestre= Semestre::findorfail($id);
        $validated = $request->validate([
            'code_semestre'  => ['required', 'string', 'max:20'],
            'nom_semestre'   => ['required', 'string', 'max:100'],
            'credits_requis' => ['nullable', 'integer', 'min:0'],
            'id_niveau'      => ['nullable', 'exists:niveaux,id_niveau'],
        ]);

        $semestre->update($validated);

        return response()->json($semestre->refresh()->load('niveau'));
    }

    public function destroy(int $id): JsonResponse
    {
        $semestre= Semestre::findorfail($id);
        $semestre->delete();

        return response()->json(null, 204);
    }
}