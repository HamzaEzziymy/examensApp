<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('correcteurs', function (Blueprint $table) {
            $table->id('id_correcteur');
            $table->unsignedBigInteger('id_examen')->nullable();
            $table->unsignedBigInteger('id_enseignant')->nullable();
            $table->integer('nombre_copies')->default(0);
            $table->date('date_attribution')->nullable();
            $table->date('date_limite_correction')->nullable();
            $table->enum('statut', ['Attribue', 'En cours', 'Termine']);
            $table->foreign('id_examen')->references('id_examen')->on('examens')->onDelete('set null');
            $table->foreign('id_enseignant')->references('id_enseignant')->on('enseignants')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('notes', function (Blueprint $table) {
            $table->id('id_note');
            $table->unsignedBigInteger('id_anonymat')->nullable();
            $table->unsignedBigInteger('id_correcteur')->nullable();
            $table->decimal('note', 5, 2);
            $table->dateTime('date_saisie')->useCurrent();
            $table->text('commentaire')->nullable();
            $table->foreign('id_anonymat')->references('id_anonymat')->on('anonymat')->onDelete('set null');
            $table->foreign('id_correcteur')->references('id_correcteur')->on('correcteurs')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('resultats_elements', function (Blueprint $table) {
            $table->id('id_resultat_element');
            $table->unsignedBigInteger('id_inscription_pedagogique')->nullable();
            $table->unsignedBigInteger('id_element')->nullable();
            $table->unsignedBigInteger('id_session_examen')->nullable();
            $table->decimal('moyenne_element', 5, 2)->nullable();
            $table->enum('statut', ['En cours', 'Valide', 'Non Valide', 'Rattrapage']);
            $table->date('date_validation')->nullable();
            $table->foreign('id_inscription_pedagogique')->references('id_inscription_pedagogique')->on('inscriptions_pedagogiques')->onDelete('set null');
            $table->foreign('id_element')->references('id_element')->on('elements_module')->onDelete('set null');
            $table->foreign('id_session_examen')->references('id_session_examen')->on('sessions_examen')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('resultats_modules', function (Blueprint $table) {
            $table->id('id_resultat_module');
            $table->unsignedBigInteger('id_inscription_pedagogique')->nullable();
            $table->unsignedBigInteger('id_module')->nullable();
            $table->decimal('moyenne_module', 5, 2)->nullable();
            $table->enum('statut', ['En cours', 'Valide', 'Non Valide', 'Rattrapage', 'Capitalise', 'En dette']);
            $table->date('date_validation')->nullable();
            $table->boolean('est_anticipe')->default(false);
            $table->foreign('id_inscription_pedagogique')->references('id_inscription_pedagogique')->on('inscriptions_pedagogiques')->onDelete('set null');
            $table->foreign('id_module')->references('id_module')->on('modules')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('resultats_modules');
        Schema::dropIfExists('resultats_elements');
        Schema::dropIfExists('notes');
        Schema::dropIfExists('correcteurs');
    }
};
