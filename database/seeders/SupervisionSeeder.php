<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Examen;
use App\Models\Surveillant;
use App\Models\Surveillance;

class SupervisionSeeder extends Seeder
{
    public function run(): void
    {
        $surveillants = Surveillant::all();
        foreach (Examen::all() as $exam) {
            // 1 principal + 1 assistant
            Surveillance::factory()->create([
                'id_examen'     => $exam->id_examen,
                'id_surveillant'=> $surveillants->random()->id_surveillant ?? null,
                'role'          => 'Principal',
            ]);

            Surveillance::factory()->create([
                'id_examen'     => $exam->id_examen,
                'id_surveillant'=> $surveillants->random()->id_surveillant ?? null,
                'role'          => 'Assistant',
            ]);
        }
    }
}
