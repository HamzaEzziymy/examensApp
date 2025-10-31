<?php

namespace Database\Factories;

use App\Models\Enseignant;
use Illuminate\Database\Eloquent\Factories\Factory;

class EnseignantFactory extends Factory
{
    protected $model = Enseignant::class;

    public function definition(): array
    {
        $nom = $this->faker->lastName();
        $prenom = $this->faker->firstName();
        return [
            'id_user'         => null, // link to users table if needed manually
            'code'            => strtoupper($this->faker->unique()->bothify('ENS-####')),
            'nom'             => $nom,
            'prenom'          => $prenom,
            'mail_academique' => strtolower($prenom.'.'.$nom).'@univ.example.ma',
            'telephone'       => $this->faker->optional()->phoneNumber(),
        ];
    }
}
