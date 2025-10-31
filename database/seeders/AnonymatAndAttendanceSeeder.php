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
        foreach (Examen::all() as $exam) {
            // Registrations for the exam's module
            $registrations = InscriptionPedagogique::where('id_module', $exam->id_module)
                ->inRandomOrder()->take(60)->get();

            $presentCount = 0;
            $absentCount  = 0;

            foreach ($registrations as $ip) {
                $anon = Anonymat::factory()->create([
                    'id_examen'                 => $exam->id_examen,
                    'id_inscription_pedagogique'=> $ip->id_inscription_pedagogique,
                ]);

                // repartition record
                $isPresent = fake()->boolean(90);
                RepartitionEtudiant::factory()->create([
                    'id_examen'                 => $exam->id_examen,
                    'id_inscription_pedagogique'=> $ip->id_inscription_pedagogique,
                    'code_anonymat'             => $anon->code_anonymat,
                    'present'                   => $isPresent,
                ]);

                if ($isPresent) {
                    $presentCount++;
                } else {
                    $absentCount++;
                    Absence::factory()->create([
                        'id_examen'   => $exam->id_examen,
                        'id_anonymat' => $anon->id_anonymat,
                    ]);
                }
            }

            // PV for the exam
            PvExamen::factory()->create([
                'id_examen'       => $exam->id_examen,
                'nombre_presents' => $presentCount,
                'nombre_absents'  => $absentCount,
                'incidents_signales' => fake()->boolean(10),
            ]);
        }
    }
}
