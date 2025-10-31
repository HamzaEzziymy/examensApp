<?php

namespace Database\Factories;

use App\Models\IncidentExamen;
use App\Models\Anonymat;
use App\Models\Surveillance;
use Illuminate\Database\Eloquent\Factories\Factory;

class IncidentExamenFactory extends Factory
{
    protected $model = IncidentExamen::class;

    public function definition(): array
    {
        return [
            'id_anonymat'     => Anonymat::factory(),
            'id_surveillance' => Surveillance::factory(),
            'type_incident'   => $this->faker->randomElement(['Fraude','Retard','Bruit','Téléphone']),
            'description'     => $this->faker->optional()->sentence(),
            'heure_incident'  => $this->faker->time('H:i:s'),
            'mesures_prises'  => $this->faker->optional()->sentence(),
        ];
    }
}
