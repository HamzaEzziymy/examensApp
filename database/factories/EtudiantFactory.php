<?php

namespace Database\Factories;

use App\Models\Etudiant;
use App\Models\Section;
use Illuminate\Database\Eloquent\Factories\Factory;

class EtudiantFactory extends Factory
{
    protected $model = Etudiant::class;

    public function definition(): array
    {
        $nom = $this->faker->lastName();
        $prenom = $this->faker->firstName();
        return [
            'cne'             => strtoupper($this->faker->unique()->bothify('CNE########')),
            'nom'             => $nom,
            'prenom'          => $prenom,
            'mail_academique' => strtolower($prenom.'.'.$nom).'@etu.univ.example.ma',
            'mail_personnel'  => $this->faker->optional()->safeEmail(),
            'date_naissance'  => $this->faker->dateTimeBetween('-28 years','-18 years')->format('Y-m-d'),
            'telephone'       => $this->faker->optional()->phoneNumber(),
            'url_photo'       => $this->faker->optional()->imageUrl(300, 300, 'people', true),
            'id_section'      => Section::factory()->create()->id_section,
        ];
    }
}
