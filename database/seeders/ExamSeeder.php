<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SessionExamen;
use App\Models\Filiere;
use App\Models\AnneeUniversitaire;
use App\Models\Examen;
use App\Models\Salle;
use App\Models\Module;
use App\Models\Semestre;

class ExamSeeder extends Seeder
{
    public function run(): void
    {
        $activeYear = AnneeUniversitaire::where('est_active', true)->latest('date_debut')->first();

        if (!$activeYear) {
            $this->command->warn('No active academic year found. Skipping exam seeding.');
            return;
        }

        $filieres = Filiere::all();
        $salles   = Salle::all();

        if ($salles->isEmpty()) {
            $this->command->warn('No salles found. Exams will be created without rooms.');
        }

        foreach ($filieres as $f) {
            // Create 2 sessions per filiere in the active year
            $sessions = SessionExamen::factory()->count(2)->create([
                'id_filiere' => $f->id_filiere,
                'id_annee'   => $activeYear->id_annee,
            ]);

            // Get modules for this filiere through: filiere → niveaux → semestres → modules
            $niveauIds = $f->niveaux()->pluck('id_niveau');
            
            if ($niveauIds->isEmpty()) {
                $this->command->warn("No niveaux found for filiere {$f->nom_filiere}");
                continue;
            }

            $semestreIds = Semestre::whereIn('id_niveau', $niveauIds)->pluck('id_semestre');
            
            if ($semestreIds->isEmpty()) {
                $this->command->warn("No semestres found for filiere {$f->nom_filiere}");
                continue;
            }

            $moduleIds = Module::whereIn('id_semestre', $semestreIds)
                ->pluck('id_module')
                ->all();

            if (empty($moduleIds)) {
                $this->command->warn("No modules found for filiere {$f->nom_filiere}");
                continue;
            }

            foreach ($sessions as $sess) {
                $selectedModules = array_slice($moduleIds, 0, min(10, count($moduleIds)));
                
                foreach ($selectedModules as $modId) {
                    Examen::factory()->create([
                        'id_session_examen' => $sess->id_session_examen,
                        'id_module'         => $modId,
                        'id_salle'          => $salles->isNotEmpty() ? $salles->random()->id_salle : null,
                        'statut'            => fake()->randomElement(['Planifiee', 'En cours', 'Terminee']),
                    ]);
                }
            }
        }
    }
}