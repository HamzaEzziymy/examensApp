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
        Schema::create('user_filiere_annee', function (Blueprint $table) {
            $table->id();
            // Make FK columns nullable because foreign keys use ON DELETE SET NULL
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->unsignedBigInteger('id_filiere')->nullable()->index();
            $table->unsignedBigInteger('id_annee')->nullable()->index();
            $table->timestamps();

            // Foreign Keys (use nullable columns above to allow ON DELETE SET NULL)
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('id_filiere')->references('id_filiere')->on('filieres')->onDelete('set null');
            $table->foreign('id_annee')->references('id_annee')->on('annees_universitaires')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_filiere_annee');
    }
};
