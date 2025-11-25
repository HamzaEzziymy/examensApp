<?php

namespace Database\Factories;

use App\Models\InscriptionPedagogique;
use App\Models\Etudiant;
use App\Models\InscriptionAdministrative;
use App\Models\Module;
use App\Models\OffreFormation;
use Illuminate\Database\Eloquent\Factories\Factory;

class InscriptionPedagogiqueFactory extends Factory
{
    protected $model = InscriptionPedagogique::class;

    public function definition(): array
    {
        return [
            'id_inscription_admin' => InscriptionAdministrative::factory(),
            'id_etudiant'          => Etudiant::factory(),
            'id_module'            => Module::factory(),
            // Prefer existing offre_formation to avoid hitting the unique index; fall back to null
            'id_offre'             => OffreFormation::inRandomOrder()->value('id_offre'),
            'type_inscription'     => $this->faker->randomElement(['Normal', 'Credit', 'Anticipe']),
            'credits_acquis'       => $this->faker->numberBetween(0, 30),
        ];
    }
}
