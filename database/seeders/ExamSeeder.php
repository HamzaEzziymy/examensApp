<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SessionExamen;
use App\Models\Filiere;
use App\Models\AnneeUniversitaire;
use App\Models\Examen;
use App\Models\Salle;
use App\Models\Module;
use App\Models\OffreFormation;

class ExamSeeder extends Seeder
{
    public function run(): void
    {
        $activeYear = AnneeUniversitaire::where('est_active', true)->latest('date_debut')->first();

        $filieres = Filiere::all();
        $salles   = Salle::all();

        foreach ($filieres as $f) {
            // create 2 sessions per filiere in the active year
            $sessions = SessionExamen::factory()->count(2)->create([
                'id_filiere' => $f->id_filiere,
                'id_annee'   => $activeYear?->id_annee,
            ]);

            // Determine modules linked to this filiere through sections/offres
            $sectionIds = $f->sections()->pluck('id_section');
            $moduleIds = OffreFormation::whereIn('id_section', $sectionIds)
                ->pluck('id_module')
                ->unique()
                ->filter()
                ->values()
                ->all();

            if (empty($moduleIds)) {
                // fallback to a small random pool so the seeder still produces data
                $moduleIds = Module::inRandomOrder()->limit(5)->pluck('id_module')->all();
            }

            foreach ($sessions as $sess) {
                $modulesForSession = array_slice($moduleIds, 0, min(10, count($moduleIds)));

                foreach ($modulesForSession as $modId) {
                    $salleId = $salles->isNotEmpty()
                        ? optional($salles->random())->id_salle
                        : null;

                    Examen::factory()->create([
                        'id_session_examen' => $sess->id_session_examen,
                        'id_module'         => $modId,
                        'id_salle'          => $salleId,
                        'statut'            => fake()->randomElement(['Planifiee', 'En cours', 'Terminee']),
                    ]);
                }
            }
        }
    }
}
