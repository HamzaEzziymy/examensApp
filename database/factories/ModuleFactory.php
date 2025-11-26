<?php

namespace Database\Factories;

use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

class ModuleFactory extends Factory
{
    protected $model = Module::class;

    public function definition(): array
    {
        return [
            'code_module'  => strtoupper($this->faker->unique()->bothify('MOD-#####')),
            'nom_module'   => strtoupper($this->faker->unique()->lexify('MODULE-?????')),
            'type_module'  => $this->faker->randomElement(['CONNAISSANCE', 'HORIZONTAL', 'STAGE', 'THESE']),
            'credits'      => $this->faker->randomFloat(1, 1, 20),
        ];
    }
}
