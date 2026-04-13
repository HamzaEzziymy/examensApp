<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Examen;
use App\Models\InscriptionPedagogique;
use App\Models\Anonymat;
use App\Models\RepartitionEtudiant;
use App\Models\Absence;
use App\Models\PvExamen;
use App\Models\AnneeUniversitaire;

class AnonymatAndAttendanceSeeder extends Seeder
{
    public function run(): void
    {
        $exams = Examen::orderBy('id_examen')->get();
        $activeYearId = AnneeUniversitaire::where('est_active', true)->latest('date_debut')->value('id_annee');

        foreach ($exams as $exam) {
            $exam->load([
                'sessionExamen:id_session_examen,id_filiere,type_session,nom_session',
                'sessionExamen.filiere:id_filiere,nom_filiere',
                'offreFormation.semestre.niveau',
                'offreFormation.section:id_section,id_filiere',
                'offreFormation.section.filiere:id_filiere,nom_filiere',
                'salle:id_salle,code_salle,capacite_examens,capacite',
                'salles:id_salle,code_salle,capacite_examens,capacite',
            ]);

            $registrations = InscriptionPedagogique::query()
                ->whereHas('offreFormation', function ($query) use ($exam) {
                    if ($exam->id_offre) {
                        $query->where('id_offre', $exam->id_offre);
                        return;
                    }

                    $query->where('id_module', $exam->id_module);
                })
                ->when($activeYearId, function ($query) use ($activeYearId) {
                    $query->whereHas('inscriptionAdministrative', function ($adminQuery) use ($activeYearId) {
                        $adminQuery->where('id_annee', $activeYearId);
                    });
                })
                ->orderBy('id_inscription_pedagogique')
                ->get(['id_inscription_pedagogique']);

            if ($registrations->isEmpty()) {
                continue;
            }

            $presentCount = 0;
            $absentCount  = 0;
            $seq          = 1;
            $now          = now();
            $anonRows         = [];
            $repartitionRows  = [];
            $pendingAbsences  = [];
            $filiereCode = $this->filiereCode($exam);
            $niveauCode  = $this->niveauCode($exam);
            $sessionCode = $this->sessionCode($exam);
            $rooms = $exam->salles->isNotEmpty()
                ? $exam->salles
                : collect([$exam->salle]->filter());

            $rooms = $rooms->values();
            if ($rooms->count() > 1) {
                $ordered = collect();
                $remainingSeats = $registrations->count();
                foreach ($rooms as $room) {
                    $ordered->push($room);
                    $cap = $room->capacite_examens ?? $room->capacite ?? 0;
                    $remainingSeats -= $cap;
                    if ($remainingSeats <= 0) {
                        break;
                    }
                }
                $rooms = $ordered;
            }

            if ($rooms->first()) {
                $firstCap = $rooms->first()->capacite_examens ?? $rooms->first()->capacite ?? 0;
                if ($firstCap >= $registrations->count()) {
                    $rooms = collect([$rooms->first()]);
                }
            }

            $registrations = $registrations->values();
            $remaining = $registrations->count();
            $roomCount = $rooms->count() ?: 1;
            $offset = 0;

            foreach ($rooms as $index => $salle) {
                $capacity = $salle->capacite_examens ?? $salle->capacite ?? $remaining;
                $roomsLeft = $roomCount - $index;
                $balancedTake = (int) ceil($remaining / max(1, $roomsLeft));
                $take = min($capacity > 0 ? $capacity : $remaining, $balancedTake, $remaining);

                $slice = $registrations->slice($offset, $take);
                $offset += $slice->count();
                $remaining -= $slice->count();

                $seat = 1;
                $seatPrefix = substr($salle->code_salle ?? 'S', 0, 4);
                $salleCode = $index + 1;

                foreach ($slice as $ip) {
                    $codeAnonymat = (string) $seq;
                    $grilleCode  = (int) sprintf('%d%d%d%d%03d', $filiereCode, $niveauCode, $sessionCode, $salleCode, $seat);

                    $anonRows[] = [
                        'id_examen'                  => $exam->id_examen,
                        'id_inscription_pedagogique' => $ip->id_inscription_pedagogique,
                        'code_anonymat'              => $codeAnonymat,
                        'created_at'                 => $now,
                        'updated_at'                 => $now,
                    ];

                    $isPresent = fake()->boolean(85);
                    $repartitionRows[] = [
                        'id_examen'                  => $exam->id_examen,
                        'id_inscription_pedagogique' => $ip->id_inscription_pedagogique,
                        'code_grille'               => $grilleCode,
                        'code_anonymat'             => $codeAnonymat,
                        'numero_place'              => sprintf('%s-%03d', $seatPrefix, $seat),
                        'present'                   => $isPresent,
                        'created_at'                => $now,
                        'updated_at'                => $now,
                    ];

                    if ($isPresent) {
                        $presentCount++;
                    } else {
                        $absentCount++;
                        $pendingAbsences[] = $codeAnonymat;
                    }

                    $seq++;
                    $seat++;
                }
            }

            if ($anonRows) {
                Anonymat::insert($anonRows);
            }
            if ($repartitionRows) {
                RepartitionEtudiant::insert($repartitionRows);
            }
            if ($pendingAbsences) {
                $anonymatMap = Anonymat::where('id_examen', $exam->id_examen)
                    ->whereIn('code_anonymat', $pendingAbsences)
                    ->pluck('id_anonymat', 'code_anonymat');

                $absenceRows = [];
                foreach ($pendingAbsences as $code) {
                    $absenceRows[] = [
                        'id_examen'    => $exam->id_examen,
                        'id_anonymat'  => $anonymatMap[$code] ?? null,
                        'date_absence' => $now->toDateString(),
                        'motif'        => null,
                        'justificatif' => null,
                        'statut'       => 'Non justifiee',
                        'created_at'   => $now,
                        'updated_at'   => $now,
                    ];
                }

                Absence::insert($absenceRows);
            }

            PvExamen::updateOrCreate(
                ['id_examen' => $exam->id_examen],
                [
                    'nombre_presents'    => $presentCount,
                    'nombre_absents'     => $absentCount,
                    'incidents_signales' => false,
                ]
            );
        }
    }

    private function filiereCode(Examen $examen): int
    {
        $filiere = $examen->sessionExamen->filiere ?? $examen->offreFormation?->section?->filiere;
        $name = strtolower($filiere->nom_filiere ?? '');

        $byName = match (true) {
            str_contains($name, 'med')  => 1,
            str_contains($name, 'phar') => 2,
            str_contains($name, 'dent') => 3,
            default                     => null,
        };

        if ($byName !== null) {
            return $byName;
        }

        return match ($filiere->id_filiere ?? null) {
            1 => 1,
            2 => 2,
            3 => 3,
            default => 0,
        };
    }

    private function niveauCode(Examen $examen): int
    {
        $offre = $examen->offreFormation;
        $niveau = $offre?->semestre?->niveau;

        if (! $niveau) {
            return 0;
        }

        if (is_numeric($niveau->ordre)) {
            $ord = (int) $niveau->ordre;
            return ($ord >= 1 && $ord <= 5) ? $ord : 0;
        }

        return 0;
    }

    private function sessionCode(Examen $examen): int
    {
        $session = $examen->sessionExamen;
        $value = strtolower($session->type_session ?? $session->nom_session ?? '');

        if (str_contains($value, 'ratt')) {
            return 2;
        }

        return 1;
    }
}
