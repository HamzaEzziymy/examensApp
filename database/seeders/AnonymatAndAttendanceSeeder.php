<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Examen;
use App\Models\InscriptionPedagogique;
use App\Models\Anonymat;
use App\Models\RepartitionEtudiant;
use App\Models\Absence;
use App\Models\PvExamen;

class AnonymatAndAttendanceSeeder extends Seeder
{
    public function run(): void
    {
        $exams = Examen::orderBy('id_examen')->limit(2)->get(); // minimal footprint

        foreach ($exams as $exam) {
            $registrations = InscriptionPedagogique::where('id_module', $exam->id_module)
                ->orderBy('id_inscription_pedagogique')
                ->limit(5)
                ->get();

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

            foreach ($registrations as $ip) {
                $codeAnonymat = sprintf('ANON-%d-%02d', $exam->id_examen, $seq++);

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
                    'code_grille'               => 1,
                    'code_anonymat'             => $codeAnonymat,
                    'numero_place'              => 'P-' . str_pad((string) $seq, 2, '0', STR_PAD_LEFT),
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
}
