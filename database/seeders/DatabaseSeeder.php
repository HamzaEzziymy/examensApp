<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CoreAcademicSeeder::class,
            PeopleAndRoomsSeeder::class,
            EnrollmentSeeder::class,
            ExamSeeder::class,
            ExamContentSeeder::class,
            SupervisionSeeder::class,
            AnonymatAndAttendanceSeeder::class,
            GradingSeeder::class,
            ResultsSeeder::class,
            CommissionsSeeder::class,
        ]);
    }
}
