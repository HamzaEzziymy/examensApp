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

        // Facultés -> Filières -> Sections
        $faculte = Faculte::factory()->create();
        $filiere = Filiere::factory()->create(['id_faculte' => $faculte->id_faculte]);
        $section = Section::factory()->create(['id_filiere' => $filiere->id_filiere]);

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

        // Modules & éléments
        $modules = Module::factory()->count(3)->create();
        foreach ($modules as $module) {
            ElementModule::factory()->count(1)->create([
                'id_module' => $module->id_module,
            ]);
        }

        // Enseignants pour coordonner les offres
        $enseignants = Enseignant::factory()->count(3)->create();

        // Offres de formation: one per module on first semestre/section
        $semestre = $semestres->first();
        foreach ($modules as $module) {
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
