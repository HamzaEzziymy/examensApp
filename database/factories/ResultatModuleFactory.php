<?php

namespace Database\Factories;

use App\Models\ResultatModule;
use App\Models\InscriptionPedagogique;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

class ResultatModuleFactory extends Factory
{
    protected $model = ResultatModule::class;

    public function definition(): array
    {
        return [
            'id_inscription_pedagogique' => InscriptionPedagogique::factory(),
            'id_module'                  => Module::factory(),
            'moyenne_module'             => $this->faker->optional()->randomFloat(2, 0, 20),
            'statut'                     => $this->faker->randomElement(['En cours','Valide','Non Valide','Rattrapage','Capitalise','En dette']),
            'date_validation'            => $this->faker->optional()->date(),
            'est_anticipe'               => $this->faker->boolean(10),
        ];
    }
}
