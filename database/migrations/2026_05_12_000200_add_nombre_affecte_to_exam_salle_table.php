<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('exam_salle', function (Blueprint $table) {
            $table->unsignedInteger('nombre_affecte')->nullable()->after('ordre');
        });
    }

    public function down(): void
    {
        Schema::table('exam_salle', function (Blueprint $table) {
            $table->dropColumn('nombre_affecte');
        });
    }
};
