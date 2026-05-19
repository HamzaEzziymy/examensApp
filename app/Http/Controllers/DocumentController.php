<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\File;
use Spatie\LaravelPdf\Facades\Pdf;

class DocumentController extends Controller
{
    public function indexPv(): Response
    {
        $documents = Document::orderBy('created_at', 'desc')->get();

        $sessions = \App\Models\SessionExamen::select('id_session_examen', 'nom_session')->orderBy('nom_session')->get();
        $niveaux  = \App\Models\Niveau::select('id_niveau', 'nom_niveau')->orderBy('nom_niveau')->get();
        $salles   = \App\Models\Salle::select('id_salle', 'code_salle', 'nom_salle')->where('est_disponible', true)->orderBy('code_salle')->get();
        $modules  = \App\Models\Module::select('id_module', 'nom_module')->orderBy('nom_module')->get();
        $filieres = \App\Models\Filiere::select('id_filiere', 'nom_filiere')->orderBy('nom_filiere')->get();
        $sections = \App\Models\Section::select('id_section', 'nom_section', 'id_filiere')->orderBy('nom_section')->get();

        // Exams for the student export modal
        $examens = \App\Models\Examen::with([
            'offreFormation.module',
            'offreFormation.section.filiere',
            'offreFormation.semestre.niveau',
            'sessionExamen',
        ])
        ->whereNotNull('id_offre')
        ->orderBy('date_examen', 'desc')
        ->get()
        ->map(fn($e) => [
            'id_examen'   => $e->id_examen,
            'module'      => $e->offreFormation?->module?->nom_module ?? '—',
            'session'     => $e->sessionExamen?->nom_session ?? '—',
            'filiere'     => $e->offreFormation?->section?->filiere?->nom_filiere ?? '',
            'section'     => $e->offreFormation?->section?->nom_section ?? '',
            'niveau'      => $e->offreFormation?->semestre?->niveau?->nom_niveau ?? '',
            'date_examen' => $e->date_examen?->format('d/m/Y') ?? '',
            'id_session'  => $e->id_session_examen,
            'id_filiere'  => $e->offreFormation?->section?->filiere?->id_filiere ?? null,
            'id_section'  => $e->offreFormation?->id_section ?? null,
        ]);

        return Inertia::render('Documents/Pvs/Index', [
            'documents' => $documents,
            'sessions'  => $sessions,
            'niveaux'   => $niveaux,
            'salles'    => $salles,
            'modules'   => $modules,
            'filieres'  => $filieres,
            'sections'  => $sections,
            'examens'   => $examens,
        ]);
    }

    public function storePv(Request $request): RedirectResponse
    {
        $now = now()->format('Y-m-d_H-i-s');
        $publicStoragePvPath = public_path('storage/pvs_absence');
        if (! File::exists($publicStoragePvPath)) {
            File::makeDirectory($publicStoragePvPath, 0755, true);
        }
        $pdfData = $request->all();
        if (!empty($pdfData['filiere'])) {
            $filiere = \App\Models\Filiere::find($pdfData['filiere']);
            $pdfData['filiere'] = $filiere ? $filiere->nom_filiere : '';
        }
        \Spatie\LaravelPdf\Facades\Pdf::view('pdfs.pv_absence', ['data' => $pdfData])
            ->format('a4')
            ->margins(12, 10, 14, 10)
            ->footerView('pdfs.partials.footer')
            ->save(public_path('storage/pvs_absence/'.$now.'pv_absence.pdf'));
        $docUrl = 'storage/pvs_absence/'.$now.'pv_absence.pdf';
        $request->merge(['url' => $docUrl]);
        $validated = $request->validate([
            'nomDoc'     => 'required|string|max:255',
            'descripDoc' => 'nullable|string',
            'url'        => 'required|string|max:255',
        ]);
        Document::create($validated);
        return redirect()->back()->with('success', 'Proces-verbal genere avec succes.');
    }

    public function indexListe(): Response
    {
        $niveaux  = \App\Models\Niveau::select('id_niveau', 'nom_niveau')->orderBy('ordre')->get();
        $filieres = \App\Models\Filiere::select('id_filiere', 'nom_filiere')->orderBy('nom_filiere')->get();
        $sections = \App\Models\Section::select('id_section', 'nom_section', 'id_filiere')->orderBy('nom_section')->get();
        $annees   = \App\Models\AnneeUniversitaire::select('id_annee', 'annee_univ')->orderByDesc('date_debut')->get();
        $semestres = \App\Models\Semestre::with('niveau')
            ->join('niveaux', 'semestres.id_niveau', '=', 'niveaux.id_niveau')
            ->orderBy('niveaux.ordre')
            ->orderBy('semestres.ordre')
            ->select('semestres.*')
            ->get();
        $salles = \App\Models\Salle::select('id_salle', 'nom_salle', 'code_salle', 'capacite_examens', 'capacite')
            ->where('est_disponible', true)
            ->orderBy('nom_salle')
            ->get();

        return Inertia::render('Documents/Liste/Index', [
            'niveaux'   => $niveaux,
            'filieres'  => $filieres,
            'sections'  => $sections,
            'annees'    => $annees,
            'semestres' => $semestres,
            'salles'    => $salles,
        ]);
    }

    public function getListeData(Request $request)
    {
        $request->validate([
            'id_niveau'   => 'required|exists:niveaux,id_niveau',
            'id_annee'    => 'nullable|exists:annees_universitaires,id_annee',
            'id_section'  => 'nullable|exists:sections,id_section',
            'id_semestre' => 'nullable|exists:semestres,id_semestre',
        ]);

        $inscriptions = \App\Models\InscriptionAdministrative::where('id_niveau', $request->id_niveau)
            ->when($request->id_annee,   fn($q) => $q->where('id_annee',   $request->id_annee))
            ->when($request->id_section, fn($q) => $q->where('id_section', $request->id_section))
            ->with([
                'etudiant',
                'section.filiere',
                'inscriptionsPedagogiques.offreFormation.module',
                'inscriptionsPedagogiques.offreFormation.semestre',
            ])
            ->get();

        // Filter pedagogical inscriptions by semestre if provided
        $semestreId = $request->id_semestre;

        // Collect all unique modules (filtered by semestre if needed, sorted by nom_module)
        $allModules = $inscriptions
            ->flatMap(fn($ia) => $ia->inscriptionsPedagogiques
                ->when($semestreId, fn($col) => $col->filter(fn($ip) => (string)($ip->offreFormation?->id_semestre) === (string)$semestreId))
                ->map(fn($ip) => [
                    'id'  => $ip->offreFormation?->module?->id_module,
                    'nom' => $ip->offreFormation?->module?->nom_module ?? '—',
                ])
            )
            ->filter(fn($m) => $m['id'])
            ->unique('id')
            ->sortBy('nom')
            ->values();

        // Build one row per student, one column per module
        $rows = $inscriptions->map(function ($ia) use ($allModules, $semestreId) {
            $row = [
                'cne'     => $ia->etudiant?->cne ?? '',
                'nom'     => $ia->etudiant?->nom ?? '',
                'prenom'  => $ia->etudiant?->prenom ?? '',
                'section' => $ia->section?->nom_section ?? '',
                'filiere' => $ia->section?->filiere?->nom_filiere ?? '',
            ];

            $filteredIps = $semestreId
                ? $ia->inscriptionsPedagogiques->filter(fn($ip) => (string)($ip->offreFormation?->id_semestre) === (string)$semestreId)
                : $ia->inscriptionsPedagogiques;

            $moduleTypes = $filteredIps
                ->keyBy(fn($ip) => $ip->offreFormation?->module?->id_module)
                ->map(fn($ip) => $ip->type_inscription ?? '');

            foreach ($allModules as $module) {
                $row['module_' . $module['id']] = $moduleTypes->get($module['id'], '');
            }

            return $row;
        })->sortBy(['nom', 'prenom'])->values();

        return response()->json([
            'modules' => $allModules,
            'rows'    => $rows,
        ]);
    }

    public function destroyPv(Document $document): RedirectResponse
    {
        $filePath = public_path($document->url);

        $document->delete();

        if (File::exists($filePath)) {
            File::delete($filePath);
        }

        return Redirect()->back();
    }

    /**
     * Generate PVs from exam planification.
     * Select: session + filière
     * Output: one PDF per section (within that filière)
     *         each PDF has one page per exam (module + salle) — same style as pv_absence
     */
    public function generateFromPlanification(Request $request)
    {
        $request->validate([
            'id_session' => 'required|exists:sessions_examen,id_session_examen',
            'id_filiere' => 'required|exists:filieres,id_filiere',
            'id_section' => 'required|exists:sections,id_section',
            'nomDoc'     => 'nullable|string|max:255',
        ]);

        $sessionId  = $request->id_session;
        $filiereId  = $request->id_filiere;
        $sectionId  = $request->id_section;
        $session    = \App\Models\SessionExamen::findOrFail($sessionId);
        $filiere    = \App\Models\Filiere::findOrFail($filiereId);
        $section    = \App\Models\Section::findOrFail($sectionId);

        // Load all planned exams for this session + filière
        // Load both the direct salle (id_salle) and the pivot salles (exam_salle)
        $examens = \App\Models\Examen::with([
            'offreFormation.module',
            'offreFormation.semestre.niveau',
            'offreFormation.section.filiere',
            'salle',
            'salles',
        ])
        ->where('id_session_examen', $sessionId)
        ->whereHas('offreFormation', fn($q) => $q->where('id_section', $sectionId))
        ->where(function ($q) {
            $q->whereNotNull('id_salle')->orWhereHas('salles');
        })
        ->get();

        if ($examens->isEmpty()) {
            return redirect()->back()->withErrors(['error' => 'Aucun examen planifié pour cette session et section.']);
        }

        // Expand exams: if an exam has multiple salles (via pivot), create one entry per salle
        $expandedExams = collect();
        foreach ($examens as $examen) {
            $allSalles = collect();
            if ($examen->salle) $allSalles->push($examen->salle);
            if ($examen->salles && $examen->salles->isNotEmpty()) {
                $allSalles = $allSalles->merge($examen->salles);
            }
            $allSalles = $allSalles->unique('id_salle');

            foreach ($allSalles as $salle) {
                $expandedExams->push((object)[
                    'examen' => $examen,
                    'salle'  => $salle,
                ]);
            }
        }

        // Group by niveau
        $byNiveau = $expandedExams->groupBy(fn($item) => $item->examen->offreFormation?->semestre?->niveau?->nom_niveau ?? 'Sans Niveau');

        $publicStoragePvPath = public_path('storage/pvs_absence');
        if (! File::exists($publicStoragePvPath)) {
            File::makeDirectory($publicStoragePvPath, 0755, true);
        }

        $now     = now()->format('Y-m-d_H-i-s');
        $created = 0;

        foreach ($byNiveau as $niveauNom => $itemsSection) {
            // Each item = one PV page (one exam + one salle)
            $pvPages = $itemsSection->map(function ($item) use ($filiere) {
                $examen  = $item->examen;
                $salle   = $item->salle;
                $offre   = $examen->offreFormation;
                $module  = $offre?->module;
                $niveau  = $offre?->semestre?->niveau;
                $section = $offre?->section;

                return [
                    'niveau'      => $niveau?->nom_niveau ?? '',
                    'filiere'     => $filiere->nom_filiere,
                    'section'     => $section?->nom_section ?? '',
                    'salle'       => $salle?->nom_salle ?? '—',
                    'module'      => $module?->nom_module ?? '—',
                    'date_examen' => $examen->date_examen?->format('d/m/Y') ?? '',
                    'heure_debut' => $examen->date_debut?->format('H:i') ?? '',
                    'heure_fin'   => $examen->date_fin?->format('H:i') ?? '',
                ];
            })->values()->toArray();

            $slug     = \Illuminate\Support\Str::slug($niveauNom);
            $filename = $now . '_pv_' . \Illuminate\Support\Str::slug($filiere->nom_filiere) . '_' . $slug . '.pdf';
            $filePath = 'storage/pvs_absence/' . $filename;
            $savePath = public_path($filePath);

            Pdf::view('pdfs.pv_planification', [
                'filiere'  => $filiere->nom_filiere,
                'section'  => $niveauNom,
                'session'  => $session->nom_session,
                'pvPages'  => $pvPages,
            ])
            ->format('a4')
            ->margins(12, 10, 14, 10)
            ->save($savePath);

            $docName = ($request->nomDoc ?? 'PV') . ' — ' . $filiere->nom_filiere . ' — ' . $section->nom_section . ' — ' . $niveauNom . ' — ' . $session->nom_session;

            Document::create([
                'nomDoc'     => $docName,
                'descripDoc' => 'Filière: ' . $filiere->nom_filiere . ' | Section: ' . $section->nom_section . ' | Niveau: ' . $niveauNom . ' | Session: ' . $session->nom_session . ' | ' . count($pvPages) . ' examen(s)',
                'url'        => $filePath,
            ]);

            $created++;
        }

        return redirect()->back()->with('success', "{$created} PV(s) générés — {$filiere->nom_filiere} / {$section->nom_section}.");
    }
}
