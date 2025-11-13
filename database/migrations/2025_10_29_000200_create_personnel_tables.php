<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('enseignants', function (Blueprint $table) {
            $table->id('id_enseignant');
            $table->unsignedBigInteger('id_utilisateur')->nullable()->unique()->comment('Lien vers le compte utilisateur');
            $table->string('matricule', 20)->unique();
            $table->string('nom', 50);
            $table->string('prenom', 50);
            $table->string('email', 100)->unique();
            $table->string('grade', 50)->nullable();
            $table->string('departement', 100)->nullable()->comment('Specialite ou departement');
            $table->string('chemin_signature_scan', 255)->nullable()->comment('Chemin vers la signature numerisee');
            $table->foreign('id_utilisateur')->references('id')->on('users')->onDelete('set null');
            $table->comment('Profil des enseignants (correcteur, surveillant)');
             $table->timestamps();
        });

        if (Schema::hasTable('offre_formation')) {
            Schema::table('offre_formation', function (Blueprint $table) {
                $table->foreign('id_coordinateur')->references('id_enseignant')->on('enseignants')->onDelete('set null');
            });
        }
    }

    public function down(): void {
        if (Schema::hasTable('offre_formation')) {
            Schema::table('offre_formation', function (Blueprint $table) {
                $table->dropForeign(['id_coordinateur']);
            });
        }

        Schema::dropIfExists('enseignants');
    }
};
