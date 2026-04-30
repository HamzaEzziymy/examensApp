<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('examens', function (Blueprint $table) {
            $table->string('student_order', 20)->default('alphabetic')->after('anonymat_end');
        });
    }

    public function down(): void
    {
        Schema::table('examens', function (Blueprint $table) {
            $table->dropColumn('student_order');
        });
    }
};
