<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SessionExamen;
use App\Models\Filiere;
use App\Models\AnneeUniversitaire;
use App\Models\Examen;
use App\Models\Salle;
use App\Models\Module;

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

            // exams for modules of this filiere's niveaux
            $moduleIds = Module::whereIn('id_niveau',
                $f->niveaux()->pluck('id_niveau')
            )->pluck('id_module')->all();

            foreach ($sessions as $sess) {
                foreach (array_slice($moduleIds, 0, min(10, count($moduleIds))) as $modId) {
                    Examen::factory()->create([
                        'id_session_examen' => $sess->id_session_examen,
                        'id_module'         => $modId,
                        'id_salle'          => $salles->random()->id_salle ?? null,
                        'statut'            => fake()->randomElement(['Planifiee','En cours','Terminee']),
                    ]);
                }
            }
        }
    }
}
