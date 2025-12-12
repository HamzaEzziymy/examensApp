<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Anonymat;
use App\Models\Correcteur;
use App\Models\Examen;
use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class NoteController extends Controller
{
    public function index(Request $request)
    {
        $selectedExamenId = $request->integer('examen');

        $examens = Examen::with([
                'module:id_module,nom_module,code_module',
                'sessionExamen:id_session_examen,nom_session,type_session',
            ])
            ->orderByDesc('date_examen')
            ->get([
                'id_examen',
                'id_session_examen',
                'id_module',
                'date_examen',
                'date_debut',
                'date_fin',
            ]);

        $selectedExamen = $examens->firstWhere('id_examen', $selectedExamenId) ?? $examens->first();

        $notesQuery = Note::with([
                'anonymat:id_anonymat,id_examen,id_inscription_pedagogique,code_anonymat',
                'anonymat.inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre',
                'anonymat.inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'anonymat.inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
                'anonymat.inscriptionPedagogique.offreFormation.module:id_module,nom_module,code_module',
                'correcteur:id_correcteur,id_examen,id_enseignant,statut,nombre_copies,date_limite_correction',
                'correcteur.enseignant:id_enseignant,nom,prenom',
            ])
            ->orderByDesc('date_saisie');

        if ($selectedExamen) {
            $notesQuery->whereHas('anonymat', fn ($query) => $query->where('id_examen', $selectedExamen->id_examen));
        }

        $notes = $notesQuery->get([
            'id_note',
            'id_anonymat',
            'id_correcteur',
            'note',
            'date_saisie',
            'commentaire',
        ]);

        $anonymats = $selectedExamen
            ? Anonymat::with([
                    'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre',
                    'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                    'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
                ])
                ->where('id_examen', $selectedExamen->id_examen)
                ->get([
                    'id_anonymat',
                    'id_inscription_pedagogique',
                    'id_examen',
                    'code_anonymat',
                ])
            : collect();

        $distinctNotes = $notes->whereNotNull('id_anonymat')->unique('id_anonymat');

        $summary = [
            'count'         => $notes->count(),
            'average'       => $notes->avg('note') !== null ? round((float) $notes->avg('note'), 2) : null,
            'max'           => $notes->max('note'),
            'min'           => $notes->min('note'),
            'pendingCopies' => max(0, ($anonymats->count() ?? 0) - $distinctNotes->count()),
            'totalCopies'   => $anonymats->count(),
        ];

        $correcteurs = $selectedExamen
            ? Correcteur::with(['enseignant:id_enseignant,nom,prenom'])
                ->where('id_examen', $selectedExamen->id_examen)
                ->get([
                    'id_correcteur',
                    'id_examen',
                    'id_enseignant',
                    'statut',
                    'nombre_copies',
                    'date_limite_correction',
                ])
            : collect();

        return Inertia::render('correction/Notes/Index', [
            'examens'          => $examens,
            'selectedExamenId' => $selectedExamen?->id_examen,
            'notes'            => $notes,
            'anonymats'        => $anonymats,
            'summary'          => $summary,
            'correcteurs'      => $correcteurs,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return redirect()->route('correction.notes.index');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateNote($request);

        $note = Note::create($validated);
        $examenId = $this->resolveExamenId($validated['id_anonymat'] ?? null);

        return $this->redirectToIndex($examenId)
            ->with('success', 'Note enregistree.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Note $note): RedirectResponse
    {
        return redirect()->route('correction.notes.index');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Note $note): RedirectResponse
    {
        return redirect()->route('correction.notes.index');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Note $note): RedirectResponse
    {
        $validated = $this->validateNote($request, $note);

        $note->update($validated);
        $examenId = $this->resolveExamenId($validated['id_anonymat'] ?? $note->id_anonymat);

        return $this->redirectToIndex($examenId)
            ->with('success', 'Note mise a jour.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Note $note): RedirectResponse
    {
        $examenId = $this->resolveExamenId($note->id_anonymat);
        $note->delete();

        return $this->redirectToIndex($examenId)
            ->with('success', 'Note supprimee.');
    }

    public function import(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'id_correcteur' => ['required', 'exists:correcteurs,id_correcteur'],
            'file'          => ['required', 'file', 'mimes:csv,txt'],
        ]);

        $correcteurId = (int) $validated['id_correcteur'];
        $path = $request->file('file')->getRealPath();

        if (! $path || ! is_readable($path)) {
            return back()->with('error', 'Fichier illisible.');
        }

        $handle = fopen($path, 'r');
        if (! $handle) {
            return back()->with('error', 'Impossible de lire le fichier.');
        }

        $inserted = 0;
        $updated = 0;
        $skipped = [];
        $firstExamenId = null;
        $headerChecked = false;

        while (($row = fgetcsv($handle, 0, ';')) !== false) {
            if (! $headerChecked) {
                $joined = strtolower(implode('|', $row));
                if (str_contains($joined, 'code')) {
                    $headerChecked = true;
                    continue;
                }
                $headerChecked = true;
            }

            $row = array_pad($row, 3, null);
            [$code, $noteValue, $commentaire] = $row;

            $code = trim((string) $code);
            if ($code === '') {
                continue;
            }

            $noteFloat = is_numeric($noteValue) ? (float) $noteValue : null;
            if ($noteFloat === null || $noteFloat < 0 || $noteFloat > 20) {
                $skipped[] = $code;
                continue;
            }

            $anonymat = Anonymat::where('code_anonymat', $code)->first();
            if (! $anonymat) {
                $skipped[] = $code;
                continue;
            }

            $firstExamenId = $firstExamenId ?? $anonymat->id_examen;

            $payload = [
                'id_anonymat'   => $anonymat->id_anonymat,
                'id_correcteur' => $correcteurId,
                'note'          => $noteFloat,
                'date_saisie'   => now(),
                'commentaire'   => $commentaire ?: null,
            ];

            $existing = Note::where('id_anonymat', $anonymat->id_anonymat)->first();
            if ($existing) {
                $existing->update($payload);
                $updated++;
            } else {
                Note::create($payload);
                $inserted++;
            }
        }

        fclose($handle);

        $message = sprintf(
            'Import termine: %d ajoutees, %d mises a jour, %d ignorees.',
            $inserted,
            $updated,
            count($skipped)
        );

        return $this->redirectToIndex($firstExamenId)->with('success', $message);
    }

    private function validateNote(Request $request, ?Note $note = null): array
    {
        $noteRules = [
            'id_anonymat' => [
                $note ? 'sometimes' : 'required',
                'exists:anonymat,id_anonymat',
            ],
            'id_correcteur' => ['nullable', 'exists:correcteurs,id_correcteur'],
            'note' => ['required', 'numeric', 'min:0', 'max:20'],
            'date_saisie' => ['nullable', 'date'],
            'commentaire' => ['nullable', 'string'],
        ];

        $validated = $request->validate($noteRules);
        if (array_key_exists('id_anonymat', $validated)) {
            $validated['id_anonymat'] = (int) $validated['id_anonymat'];
        }
        if (array_key_exists('id_correcteur', $validated)) {
            $validated['id_correcteur'] = $validated['id_correcteur'] ? (int) $validated['id_correcteur'] : null;
        }

        return $validated;
    }

    private function resolveExamenId(?int $anonymatId): ?int
    {
        if (! $anonymatId) {
            return null;
        }

        return Anonymat::where('id_anonymat', $anonymatId)->value('id_examen');
    }

    private function redirectToIndex(?int $examenId = null): RedirectResponse
    {
        $params = $examenId ? ['examen' => $examenId] : [];

        return redirect()->route('correction.notes.index', $params);
    }
}
