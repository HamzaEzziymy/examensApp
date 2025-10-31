<?php

namespace Database\Factories;

use App\Models\MembreCommission;
use App\Models\Commission;
use App\Models\Enseignant;
use Illuminate\Database\Eloquent\Factories\Factory;

class MembreCommissionFactory extends Factory
{
    protected $model = MembreCommission::class;

    public function definition(): array
    {
        return [
            'id_commission' => Commission::factory(),
            'id_enseignant' => Enseignant::factory(),
            'role'          => $this->faker->randomElement(['Président','Rapporteur','Membre']),
        ];
    }
}
