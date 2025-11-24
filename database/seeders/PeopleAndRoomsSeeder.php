<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Enseignant;
use App\Models\Surveillant;
use App\Models\Salle;

class PeopleAndRoomsSeeder extends Seeder
{
    public function run(): void
    {
        Enseignant::factory()->count(5)->create();
        Surveillant::factory()->count(3)->create();
        Salle::factory()->count(3)->create();
    }
}
