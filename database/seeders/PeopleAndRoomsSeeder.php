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
        Enseignant::factory()->count(25)->create();
        Surveillant::factory()->count(20)->create();
        Salle::factory()->count(12)->create();
    }
}
