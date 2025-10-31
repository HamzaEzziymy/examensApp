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
            'id_module'          => Module::factory(),
            'type_element'       => $this->faker->randomElement(['TP','TD','COURS','STAGE']),
            'nom_element'        => ucfirst($this->faker->words(2, true)),
            'coefficient_element'=> $this->faker->randomFloat(2, 0.5, 2.0),
            'seuil_validation'   => 10.00,
            'est_obligatoire'    => $this->faker->boolean(80),
        ];
    }
}
