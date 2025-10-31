<?php

namespace Database\Factories;

use App\Models\Commission;
use Illuminate\Database\Eloquent\Factories\Factory;

class CommissionFactory extends Factory
{
    protected $model = Commission::class;

    public function definition(): array
    {
        return [
            'type_commission' => $this->faker->randomElement(['Disciplinaire','Recours']),
            'nom_commission'  => $this->faker->optional()->sentence(3),
            'description'     => $this->faker->optional()->paragraph(),
        ];
    }
}
