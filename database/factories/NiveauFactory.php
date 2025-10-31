<?php

namespace Database\Factories;

use App\Models\Niveau;
use App\Models\Filiere;
use Illuminate\Database\Eloquent\Factories\Factory;

class NiveauFactory extends Factory
{
    protected $model = Niveau::class;

    public function definition(): array
    {
        $sem = $this->faker->numberBetween(1, 6);
        return [
            'code_niveau'    => 'N' . $this->faker->unique()->numerify('###'),
            'nom_niveau'     => $this->faker->randomElement(['L1','L2','L3','M1','M2','D1','D2']) . ' ' . $this->faker->word(),
            'id_filiere'     => Filiere::factory(),
            'semestre'       => $sem,
            'credits_requis' => $this->faker->numberBetween(0, 180),
        ];
    }
}
