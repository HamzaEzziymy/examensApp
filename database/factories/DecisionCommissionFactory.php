<?php

namespace Database\Factories;

use App\Models\DecisionCommission;
use App\Models\Commission;
use Illuminate\Database\Eloquent\Factories\Factory;

class DecisionCommissionFactory extends Factory
{
    protected $model = DecisionCommission::class;

    public function definition(): array
    {
        return [
            'id_commission' => Commission::factory(),
            'id_cas'        => $this->faker->optional()->numberBetween(1, 10000),
            'date_decision' => $this->faker->date(),
            'decision'      => $this->faker->optional()->sentence(),
            'sanction'      => $this->faker->optional()->sentence(),
        ];
    }
}
