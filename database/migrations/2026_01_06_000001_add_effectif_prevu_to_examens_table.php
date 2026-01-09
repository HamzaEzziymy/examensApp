<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('examens', function (Blueprint $table) {
            $table->unsignedInteger('effectif_prevu')->nullable()->after('statut');
        });
    }

    public function down(): void
    {
        Schema::table('examens', function (Blueprint $table) {
            $table->dropColumn('effectif_prevu');
        });
    }
};
