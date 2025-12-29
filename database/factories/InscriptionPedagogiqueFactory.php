<?php

namespace Database\Factories;

use App\Models\InscriptionPedagogique;
use App\Models\InscriptionAdministrative;
use App\Models\OffreFormation;
use Illuminate\Database\Eloquent\Factories\Factory;

class InscriptionPedagogiqueFactory extends Factory
{
    protected $model = InscriptionPedagogique::class;

    public function definition(): array
    {
        $admin = InscriptionAdministrative::factory()->create();
        $offre = OffreFormation::inRandomOrder()->first() ?? OffreFormation::factory()->create();

        return [
            'id_inscription_admin' => $admin->id_inscription_admin,
            'id_offre'             => $offre->id_offre,
            'type_inscription'     => $this->faker->randomElement(['Normal', 'Credit', 'Anticipe', 'Capitalisation']),
            'credits_acquis'       => $this->faker->numberBetween(0, 30),
        ];
    }
}
