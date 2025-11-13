<?php

namespace App\Http\Controllers;

use App\Models\Examen;
use App\Models\Module;
use App\Models\Salle;
use App\Models\SessionExamen;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ExamenController extends Controller
{
    public function index()
    {
        $examens = Examen::with([
                'sessionExamen:id_session_examen,nom_session,type_session',
                'module:id_module,nom_module,code_module',
                'salle:id_salle,code_salle,nom_salle,capacite_examens',
            ])
            ->withCount('repartitions')
            ->orderByDesc('date_examen')
            ->get([
                'id_examen',
                'id_session_examen',
                'id_module',
                'id_salle',
                'date_examen',
                'date_debut',
                'date_fin',
                'statut',
                'description',
            ]);

        $sessions = SessionExamen::select('id_session_examen', 'nom_session', 'type_session', 'date_session_examen')
            ->orderByDesc('date_session_examen')
            ->get();

        $modules = Module::select('id_module', 'nom_module', 'code_module')
            ->orderBy('nom_module')
            ->get();

        $salles = Salle::select('id_salle', 'code_salle', 'nom_salle', 'capacite_examens')
            ->orderBy('code_salle')
            ->get();

        return Inertia::render('examens/Examens/Index', [
            'examens' => $examens,
            'sessions' => $sessions,
            'modules' => $modules,
            'salles' => $salles,
            'statuts' => Examen::STATUTS,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateExamen($request);

        Examen::create($validated);

        return redirect()
            ->route('examens.examens.index')
            ->with('success', 'Examen planifié.');
    }

    public function show(Examen $examen)
    {
        return redirect()->route('examens.examens.index');
    }

    public function edit(Examen $examen)
    {
        return redirect()->route('examens.examens.index');
    }

    public function update(Request $request, Examen $examen)
    {
        $validated = $this->validateExamen($request);

        $examen->update($validated);

        return redirect()
            ->route('examens.examens.index')
            ->with('success', 'Examen mis à jour.');
    }

    public function destroy(Examen $examen)
    {
        $examen->delete();

        return redirect()
            ->route('examens.examens.index')
            ->with('success', 'Examen supprimé.');
    }

    private function validateExamen(Request $request): array
    {
        return $request->validate([
            'id_session_examen' => ['required', 'exists:sessions_examen,id_session_examen'],
            'id_module'         => ['required', 'exists:modules,id_module'],
            'id_salle'          => ['nullable', 'exists:salles,id_salle'],
            'date_examen'       => ['required', 'date'],
            'date_debut'        => ['required', 'date'],
            'date_fin'          => ['required', 'date', 'after:date_debut'],
            'statut'            => ['required', Rule::in(Examen::STATUTS)],
            'description'       => ['nullable', 'string'],
        ]);
    }
}
