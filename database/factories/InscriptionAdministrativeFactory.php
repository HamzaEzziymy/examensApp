<?php

namespace Database\Factories;

use App\Models\InscriptionAdministrative;
use App\Models\Etudiant;
use App\Models\AnneeUniversitaire;
use App\Models\Filiere;
use App\Models\Niveau;
use Illuminate\Database\Eloquent\Factories\Factory;

class InscriptionAdministrativeFactory extends Factory
{
    protected $model = InscriptionAdministrative::class;

    public function definition(): array
    {
        $anneeId = AnneeUniversitaire::where('est_active', true)->latest('date_debut')->value('id_annee')
            ?? AnneeUniversitaire::latest('date_debut')->value('id_annee')
            ?? AnneeUniversitaire::factory()->create()->id_annee;

        return [
            'id_etudiant'       => Etudiant::factory(),
            'id_annee'          => $anneeId,
            'id_niveau'         => Niveau::factory(),
            'id_filiere'        => Filiere::factory(),
            'date_inscription'  => $this->faker->date(),
            'statut'            => $this->faker->randomElement(['Active', 'Suspendue', 'Archivee']),
        ];
    }
}
