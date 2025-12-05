<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AnneeUniversitaire;
use App\Models\ElementModule;
use App\Models\Enseignant;
use App\Models\Faculte;
use App\Models\Filiere;
use App\Models\Module;
use App\Models\Niveau;
use App\Models\OffreFormation;
use App\Models\Section;
use App\Models\Semestre;

class CoreAcademicSeeder extends Seeder
{
    public function run(): void
    {
        // Minimal: single active academic year
        $activeData = AnneeUniversitaire::factory()->active()->make(['est_active' => true])->toArray();
        $active = AnneeUniversitaire::updateOrCreate(
            ['annee_univ' => $activeData['annee_univ']],
            $activeData + ['est_active' => true]
        );

        // Facultes -> 3 Filieres -> Sections
        $faculte = Faculte::factory()->create();
        $filieres = Filiere::factory()->count(3)->create(['id_faculte' => $faculte->id_faculte]);
        $sections = $filieres->map(function ($filiere) {
            return Section::factory()->create(['id_filiere' => $filiere->id_filiere]);
        });

        // Two niveaux -> one semestre each
        $niveaux = Niveau::factory()->count(2)->create();
        $semestres = collect();
        foreach ($niveaux as $niveau) {
            $semestres->push(
                Semestre::create([
                    'code_semestre' => sprintf('%s-S1', $niveau->code_niveau),
                    'nom_semestre'  => sprintf('%s Semestre 1', $niveau->nom_niveau),
                    'id_niveau'     => $niveau->id_niveau,
                    'ordre'         => 1,
                ])
            );
        }

        // Enseignants pour coordonner les offres
        $enseignants = Enseignant::factory()->count(3)->create();

        // Modules & elements
        $semestreIds = $semestres->pluck('id_semestre');
        foreach ($sections as $section) {
            // Give each section its own set of modules to avoid all filieres sharing the same trio
            $modules = Module::factory()->count(4)->create();

            foreach ($modules as $index => $module) {
                ElementModule::factory()->count(1)->create([
                    'id_module' => $module->id_module,
                ]);

                // Spread modules across available semestres for a bit of variety
                $semestreId = $semestreIds[$index % $semestreIds->count()] ?? $semestreIds->first();

                OffreFormation::updateOrCreate(
                    [
                        'id_module'   => $module->id_module,
                        'id_semestre' => $semestreId,
                        'id_section'  => $section->id_section,
                        'id_annee'    => $active->id_annee,
                    ],
                    [
                        'id_coordinateur' => optional($enseignants->random())->id_enseignant,
                        'nom_affiche'     => $module->nom_module,
                    ]
                );
            }
        }
    }
}
