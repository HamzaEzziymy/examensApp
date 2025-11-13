<?php

namespace App\Http\Controllers;

use App\Models\AnneeUniversitaire;
use App\Models\Filiere;
use App\Models\SessionExamen;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SessionExamenController extends Controller
{
    public function index()
    {
        $sessions = SessionExamen::with([
                'filiere:id_filiere,nom_filiere',
                'anneeUniversitaire:id_annee,annee_univ',
            ])
            ->orderByDesc('date_session_examen')
            ->get();

        $filieres = Filiere::select('id_filiere', 'nom_filiere')
            ->orderBy('nom_filiere')
            ->get();

        $annees = AnneeUniversitaire::select('id_annee', 'annee_univ')
            ->orderByDesc('date_debut')
            ->get();

        return Inertia::render('examens/Sessions/Index', [
            'sessions'     => $sessions,
            'filieres'     => $filieres,
            'annees'       => $annees,
            'typesSession' => ['Normale', 'Rattrapage', 'Exceptionnelle'],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateSession($request);

        SessionExamen::create($validated);

        return redirect()
            ->route('examens.sessions.index')
            ->with('success', 'Session ajoutée.');
    }

    public function show(SessionExamen $session)
    {
        return redirect()->route('examens.sessions.index');
    }

    public function edit(SessionExamen $session)
    {
        return redirect()->route('examens.sessions.index');
    }

    public function update(Request $request, SessionExamen $session)
    {
        $validated = $this->validateSession($request);

        $session->update($validated);

        return redirect()
            ->route('examens.sessions.index')
            ->with('success', 'Session mise à jour.');
    }

    public function destroy(SessionExamen $session)
    {
        if ($session->examens()->exists()) {
            return redirect()
                ->route('examens.sessions.index')
                ->with('error', 'Impossible de supprimer une session qui contient des examens.');
        }

        $session->delete();

        return redirect()
            ->route('examens.sessions.index')
            ->with('success', 'Session supprimée.');
    }

    private function validateSession(Request $request): array
    {
        return $request->validate([
            'id_filiere'           => ['nullable', 'exists:filieres,id_filiere'],
            'id_annee'             => ['required', 'exists:annees_universitaires,id_annee'],
            'nom_session'          => ['required', 'string', 'max:50'],
            'type_session'         => ['required', Rule::in(['Normale', 'Rattrapage', 'Exceptionnelle'])],
            'date_session_examen'  => ['required', 'date'],
            'quadrimestre'         => ['required', 'integer', 'between:1,6'],
            'description'          => ['nullable', 'string'],
        ]);
    }
}
