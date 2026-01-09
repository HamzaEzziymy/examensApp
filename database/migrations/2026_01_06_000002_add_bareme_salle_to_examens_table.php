<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('examens', function (Blueprint $table) {
            $table->unsignedInteger('bareme_salle')->nullable()->after('effectif_prevu');
        });
    }

    public function down(): void
    {
        Schema::table('examens', function (Blueprint $table) {
            $table->dropColumn('bareme_salle');
        });
    }
};
