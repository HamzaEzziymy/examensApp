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
        $activeYear = AnneeUniversitaire::where('est_active', true)->latest('date_debut')->first();

        if (! $activeYear) {
            $activeData = AnneeUniversitaire::factory()->active()->make(['est_active' => true])->toArray();
            $activeYear = AnneeUniversitaire::updateOrCreate(
                ['annee_univ' => $activeData['annee_univ']],
                $activeData + ['est_active' => true]
            );
        }

        // Create a larger student cohort across filieres
        $filieres = Filiere::all();
        if ($filieres->isEmpty()) {
            $filieres = Filiere::factory()->count(3)->create();
        }

        $niveaux = Niveau::all();
        if ($niveaux->isEmpty()) {
            $niveaux = Niveau::factory()->count(2)->create();
        }

        $students = collect();
        foreach ($filieres as $f) {
            $sections = $f->sections ?? collect();
            if ($sections->isEmpty()) {
                $sections = \App\Models\Section::factory()->count(1)->create(['id_filiere' => $f->id_filiere]);
            }
            $section = $sections->first();

            $count = 40 + fake()->numberBetween(0, 40); // 40-80 students per filiere
            $students = $students->merge(
                Etudiant::factory()->count($count)->create([
                    'id_filiere' => $f->id_filiere,
                    'id_section' => $section->id_section,
                ])
            );
        }

        // Create administrative and pedagogical registrations
        foreach ($students as $etd) {
            // pick any niveau from the catalogue
            $niveau = $niveaux->random();

            // ensure a section for the student's filiere
            $sections = $f->sections ?? collect();
            if ($sections->isEmpty()) {
                $sections = \App\Models\Section::factory()->count(1)->create(['id_filiere' => $f->id_filiere]);
            }
            $section = $sections->first();

            // offres for this section and active year
            $offres = \App\Models\OffreFormation::where('id_section', $section->id_section)
                ->when($activeYear, fn ($q) => $q->where('id_annee', $activeYear->id_annee))
                ->get();

            $ia = InscriptionAdministrative::factory()->create([
                'id_etudiant' => $etd->id_etudiant,
                'id_annee'    => $activeYear->id_annee,
                'id_niveau'   => $niveau->id_niveau,
                'id_filiere'  => $etd->id_filiere,
                'id_section'  => $etd->id_section,
                'statut'      => 'Active',
                'type_inscription' => 'nouveau',
            ]);

            // pick some modules from the filiere's catalogue (fallback to global)
            $modules = $offres->pluck('module')->filter();
            if ($modules->isEmpty()) {
                $modules = Module::inRandomOrder()->take(4)->get();
            } else {
                $modules = $modules->take(4);
            }

            foreach ($modules as $m) {
                $offre = $offres->firstWhere('id_module', $m->id_module);
                InscriptionPedagogique::factory()->create([
                    'id_etudiant'          => $etd->id_etudiant,
                    'id_inscription_admin' => $ia->id_inscription_admin,
                    'id_module'            => $m->id_module,
                    'id_offre'             => $offre->id_offre ?? null,
                    'type_inscription'     => fake()->randomElement(['Normal','Credit']),
                ]);
            }
        }
    }
}
