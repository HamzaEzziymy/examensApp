<?php

namespace App\Http\Controllers;

use App\Models\AnneeUniversitaire;
use App\Models\SessionExamen;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SessionExamenController extends Controller
{
    public function index()
    {
        $userFiliereAnnee = auth()->user()?->userFiliereAnnees()->first();
        $selectedFiliere = $userFiliereAnnee?->id_filiere;
        $selectedAnnee = $userFiliereAnnee?->id_annee;

        $sessions = SessionExamen::with([
                'filiere:id_filiere,nom_filiere',
                'anneeUniversitaire:id_annee,annee_univ',
            ])
            ->when($selectedFiliere && $selectedFiliere !== 'all', function ($query) use ($selectedFiliere) {
                $query->where(function ($sessionQuery) use ($selectedFiliere) {
                    $sessionQuery
                        ->whereNull('id_filiere')
                        ->orWhere('id_filiere', $selectedFiliere);
                });
            })
            ->when($selectedAnnee && $selectedAnnee !== 'all', function ($query) use ($selectedAnnee) {
                $query->where('id_annee', $selectedAnnee);
            })
            ->orderByDesc('date_session_examen')
            ->get();

        $annees = AnneeUniversitaire::select('id_annee', 'annee_univ')
            ->orderByDesc('date_debut')
            ->get();

        return Inertia::render('examens/Sessions/Index', [
            'sessions'     => $sessions,
            'annees'       => $annees,
            'typesSession' => ['Normale', 'Rattrapage', 'Exceptionnelle'],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateSharedSession($request);

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
        $validated = $this->validateSharedSession($request, $session);

        $session->update($validated);

        return redirect()
            ->route('examens.sessions.index')
            ->with('success', 'Session mise à jour.');
    }

    public function destroy(SessionExamen $session)
    {
        try {
            $session->delete();
        } catch (\Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'error' => 'Impossible de supprimer cette session car elle est utilisee ailleurs.',
            ]);
        }

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

    private function validateSharedSession(Request $request, ?SessionExamen $session = null): array
    {
        $validated = $this->validateSession($request);
        $validated['id_filiere'] = null;

        $duplicateExists = SessionExamen::query()
            ->where('id_annee', $validated['id_annee'])
            ->where('quadrimestre', $validated['quadrimestre'])
            ->where('type_session', $validated['type_session'])
            ->when($session, fn ($query) => $query->whereKeyNot($session->getKey()))
            ->exists();

        if ($duplicateExists) {
            throw ValidationException::withMessages([
                'type_session' => 'Une session commune existe deja pour ce type, ce quadrimestre et cette annee.',
            ]);
        }

        return $validated;
    }
}
