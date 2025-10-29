<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('correcteurs', function (Blueprint $table) {
            $table->increments('id_correcteur');
            $table->unsignedInteger('id_examen')->nullable();
            $table->unsignedInteger('id_enseignant')->nullable();
            $table->integer('nombre_copies')->default(0);
            $table->date('date_attribution')->nullable();
            $table->date('date_limite_correction')->nullable();
            $table->enum('statut', ['Attribué', 'En cours', 'Terminé']);
            $table->foreign('id_examen')->references('id_examen')->on('examens');
            $table->foreign('id_enseignant')->references('id_enseignant')->on('enseignants');
        });

        Schema::create('notes', function (Blueprint $table) {
            $table->increments('id_note');
            $table->unsignedInteger('id_anonymat')->nullable();
            $table->unsignedInteger('id_correcteur')->nullable();
            $table->decimal('note', 5, 2);
            $table->dateTime('date_saisie')->useCurrent();
            $table->text('commentaire')->nullable();
            $table->foreign('id_anonymat')->references('id_anonymat')->on('anonymat');
            $table->foreign('id_correcteur')->references('id_correcteur')->on('correcteurs');
        });

        Schema::create('resultats_elements', function (Blueprint $table) {
            $table->increments('id_resultat_element');
            $table->unsignedInteger('id_inscription_pedagogique')->nullable();
            $table->unsignedInteger('id_element')->nullable();
            $table->unsignedInteger('id_session_examen')->nullable();
            $table->decimal('moyenne_element', 5, 2)->nullable();
            $table->enum('statut', ['En cours', 'Validé', 'Non Validé', 'Rattrapage']);
            $table->date('date_validation')->nullable();
            $table->foreign('id_inscription_pedagogique')->references('id_inscription_pedagogique')->on('inscriptions_pedagogiques');
            $table->foreign('id_element')->references('id_element')->on('elements_module');
            $table->foreign('id_session_examen')->references('id_session_examen')->on('sessions_examen');
        });

        Schema::create('resultats_modules', function (Blueprint $table) {
            $table->increments('id_resultat_module');
            $table->unsignedInteger('id_inscription_pedagogique')->nullable();
            $table->unsignedInteger('id_module')->nullable();
            $table->decimal('moyenne_module', 5, 2)->nullable();
            $table->enum('statut', ['En cours', 'Validé', 'Non Validé', 'Rattrapage', 'Capitalisé', 'En dette']);
            $table->date('date_validation')->nullable();
            $table->boolean('est_anticipe')->default(false);
            $table->foreign('id_inscription_pedagogique')->references('id_inscription_pedagogique')->on('inscriptions_pedagogiques');
            $table->foreign('id_module')->references('id_module')->on('modules');
        });
    }

    public function down(): void {
        Schema::dropIfExists('resultats_modules');
        Schema::dropIfExists('resultats_elements');
        Schema::dropIfExists('notes');
        Schema::dropIfExists('correcteurs');
    }
};
