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
            // Assign 2 correcteurs per exam
            $correcteurs = Correcteur::factory()->count(2)->create([
                'id_examen'     => $exam->id_examen,
                'id_enseignant' => $enseignants->random()->id_enseignant ?? null,
                'statut'        => 'En cours',
            ]);

            // Create notes for anonymats split across correcteurs
            $anonymats = Anonymat::where('id_examen', $exam->id_examen)->get();
            foreach ($anonymats as $i => $anon) {
                $corr = $correcteurs[$i % $correcteurs->count()];
                Note::factory()->create([
                    'id_anonymat'   => $anon->id_anonymat,
                    'id_correcteur' => $corr->id_correcteur,
                    'note'          => fake()->randomFloat(2, 0, 20),
                ]);
            }
        }
    }
}
