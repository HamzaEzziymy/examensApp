<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('examens', function (Blueprint $table) {
            $table->unsignedBigInteger('id_element')->nullable()->after('id_module');
            $table->foreign('id_element')->references('id_element')->on('elements_module')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('examens', function (Blueprint $table) {
            $table->dropForeign(['id_element']);
            $table->dropColumn('id_element');
        });
    }
};
