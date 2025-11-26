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
        $admin = InscriptionAdministrative::factory()->create();
        $offre = OffreFormation::inRandomOrder()->first();

        return [
            'id_inscription_admin' => $admin->id_inscription_admin,
            'id_etudiant'          => $admin->id_etudiant,
            'id_module'            => $offre->id_module ?? Module::factory(),
            'id_offre'             => $offre->id_offre ?? null,
            'type_inscription'     => $this->faker->randomElement(['Normal', 'Credit', 'Anticipe']),
            'credits_acquis'       => $this->faker->numberBetween(0, 30),
        ];
    }
}
