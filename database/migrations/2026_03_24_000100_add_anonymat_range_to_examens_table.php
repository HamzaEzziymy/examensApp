<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('examens', function (Blueprint $table) {
            $table->unsignedInteger('anonymat_start')->nullable()->after('id_salle');
            $table->unsignedInteger('anonymat_end')->nullable()->after('anonymat_start');
        });
    }

    public function down(): void
    {
        Schema::table('examens', function (Blueprint $table) {
            $table->dropColumn(['anonymat_start', 'anonymat_end']);
        });
    }
};
