<?php

namespace Database\Factories;

use App\Models\Surveillant;
use Illuminate\Database\Eloquent\Factories\Factory;

class SurveillantFactory extends Factory
{
    protected $model = Surveillant::class;

    public function definition(): array
    {
        $nom = $this->faker->lastName();
        $prenom = $this->faker->firstName();
        return [
            'nom_surveillant'     => $nom,
            'prenom_surveillant'  => $prenom,
            'mail_surveillant'    => strtolower($prenom.'.'.$nom).'@univ.example.ma',
            'telephone_surveillant'=> $this->faker->optional()->phoneNumber(),
            'type_surveillant'    => $this->faker->randomElement(['Administrateur','Docteur']),
            'disponibilites'      => $this->faker->boolean(80),
        ];
    }
}
