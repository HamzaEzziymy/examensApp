<?php

namespace Database\Factories;

use App\Models\Faculte;
use Illuminate\Database\Eloquent\Factories\Factory;

class FaculteFactory extends Factory
{
    protected $model = Faculte::class;

    public function definition(): array
    {
        return [
            'nom_faculte' => $this->faker->unique()->words(2, true),
            'entete'      => $this->faker->optional()->imageUrl(),
            'logo'        => $this->faker->optional()->imageUrl(),
            'adress'      => $this->faker->address(),
            'phone'       => $this->faker->optional()->phoneNumber(),
            'email'       => $this->faker->optional()->companyEmail(),
            'web'         => $this->faker->optional()->url(),
            'fax'         => $this->faker->optional()->phoneNumber(),
        ];
    }
}

