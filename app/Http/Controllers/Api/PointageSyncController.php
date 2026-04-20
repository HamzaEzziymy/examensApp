<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Examen;
use App\Models\RepartitionEtudiant;
use App\Services\PointagePayloadBuilder;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PointageSyncController extends Controller
{
    public function __construct(private PointagePayloadBuilder $payloadBuilder)
    {
    }

    public function show(Request $request, Examen $examen): JsonResponse
    {
        return response()->json([
            'data' => $this->payloadBuilder->build(
                $examen,
                $this->payloadBuilder->parseIncludes($request->query('include'))
            ),
        ]);
    }

    public function update(Request $request, Examen $examen): JsonResponse
    {
        $validated = $request->validate([
            'repartitions' => ['required', 'array', 'min:1'],
            'repartitions.*.id_repartition' => ['required', 'integer'],
            'repartitions.*.present' => ['sometimes', 'boolean'],
            'repartitions.*.date_debut' => ['nullable', 'date'],
            'repartitions.*.date_fin' => ['nullable', 'date'],
            'repartitions.*.observation' => ['nullable', 'string'],
        ]);

        $rows = collect($validated['repartitions'])->values();

        $this->validateDateOrder($rows->all());

        $ids = $rows
            ->pluck('id_repartition')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $repartitions = RepartitionEtudiant::query()
            ->where('id_examen', $examen->id_examen)
            ->whereIn('id_repartition', $ids)
            ->get()
            ->keyBy('id_repartition');

        $missingIds = $ids->diff($repartitions->keys()->map(fn ($id) => (int) $id))->values();
        if ($missingIds->isNotEmpty()) {
            throw ValidationException::withMessages([
                'repartitions' => 'Unknown repartitions for this exam: '.$missingIds->implode(', '),
            ]);
        }

        DB::transaction(function () use ($rows, $repartitions) {
            $rows->each(function (array $row) use ($repartitions) {
                /** @var RepartitionEtudiant $repartition */
                $repartition = $repartitions->get((int) $row['id_repartition']);
                $attributes = [];

                if (array_key_exists('present', $row)) {
                    $attributes['present'] = (bool) $row['present'];
                }

                if (array_key_exists('date_debut', $row)) {
                    $attributes['heure_arrivee'] = $this->timeFromDate($row['date_debut']);
                }

                if (array_key_exists('date_fin', $row)) {
                    $attributes['heure_sortie'] = $this->timeFromDate($row['date_fin']);
                }

                if (array_key_exists('observation', $row)) {
                    $attributes['observation'] = $row['observation'];
                }

                if ($attributes !== []) {
                    $repartition->update($attributes);
                }
            });
        });

        $this->payloadBuilder->loadPointageRelations($examen, withRepartitions: false);

        $updated = RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,cne,nom,prenom',
            ])
            ->whereIn('id_repartition', $ids)
            ->orderBy('code_grille')
            ->orderBy('numero_place')
            ->get()
            ->map(fn (RepartitionEtudiant $repartition) => $this->payloadBuilder->formatRepartition($examen, $repartition));

        return response()->json([
            'message' => 'Pointage data synced.',
            'data' => [
                'exam' => $this->payloadBuilder->formatExam($examen),
                'repartitions' => $updated,
            ],
        ]);
    }

    private function validateDateOrder(array $rows): void
    {
        $errors = [];

        foreach ($rows as $index => $row) {
            if (empty($row['date_debut']) || empty($row['date_fin'])) {
                continue;
            }

            if (Carbon::parse($row['date_fin'])->lt(Carbon::parse($row['date_debut']))) {
                $errors["repartitions.$index.date_fin"] = 'The date_fin must be after or equal to date_debut.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function timeFromDate(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return Carbon::parse($value)->format('H:i:s');
    }
}
