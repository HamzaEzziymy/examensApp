<?php

namespace Database\Factories;

use App\Models\Module;
use App\Models\Niveau;
use App\Models\Semestre;
use Illuminate\Database\Eloquent\Factories\Factory;

class ModuleFactory extends Factory
{
    protected $model = Module::class;

    public function definition(): array
    {
        return [
            'code_module'        => strtoupper($this->faker->unique()->bothify('MOD-###')),
            'nom_module'         => ucfirst($this->faker->unique()->words(3, true)),
            'abreviation_module' => strtoupper($this->faker->lexify('????')),
            'nature'             => $this->faker->randomElement(['Fondamental','Transversal','Pratique']),
            'id_semestre'        => Semestre::factory(),
            'quadrimestre'       => $this->faker->numberBetween(1, 8),
            'seuil_validation'   => 10.00,
            'coefficient_module' => $this->faker->randomFloat(2, 1, 5),
            'credits_requis'     => $this->faker->numberBetween(0, 30),
            'description'        => $this->faker->optional()->paragraph(),
        ];
    }
}
