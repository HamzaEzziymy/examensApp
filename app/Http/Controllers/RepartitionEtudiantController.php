<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\FiltersEligibleExamRegistrations;
use App\Models\AnneeUniversitaire as AnneeUniversitaireModel;
use App\Models\Document;
use App\Models\Examen;
use App\Models\InscriptionPedagogique;
use App\Models\OffreFormation;
use App\Models\RepartitionEtudiant;
use App\Models\Salle;
use App\Services\PvAbsenceDatasetService;
use App\Services\PvAbsenceFormOptionsService;
use App\Services\PvAbsencePdfService;
use App\Services\PointagePayloadBuilder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Spatie\LaravelPdf\Facades\Pdf;

class RepartitionEtudiantController extends Controller
{
    use FiltersEligibleExamRegistrations;

    public function index(Request $request, PvAbsenceFormOptionsService $pvAbsenceFormOptionsService)
    {
        $userFiliereAnnee = auth()->user()?->userFiliereAnnees()->first();
        $selectedFiliere = $userFiliereAnnee?->id_filiere;
        $selectedAnnee = $userFiliereAnnee?->id_annee;

        $selectedExamenId = $request->integer('examen');

        $examensQuery = Examen::with([
                'module' => fn ($query) => $query->select('modules.id_module', 'modules.nom_module', 'modules.code_module'),
                'element:id_element,id_module,code_element,nom_element',
                'module.elements:id_element,id_module,code_element,nom_element',
                'sessionExamen:id_session_examen,nom_session,type_session,id_filiere,id_annee',
                'salle:id_salle,code_salle,nom_salle,capacite_examens',
                'salles:id_salle,code_salle,nom_salle,capacite_examens',
                'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
                'offreFormation.semestre:id_semestre,nom_semestre,id_niveau',
                'offreFormation.semestre.niveau:id_niveau,nom_niveau',
                'offreFormation.section:id_section,id_filiere',
                'offreFormation.section.filiere:id_filiere,nom_filiere',
            ])
            ->withCount('repartitions');

        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $examensQuery->where(function ($query) use ($selectedFiliere) {
                $query
                    ->whereHas('sessionExamen', function ($sessionQuery) use ($selectedFiliere) {
                        $sessionQuery->where('id_filiere', $selectedFiliere);
                    })
                    ->orWhere(function ($sharedQuery) use ($selectedFiliere) {
                        $sharedQuery
                            ->whereHas('sessionExamen', function ($sessionQuery) {
                                $sessionQuery->whereNull('id_filiere');
                            })
                            ->whereHas('offreFormation.section', function ($offreQuery) use ($selectedFiliere) {
                                $offreQuery->where('id_filiere', $selectedFiliere);
                            });
                    });
            });
        }

        if ($selectedAnnee && $selectedAnnee !== 'all') {
            $examensQuery->whereHas('sessionExamen', function ($query) use ($selectedAnnee) {
                $query->where('id_annee', $selectedAnnee);
            });
        }

        $examens = $examensQuery
            ->orderByDesc('date_examen')
            ->get([
                'id_examen',
                'id_session_examen',
                'id_offre',
                'id_module',
                'id_element',
                'id_salle',
                'date_examen',
                'date_debut',
                'date_fin',
                'statut',
            ]);

        $examens->each(function ($examen) use ($selectedFiliere) {
            $session = $examen->sessionExamen;
            $preferredFiliereId = $session?->id_filiere ?: (($selectedFiliere && $selectedFiliere !== 'all') ? (int) $selectedFiliere : null);
            $offre = $this->referenceOffre($examen, $preferredFiliereId);

            $semestre = $offre?->semestre;
            $niveau = $semestre?->niveau;

            $examen->setAttribute('semestre_id', $semestre?->id_semestre);
            $examen->setAttribute('semestre_nom', $semestre?->nom_semestre);
            $examen->setAttribute('niveau_id', $niveau?->id_niveau);
            $examen->setAttribute('niveau_nom', $niveau?->nom_niveau);
            $examen->setAttribute('filiere_nom', $offre?->section?->filiere?->nom_filiere);
        });

        $selectedExamen = $examens->firstWhere('id_examen', $selectedExamenId) ?? $examens->first();
        if ($selectedExamen) {
            $selectedExamen->loadMissing([
                'sessionExamen.filiere:id_filiere,nom_filiere',
                'element:id_element,id_module,code_element,nom_element',
                'module.elements:id_element,id_module,code_element,nom_element',
                'offreFormation.section.filiere:id_filiere,nom_filiere',
                'offreFormation.semestre.niveau:id_niveau,nom_niveau',
            ]);
        }

        $repartitions = RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
                'inscriptionPedagogique.offreFormation.module:id_module,nom_module,code_module',
            ])
            ->when($selectedExamen, fn ($query) => $query->where('id_examen', $selectedExamen->id_examen))
            ->orderBy('code_grille')
            ->get([
                'id_repartition',
                'id_examen',
                'id_inscription_pedagogique',
                'code_grille',
                'code_anonymat',
                'numero_place',
                'present',
                'heure_arrivee',
                'heure_sortie',
                'observation',
            ]);

        if ($selectedExamen) {
            $selectedExamen->setRelation(
                'salles',
                $this->resolvedExamSallesForRepartitions($selectedExamen, $repartitions)
            );
        }

        $inscriptions = $selectedExamen
            ? $this->eligibleInscriptionsForExam($selectedExamen)
            : collect();

        $salles = $selectedExamen
            ? $selectedExamen->salles->values()
            : collect();

        return Inertia::render(
            'examens/Repartition/Index',
            array_merge(
                [
                    'examens' => $examens,
                    'repartitions' => $repartitions,
                    'inscriptions' => $inscriptions,
                    'selectedExamenId' => $selectedExamen?->id_examen,
                    'salles' => $salles,
                    'pvDocuments' => Document::orderBy('created_at', 'desc')->get(),
                ],
                ['pvFormOptions' => $pvAbsenceFormOptionsService->payload()]
            )
        );
    }

    public function store(Request $request)
    {
        $request->merge([
            'numero_place' => $this->normalizedSeatNumber($request->input('numero_place')),
        ]);

        $validated = $request->validate($this->rules($request));
        $validated['present'] = $request->boolean('present');

        RepartitionEtudiant::create($validated);

        return $this->redirectToIndex((int) $validated['id_examen'])
            ->with('success', 'Ligne ajoutee.');
    }

    public function show(RepartitionEtudiant $repartitionEtudiant)
    {
        return $this->redirectToIndex($repartitionEtudiant->id_examen);
    }

    public function edit(RepartitionEtudiant $repartitionEtudiant)
    {
        return $this->redirectToIndex($repartitionEtudiant->id_examen);
    }

    public function update(Request $request, RepartitionEtudiant $repartitionEtudiant)
    {
        $request->merge([
            'numero_place' => $this->normalizedSeatNumber($request->input('numero_place')),
        ]);

        $validated = $request->validate($this->rules($request, $repartitionEtudiant->id_repartition));
        $validated['present'] = $request->boolean('present');

        $repartitionEtudiant->update($validated);

        return $this->redirectToIndex((int) $validated['id_examen'])
            ->with('success', 'Ligne mise a jour.');
    }

    public function destroy(RepartitionEtudiant $repartitionEtudiant)
    {
        $examenId = $repartitionEtudiant->id_examen;
        $repartitionEtudiant->delete();

        return $this->redirectToIndex($examenId)
            ->with('success', 'Ligne supprimee.');
    }

    public function pushPointage(Examen $examen, PointagePayloadBuilder $payloadBuilder): JsonResponse
    {
        if (! $examen->repartitions()->exists()) {
            return response()->json([
                'message' => 'Aucune repartition pour cet examen.',
            ], 422);
        }

        $externalUrl = trim((string) config('pointage.external_url', ''));
        if ($externalUrl === '') {
            return response()->json([
                'message' => 'POINTAGE_EXTERNAL_URL n est pas configure.',
            ], 422);
        }

        $url = str_replace('{id_examen}', (string) $examen->id_examen, $externalUrl);
        $payload = [
            'data' => $payloadBuilder->build(
                $examen,
                config('pointage.push_include', ['exam', 'students'])
            ),
        ];

        $request = Http::acceptJson()
            ->asJson()
            ->timeout(max(1, (int) config('pointage.external_timeout', 15)));

        $externalToken = trim((string) config('pointage.external_token', ''));
        if ($externalToken !== '') {
            $request = $request->withToken($externalToken);
        }

        try {
            $response = $request->post($url, $payload);
        } catch (ConnectionException $exception) {
            return response()->json([
                'message' => 'Impossible de contacter l application pointage.',
                'error' => $exception->getMessage(),
            ], 502);
        }

        if ($response->failed()) {
            return response()->json([
                'message' => 'L application pointage a refuse la repartition.',
                'external_status' => $response->status(),
                'external_response' => mb_substr($response->body(), 0, 1000),
            ], 502);
        }

        return response()->json([
            'message' => 'Repartition envoyee au pointage.',
            'external_status' => $response->status(),
            'sent' => [
                'id_examen' => $examen->id_examen,
                'students' => count($payload['data']['students'] ?? []),
                'repartitions' => count($payload['data']['repartitions'] ?? []),
            ],
        ]);
    }

    private function rules(Request $request, ?int $ignoreId = null): array
    {
        $examenId = (int) $request->input('id_examen');

        return [
            'id_examen' => ['required', 'exists:examens,id_examen'],
            'id_inscription_pedagogique' => [
                'required',
                'exists:inscriptions_pedagogiques,id_inscription_pedagogique',
                $this->uniquePerExam('id_inscription_pedagogique', $examenId, $ignoreId),
            ],
            'code_grille' => [
                'required',
                'integer',
                'min:1',
                $this->uniquePerExam('code_grille', $examenId, $ignoreId),
            ],
            'code_anonymat' => [
                'nullable',
                'string',
                'max:20',
                'regex:/^\d+$/',
                $this->uniquePerExam('code_anonymat', $examenId, $ignoreId),
            ],
            'numero_place' => [
                'nullable',
                'string',
                'max:20',
                'regex:/^\d+$/',
            ],
            'present' => ['sometimes', 'boolean'],
            'heure_arrivee' => ['nullable'],
            'heure_sortie' => ['nullable', 'after_or_equal:heure_arrivee'],
            'observation' => ['nullable', 'string'],
        ];
    }

    private function uniquePerExam(string $column, int $examenId, ?int $ignoreId = null): Unique
    {
        return Rule::unique('repartition_etudiants', $column)
            ->where(fn ($query) => $query->where('id_examen', $examenId))
            ->ignore($ignoreId, 'id_repartition');
    }

    private function redirectToIndex(?int $examenId = null)
    {
        $params = $examenId ? ['examen' => $examenId] : [];

        return redirect()->route('surveillance.repartition-etudiants.index', $params);
    }

    private function normalizedSeatNumber($value): ?string
    {
        $normalized = trim((string) $value);

        if ($normalized === '') {
            return null;
        }

        if (preg_match('/(\d+)\s*$/', $normalized, $matches)) {
            return (string) ((int) $matches[1]);
        }

        return $normalized;
    }

    public function export(Request $request, Examen $examen)
    {
        $requestedIds = $this->requestedRepartitionIds($request);

        $repartitionsQuery = RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
            ])
            ->where('id_examen', $examen->id_examen)
            ->orderBy('code_grille')
            ->orderBy('numero_place');

        if ($requestedIds->isNotEmpty()) {
            $repartitionsQuery->whereIn('id_repartition', $requestedIds);
        }

        $repartitions = $repartitionsQuery->get();

        if ($repartitions->isEmpty()) {
            return back()->with('error', 'Aucune repartition pour cet examen.');
        }

        $presentCount = $repartitions->where('present', true)->count();
        $total = $repartitions->count();

        $examen->load([
            'module' => fn ($query) => $query->select('modules.id_module', 'modules.nom_module', 'modules.code_module'),
            'element:id_element,id_module,code_element,nom_element',
            'sessionExamen:id_session_examen,nom_session,type_session',
            'salle:id_salle,code_salle,nom_salle',
            'salles:id_salle,code_salle,nom_salle,capacite_examens,capacite',
            'offreFormation.section.filiere',
            'offreFormation.semestre.niveau',
        ]);

        $allowedColumns = ['cne', 'etudiant', 'nom', 'prenom', 'grille', 'place', 'anonymat', 'presence'];
        $columns = collect($request->input('columns', $allowedColumns))
            ->map(fn ($column) => (string) $column)
            ->filter(fn ($column) => in_array($column, $allowedColumns, true))
            ->unique()
            ->values()
            ->all();
        if (empty($columns)) {
            $columns = $allowedColumns;
        }

        $presenceFilled = $request->boolean('presence_filled', true);

        $salles = $examen->salles->values();
        if ($salles->isEmpty() && $examen->salle) {
            $salles = collect([$examen->salle]);
        }

        $orderedSalleGroups = $this->buildSalleGroupsWithCollectiveOrder($examen, $repartitions, $salles);
        if ($orderedSalleGroups && $orderedSalleGroups->isNotEmpty()) {
            $salleGroups = $orderedSalleGroups;
        } else {
            $salleGroups = $repartitions
                ->groupBy(fn ($rep) => $this->salleIndexFromGrille($rep->code_grille))
                ->map(function ($rows, $salleIndex) use ($salles) {
                    $salle = $salles[$salleIndex - 1] ?? null;
                    return [
                        'salle'       => $salle,
                        'rows'        => $rows,
                        'present'     => $rows->where('present', true)->count(),
                        'total'       => $rows->count(),
                        'absent'      => $rows->count() - $rows->where('present', true)->count(),
                        'salle_index' => (int) $salleIndex,
                    ];
                })
                ->values();
        }

        $footerSalleLabel = $salles->pluck('nom_salle')->filter()->unique()->implode(' | ');
        if (empty($footerSalleLabel) && $examen->salle) {
            $footerSalleLabel = $examen->salle->nom_salle;
        }

        $requestedSalleIndex = $request->integer('salle_index');
        $exportRepartitions = $repartitions;
        $exportPresentCount = $presentCount;
        $exportTotal = $total;
        $exportSalleGroups = $salleGroups;
        $filenameBase = $this->resolvePdfFilenameBase(
            $request,
            sprintf('repartition-%s-%s', $this->examFileCode($examen), $examen->id_examen)
        );
        $filename = $filenameBase.'.pdf';

        if ($requestedSalleIndex) {
            $targetGroup = $salleGroups->firstWhere('salle_index', $requestedSalleIndex);
            if (! $targetGroup) {
                return back()->with('error', 'Aucune repartition pour cette salle.');
            }

            $exportRepartitions = collect($targetGroup['rows'] ?? [])->values();
            $exportPresentCount = (int) ($targetGroup['present'] ?? $exportRepartitions->where('present', true)->count());
            $exportTotal = (int) ($targetGroup['total'] ?? $exportRepartitions->count());
            $exportSalleGroups = collect([$targetGroup]);
            $footerSalleLabel = $targetGroup['salle']->nom_salle ?? ('Salle '.$targetGroup['salle_index']);
            $filename = sprintf('%s-salle-%s.pdf', $filenameBase, $targetGroup['salle_index']);
        }

        $payload = [
            'examen'         => $examen,
            'repartitions'   => $exportRepartitions,
            'presentCount'   => $exportPresentCount,
            'absentCount'    => $exportTotal - $exportPresentCount,
            'total'          => $exportTotal,
            'generatedAt'    => now(),
            'niveauFiliere'  => $this->niveauFiliereLabel($examen),
            'columns'        => $columns,
            'presenceFilled' => $presenceFilled,
            'salleGroups'    => $exportSalleGroups,
            'sessionLabel'   => $this->sessionLabel($examen),
            'examLabel'      => $this->examLabel($examen),
            'displayLabel'   => $this->displayLabel($examen),
            'moduleLabel'    => $this->moduleLabel($examen),
            'elementLabel'   => $this->elementLabel($examen),
        ];

        return Pdf::view('pdfs.repartition', $payload)
            ->format('a4')
            ->margins(12, 10, 14, 10)
            ->footerView('pdfs.partials.footer', ['footerSalleLabel' => $footerSalleLabel])
            ->download($filename);
    }

    public function exportCollective(Request $request, Examen $examen)
    {
        $collectiveData = $this->buildCollectiveExportData($request, $examen);

        if (isset($collectiveData['error'])) {
            return back()->with('error', $collectiveData['error']);
        }

        $payload = [
            'examen'        => $collectiveData['examen'],
            'modules'       => $collectiveData['modules'],
            'groups'        => $collectiveData['groups'],
            'studentsTotal' => $collectiveData['studentsTotal'],
            'generatedAt'   => now(),
            'niveauFiliere' => $collectiveData['niveauFiliere'],
            'sessionName'   => $collectiveData['sessionName'],
            'firstExamDate' => $collectiveData['firstExamDate'],
            'examLabel'     => $this->examLabel($collectiveData['examen']),
        ];

        $footerData = [
            'examen'            => $collectiveData['examen'],
            'modules'           => $collectiveData['modules'],
            'sessionName'       => $collectiveData['sessionName'],
            'firstExamDate'     => $collectiveData['firstExamDate'],
            'niveauFiliere'     => $collectiveData['niveauFiliere'],
            'footerSalleLabel'  => $collectiveData['requestedSalle']
                ? ($collectiveData['requestedSalle']->nom_salle ?: $collectiveData['requestedSalle']->code_salle ?: ('Salle ' . $collectiveData['requestedSalle']->id_salle))
                : ($collectiveData['referenceExamSalles']->pluck('nom_salle')->filter()->unique()->implode(' | ') ?: $collectiveData['referenceExam']->salle?->nom_salle),
        ];

        $filenameBase = $this->resolvePdfFilenameBase(
            $request,
            sprintf('presence-collective-%s-%s', $collectiveData['sessionName'], $collectiveData['examen']->id_session_examen)
        );
        $filename = $collectiveData['requestedSalle']
            ? $this->pdfFilenameForSalle($filenameBase, $collectiveData['requestedSalle'])
            : $filenameBase.'.pdf';

        return Pdf::view('pdfs.repartition-collective', $payload)
            ->format('a4')
            ->margins(12, 10, 14, 10)
            ->footerView('pdfs.partials.footer', $footerData)
            ->download($filename);
    }

    public function exportCollectiveExcel(Request $request, Examen $examen)
    {
        $collectiveData = $this->buildCollectiveExportData($request, $examen);

        if (isset($collectiveData['error'])) {
            return back()->with('error', $collectiveData['error']);
        }

        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0);
        $usedSheetTitles = [];

        foreach ($collectiveData['groups'] as $group) {
            $sheet = $spreadsheet->createSheet();
            $sheet->setTitle($this->collectiveExcelSheetTitle(
                $group['salle'] ?? null,
                (int) ($group['salle_index'] ?? 1),
                $usedSheetTitles
            ));

            $this->fillCollectiveExcelSheet($sheet, $collectiveData, $group);
        }

        if ($spreadsheet->getSheetCount() > 0) {
            $spreadsheet->setActiveSheetIndex(0);
        }

        $filenameBase = $this->resolveXlsxFilenameBase(
            $request,
            sprintf('presence-collective-%s-%s', $collectiveData['sessionName'], $collectiveData['examen']->id_session_examen)
        );
        $filename = $collectiveData['requestedSalle']
            ? $this->xlsxFilenameForSalle($filenameBase, $collectiveData['requestedSalle'])
            : $filenameBase.'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function exportPvAbsence(
        Request $request,
        Examen $examen,
        PvAbsenceDatasetService $pvAbsenceDatasetService,
        PvAbsencePdfService $pvAbsencePdfService
    )
    {
        $requestedIds = $this->requestedRepartitionIds($request);
        $requestedSalleIndex = $request->integer('salle_index');

        $examen->load([
            'module' => fn ($query) => $query->select('modules.id_module', 'modules.nom_module', 'modules.code_module'),
            'sessionExamen:id_session_examen,nom_session,type_session,id_filiere,id_annee',
            'salle:id_salle,code_salle,nom_salle',
            'salles:id_salle,code_salle,nom_salle',
            'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
            'offreFormation.section:id_section,id_filiere,nom_section',
            'offreFormation.section.filiere:id_filiere,nom_filiere',
            'offreFormation.semestre:id_semestre,id_niveau,nom_semestre',
            'offreFormation.semestre.niveau:id_niveau,nom_niveau',
            'repartitions' => fn ($query) => $query
                ->with([
                    'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                    'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                    'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
                ])
                ->orderBy('code_grille')
                ->orderBy('numero_place'),
            'absences' => fn ($query) => $query
                ->with([
                    'anonymat:id_anonymat,id_inscription_pedagogique',
                ])
                ->orderBy('date_absence'),
        ]);

        $requestedSalle = $this->resolveRequestedSalle($request, $this->resolvedExamSalles($examen));
        if (! $requestedSalle && ! $requestedSalleIndex) {
            return response('Aucune repartition pour cette salle.', 422);
        }

        $referenceOffre = $this->referenceOffre($examen, $examen->sessionExamen?->id_filiere ?: $this->currentUserFiliereId());
        $requestedSalleId = $requestedSalle?->id_salle ? (int) $requestedSalle->id_salle : null;

        if (! $referenceOffre?->section?->id_section || ! $referenceOffre?->semestre?->id_niveau || ! $requestedSalleId) {
            return response('Impossible de reconstituer le contexte du PV d\'absence depuis cet examen.', 422);
        }

        $selectedStudentKeys = $requestedIds->isNotEmpty()
            ? $this->selectedStudentKeysForExam($examen->id_examen, $requestedIds)
            : null;

        if ($requestedIds->isNotEmpty() && $selectedStudentKeys?->isEmpty()) {
            return response('Aucune repartition pour cet examen.', 422);
        }

        $pages = $pvAbsenceDatasetService->buildPages([
            'session_id' => (int) $examen->id_session_examen,
            'niveau_id' => (int) $referenceOffre->semestre->id_niveau,
            'filiere_id' => (int) ($referenceOffre->section->id_filiere ?? $examen->sessionExamen?->id_filiere ?? 0),
            'section_id' => (int) $referenceOffre->section->id_section,
            'annee_id' => $examen->sessionExamen?->id_annee ? (int) $examen->sessionExamen->id_annee : null,
            'salle_id' => $requestedSalleId,
            'module_id' => $examen->id_module ? (int) $examen->id_module : null,
        ], $selectedStudentKeys);

        if ($pages->isEmpty()) {
            return response('Aucune repartition pour cette salle.', 422);
        }

        $filenameBase = $this->resolvePdfFilenameBase(
            $request,
            sprintf('pv-absence-%s-%s', $this->examFileCode($examen), $examen->id_examen)
        );

        return $pvAbsencePdfService
            ->make($pages)
            ->download($this->pdfFilenameForSalle($filenameBase, $requestedSalle, $requestedSalleIndex));
    }

    public function exportCollectivePvAbsence(
        Request $request,
        Examen $examen,
        PvAbsenceDatasetService $pvAbsenceDatasetService,
        PvAbsencePdfService $pvAbsencePdfService
    )
    {
        $examen->load([
            'module' => fn ($query) => $query->select('modules.id_module', 'modules.nom_module', 'modules.code_module'),
            'sessionExamen:id_session_examen,nom_session,id_filiere,id_annee',
            'salle:id_salle,code_salle,nom_salle,capacite_examens,capacite',
            'salles:id_salle,code_salle,nom_salle,capacite_examens,capacite',
            'offreFormation.section.filiere',
            'offreFormation.semestre.niveau',
        ]);

        $requestedIds = $this->requestedRepartitionIds($request);
        $collectiveFilters = $this->collectiveOffreFilters($examen);
        $collectiveExamensQuery = Examen::with([
                'module' => fn ($query) => $query->select('modules.id_module', 'modules.nom_module', 'modules.code_module'),
                'salle:id_salle,code_salle,nom_salle,capacite_examens,capacite',
                'salles:id_salle,code_salle,nom_salle,capacite_examens,capacite',
                'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
                'offreFormation.section:id_section,id_filiere',
                'offreFormation.semestre:id_semestre,id_niveau',
            ])
            ->where('id_session_examen', $examen->id_session_examen);

        if ($this->hasCollectiveOffreFilters($collectiveFilters)) {
            $collectiveExamensQuery->whereHas('offreFormation', function (Builder $query) use ($collectiveFilters) {
                $this->applyCollectiveOffreFilters($query, $collectiveFilters);
            });
        }

        $collectiveExamens = $collectiveExamensQuery
            ->orderBy('date_examen')
            ->orderBy('id_examen')
            ->get(['id_examen', 'id_session_examen', 'id_offre', 'id_module', 'id_salle', 'date_examen']);

        if ($collectiveExamens->isEmpty()) {
            return response('Aucun examen trouve pour cette session.', 422);
        }

        $collectiveSalles = $this->collectiveSalles($collectiveExamens);
        $requestedSalle = $this->resolveRequestedSalle($request, $collectiveSalles);
        if (! $requestedSalle) {
            return response('Aucune repartition pour cette salle.', 422);
        }

        $referenceOffre = $this->referenceOffre($examen, $examen->sessionExamen?->id_filiere ?: $this->currentUserFiliereId());
        if (! $referenceOffre?->section?->id_section || ! $referenceOffre?->semestre?->id_niveau) {
            return response('Impossible de reconstituer le contexte du PV d\'absence depuis cet examen.', 422);
        }

        $selectedStudentKeys = $requestedIds->isNotEmpty()
            ? $this->selectedStudentKeysForExam($examen->id_examen, $requestedIds)
            : null;

        if ($requestedIds->isNotEmpty() && $selectedStudentKeys?->isEmpty()) {
            return response('Aucune repartition pour cet examen.', 422);
        }

        $pages = $pvAbsenceDatasetService->buildPages([
            'session_id' => (int) $examen->id_session_examen,
            'niveau_id' => (int) $referenceOffre->semestre->id_niveau,
            'filiere_id' => (int) ($referenceOffre->section->id_filiere ?? $examen->sessionExamen?->id_filiere ?? 0),
            'section_id' => (int) $referenceOffre->section->id_section,
            'annee_id' => $examen->sessionExamen?->id_annee ? (int) $examen->sessionExamen->id_annee : null,
            'salle_id' => (int) $requestedSalle->id_salle,
            'module_id' => null,
        ], $selectedStudentKeys);

        if ($pages->isEmpty()) {
            return response('Aucune repartition pour cette salle.', 422);
        }

        $filenameBase = $this->resolvePdfFilenameBase(
            $request,
            sprintf(
                'pv-absence-collective-%s-%s',
                Str::slug($examen->sessionExamen?->nom_session ?? 'session') ?: 'session',
                $examen->id_session_examen
            )
        );

        return $pvAbsencePdfService
            ->make($pages)
            ->download($this->pdfFilenameForSalle($filenameBase, $requestedSalle));
    }

    public function exportSallesPlaces(Request $request, Examen $examen)
    {
        $examen->load([
            'module' => fn ($query) => $query->select('modules.id_module', 'modules.nom_module', 'modules.code_module'),
            'element:id_element,id_module,code_element,nom_element',
            'sessionExamen:id_session_examen,nom_session,type_session,id_filiere,id_annee',
            'salle:id_salle,nom_salle,code_salle,capacite_examens,capacite',
            'salles:id_salle,nom_salle,code_salle,capacite_examens,capacite',
            'offreFormation.section.filiere',
            'offreFormation.semestre.niveau',
        ]);

        $collectiveFilters = $this->collectiveOffreFilters($examen);
        $requestedIds = $this->requestedRepartitionIds($request);

        $examensQuery = Examen::with([
                'module' => fn ($query) => $query->select('modules.id_module', 'modules.nom_module', 'modules.code_module'),
                'element:id_element,id_module,code_element,nom_element',
                'salle:id_salle,code_salle,nom_salle,capacite_examens,capacite',
                'salles:id_salle,code_salle,nom_salle,capacite_examens,capacite',
                'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
                'offreFormation.section:id_section,id_filiere',
                'offreFormation.semestre:id_semestre,nom_semestre,id_niveau',
            ])
            ->where('id_session_examen', $examen->id_session_examen);

        if ($this->hasCollectiveOffreFilters($collectiveFilters)) {
            $examensQuery->whereHas('offreFormation', function (Builder $query) use ($collectiveFilters) {
                $this->applyCollectiveOffreFilters($query, $collectiveFilters);
            });
        }

        $examens = $examensQuery
            ->orderBy('date_examen')
            ->orderBy('id_examen')
            ->get(['id_examen', 'id_session_examen', 'id_offre', 'id_module', 'id_element', 'id_salle', 'date_examen']);

        if ($examens->isEmpty()) {
            return back()->with('error', 'Aucun examen trouve pour cette session.');
        }

        $collectiveSalles = $this->collectiveSalles($examens);
        $requestedSalle = $this->resolveRequestedSalle($request, $collectiveSalles);

        if (($request->filled('salle_id') || $request->filled('salle_index')) && ! $requestedSalle) {
            return back()->with('error', 'Aucune repartition pour cette salle.');
        }

        $moduleExamens = $requestedSalle
            ? $examens->filter(fn ($exam) => $this->examUsesSalle($exam, (int) $requestedSalle->id_salle))->values()
            : $examens;

        if ($moduleExamens->isEmpty()) {
            return back()->with('error', $requestedSalle
                ? 'Aucun examen collectif n utilise cette salle.'
                : 'Aucun examen trouve pour cette session.');
        }

        $referenceExam = $requestedSalle
            ? ($moduleExamens->firstWhere('id_examen', $examen->id_examen) ?: $moduleExamens->first())
            : $examen;

        $modules = $moduleExamens
            ->sortBy(fn ($exam) => $exam->date_examen)
            ->map(function ($exam) use ($collectiveFilters) {
                $offre = $this->matchingCollectiveOffre($exam, $collectiveFilters);

                return [
                    'id_examen' => $exam->id_examen,
                    'id_module' => $exam->id_module,
                    'code'      => $this->examFileCode($exam),
                    'name'      => $this->displayLabel($exam),
                    'date'      => optional($exam->date_examen)->format('d/m'),
                    'semestre'  => $offre?->semestre?->nom_semestre,
                ];
            })
            ->values();

        $allRepartitions = RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
            ])
            ->whereIn('id_examen', $moduleExamens->pluck('id_examen'))
            ->orderBy('code_grille')
            ->orderBy('numero_place')
            ->get([
                'id_repartition',
                'id_examen',
                'id_inscription_pedagogique',
                'code_grille',
                'numero_place',
                'code_anonymat',
            ]);

        if ($allRepartitions->isEmpty()) {
            return back()->with('error', 'Aucune repartition pour ces examens.');
        }

        if ($requestedIds->isNotEmpty()) {
            $selectionRepartitions = RepartitionEtudiant::with([
                    'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                    'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                ])
                ->where('id_examen', $examen->id_examen)
                ->whereIn('id_repartition', $requestedIds)
                ->get([
                    'id_repartition',
                    'id_examen',
                    'id_inscription_pedagogique',
                ]);

            if ($selectionRepartitions->isEmpty()) {
                return back()->with('error', 'Aucune repartition pour cet examen.');
            }

            $selectedStudentKeys = $selectionRepartitions
                ->map(fn ($rep) => $rep->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant ?? $rep->id_inscription_pedagogique)
                ->filter()
                ->unique()
                ->values();

            $allRepartitions = $allRepartitions
                ->filter(fn ($rep) => $selectedStudentKeys->contains($rep->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant ?? $rep->id_inscription_pedagogique))
                ->values();
        }

        $exportGroups = $this->buildCollectiveSemesterSeatGroups(
            $moduleExamens,
            $modules,
            $collectiveFilters,
            $allRepartitions,
            $requestedSalle
        )->map(function ($group) {
            $rows = collect($group['rows'] ?? [])->map(function ($student) use ($group) {
                return [
                    'cne'          => $student['cne'] ?? '',
                    'nom'          => $student['nom'] ?? '',
                    'prenom'       => $student['prenom'] ?? '',
                    'is_credit'    => !empty($student['is_credit']),
                    'salle'        => $group['salle']->nom_salle ?? ('Salle '.($group['salle_index'] ?? 1)),
                    'code_salle'   => $group['salle']->code_salle ?? null,
                    'numero_place' => $student['numero_place'] ?? null,
                    'code_grille'  => $student['code_grille'] ?? null,
                    'salle_index'  => (int) ($group['salle_index'] ?? 1),
                ];
            })->values();

            return [
                'salle' => $group['salle'] ?? null,
                'rows' => $rows,
                'total' => (int) ($group['total'] ?? $rows->count()),
                'salle_index' => (int) ($group['salle_index'] ?? 1),
            ];
        })->values();

        if ($exportGroups->isEmpty()) {
            return back()->with('error', $requestedSalle
                ? 'Aucune repartition pour cette salle.'
                : 'Aucune repartition pour cet examen.');
        }

        $footerSalleLabel = $requestedSalle
            ? ($requestedSalle->nom_salle ?: $requestedSalle->code_salle ?: ('Salle ' . $requestedSalle->id_salle))
            : ($collectiveSalles->pluck('nom_salle')->filter()->unique()->implode(' | ') ?: $examen->salle?->nom_salle);

        $filenameBase = $this->resolvePdfFilenameBase(
            $request,
            sprintf('repartition-salles-places-%s-%s', $this->examFileCode($examen), $examen->id_examen)
        );
        $filename = $filenameBase.'.pdf';

        if ($requestedSalle) {
            $salleSlug = Str::slug($requestedSalle->code_salle ?: $requestedSalle->nom_salle ?: (string) $requestedSalle->id_salle);
            $filename = sprintf('%s-salle-%s.pdf', $filenameBase, $salleSlug ?: $requestedSalle->id_salle);
        }

        $payload = [
            'examen'       => $examen,
            'rows'         => $exportGroups->flatMap(fn ($group) => $group['rows'] ?? collect())->values(),
            'groups'       => $exportGroups,
            'generatedAt'  => now(),
            'niveauFiliere'=> $this->niveauFiliereLabel($examen),
            'sessionLabel' => $this->sessionLabel($examen),
            'examLabel'    => $this->examLabel($examen),
            'displayLabel' => $this->displayLabel($examen),
            'moduleLabel'  => $this->moduleLabel($examen),
            'elementLabel' => $this->elementLabel($examen),
        ];

        return Pdf::view('pdfs.repartition-salles-places', $payload)
            ->format('a4')
            ->margins(12, 10, 14, 10)
            ->footerView('pdfs.partials.footer', ['footerSalleLabel' => $footerSalleLabel])
            ->download($filename);
    }

    private function niveauFiliereLabel(Examen $examen): string
    {
        $offre = $this->referenceOffre($examen);
        $niveauName = $offre?->semestre?->niveau?->nom_niveau;
        $filiereName = $offre?->section?->filiere?->nom_filiere;

        return trim(
            ($niveauName ?? '') .
            ($niveauName && $filiereName ? ' - ' : '') .
            ($filiereName ?? '')
        );
    }

    private function isDentaireExam(Examen $examen): bool
    {
        $filiereName = trim((string) ($this->referenceOffre($examen)?->section?->filiere?->nom_filiere ?? ''));

        return $filiereName !== '' && str_contains(strtolower($filiereName), 'dent');
    }

    private function moduleLabel(Examen $examen): string
    {
        $code = trim((string) ($examen->module?->code_module ?? ''));
        $name = trim((string) ($examen->module?->nom_module ?? ''));

        if ($code === '' && $name === '') {
            return 'Module';
        }

        if ($code === '') {
            return $name;
        }

        if ($name === '') {
            return $code;
        }

        return sprintf('%s - %s', $code, $name);
    }

    private function elementLabel(Examen $examen): ?string
    {
        if (! $this->isDentaireExam($examen)) {
            return null;
        }

        $code = trim((string) ($examen->element?->code_element ?? ''));
        $name = trim((string) ($examen->element?->nom_element ?? ''));

        if ($code === '' && $name === '') {
            return null;
        }

        if ($code === '') {
            return $name;
        }

        if ($name === '') {
            return $code;
        }

        return sprintf('%s - %s', $code, $name);
    }

    private function examLabel(Examen $examen): string
    {
        $elementLabel = $this->elementLabel($examen);

        return $elementLabel
            ? sprintf('%s / %s', $this->moduleLabel($examen), $elementLabel)
            : $this->moduleLabel($examen);
    }

    private function displayLabel(Examen $examen): string
    {
        if ($this->isDentaireExam($examen)) {
            $elementName = trim((string) ($examen->element?->nom_element ?? ''));
            if ($elementName !== '') {
                return $elementName;
            }
        }

        $moduleName = trim((string) ($examen->module?->nom_module ?? ''));
        if ($moduleName !== '') {
            return $moduleName;
        }

        if ($this->isDentaireExam($examen)) {
            $elementCode = trim((string) ($examen->element?->code_element ?? ''));
            if ($elementCode !== '') {
                return $elementCode;
            }
        }

        $moduleCode = trim((string) ($examen->module?->code_module ?? ''));

        return $moduleCode !== '' ? $moduleCode : 'Examen';
    }

    private function examFileCode(Examen $examen): string
    {
        $moduleCode = trim((string) ($examen->module?->code_module ?? ''));
        $elementCode = trim((string) ($examen->element?->code_element ?? ''));
        $canUseElementCode = $this->isDentaireExam($examen);

        if ($canUseElementCode && $elementCode !== '' && strcasecmp($moduleCode, $elementCode) !== 0) {
            return trim($moduleCode !== '' ? $moduleCode.'-'.$elementCode : $elementCode, '-');
        }

        return $moduleCode !== ''
            ? $moduleCode
            : ($canUseElementCode && $elementCode !== '' ? $elementCode : 'examen');
    }

    private function sessionLabel(Examen $examen): string
    {
        $session = $examen->sessionExamen;
        $sessionId = $examen->getAttribute('id_session_examen');

        if (
            (! $session || (
                trim((string) ($session->nom_session ?? '')) === '' &&
                trim((string) ($session->type_session ?? '')) === ''
            )) &&
            $sessionId
        ) {
            $session = \App\Models\SessionExamen::query()
                ->find($sessionId, ['id_session_examen', 'nom_session', 'type_session']);
        }

        $name = trim((string) ($session?->nom_session ?? ''));
        $type = trim((string) ($session?->type_session ?? ''));

        if ($name === '' && $type === '') {
            return '-';
        }

        if ($name === '') {
            return $type;
        }

        if ($type === '' || str_contains(strtolower($name), strtolower($type))) {
            return $name;
        }

        return sprintf('%s (%s)', $name, $type);
    }

    private function eligibleInscriptionsForExam(Examen $examen)
    {
        $examen->loadMissing([
            'sessionExamen:id_session_examen,id_filiere,id_annee,type_session,nom_session',
            'offreFormation:id_offre,id_module,id_annee,id_section',
            'offreFormation.section:id_section,id_filiere',
        ]);

        $referenceOffre = $this->referenceOffre($examen, $examen->sessionExamen?->id_filiere ?: $this->currentUserFiliereId());
        $moduleId = (int) ($referenceOffre?->id_module ?: $examen->id_module);
        $anneeId = $examen->sessionExamen?->id_annee
            ?: AnneeUniversitaireModel::where('est_active', true)->latest('date_debut')->value('id_annee');
        $preferredFiliereId = $examen->sessionExamen?->id_filiere ?: $this->currentUserFiliereId();
        $filiereIds = $referenceOffre?->section?->id_filiere
            ? [(int) $referenceOffre->section->id_filiere]
            : $this->resolvedModuleFiliereIds($moduleId, $anneeId, $preferredFiliereId);

        $session = $examen->sessionExamen;
        $isRattrapageSession = $this->isRattrapageSession($session);

        $registrations = InscriptionPedagogique::query()
            ->when($isRattrapageSession, function ($query) use ($moduleId) {
                $query->with(['resultatsModules' => function ($resultQuery) use ($moduleId) {
                    $resultQuery
                        ->select([
                            'id_resultat_module',
                            'id_inscription_pedagogique',
                            'id_module',
                            'statut',
                            'date_validation',
                        ])
                        ->where('id_module', $moduleId)
                        ->orderByDesc('date_validation')
                        ->orderByDesc('id_resultat_module');
                }]);
            })
            ->with([
                'inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
                'offreFormation.module:id_module,nom_module,code_module',
            ])
            ->whereHas('offreFormation', function ($query) use ($referenceOffre, $moduleId, $anneeId, $filiereIds) {
                if ($referenceOffre?->id_offre) {
                    $query->where('id_offre', $referenceOffre->id_offre);
                    return;
                }

                $query->where('id_module', $moduleId);

                if ($anneeId) {
                    $query->where('id_annee', $anneeId);
                }

                if ($filiereIds !== []) {
                    $query->whereHas('section', function ($sectionQuery) use ($filiereIds) {
                        $sectionQuery->whereIn('id_filiere', $filiereIds);
                    });
                }
            })
            ->when($anneeId, function ($query) use ($anneeId) {
                $query->whereHas('inscriptionAdministrative', function ($adminQuery) use ($anneeId) {
                    $adminQuery->where('id_annee', $anneeId);
                });
            })
            ->orderBy('id_inscription_pedagogique')
            ->get([
                'id_inscription_pedagogique',
                'id_inscription_admin',
                'id_offre',
            ]);

        return $this->filterRegistrationsForSession($registrations, $moduleId, $session);
    }

    private function referenceOffre(Examen $examen, ?int $preferredFiliereId = null)
    {
        $examen->loadMissing([
            'sessionExamen:id_session_examen,id_filiere,id_annee',
            'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
            'offreFormation.section:id_section,id_filiere',
            'offreFormation.section.filiere:id_filiere,nom_filiere',
            'offreFormation.semestre:id_semestre,nom_semestre,id_niveau',
            'offreFormation.semestre.niveau:id_niveau,nom_niveau',
        ]);

        if ($examen->offreFormation) {
            return $examen->offreFormation;
        }

        $session = $examen->sessionExamen;
        $effectiveFiliereId = $session?->id_filiere ?: $preferredFiliereId ?: $this->currentUserFiliereId();
        $moduleId = (int) $examen->id_module;
        if (! $moduleId) {
            return null;
        }

        $query = OffreFormation::query()
            ->with([
                'section:id_section,id_filiere,nom_section',
                'section.filiere:id_filiere,nom_filiere',
                'semestre:id_semestre,nom_semestre,id_niveau',
                'semestre.niveau:id_niveau,nom_niveau',
            ])
            ->where('id_module', $moduleId);

        $offre = (clone $query)
            ->when($session?->id_annee, fn ($offreQuery) => $offreQuery->where('id_annee', $session->id_annee))
            ->when($effectiveFiliereId, function ($offreQuery) use ($effectiveFiliereId) {
                $offreQuery->whereHas('section', function ($sectionQuery) use ($effectiveFiliereId) {
                    $sectionQuery->where('id_filiere', $effectiveFiliereId);
                });
            })
            ->orderBy('id_offre')
            ->first();

        if (! $offre && $session?->id_annee) {
            $offre = (clone $query)
                ->where('id_annee', $session->id_annee)
                ->orderBy('id_offre')
                ->first();
        }

        $offre = $offre ?: $query->orderBy('id_offre')->first();

        if ($offre) {
            $examen->setRelation('offreFormation', $offre);
            if (! $examen->id_offre) {
                $examen->id_offre = $offre->id_offre;
            }
        }

        return $offre;
    }

    private function collectiveOffreFilters(Examen $examen): array
    {
        $examen->loadMissing([
            'sessionExamen:id_session_examen,nom_session,id_filiere,id_annee',
            'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
            'offreFormation.section:id_section,id_filiere',
            'offreFormation.section.filiere:id_filiere,nom_filiere',
            'offreFormation.semestre:id_semestre,nom_semestre,id_niveau',
            'offreFormation.semestre.niveau:id_niveau,nom_niveau',
        ]);

        $referenceOffre = $this->referenceOffre($examen);

        return [
            'annee_id' => $examen->sessionExamen?->id_annee ? (int) $examen->sessionExamen->id_annee : null,
            'semestre_id' => $referenceOffre?->id_semestre ? (int) $referenceOffre->id_semestre : null,
            'niveau_id' => $referenceOffre?->semestre?->id_niveau ? (int) $referenceOffre->semestre->id_niveau : null,
            'filiere_id' => $referenceOffre?->section?->id_filiere
                ? (int) $referenceOffre->section->id_filiere
                : ($examen->sessionExamen?->id_filiere ? (int) $examen->sessionExamen->id_filiere : $this->currentUserFiliereId()),
        ];
    }

    private function hasCollectiveOffreFilters(array $filters): bool
    {
        return collect([
            $filters['annee_id'] ?? null,
            $filters['semestre_id'] ?? null,
            $filters['niveau_id'] ?? null,
            $filters['filiere_id'] ?? null,
        ])->filter()->isNotEmpty();
    }

    private function applyCollectiveOffreFilters(Builder $query, array $filters): Builder
    {
        $anneeId = $filters['annee_id'] ?? null;
        $semestreId = $filters['semestre_id'] ?? null;
        $niveauId = $filters['niveau_id'] ?? null;
        $filiereId = $filters['filiere_id'] ?? null;

        if ($anneeId) {
            $query->where('id_annee', $anneeId);
        }

        if ($semestreId) {
            $query->where('id_semestre', $semestreId);
        }

        if ($niveauId) {
            $query->whereHas('semestre', function (Builder $semestreQuery) use ($niveauId) {
                $semestreQuery->where('id_niveau', $niveauId);
            });
        }

        if ($filiereId) {
            $query->whereHas('section', function (Builder $sectionQuery) use ($filiereId) {
                $sectionQuery->where('id_filiere', $filiereId);
            });
        }

        return $query;
    }

    private function matchingCollectiveOffre(Examen $examen, array $filters)
    {
        $offre = $this->referenceOffre($examen, $filters['filiere_id'] ?? null);
        if (! $offre) {
            return null;
        }

        $anneeId = $filters['annee_id'] ?? null;
        $semestreId = $filters['semestre_id'] ?? null;
        $niveauId = $filters['niveau_id'] ?? null;
        $filiereId = $filters['filiere_id'] ?? null;

        if ($anneeId && (int) $offre->id_annee !== (int) $anneeId) {
            return null;
        }

        if ($semestreId && (int) $offre->id_semestre !== (int) $semestreId) {
            return null;
        }

        if ($niveauId && (int) $offre->semestre?->id_niveau !== (int) $niveauId) {
            return null;
        }

        if ($filiereId && (int) $offre->section?->id_filiere !== (int) $filiereId) {
            return null;
        }

        return $offre;
    }

    private function resolvedModuleFiliereIds(int $moduleId, ?int $anneeId = null, ?int $preferredFiliereId = null): array
    {
        if ($preferredFiliereId) {
            return [(int) $preferredFiliereId];
        }

        $module = \App\Models\Module::with([
            'offresFormation' => function ($query) use ($anneeId) {
                if ($anneeId) {
                    $query->where('id_annee', $anneeId);
                }
            },
            'offresFormation.section:id_section,id_filiere',
        ])->find($moduleId, ['id_module']);

        if (! $module) {
            return [];
        }

        $filiereIds = $module->offresFormation
            ->pluck('section.id_filiere')
            ->filter()
            ->unique()
            ->values();

        if ($filiereIds->count() === 1) {
            return [(int) $filiereIds->first()];
        }

        return [];
    }

    private function currentUserFiliereId(): ?int
    {
        $filiereId = auth()->user()?->userFiliereAnnees()->first()?->id_filiere;

        return $filiereId && $filiereId !== 'all'
            ? (int) $filiereId
            : null;
    }

    private function resolvedExamSalles(Examen $examen): Collection
    {
        $salles = $examen->salles
            ->sortBy(function ($salle) use ($examen) {
                $storedOrder = $salle->pivot?->ordre;
                $isPrimarySalle = (int) ($salle->id_salle ?? 0) === (int) ($examen->id_salle ?? 0) ? 0 : 1;

                return sprintf(
                    '%010d|%d|%010d',
                    $storedOrder ?? PHP_INT_MAX,
                    $isPrimarySalle,
                    (int) ($salle->id_salle ?? 0)
                );
            })
            ->values();

        if ($salles->isEmpty() && $examen->salle) {
            $salles = collect([$examen->salle]);
        }

        return $salles;
    }

    private function resolvedExamSallesForRepartitions(Examen $examen, Collection $repartitions): Collection
    {
        $salles = $this->resolvedExamSalles($examen);

        if ($salles->count() <= 1 || $repartitions->isEmpty()) {
            return $salles;
        }

        $countsByIndex = $this->salleCountsByIndex($repartitions);

        if ($countsByIndex->isEmpty() || $salles->count() > 6) {
            return $salles;
        }

        $currentScore = $this->salleOrderMismatchScore($salles, $countsByIndex);
        $bestOrder = $salles;
        $bestScore = $currentScore;

        foreach ($this->sallePermutations($salles->all()) as $permutation) {
            $candidate = collect($permutation)->values();
            $candidateScore = $this->salleOrderMismatchScore($candidate, $countsByIndex);

            if ($this->isBetterSalleOrderScore($candidateScore, $bestScore)) {
                $bestOrder = $candidate;
                $bestScore = $candidateScore;
            }
        }

        return $this->isBetterSalleOrderScore($bestScore, $currentScore)
            ? $bestOrder
            : $salles;
    }

    private function salleOrderMismatchScore(Collection $salles, Collection $countsByIndex): array
    {
        $overflow = 0;
        $distance = 0;

        foreach ($countsByIndex as $index => $count) {
            $capacity = (int) ($salles->get(((int) $index) - 1)?->capacite_examens
                ?? $salles->get(((int) $index) - 1)?->capacite
                ?? 0);

            if ($capacity < 1) {
                continue;
            }

            $overflow += max(0, (int) $count - $capacity);
            $distance += abs((int) $count - $capacity);
        }

        return [$overflow, $distance];
    }

    private function isBetterSalleOrderScore(array $candidate, array $reference): bool
    {
        if (($candidate[0] ?? PHP_INT_MAX) !== ($reference[0] ?? PHP_INT_MAX)) {
            return ($candidate[0] ?? PHP_INT_MAX) < ($reference[0] ?? PHP_INT_MAX);
        }

        return ($candidate[1] ?? PHP_INT_MAX) < ($reference[1] ?? PHP_INT_MAX);
    }

    private function sallePermutations(array $items): array
    {
        if (count($items) <= 1) {
            return [$items];
        }

        $permutations = [];

        foreach ($items as $index => $item) {
            $remaining = $items;
            array_splice($remaining, $index, 1);

            foreach ($this->sallePermutations(array_values($remaining)) as $permutation) {
                $permutations[] = array_merge([$item], $permutation);
            }
        }

        return $permutations;
    }

    private function collectiveSalles(Collection $examens): Collection
    {
        return $examens
            ->flatMap(fn ($exam) => $this->resolvedExamSalles($exam))
            ->filter(fn ($salle) => $salle && $salle->id_salle)
            ->unique('id_salle')
            ->values();
    }

    private function collectiveExcelModuleHeader(array $module): string
    {
        $parts = array_filter([
            $module['code'] ?? null,
            $module['name'] ?? null,
        ]);

        return implode(' - ', $parts) ?: 'Module';
    }

    private function collectiveExcelStatusValue(string $status): string
    {
        return match ($status) {
            'cap' => 'CAP',
            'none' => 'X',
            default => '',
        };
    }

    private function collectiveExcelSheetTitle(?Salle $salle, int $salleIndex, array &$usedTitles): string
    {
        $baseTitle = $salle?->nom_salle ?: $salle?->code_salle ?: ('Salle '.$salleIndex);
        $baseTitle = preg_replace('/[\\\\\\/?*\\[\\]:]/', ' ', $baseTitle) ?: 'Salle '.$salleIndex;
        $baseTitle = trim($baseTitle) !== '' ? trim($baseTitle) : 'Salle '.$salleIndex;
        $baseTitle = mb_substr($baseTitle, 0, 31);
        $candidate = $baseTitle;
        $suffix = 2;

        while (in_array($candidate, $usedTitles, true)) {
            $candidate = mb_substr($baseTitle, 0, max(0, 31 - mb_strlen((string) $suffix) - 1)).'-'.$suffix;
            $suffix++;
        }

        $usedTitles[] = $candidate;

        return $candidate;
    }

    private function resolveRequestedSalle(Request $request, Collection $salles): ?Salle
    {
        $requestedSalleId = $request->integer('salle_id');
        if ($requestedSalleId) {
            return $salles->first(fn ($salle) => (int) $salle->id_salle === $requestedSalleId);
        }

        $requestedSalleIndex = $request->integer('salle_index');
        if ($requestedSalleIndex) {
            return $salles->get($requestedSalleIndex - 1);
        }

        return $salles->count() === 1 ? $salles->first() : null;
    }

    private function examUsesSalle(Examen $examen, int $targetSalleId): bool
    {
        if ($targetSalleId < 1) {
            return false;
        }

        $salleIds = $this->resolvedExamSalles($examen)
            ->pluck('id_salle')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->values();

        if ($salleIds->isEmpty() && $examen->id_salle) {
            $salleIds = collect([(int) $examen->id_salle]);
        }

        return $salleIds->contains($targetSalleId);
    }

    private function salleIndexFromGrille($codeGrille): int
    {
        $str = str_pad((string) ($codeGrille ?? ''), 7, '0', STR_PAD_LEFT);
        $digit = (int) ($str[3] ?? 1);

        return $digit >= 1 ? $digit : 1;
    }

    private function salleCountsByIndex(Collection $repartitions): Collection
    {
        return $repartitions
            ->map(fn ($rep) => $this->salleIndexFromGrille($rep->code_grille))
            ->countBy()
            ->sortKeys();
    }

    private function assignStudentsToSalleIndices(Collection $students, Collection $salleCounts): Collection
    {
        $students = $students->values();
        $salleIndices = $salleCounts
            ->keys()
            ->map(fn ($index) => (int) $index)
            ->values();

        if ($students->isEmpty() || $salleIndices->isEmpty()) {
            return $students;
        }

        $currentSallePosition = 0;
        $currentSalleIndex = (int) $salleIndices->first();
        $currentSalleFilled = 0;
        $currentSalleCap = (int) $salleCounts->get($currentSalleIndex, $students->count());

        return $students->map(function ($student) use (&$currentSallePosition, &$currentSalleIndex, &$currentSalleFilled, &$currentSalleCap, $salleIndices, $salleCounts, $students) {
            if ($currentSalleFilled >= $currentSalleCap && $currentSallePosition < $salleIndices->count() - 1) {
                $currentSallePosition++;
                $currentSalleIndex = (int) $salleIndices->get($currentSallePosition, $currentSalleIndex);
                $currentSalleFilled = 0;
                $currentSalleCap = (int) $salleCounts->get($currentSalleIndex, $students->count());
            }

            $student['salle_index'] = $currentSalleIndex;
            $currentSalleFilled++;

            return $student;
        });
    }

    private function buildSalleGroupsWithCollectiveOrder(Examen $examen, Collection $repartitions, Collection $salles): ?Collection
    {
        if ($repartitions->isEmpty()) {
            return null;
        }

        $collectiveFilters = $this->collectiveOffreFilters($examen);

        $examensQuery = Examen::with([
                'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
                'offreFormation.section:id_section,id_filiere',
                'offreFormation.semestre:id_semestre,id_niveau',
            ])
            ->where('id_session_examen', $examen->id_session_examen);

        if ($this->hasCollectiveOffreFilters($collectiveFilters)) {
            $examensQuery->whereHas('offreFormation', function (Builder $query) use ($collectiveFilters) {
                $this->applyCollectiveOffreFilters($query, $collectiveFilters);
            });
        }

        $examens = $examensQuery
            ->orderBy('date_examen')
            ->orderBy('id_examen')
            ->get(['id_examen', 'id_offre']);

        if ($examens->isEmpty()) {
            return null;
        }

        $allRepartitions = RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
            ])
            ->whereIn('id_examen', $examens->pluck('id_examen'))
            ->orderBy('id_inscription_pedagogique')
            ->get([
                'id_repartition',
                'id_examen',
                'id_inscription_pedagogique',
            ]);

        if ($allRepartitions->isEmpty()) {
            return null;
        }

        $creditStatusByStudent = $allRepartitions->reduce(function ($carry, $rep) {
            $key = $rep->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant
                ?? $rep->id_inscription_pedagogique;
            $type = strtolower($rep->inscriptionPedagogique?->type_inscription ?? '');

            if (!array_key_exists($key, $carry)) {
                $carry[$key] = false;
            }

            if ($type === 'credit') {
                $carry[$key] = true;
            }

            return $carry;
        }, []);

        $studentsById = $allRepartitions
            ->groupBy(function ($rep) {
                return $rep->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant ?? $rep->id_inscription_pedagogique;
            })
            ->map(function ($rows, $studentKey) {
                $ip = $rows->first()->inscriptionPedagogique;

                return [
                    'student_key' => $studentKey,
                    'cne'        => $ip?->inscriptionAdministrative?->etudiant?->cne,
                    'nom'        => $ip?->inscriptionAdministrative?->etudiant?->nom,
                    'prenom'     => $ip?->inscriptionAdministrative?->etudiant?->prenom,
                ];
            });

        $studentsWithSeats = $studentsById
            ->map(function ($student) use ($creditStatusByStudent) {
                $key = $student['student_key'];

                return [
                    'student_key' => $key,
                    'cne'         => $student['cne'],
                    'nom'         => $student['nom'],
                    'prenom'      => $student['prenom'],
                    'is_credit'   => $creditStatusByStudent[$key] ?? false,
                ];
            })
            ->sortBy(function ($student) {
                $creditRank = $student['is_credit'] ? 1 : 0;
                return sprintf(
                    '%d|%s|%s|%s',
                    $creditRank,
                    strtolower($student['nom'] ?? ''),
                    strtolower($student['prenom'] ?? ''),
                    strtolower($student['cne'] ?? '')
                );
            })
            ->values()
            ->map(function ($student, $index) {
                $student['global_index'] = $index + 1;
                return $student;
            })
            ->values();

        $salleCounts = $this->salleCountsByIndex($repartitions);
        $studentsWithSeats = $this->assignStudentsToSalleIndices($studentsWithSeats, $salleCounts);

        $repartitionsByStudent = $repartitions->keyBy(function ($rep) {
            return $rep->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant ?? $rep->id_inscription_pedagogique;
        });

        $orderedRows = $studentsWithSeats
            ->map(function ($student) use ($repartitionsByStudent) {
                $rep = $repartitionsByStudent->get($student['student_key']);
                if (! $rep) {
                    return null;
                }

                return [
                    'salle_index' => $student['salle_index'] ?? 1,
                    'rep'         => $rep,
                ];
            })
            ->filter()
            ->values();

        if ($orderedRows->isEmpty()) {
            return null;
        }

        return $orderedRows
            ->groupBy('salle_index')
            ->sortKeys()
            ->map(function ($rows, $salleIndex) use ($salles) {
                $orderedReps = $rows->map(fn ($row) => $row['rep'])->values();

                return [
                    'salle'       => $salles[$salleIndex - 1] ?? null,
                    'rows'        => $orderedReps,
                    'present'     => $orderedReps->where('present', true)->count(),
                    'total'       => $orderedReps->count(),
                    'absent'      => $orderedReps->count() - $orderedReps->where('present', true)->count(),
                    'salle_index' => (int) $salleIndex,
                ];
            })
            ->values();
    }

    private function buildCollectiveSemesterSeatGroups(
        Collection $moduleExamens,
        Collection $modules,
        array $collectiveFilters,
        Collection $allRepartitions,
        ?Salle $requestedSalle = null
    ): Collection {
        if ($allRepartitions->isEmpty()) {
            return collect();
        }

        $examensById = $moduleExamens->keyBy('id_examen');
        $orderedSallesByExamId = $moduleExamens
            ->mapWithKeys(function ($exam) use ($allRepartitions) {
                $examRepartitions = $allRepartitions
                    ->where('id_examen', $exam->id_examen)
                    ->values();

                return [
                    $exam->id_examen => $this->resolvedExamSallesForRepartitions($exam, $examRepartitions),
                ];
            });
        $studentIds = $allRepartitions
            ->map(fn ($rep) => $rep->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant)
            ->filter()
            ->unique()
            ->values();
        $moduleIds = $modules
            ->pluck('id_module')
            ->filter()
            ->unique()
            ->values();

        $capByStudentModule = [];
        if ($studentIds->isNotEmpty() && $moduleIds->isNotEmpty()) {
            $capIps = InscriptionPedagogique::with([
                    'inscriptionAdministrative:id_inscription_admin,id_etudiant',
                    'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
                    'offreFormation.section:id_section,id_filiere',
                    'offreFormation.semestre:id_semestre,id_niveau',
                ])
                ->whereHas('inscriptionAdministrative', function ($query) use ($studentIds) {
                    $query->whereIn('id_etudiant', $studentIds);
                })
                ->whereHas('offreFormation', function (Builder $query) use ($moduleIds, $collectiveFilters) {
                    $query->whereIn('id_module', $moduleIds);
                    $this->applyCollectiveOffreFilters($query, $collectiveFilters);
                })
                ->get([
                    'id_inscription_pedagogique',
                    'id_inscription_admin',
                    'id_offre',
                    'type_inscription',
                ])
                ->filter(fn ($ip) => strtolower($ip->type_inscription ?? '') === 'capitalisation');

            foreach ($capIps as $ip) {
                $studentKey = $ip->inscriptionAdministrative?->id_etudiant ?? $ip->id_inscription_pedagogique;
                $moduleId = $ip->offreFormation?->id_module;
                if ($studentKey && $moduleId) {
                    $capByStudentModule[$studentKey][$moduleId] = true;
                }
            }
        }

        $creditStatusByStudent = $allRepartitions->reduce(function ($carry, $rep) {
            $key = $this->studentKeyForRepartition($rep);
            $type = strtolower($rep->inscriptionPedagogique?->type_inscription ?? '');

            if (! array_key_exists($key, $carry)) {
                $carry[$key] = false;
            }

            if ($type === 'credit') {
                $carry[$key] = true;
            }

            return $carry;
        }, []);

        $resolvePlacement = function ($rep) use ($examensById, $orderedSallesByExamId) {
            $exam = $examensById->get($rep->id_examen);
            $salleIndex = $this->salleIndexFromGrille($rep->code_grille);
            $salles = $orderedSallesByExamId->get($rep->id_examen)
                ?? ($exam ? $this->resolvedExamSalles($exam) : collect());
            $placeValue = strtoupper(trim((string) ($rep->numero_place ?? '')));
            $salle = $salles->first(function ($candidate) use ($placeValue) {
                $code = strtoupper(trim((string) ($candidate?->code_salle ?? '')));

                return $code !== '' && str_starts_with($placeValue, $code.'-');
            });

            if (! $salle) {
                $salle = $salles[$salleIndex - 1] ?? $exam?->salle;
            }

            return [
                'rep' => $rep,
                'salle' => $salle,
                'salle_id' => (int) ($salle?->id_salle ?? 0),
                'salle_index' => $salleIndex,
            ];
        };

        $placementsByStudent = $allRepartitions
            ->map(function ($rep) use ($resolvePlacement, $examensById) {
                $placement = $resolvePlacement($rep);
                $exam = $examensById->get($rep->id_examen);

                $placement['student_key'] = $this->studentKeyForRepartition($rep);
                $placement['date_key'] = optional($exam?->date_examen)->format('Ymd') ?? '99999999';
                $placement['seat_sort_key'] = $this->seatSortKey($rep->numero_place, $rep->code_grille);
                $placement['seat_key'] = $this->placementSeatKey(
                    (int) ($placement['salle_id'] ?? 0),
                    (int) ($placement['salle_index'] ?? 1),
                    $rep->numero_place,
                    $rep->code_grille
                );

                return $placement;
            })
            ->groupBy('student_key')
            ->map(function ($placements) {
                return $placements
                    ->sortBy(fn ($placement) => $this->placementOrderKey($placement))
                    ->values();
            });

        $assignedPlacementsByStudent = $this->assignSemesterPlacements($placementsByStudent);

        return $allRepartitions
            ->groupBy(fn ($rep) => $this->studentKeyForRepartition($rep))
            ->map(function ($rows, $studentKey) use (
                $modules,
                $capByStudentModule,
                $creditStatusByStudent,
                $assignedPlacementsByStudent
            ) {
                $ip = $rows->first()->inscriptionPedagogique;
                $rowsByExam = $rows->groupBy('id_examen');
                $statuses = [];

                foreach ($modules as $module) {
                    $examRows = $rowsByExam->get($module['id_examen'], collect());
                    $hasCap = $capByStudentModule[$studentKey][$module['id_module']] ?? false;
                    if ($examRows->isNotEmpty()) {
                        $hasCap = $hasCap || $examRows->contains(function ($rep) {
                            return strtolower($rep->inscriptionPedagogique?->type_inscription ?? '') === 'capitalisation';
                        });
                    }

                    if ($hasCap) {
                        $statuses[$module['id_examen']] = 'cap';
                    } elseif ($examRows->isNotEmpty()) {
                        $statuses[$module['id_examen']] = 'pass';
                    } else {
                        $statuses[$module['id_examen']] = 'none';
                    }
                }

                $seat = $assignedPlacementsByStudent[(string) $studentKey] ?? null;
                if (! $seat) {
                    return null;
                }

                return [
                    'student_key' => $studentKey,
                    'cne' => $ip?->inscriptionAdministrative?->etudiant?->cne,
                    'nom' => $ip?->inscriptionAdministrative?->etudiant?->nom,
                    'prenom' => $ip?->inscriptionAdministrative?->etudiant?->prenom,
                    'modules' => $statuses,
                    'is_credit' => $creditStatusByStudent[$studentKey] ?? false,
                    'numero_place' => $seat['rep']->numero_place ?? null,
                    'code_grille' => $seat['rep']->code_grille ?? null,
                    'salle' => $seat['salle'] ?? null,
                    'salle_id' => (int) ($seat['salle_id'] ?? 0),
                    'salle_index' => (int) ($seat['salle_index'] ?? 1),
                ];
            })
            ->filter()
            ->sortBy(function ($student) {
                return sprintf(
                    '%05d|%s|%d|%s|%s',
                    (int) ($student['salle_index'] ?? 0),
                    $this->seatSortKey($student['numero_place'] ?? null, $student['code_grille'] ?? null),
                    !empty($student['is_credit']) ? 1 : 0,
                    strtolower($student['nom'] ?? ''),
                    strtolower($student['prenom'] ?? '')
                );
            })
            ->groupBy(function ($student) {
                return (int) ($student['salle_id'] ?? 0) > 0
                    ? 'salle:'.(int) $student['salle_id']
                    : 'index:'.(int) ($student['salle_index'] ?? 1);
            })
            ->map(function ($rows) {
                $rows = $rows->values()->map(function ($student, $index) {
                    $student['global_index'] = $index + 1;

                    return $student;
                });

                return [
                    'salle' => $rows->first()['salle'] ?? null,
                    'rows' => $rows,
                    'total' => $rows->count(),
                    'salle_index' => (int) ($rows->first()['salle_index'] ?? 1),
                ];
            })
            ->values()
            ->sortBy(function ($group) {
                return sprintf(
                    '%05d|%s',
                    (int) ($group['salle_index'] ?? 0),
                    strtolower($group['salle']->nom_salle ?? $group['salle']->code_salle ?? '')
                );
            })
            ->values();

        $groups = $this->rebalanceCollectiveCreditGroups($groups);

        if (! $requestedSalle) {
            return $groups;
        }

        return $groups
            ->filter(fn ($group) => (int) ($group['salle']->id_salle ?? 0) === (int) $requestedSalle->id_salle)
            ->values();
    }

    private function rebalanceCollectiveCreditGroups(Collection $groups): Collection
    {
        $groups = $groups
            ->map(function ($group) {
                $group['rows'] = collect($group['rows'] ?? [])->values();

                return $group;
            })
            ->values();

        if ($groups->isEmpty()) {
            return collect();
        }

        $lastGroupIndex = (int) $groups->keys()->last();
        $lastGroup = $groups->get($lastGroupIndex);
        $lastSalle = $lastGroup['salle'] ?? null;
        $lastSalleId = (int) ($lastGroup['rows']->first()['salle_id'] ?? $lastSalle?->id_salle ?? 0);
        $lastSalleIndex = (int) ($lastGroup['salle_index'] ?? ($lastGroup['rows']->first()['salle_index'] ?? 1));

        $moveToLastSalle = function (array $student) use ($lastSalle, $lastSalleId, $lastSalleIndex) {
            $student['salle'] = $lastSalle;
            $student['salle_id'] = $lastSalleId;
            $student['salle_index'] = $lastSalleIndex;

            return $student;
        };

        $carriedCreditRows = $groups
            ->take(max(0, $groups->count() - 1))
            ->flatMap(fn ($group) => collect($group['rows'] ?? [])
                ->filter(fn ($student) => ! empty($student['is_credit']))
                ->map($moveToLastSalle))
            ->values();

        return $groups
            ->map(function ($group, $index) use ($lastGroupIndex, $carriedCreditRows, $moveToLastSalle) {
                $rows = collect($group['rows'] ?? []);
                $normalRows = $rows
                    ->reject(fn ($student) => ! empty($student['is_credit']))
                    ->values();

                if ($index === $lastGroupIndex) {
                    $creditRows = $rows
                        ->filter(fn ($student) => ! empty($student['is_credit']))
                        ->map($moveToLastSalle)
                        ->concat($carriedCreditRows)
                        ->values();

                    $rows = $normalRows->concat($creditRows)->values();
                } else {
                    $rows = $normalRows;
                }

                $group['rows'] = $rows->map(function ($student, $rowIndex) {
                    $student['global_index'] = $rowIndex + 1;

                    return $student;
                })->values();
                $group['total'] = $group['rows']->count();

                return $group;
            })
            ->values();
    }

    private function buildCollectiveExportData(Request $request, Examen $examen): array
    {
        $examen->load([
            'module' => fn ($query) => $query->select('modules.id_module', 'modules.nom_module', 'modules.code_module'),
            'element:id_element,id_module,code_element,nom_element',
            'sessionExamen:id_session_examen,nom_session,id_filiere,id_annee',
            'salle:id_salle,code_salle,nom_salle,capacite_examens,capacite',
            'salles:id_salle,code_salle,nom_salle,capacite_examens,capacite',
            'offreFormation.section.filiere',
            'offreFormation.semestre.niveau',
        ]);

        $collectiveFilters = $this->collectiveOffreFilters($examen);
        $requestedIds = $this->requestedRepartitionIds($request);

        $examensQuery = Examen::with([
                'module' => fn ($query) => $query->select('modules.id_module', 'modules.nom_module', 'modules.code_module'),
                'element:id_element,id_module,code_element,nom_element',
                'salle:id_salle,code_salle,nom_salle,capacite_examens,capacite',
                'salles:id_salle,code_salle,nom_salle,capacite_examens,capacite',
                'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee',
                'offreFormation.section:id_section,id_filiere',
                'offreFormation.semestre:id_semestre,nom_semestre,id_niveau',
            ])
            ->where('id_session_examen', $examen->id_session_examen);

        if ($this->hasCollectiveOffreFilters($collectiveFilters)) {
            $examensQuery->whereHas('offreFormation', function (Builder $query) use ($collectiveFilters) {
                $this->applyCollectiveOffreFilters($query, $collectiveFilters);
            });
        }

        $examens = $examensQuery
            ->orderBy('date_examen')
            ->orderBy('id_examen')
            ->get(['id_examen', 'id_session_examen', 'id_offre', 'id_module', 'id_element', 'id_salle', 'date_examen']);

        if ($examens->isEmpty()) {
            return ['error' => 'Aucun examen trouve pour cette session.'];
        }

        $collectiveSalles = $this->collectiveSalles($examens);
        $requestedSalle = $this->resolveRequestedSalle($request, $collectiveSalles);
        $requestedSalleId = $request->integer('salle_id');
        $requestedSalleIndex = $request->integer('salle_index');

        if (($requestedSalleId || $requestedSalleIndex) && ! $requestedSalle) {
            return ['error' => 'Aucune repartition pour cette salle.'];
        }

        $moduleExamens = $requestedSalle
            ? $examens->filter(fn ($exam) => $this->examUsesSalle($exam, (int) $requestedSalle->id_salle))->values()
            : $examens;

        if ($moduleExamens->isEmpty()) {
            return ['error' => $requestedSalle
                ? 'Aucun examen collectif n utilise cette salle.'
                : 'Aucun examen trouve pour cette session.'];
        }

        $referenceExam = $requestedSalle
            ? ($moduleExamens->firstWhere('id_examen', $examen->id_examen) ?: $moduleExamens->first())
            : $examen;
        $referenceExamSalles = $this->resolvedExamSalles($referenceExam);
        $referenceSalleIndex = null;

        if ($requestedSalle) {
            $referenceSallePosition = $referenceExamSalles->search(
                fn ($salle) => (int) $salle->id_salle === (int) $requestedSalle->id_salle
            );

            if ($referenceSallePosition !== false) {
                $referenceSalleIndex = (int) $referenceSallePosition + 1;
            }
        }

        $modules = $moduleExamens
            ->sortBy(fn ($exam) => $exam->date_examen)
            ->map(function ($exam) use ($collectiveFilters) {
                $offre = $this->matchingCollectiveOffre($exam, $collectiveFilters);

                return [
                    'id_examen' => $exam->id_examen,
                    'id_module' => $exam->id_module,
                    'code' => $this->examFileCode($exam),
                    'name' => $this->displayLabel($exam),
                    'date' => optional($exam->date_examen)->format('d/m'),
                    'semestre' => $offre?->semestre?->nom_semestre,
                ];
            })
            ->values();

        $firstExamDate = $moduleExamens->pluck('date_examen')->filter()->min();

        $allRepartitions = RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
            ])
            ->whereIn('id_examen', $moduleExamens->pluck('id_examen'))
            ->orderBy('code_grille')
            ->orderBy('numero_place')
            ->get([
                'id_repartition',
                'id_examen',
                'id_inscription_pedagogique',
                'code_grille',
                'numero_place',
            ]);

        if ($allRepartitions->isEmpty()) {
            return ['error' => 'Aucune repartition pour ces examens.'];
        }

        $selectedStudentKeys = collect();
        if ($requestedIds->isNotEmpty()) {
            $selectionRepartitions = RepartitionEtudiant::with([
                    'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                    'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                    'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
                ])
                ->where('id_examen', $examen->id_examen)
                ->whereIn('id_repartition', $requestedIds)
                ->orderBy('code_grille')
                ->orderBy('numero_place')
                ->get([
                    'id_repartition',
                    'id_examen',
                    'id_inscription_pedagogique',
                    'code_grille',
                    'numero_place',
                    'code_anonymat',
                ]);

            if ($selectionRepartitions->isEmpty()) {
                return ['error' => 'Aucune repartition pour cet examen.'];
            }

            $selectedStudentKeys = $selectionRepartitions
                ->map(fn ($rep) => $rep->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant ?? $rep->id_inscription_pedagogique)
                ->filter()
                ->unique()
                ->values();

            $allRepartitions = $allRepartitions
                ->filter(fn ($rep) => $selectedStudentKeys->contains($rep->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant ?? $rep->id_inscription_pedagogique))
                ->values();
        }

        $selectedRepartitions = RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
            ])
            ->where('id_examen', $referenceExam->id_examen)
            ->orderBy('code_grille')
            ->orderBy('numero_place')
            ->get([
                'id_repartition',
                'id_examen',
                'id_inscription_pedagogique',
                'code_grille',
                'numero_place',
                'code_anonymat',
            ]);

        if ($selectedStudentKeys->isNotEmpty()) {
            $selectedRepartitions = $selectedRepartitions
                ->filter(fn ($rep) => $selectedStudentKeys->contains($rep->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant ?? $rep->id_inscription_pedagogique))
                ->values();
        }

        $requestedSalleRepartitions = $referenceSalleIndex !== null
            ? $selectedRepartitions
                ->filter(fn ($rep) => $this->salleIndexFromGrille($rep->code_grille) === $referenceSalleIndex)
                ->values()
            : $selectedRepartitions;

        if ($requestedSalleRepartitions->isEmpty()) {
            return ['error' => $requestedSalle
                ? 'Aucune repartition pour cette salle.'
                : 'Aucune repartition pour cet examen.'];
        }

        $groups = $this->buildCollectiveSemesterSeatGroups(
            $moduleExamens,
            $modules,
            $collectiveFilters,
            $allRepartitions,
            $requestedSalle
        );

        if ($groups->isEmpty()) {
            return ['error' => $requestedSalle
                ? 'Aucune repartition pour cette salle.'
                : 'Aucune repartition pour cet examen.'];
        }

        return [
            'examen' => $examen,
            'modules' => $modules,
            'groups' => $groups,
            'studentsTotal' => $groups->sum('total'),
            'niveauFiliere' => $this->niveauFiliereLabel($examen),
            'sessionName' => $examen->sessionExamen->nom_session ?? 'session',
            'firstExamDate' => $firstExamDate,
            'requestedSalle' => $requestedSalle,
            'referenceExam' => $referenceExam,
            'referenceExamSalles' => $referenceExamSalles,
        ];
    }

    private function fillCollectiveExcelSheet(Worksheet $sheet, array $collectiveData, array $group): void
    {
        $modules = collect($collectiveData['modules'] ?? []);
        $rows = collect($group['rows'] ?? []);
        $normalRows = $rows->reject(fn ($student) => ! empty($student['is_credit']))->values();
        $creditRows = $rows->filter(fn ($student) => ! empty($student['is_credit']))->values();
        $moduleHeaders = $modules->map(fn ($module) => $this->collectiveExcelModuleHeader($module))->all();
        $headers = array_merge(['#', 'CNE', 'Nom', 'Prenom', 'Grille', 'Place'], $moduleHeaders);
        $lastColumn = Coordinate::stringFromColumnIndex(count($headers));
        $salleLabel = $group['salle']?->nom_salle
            ?: $group['salle']?->code_salle
            ?: ('Salle '.((int) ($group['salle_index'] ?? 1)));
        $dateLabel = optional($collectiveData['firstExamDate'])->format('d/m/Y') ?? '-';

        $sheet->setCellValue('A1', 'Presence collective');
        $sheet->mergeCells("A1:{$lastColumn}1");
        $sheet->setCellValue('A2', $collectiveData['sessionName'] ?? 'Session');
        $sheet->mergeCells("A2:{$lastColumn}2");
        $sheet->setCellValue('A3', sprintf(
            'Salle: %s | Date: %s | %s',
            $salleLabel,
            $dateLabel,
            $collectiveData['niveauFiliere'] ?: ($this->examLabel($collectiveData['examen']) ?: 'Session')
        ));
        $sheet->mergeCells("A3:{$lastColumn}3");
        $sheet->setCellValue('A4', sprintf(
            'Modules: %d | Etudiants: %d',
            $modules->count(),
            (int) ($group['total'] ?? $rows->count())
        ));
        $sheet->mergeCells("A4:{$lastColumn}4");

        $headerRow = 6;
        foreach ($headers as $index => $header) {
            $sheet->setCellValue(
                Coordinate::stringFromColumnIndex($index + 1).$headerRow,
                $header
            );
        }

        $sheet->getStyle("A1:{$lastColumn}1")->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle("A2:{$lastColumn}4")->getFont()->setBold(true);
        $sheet->getStyle("A1:{$lastColumn}4")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("A1:{$lastColumn}4")->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getStyle("A{$headerRow}:{$lastColumn}{$headerRow}")->getFont()->setBold(true);
        $sheet->getStyle("A{$headerRow}:{$lastColumn}{$headerRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("A{$headerRow}:{$lastColumn}{$headerRow}")->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFFDD966');

        $currentRow = $headerRow + 1;
        $writeStudent = function (array $student) use (&$currentRow, $sheet, $modules) {
            $baseValues = [
                $student['global_index'] ?? '',
                $student['cne'] ?? '',
                $student['nom'] ?? '',
                $student['prenom'] ?? '',
                $student['code_grille'] ?? '',
                $student['numero_place'] ?? '',
            ];

            foreach ($baseValues as $index => $value) {
                $sheet->setCellValue(
                    Coordinate::stringFromColumnIndex($index + 1).$currentRow,
                    $value
                );
            }

            foreach ($modules as $moduleIndex => $module) {
                $status = $student['modules'][$module['id_examen']] ?? 'none';
                $columnIndex = 7 + $moduleIndex;
                $cellCoordinate = Coordinate::stringFromColumnIndex($columnIndex).$currentRow;
                $sheet->setCellValue($cellCoordinate, $this->collectiveExcelStatusValue($status));
                $sheet->getStyle($cellCoordinate)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                if ($status !== 'pass') {
                    $sheet->getStyle($cellCoordinate)->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setARGB('FFD9D9D9');
                }
            }

            $currentRow++;
        };

        foreach ($normalRows as $student) {
            $writeStudent($student);
        }

        if ($creditRows->isNotEmpty()) {
            $sheet->setCellValue("A{$currentRow}", 'Etudiants en credit');
            $sheet->mergeCells("A{$currentRow}:{$lastColumn}{$currentRow}");
            $sheet->getStyle("A{$currentRow}:{$lastColumn}{$currentRow}")->getFont()->setBold(true);
            $sheet->getStyle("A{$currentRow}:{$lastColumn}{$currentRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("A{$currentRow}:{$lastColumn}{$currentRow}")->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setARGB('FFCFE2F3');
            $currentRow++;

            foreach ($creditRows as $student) {
                $writeStudent($student);
            }
        }

        $dataEndRow = max($currentRow - 1, $headerRow);
        $sheet->setAutoFilter("A{$headerRow}:{$lastColumn}{$dataEndRow}");
        $sheet->freezePane('A7');

        for ($columnIndex = 1; $columnIndex <= count($headers); $columnIndex++) {
            $columnLetter = Coordinate::stringFromColumnIndex($columnIndex);
            $width = match (true) {
                $columnIndex === 1 => 7,
                $columnIndex === 2 => 16,
                $columnIndex === 3, $columnIndex === 4 => 18,
                $columnIndex === 5, $columnIndex === 6 => 14,
                default => 16,
            };
            $sheet->getColumnDimension($columnLetter)->setWidth($width);
        }
    }

    private function assignSemesterPlacements(Collection $placementsByStudent): array
    {
        $assignedPlacements = [];
        $occupiedSeatKeys = [];

        $orderedPlacements = $placementsByStudent
            ->flatMap(fn ($placements) => $placements)
            ->sortBy(fn ($placement) => $this->placementOrderKey($placement))
            ->values();

        foreach ($orderedPlacements as $placement) {
            $studentKey = (string) ($placement['student_key'] ?? '');
            $seatKey = $placement['seat_key'] ?? null;

            if ($studentKey === '' || array_key_exists($studentKey, $assignedPlacements)) {
                continue;
            }

            if ($seatKey && array_key_exists($seatKey, $occupiedSeatKeys)) {
                continue;
            }

            $assignedPlacements[$studentKey] = $placement;

            if ($seatKey) {
                $occupiedSeatKeys[$seatKey] = true;
            }
        }

        foreach ($placementsByStudent as $studentKey => $placements) {
            $studentKey = (string) $studentKey;
            if (array_key_exists($studentKey, $assignedPlacements)) {
                continue;
            }

            $placement = $placements->first(function ($candidate) use ($occupiedSeatKeys) {
                $seatKey = $candidate['seat_key'] ?? null;

                return ! $seatKey || ! array_key_exists($seatKey, $occupiedSeatKeys);
            });

            if (! $placement) {
                $placement = $placements->first();
            }

            if (! $placement) {
                continue;
            }

            $assignedPlacements[$studentKey] = $placement;

            $seatKey = $placement['seat_key'] ?? null;
            if ($seatKey) {
                $occupiedSeatKeys[$seatKey] = true;
            }
        }

        return $assignedPlacements;
    }

    private function studentKeyForRepartition($repartition)
    {
        return $repartition->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant
            ?? $repartition->id_inscription_pedagogique;
    }

    private function placementOrderKey(array $placement): string
    {
        return sprintf(
            '%s|%010d|%05d|%s|%010d',
            $placement['date_key'] ?? '99999999',
            (int) ($placement['rep']->id_examen ?? 0),
            (int) ($placement['salle_index'] ?? 0),
            $placement['seat_sort_key'] ?? $this->seatSortKey(
                $placement['rep']->numero_place ?? null,
                $placement['rep']->code_grille ?? null
            ),
            (int) ($placement['rep']->id_repartition ?? 0)
        );
    }

    private function placementSeatKey(int $salleId, int $salleIndex, $numeroPlace, $codeGrille): string
    {
        $scope = $salleId > 0
            ? 'salle:'.$salleId
            : 'index:'.$salleIndex;
        $seatNumber = $this->placementSeatNumber($numeroPlace, $codeGrille);

        if ($seatNumber !== null) {
            return sprintf('%s|seat:%03d', $scope, $seatNumber);
        }

        $placeValue = strtoupper(trim((string) ($numeroPlace ?? '')));
        if ($placeValue !== '') {
            return $scope.'|place:'.$placeValue;
        }

        return sprintf(
            '%s|grille:%010d',
            $scope,
            (int) ($codeGrille ?? 0)
        );
    }

    private function seatSortKey($numeroPlace, $codeGrille): string
    {
        $seatNumber = $this->placementSeatNumber($numeroPlace, $codeGrille);
        $placeValue = $seatNumber === null
            ? '999999'
            : str_pad((string) $seatNumber, 6, '0', STR_PAD_LEFT);

        return sprintf(
            '%s|%010d',
            $placeValue,
            (int) ($codeGrille ?? 0)
        );
    }

    private function placementSeatNumber($numeroPlace, $codeGrille): ?int
    {
        $normalizedPlace = $this->normalizedSeatNumber($numeroPlace);
        if ($normalizedPlace !== null && $normalizedPlace !== '') {
            return (int) $normalizedPlace;
        }

        $grille = trim((string) ($codeGrille ?? ''));
        if ($grille === '' || ! preg_match('/\d+/', $grille)) {
            return null;
        }

        $grilleValue = str_pad(preg_replace('/\D+/', '', $grille), 7, '0', STR_PAD_LEFT);

        return (int) substr($grilleValue, -3);
    }

    private function requestedRepartitionIds(Request $request): Collection
    {
        return collect($request->input('ids', []))
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values();
    }

    private function selectedStudentKeysForExam(int $examenId, Collection $requestedIds): Collection
    {
        if ($requestedIds->isEmpty()) {
            return collect();
        }

        return RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
            ])
            ->where('id_examen', $examenId)
            ->whereIn('id_repartition', $requestedIds)
            ->get([
                'id_repartition',
                'id_examen',
                'id_inscription_pedagogique',
            ])
            ->map(function ($repartition) {
                return $repartition->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant
                    ?? $repartition->id_inscription_pedagogique;
            })
            ->filter()
            ->map(fn ($key) => (string) $key)
            ->unique()
            ->values();
    }

    private function pdfFilenameForSalle(string $filenameBase, ?Salle $salle, ?int $salleIndex = null): string
    {
        if (! $salle) {
            return sprintf('%s-salle-%s.pdf', $filenameBase, $salleIndex ?: 1);
        }

        $salleSlug = Str::slug($salle->code_salle ?: $salle->nom_salle ?: (string) $salle->id_salle);

        return sprintf('%s-salle-%s.pdf', $filenameBase, $salleSlug ?: $salle->id_salle);
    }

    private function xlsxFilenameForSalle(string $filenameBase, ?Salle $salle, ?int $salleIndex = null): string
    {
        if (! $salle) {
            return sprintf('%s-salle-%s.xlsx', $filenameBase, $salleIndex ?: 1);
        }

        $salleSlug = Str::slug($salle->code_salle ?: $salle->nom_salle ?: (string) $salle->id_salle);

        return sprintf('%s-salle-%s.xlsx', $filenameBase, $salleSlug ?: $salle->id_salle);
    }

    private function resolvePdfFilenameBase(Request $request, string $default): string
    {
        $requested = trim((string) $request->input('filename', ''));

        if ($requested === '') {
            return $default;
        }

        $sanitized = preg_replace('/\.pdf$/i', '', $requested);
        $sanitized = Str::of(Str::ascii($sanitized))
            ->replaceMatches('/[^A-Za-z0-9._-]+/', '-')
            ->replaceMatches('/-+/', '-')
            ->trim('-_.')
            ->value();

        return $sanitized !== '' ? $sanitized : $default;
    }

    private function resolveXlsxFilenameBase(Request $request, string $default): string
    {
        $requested = trim((string) $request->input('filename', ''));

        if ($requested === '') {
            return $default;
        }

        $sanitized = preg_replace('/\.xlsx$/i', '', $requested);
        $sanitized = Str::of(Str::ascii($sanitized))
            ->replaceMatches('/[^A-Za-z0-9._-]+/', '-')
            ->replaceMatches('/-+/', '-')
            ->trim('-_.')
            ->value();

        return $sanitized !== '' ? $sanitized : $default;
    }
}
