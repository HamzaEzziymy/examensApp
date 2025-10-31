<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Examen;
use App\Models\Enseignant;
use App\Models\SujetExamen;
use App\Models\GrilleCorrection;
use App\Models\TirageExamen;

class ExamContentSeeder extends Seeder
{
    public function run(): void
    {
        $enseignants = Enseignant::all();
        foreach (Examen::all() as $exam) {
            // 1-2 sujets per exam
            $sujets = SujetExamen::factory()->count(fake()->numberBetween(1,2))->create([
                'id_examen' => $exam->id_examen,
                'id_auteur' => $enseignants->random()->id_enseignant ?? null,
            ]);

            foreach ($sujets as $sujet) {
                // 70% have a correction grid
                if (fake()->boolean(70)) {
                    GrilleCorrection::factory()->create([
                        'id_sujet'  => $sujet->id_sujet,
                        'id_auteur' => $enseignants->random()->id_enseignant ?? null,
                    ]);
                }

                // 60% have a tirage
                if (fake()->boolean(60)) {
                    TirageExamen::factory()->create([
                        'id_sujet'         => $sujet->id_sujet,
                        'nombre_copies'    => fake()->numberBetween(20, 200),
                    ]);
                }
            }
        }
    }
}
