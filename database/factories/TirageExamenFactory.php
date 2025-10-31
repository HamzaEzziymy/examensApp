<?php

namespace Database\Factories;

use App\Models\TirageExamen;
use App\Models\SujetExamen;
use Illuminate\Database\Eloquent\Factories\Factory;

class TirageExamenFactory extends Factory
{
    protected $model = TirageExamen::class;

    public function definition(): array
    {
        return [
            'id_sujet'               => SujetExamen::factory(),
            'id_fonctionnaire'       => $this->faker->numberBetween(1, 99999), // adjust if Fonctionnaires table exists
            'date_tirage'            => $this->faker->dateTimeBetween('-2 weeks','+1 week'),
            'nombre_copies'          => $this->faker->numberBetween(10, 500),
            'details_conditionnement'=> $this->faker->optional()->sentence(),
        ];
    }
}
