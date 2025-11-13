<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('facultes', function (Blueprint $table) {
            $table->id('id_faculte');
            $table->string('nom_faculte', 100)->unique();
            $table->string('entete', 255)->nullable()->comment("Chemin vers l''entete de la faculte");
            $table->string('logo', 255)->nullable()->comment('Chemin vers le logo de la faculte');
            $table->string('adress', 255)->nullable();
            $table->string('phone', 255)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('web', 255)->nullable();
            $table->string('fax', 255)->nullable();
            $table->comment('Table centrale des facultes');
            $table->timestamps();
        });

        Schema::create('niveaux', function (Blueprint $table) {
            $table->id('id_niveau');
            $table->string('code_niveau', 20)->unique();
            $table->string('nom_niveau', 100)->comment('Generique: 1ere Annee, 2eme Annee...');
            $table->integer('ordre');
            $table->comment('Catalogue generique des niveaux');
            $table->timestamps();
        });

        Schema::create('annees_universitaires', function (Blueprint $table) {
            $table->id('id_annee');
            $table->string('annee_univ', 9)->unique()->comment('Format 2025/2026');
            $table->date('date_debut');
            $table->date('date_fin');
            $table->boolean('est_active')->default(false);
            $table->timestamps();
        });

        Schema::create('modules', function (Blueprint $table) {
            $table->id('id_module');
            $table->string('code_module', 20)->unique()->comment('Code metier unique, ex: ANAT-101');
            $table->string('nom_module', 255)->comment('Nom officiel du module');
            $table->enum('type_module', ['CONNAISSANCE', 'HORIZONTAL', 'STAGE', 'THESE'])->default('CONNAISSANCE');
            $table->decimal('credits', 4, 1)->default(0);
            $table->comment('Catalogue central des modules');
            $table->timestamps();
        });

        Schema::create('filieres', function (Blueprint $table) {
            $table->id('id_filiere');
            $table->unsignedBigInteger('id_faculte');
            $table->string('nom_filiere', 100)->unique()->comment('Ex: Medecine, Pharmacie');
            $table->foreign('id_faculte')->references('id_faculte')->on('facultes')->onDelete('restrict');
            $table->comment('Definit le diplome principal');
            $table->timestamps();
        });

        Schema::create('semestres', function (Blueprint $table) {
            $table->id('id_semestre');
            $table->unsignedBigInteger('id_niveau')->comment('Lien vers le niveau generique');
            $table->string('code_semestre', 20)->unique();
            $table->string('nom_semestre', 100)->comment('Generique: Semestre 1, Semestre 2...');
            $table->integer('ordre');
            $table->foreign('id_niveau')->references('id_niveau')->on('niveaux')->onDelete('cascade');
            $table->unique(['id_niveau', 'ordre']);
            $table->comment('Catalogue generique des semestres');
            $table->timestamps();
        });

        Schema::create('elements_module', function (Blueprint $table) {
            $table->id('id_element');
            $table->unsignedBigInteger('id_module')->comment('Module du catalogue central');
            $table->unsignedBigInteger('id_element_parent')->nullable()->comment('Lien optionnel vers un element parent');
            $table->string('code_element', 20);
            $table->string('nom_element', 255);
            $table->enum('type_element', ['COURS', 'TP', 'PRE_CLINIQUE', 'STAGE_ELEMENT', 'AUTRE'])->default('COURS');
            $table->decimal('coefficient', 4, 2)->default(1.00);
            $table->unique(['id_module', 'code_element']);
            $table->foreign('id_module')->references('id_module')->on('modules')->onDelete('cascade');
            $table->comment('Elements (cours, TP, stage) composant un module');
            $table->timestamps();
        });

        Schema::create('sections', function (Blueprint $table) {
            $table->id('id_section');
            $table->unsignedBigInteger('id_filiere');
            $table->string('nom_section', 100)->comment('Ex: Section Francaise, Section Anglaise');
            $table->enum('langue', ['FR', 'EN', 'AR']);
            $table->unique(['id_filiere', 'nom_section']);
            $table->foreign('id_filiere')->references('id_filiere')->on('filieres')->onDelete('cascade');
            $table->timestamps();
        });

        Schema::create('offre_formation', function (Blueprint $table) {
            $table->id('id_offre');
            $table->unsignedBigInteger('id_module')->comment('Module du catalogue');
            $table->unsignedBigInteger('id_semestre')->comment('Semestre generique');
            $table->unsignedBigInteger('id_section')->comment('Section cible');
            $table->unsignedBigInteger('id_annee')->comment('Annee universitaire');
            $table->unsignedBigInteger('id_coordinateur')->nullable()->comment('Responsable (enseignant)');
            $table->string('nom_affiche', 255)->nullable()->comment('Nom affiche optionnel');
            $table->unique(['id_module', 'id_semestre', 'id_section', 'id_annee'], 'offre_formation_unique_index');
            $table->foreign('id_module')->references('id_module')->on('modules')->onDelete('cascade');
            $table->foreign('id_semestre')->references('id_semestre')->on('semestres')->onDelete('cascade');
            $table->foreign('id_section')->references('id_section')->on('sections')->onDelete('cascade');
            $table->foreign('id_annee')->references('id_annee')->on('annees_universitaires')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offre_formation');
        Schema::dropIfExists('sections');
        Schema::dropIfExists('elements_module');
        Schema::dropIfExists('semestres');
        Schema::dropIfExists('filieres');
        Schema::dropIfExists('modules');
        Schema::dropIfExists('annees_universitaires');
        Schema::dropIfExists('niveaux');
        Schema::dropIfExists('facultes');
    }
};
