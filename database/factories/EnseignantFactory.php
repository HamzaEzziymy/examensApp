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
            'id_utilisateur'      => null, // link to users table if needed manually
            'matricule'           => strtoupper($this->faker->unique()->bothify('ENS-####')),
            'nom'                 => $nom,
            'prenom'              => $prenom,
            'email'               => strtolower($prenom.'.'.$nom).'@univ.example.ma',
            'grade'               => $this->faker->optional()->randomElement(['Assistant','Professeur','Maître de conf.']),
            'departement'         => $this->faker->optional()->word(),
            'chemin_signature_scan' => $this->faker->optional()->imageUrl(),
        ];
    }
}
