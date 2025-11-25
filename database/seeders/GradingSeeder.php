<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Examen;
use App\Models\Correcteur;
use App\Models\Note;
use App\Models\Enseignant;
use App\Models\Anonymat;

class GradingSeeder extends Seeder
{
    public function run(): void
    {
        $enseignants = Enseignant::all();

        foreach (Examen::all() as $exam) {
            // Assign a single correcteur per exam
            $correcteur = Correcteur::factory()->create([
                'id_examen'     => $exam->id_examen,
                'id_enseignant' => $enseignants->random()->id_enseignant ?? null,
                'statut'        => 'En cours',
            ]);

            // Create notes for a minimal set of anonymats
            $anonymats = Anonymat::where('id_examen', $exam->id_examen)
                ->orderBy('id_anonymat')
                ->limit(10)
                ->get();

            foreach ($anonymats as $anon) {
                Note::factory()->create([
                    'id_anonymat'   => $anon->id_anonymat,
                    'id_correcteur' => $correcteur->id_correcteur,
                    'note'          => fake()->randomFloat(2, 0, 20),
                ]);
            }
        }
    }
}
