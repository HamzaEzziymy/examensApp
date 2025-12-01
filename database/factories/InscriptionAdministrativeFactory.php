<?php

namespace Database\Factories;

use App\Models\InscriptionAdministrative;
use App\Models\Etudiant;
use App\Models\AnneeUniversitaire;
use App\Models\Filiere;
use App\Models\Niveau;
use App\Models\Section;
use Illuminate\Database\Eloquent\Factories\Factory;

class InscriptionAdministrativeFactory extends Factory
{
    protected $model = InscriptionAdministrative::class;

    public function definition(): array
    {
        $anneeId = AnneeUniversitaire::where('est_active', true)->latest('date_debut')->value('id_annee')
            ?? AnneeUniversitaire::latest('date_debut')->value('id_annee');

        if (! $anneeId) {
            throw new \RuntimeException('Active academic year missing; seed CoreAcademicSeeder first.');
        }

        return [
            'id_etudiant'       => null,
            'id_annee'          => $anneeId,
<<<<<<< HEAD
            'id_niveau'         => null,
            'id_filiere'        => null,
            'id_section'        => null,
=======
            'id_niveau'         => Niveau::factory(),
            'id_section'        => $section->id_section,
>>>>>>> c7bb9f81d263335978bd09bd5b7d8ce074229967
            'date_inscription'  => $this->faker->date(),
            'statut'            => $this->faker->randomElement(['Active', 'Suspendue', 'Archivee']),
            'type_inscription'  => $this->faker->randomElement(['nouveau', 'redoublant', 'transfert']),
        ];
    }

    public function configure()
    {
        return $this->afterMaking(function (InscriptionAdministrative $ia) {
            $etudiant = $ia->id_etudiant ? Etudiant::find($ia->id_etudiant) : null;

            if (! $ia->id_filiere) {
                $ia->id_filiere = $etudiant?->id_filiere ?? Filiere::inRandomOrder()->value('id_filiere');
            }

            if (! $ia->id_section) {
                $ia->id_section = $etudiant?->id_section
                    ?? Section::where('id_filiere', $ia->id_filiere)->inRandomOrder()->value('id_section');
            }

            if (! $ia->id_etudiant) {
                $student = Etudiant::factory()->create([
                    'id_filiere' => $ia->id_filiere,
                    'id_section' => $ia->id_section,
                ]);
                $ia->id_etudiant = $student->id_etudiant;
            }

            if (! $ia->id_niveau) {
                $ia->id_niveau = Niveau::inRandomOrder()->value('id_niveau');
            }

            if (! $ia->id_filiere || ! $ia->id_section || ! $ia->id_niveau) {
                throw new \RuntimeException('Core academic data missing; seed CoreAcademicSeeder first.');
            }
        });
    }
}
