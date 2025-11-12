<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AnneeUniversitaire;
use App\Models\Filiere;
use App\Models\Niveau;
use App\Models\Semestre;
use App\Models\Module;
use App\Models\ElementModule;

class CoreAcademicSeeder extends Seeder
{
    public function run(): void
    {
        // Academic years: create 3, last one active
        $years = AnneeUniversitaire::factory()->count(2)->create();
        $active = AnneeUniversitaire::factory()->active()->create(['est_active' => true]);

        // Filieres (4) attached to active year
        $filieres = Filiere::factory()->count(4)->create([
            'id_annee' => $active->id_annee
        ]);

        // For each filiere: niveaux (3-5), each niveau has 2 semestres and 5-7 modules, each module has 2-3 elements
        foreach ($filieres as $filiere) {
            $niveaux = Niveau::factory()->count(fake()->numberBetween(3,5))->create([
                'id_filiere' => $filiere->id_filiere
            ]);

            foreach ($niveaux as $niv) {
                $semestres = Semestre::factory()->count(2)->create([
                    'id_niveau' => $niv->id_niveau
                ]);

                // pick a semestre id for modules
                $semIds = $semestres->pluck('id_semestre')->all();

                $modules = Module::factory()->count(fake()->numberBetween(5,7))->create([
                    'id_semestre' => fake()->randomElement($semIds),
                ]);

                foreach ($modules as $mod) {
                    ElementModule::factory()->count(fake()->numberBetween(2,3))->create([
                        'id_module' => $mod->id_module
                    ]);
                }
            }
        }
    }
}
