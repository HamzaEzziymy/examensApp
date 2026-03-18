<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropForeign(['id_correcteur']);
            $table->dropColumn('id_correcteur');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->unsignedBigInteger('id_correcteur')->nullable()->after('id_anonymat');
            $table->foreign('id_correcteur')->references('id_correcteur')->on('correcteurs')->onDelete('set null');
        });
    }
};