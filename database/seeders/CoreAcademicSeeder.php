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
        // Academic years: create 3, last one active
        AnneeUniversitaire::factory()->count(2)->create();
        $active = AnneeUniversitaire::factory()->active()->create(['est_active' => true]);

        // Facultés -> Filières -> Sections
        $facultes = Faculte::factory()->count(2)->create();
        $filieres = collect();
        $sections = collect();

        foreach ($facultes as $faculte) {
            $facFilieres = Filiere::factory()->count(2)->create([
                'id_faculte' => $faculte->id_faculte,
            ]);
            $filieres = $filieres->merge($facFilieres);

            foreach ($facFilieres as $filiere) {
                $sections = $sections->merge(
                    Section::factory()->count(2)->create([
                        'id_filiere' => $filiere->id_filiere,
                    ])
                );
            }
        }

        // Niveaux -> Semestres
        $niveaux = Niveau::factory()->count(6)->create();
        $semestres = collect();
        foreach ($niveaux as $niveau) {
            foreach ([1, 2] as $ordre) {
                $semestres->push(
                    Semestre::create([
                        'code_semestre' => sprintf('%s-S%d', $niveau->code_niveau, $ordre),
                        'nom_semestre'  => sprintf('%s Semestre %d', $niveau->nom_niveau, $ordre),
                        'id_niveau'     => $niveau->id_niveau,
                        'ordre'         => $ordre,
                    ])
                );
            }
        }

        // Modules & éléments
        $modules = Module::factory()->count(15)->create();
        foreach ($modules as $module) {
            ElementModule::factory()->count(fake()->numberBetween(2, 4))->create([
                'id_module' => $module->id_module,
            ]);
        }

        // Enseignants pour coordonner les offres
        $enseignants = Enseignant::factory()->count(10)->create();

        // Offres de formation
        foreach ($sections as $section) {
            $sectionSemestres = $semestres->random( min(2, $semestres->count()) );
            foreach ($sectionSemestres as $semestre) {
                $assignedModules = $modules->random(3);
                foreach ($assignedModules as $module) {
                    OffreFormation::updateOrCreate(
                        [
                            'id_module'   => $module->id_module,
                            'id_semestre' => $semestre->id_semestre,
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
}
