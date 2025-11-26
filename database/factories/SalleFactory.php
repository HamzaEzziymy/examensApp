<?php

namespace Database\Factories;

use App\Models\Salle;
use Illuminate\Database\Eloquent\Factories\Factory;

class SalleFactory extends Factory
{
    protected $model = Salle::class;

    public function definition(): array
    {
        return [
            'code_salle'        => strtoupper($this->faker->unique()->bothify('S-#####')),
            'nom_salle'         => 'Salle ' . $this->faker->bothify('??-##'),
            'capacite'          => $this->faker->numberBetween(20, 300),
            'capacite_examens'  => $this->faker->numberBetween(15, 250),
            'batiment'          => $this->faker->optional()->randomElement(['A','B','C','D']),
            'est_disponible'    => $this->faker->boolean(85),
            'specificites'      => $this->faker->optional()->sentence(),
        ];
    }
}
