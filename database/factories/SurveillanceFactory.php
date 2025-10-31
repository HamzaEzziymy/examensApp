<?php

namespace Database\Factories;

use App\Models\Surveillance;
use App\Models\Examen;
use App\Models\Surveillant;
use Illuminate\Database\Eloquent\Factories\Factory;

class SurveillanceFactory extends Factory
{
    protected $model = Surveillance::class;

    public function definition(): array
    {
        $start = $this->faker->time('H:i:s');
        $end   = date('H:i:s', strtotime($start) + $this->faker->numberBetween(60, 180)*60);

        return [
            'id_examen'     => Examen::factory(),
            'id_surveillant'=> Surveillant::factory(),
            'role'          => $this->faker->randomElement(['Principal','Assistant']),
            'heure_debut'   => $start,
            'heure_fin'     => $end,
            'observations'  => $this->faker->optional()->sentence(),
        ];
    }
}
