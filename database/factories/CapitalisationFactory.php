<?php

namespace Database\Factories;

use App\Models\Capitalisation;
use App\Models\InscriptionPedagogique;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

class CapitalisationFactory extends Factory
{
    protected $model = Capitalisation::class;

    public function definition(): array
    {
        $start = $this->faker->dateTimeBetween('-2 years','now');
        return [
            'id_inscription_pedagogique' => InscriptionPedagogique::factory(),
            'id_module'                  => Module::factory(),
            'date_capitalisation'        => $start->format('Y-m-d'),
            'date_expiration'            => $this->faker->optional(0.3)->dateTimeBetween($start, '+2 years')->format('Y-m-d'),
        ];
    }
}
