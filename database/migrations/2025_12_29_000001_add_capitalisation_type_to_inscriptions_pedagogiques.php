<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Modify the enum to include 'Capitalisation'
        DB::statement("ALTER TABLE inscriptions_pedagogiques MODIFY COLUMN type_inscription ENUM('Normal', 'Credit', 'Anticipe', 'Capitalisation') NOT NULL DEFAULT 'Normal'");
    }

    public function down(): void
    {
        // Revert to original enum values
        DB::statement("ALTER TABLE inscriptions_pedagogiques MODIFY COLUMN type_inscription ENUM('Normal', 'Credit', 'Anticipe') NOT NULL DEFAULT 'Normal'");
    }
};
