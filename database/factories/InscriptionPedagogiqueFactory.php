<?php

namespace Database\Factories;

use App\Models\InscriptionPedagogique;
use App\Models\Etudiant;
use App\Models\InscriptionAdministrative;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

class InscriptionPedagogiqueFactory extends Factory
{
    protected $model = InscriptionPedagogique::class;

    public function definition(): array
    {
        return [
            'id_etudiant'          => Etudiant::factory(),
            'id_inscription_admin' => InscriptionAdministrative::factory(),
            'id_module'            => \App\Models\Module::factory(),
            'type_inscription'     => $this->faker->randomElement(['Normal','Credit','Anticipe']),
            'credits_acquis'       => $this->faker->numberBetween(0, 30),
        ];
    }
}
