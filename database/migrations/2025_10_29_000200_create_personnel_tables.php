<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('enseignants', function (Blueprint $table) {
            $table->increments('id_enseignant');
            // Match Laravel users.id (bigint) to avoid FK type mismatch
            $table->unsignedBigInteger('id_user')->nullable(); // FK to existing users table
            $table->string('code', 20)->unique();
            $table->string('nom', 50);
            $table->string('prenom', 50);
            $table->string('mail_academique', 100)->unique();
            $table->string('telephone', 20)->nullable();
            $table->unsignedInteger('id_module')->nullable();

            $table->foreign('id_module')->references('id_module')->on('modules');
            // assume your user table is "users" with pk "id"
            $table->foreign('id_user')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void {
        Schema::dropIfExists('enseignants');
    }
};
