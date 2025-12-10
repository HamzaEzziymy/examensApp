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
use App\Models\OffreFormation;
use App\Models\Section;

class EnrollmentSeeder extends Seeder
{
    public function run(): void
    {
        $activeYear = AnneeUniversitaire::where('est_active', true)->latest('date_debut')->first();
        if (! $activeYear) {
            throw new \RuntimeException('Active academic year missing; run CoreAcademicSeeder first.');
        }

        $filieres = Filiere::with('sections')->take(3)->get();
        if ($filieres->isEmpty()) {
            throw new \RuntimeException('No filieres found; run CoreAcademicSeeder first.');
        }

        $niveaux = Niveau::all();
        if ($niveaux->isEmpty()) {
            throw new \RuntimeException('No niveaux found; run CoreAcademicSeeder first.');
        }

        $students = collect();

        foreach ($filieres as $filiere) {
            $section = $filiere->sections->first();
            if (! $section instanceof Section) {
                continue;
            }

            $count = 60 + fake()->numberBetween(0, 40); // ~60-100 students per filiere
            $students = $students->merge(
                Etudiant::factory()->count($count)->create([
                    'id_section' => $section->id_section,
                ])
            );
        }

        foreach ($students as $etd) {
            $section = $etd->section ?: Section::find($etd->id_section);
            if (! $section) {
                continue;
            }

            $niveau = $niveaux->random();

            $offres = OffreFormation::where('id_section', $section->id_section)
                ->where('id_annee', $activeYear->id_annee)
                ->with('module')
                ->get();

            $ia = InscriptionAdministrative::factory()->create([
                'id_etudiant' => $etd->id_etudiant,
                'id_annee'    => $activeYear->id_annee,
                'id_niveau'   => $niveau->id_niveau,
                'id_section'  => $section->id_section,
                'statut'      => 'Active',
                'type_inscription' => 'nouveau',
            ]);

            $modules = $offres->pluck('module')->filter();
            if ($modules->isEmpty()) {
                $modules = Module::inRandomOrder()->take(3)->get();
            } else {
                $modules = $modules->shuffle()->take(3);
            }

            foreach ($modules as $module) {
                $offre = $offres->firstWhere('id_module', $module->id_module);
                InscriptionPedagogique::factory()->create([
                    'id_inscription_admin' => $ia->id_inscription_admin,
                    'id_offre'             => $offre->id_offre ?? null,
                    'type_inscription'     => fake()->randomElement(['Normal','Credit']),
                ]);
            }
        }
    }
}
