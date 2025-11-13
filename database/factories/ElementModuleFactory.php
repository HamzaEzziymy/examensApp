<?php

namespace Database\Factories;

use App\Models\ElementModule;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

class ElementModuleFactory extends Factory
{
    protected $model = ElementModule::class;

    public function definition(): array
    {
        return [
            'id_module'        => Module::factory(),
            'id_element_parent'=> null,
            'code_element'     => strtoupper($this->faker->unique()->bothify('EL-##')),
            'nom_element'      => ucfirst($this->faker->words(2, true)),
            'type_element'     => $this->faker->randomElement(['COURS','TP','PRE_CLINIQUE','STAGE_ELEMENT','AUTRE']),
            'coefficient'      => $this->faker->randomFloat(2, 0.5, 2.0),
        ];
    }
}
