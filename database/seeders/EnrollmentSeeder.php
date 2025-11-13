<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Etudiant;
use App\Models\Filiere;
use App\Models\Niveau;
use App\Models\AnneeUniversitaire;
use App\Models\InscriptionAdministrative;
use App\Models\InscriptionPedagogique;
use App\Models\Module;

class EnrollmentSeeder extends Seeder
{
    public function run(): void
    {
        $activeYear = AnneeUniversitaire::where('est_active', true)->latest('date_debut')->first()
            ?? AnneeUniversitaire::factory()->active()->create();

        // Create 200 students distributed across existing filieres
        $filieres = Filiere::all();
        if ($filieres->isEmpty()) {
            $filieres = Filiere::factory()->count(3)->create();
        }

        $niveaux = Niveau::all();
        if ($niveaux->isEmpty()) {
            $niveaux = Niveau::factory()->count(4)->create();
        }

        $students = collect();
        foreach ($filieres as $f) {
            $count = 50 + fake()->numberBetween(0, 30);
            $students = $students->merge(
                Etudiant::factory()->count($count)->create(['id_filiere' => $f->id_filiere])
            );
        }

        // Create administrative and pedagogical registrations
        foreach ($students as $etd) {
            // pick any niveau from the catalogue
            $niveau = $niveaux->random();

            $ia = InscriptionAdministrative::factory()->create([
                'id_etudiant' => $etd->id_etudiant,
                'id_annee'    => $activeYear->id_annee,
                'id_niveau'   => $niveau->id_niveau,
                'statut'      => 'Active',
            ]);

            // pick some modules from the global catalogue
            $modules = Module::inRandomOrder()->take(4)->get();
            foreach ($modules as $m) {
                InscriptionPedagogique::factory()->create([
                    'id_etudiant'          => $etd->id_etudiant,
                    'id_inscription_admin' => $ia->id_inscription_admin,
                    'id_module'            => $m->id_module,
                    'type_inscription'     => fake()->randomElement(['Normal','Credit']),
                ]);
            }
        }
    }
}
