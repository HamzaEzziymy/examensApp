<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // SQLite doesn't support MODIFY COLUMN, so we need to check the driver
        $driver = Schema::getConnection()->getDriverName();
        
        if ($driver === 'sqlite') {
            // For SQLite, we need to recreate the table or just skip since SQLite doesn't enforce enum
            // In testing, SQLite stores enum as TEXT, so no modification needed
            return;
        }
        
        // For MySQL/MariaDB
        DB::statement("ALTER TABLE inscriptions_pedagogiques MODIFY COLUMN type_inscription ENUM('Normal', 'Credit', 'Anticipe', 'Capitalisation') NOT NULL DEFAULT 'Normal'");
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        
        if ($driver === 'sqlite') {
            return;
        }
        
        // Revert to original enum values
        DB::statement("ALTER TABLE inscriptions_pedagogiques MODIFY COLUMN type_inscription ENUM('Normal', 'Credit', 'Anticipe') NOT NULL DEFAULT 'Normal'");
    }
};
