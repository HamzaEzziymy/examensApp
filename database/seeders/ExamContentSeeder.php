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
            // Minimal: single sujet per exam
            $sujets = SujetExamen::factory()->count(1)->create([
                'id_examen' => $exam->id_examen,
                'id_auteur' => $enseignants->random()->id_enseignant ?? null,
            ]);

            foreach ($sujets as $sujet) {
                // Optionally attach a correction grid
                if (fake()->boolean(50)) {
                    GrilleCorrection::factory()->create([
                        'id_sujet'  => $sujet->id_sujet,
                        'id_auteur' => $enseignants->random()->id_enseignant ?? null,
                    ]);
                }

                // Optionally add a tirage
                if (fake()->boolean(40)) {
                    TirageExamen::factory()->create([
                        'id_sujet'         => $sujet->id_sujet,
                        'nombre_copies'    => fake()->numberBetween(10, 30),
                    ]);
                }
            }
        }
    }
}
