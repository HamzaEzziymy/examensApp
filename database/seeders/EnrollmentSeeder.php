<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Etudiant;
use App\Models\Filiere;
use App\Models\Niveau;
use App\Models\Semestre;
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
            $filieres = Filiere::factory()->count(3)->create(['id_annee' => $activeYear->id_annee]);
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
            // Pick a niveau from the student's filiere
            $niveau = Niveau::where('id_filiere', $etd->id_filiere)->inRandomOrder()->first();
            if (!$niveau) continue;

            $ia = InscriptionAdministrative::factory()->create([
                'id_etudiant' => $etd->id_etudiant,
                'id_annee'    => $activeYear->id_annee,
                'id_niveau'   => $niveau->id_niveau,
                'statut'      => 'Active',
            ]);

            // Get semestres for this niveau, then get modules from those semestres
            $semestreIds = Semestre::where('id_niveau', $niveau->id_niveau)->pluck('id_semestre');
            
            if ($semestreIds->isEmpty()) continue;

            $modules = Module::whereIn('id_semestre', $semestreIds)
                ->inRandomOrder()
                ->take(4)
                ->get();

            foreach ($modules as $m) {
                InscriptionPedagogique::factory()->create([
                    'id_etudiant'          => $etd->id_etudiant,
                    'id_inscription_admin' => $ia->id_inscription_admin,
                    'id_module'            => $m->id_module,
                    'type_inscription'     => fake()->randomElement(['Normal', 'Credit']),
                ]);
            }
        }
    }
}