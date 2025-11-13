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
        // -------------------------------------------
        // 1. Tables indépendantes (ou presque)
        // -------------------------------------------

        Schema::create('facultes', function (Blueprint $table) {
            $table->id('id_faculte');
            $table->string('nom_faculte', 100)->unique();
            $table->string('entete', 255)->nullable()->comment('Chemin vers le entete de la faculté');
            $table->string('logo', 255)->nullable()->comment('Chemin vers le logo de la faculté');
            $table->comment('Table centrale des facultés (ex: FMPR)');
            $table->string('adress',255)->nullable()->comment('');
            $table->string('phone',255)->nullable()->comment('');
            $table->string('email',255)->nullable()->comment('');
            $table->string('web',255)->nullable()->comment('');
            $table->string('fax',255)->nullable()->comment('');
        });

        Schema::create('niveaux', function (Blueprint $table) {
            $table->id('id_niveau');
            $table->string('code_niveau', 20)->unique();
            $table->string('nom_niveau', 100)->comment('Générique: 1ère Année, 2ème Année...');
            $table->integer('ordre');
            $table->comment('Catalogue générique des niveaux (ne se duplique pas)');
        });

        Schema::create('annees_universitaires', function (Blueprint $table) {
            $table->id('id_annee');
            $table->string('annee_univ', 9)->unique()->comment('Format "2025/2026"');
            $table->date('date_debut');
            $table->date('date_fin');
            $table->boolean('est_active')->default(false);
        });

        Schema::create('modules', function (Blueprint $table) {
            $table->id('id_module');
            $table->string('code_module', 20)->unique()->comment('Code "métier" unique, ex: ANAT-101');
            $table->string('nom_module', 255)->comment('Nom officiel, ex: Anatomie 1');
            $table->enum('type_module', ['CONNAISSANCE', 'HORIZONTAL', 'STAGE', 'THESE'])->default('CONNAISSANCE');
            $table->decimal('credits', 4, 1)->default(0);
            $table->comment('CATALOGUE central de tous les modules (communs ou non)');
        });

        // NOTE : On suppose que la table 'utilisateurs' avec une clé 'id_utilisateur'
        // existe DÉJÀ avant cette migration (ou 'users' avec 'id' si vous adaptez).
        Schema::create('enseignants', function (Blueprint $table) {
            $table->id('id_enseignant');
            $table->unsignedBigInteger('id_utilisateur')->nullable()->unique()->comment('Lien vers le compte de connexion');
            $table->string('matricule', 20)->unique();
            $table->string('nom', 50);
            $table->string('prenom', 50);
            $table->string('email', 100)->unique();
            $table->string('grade', 50)->nullable();
            $table->string('departement', 100)->nullable()->comment('Spécialité/Département pour les règles de conflit');
            $table->string('chemin_signature_scan', 255)->nullable()->comment('Chemin vers l_image de la signature');
            
            // Assurez-vous que la table 'utilisateurs' et la clé 'id_utilisateur' existent
            // Si votre table s'appelle 'users' et la clé 'id', changez 'utilisateurs' en 'users' et 'id_utilisateur' en 'id'.
            // $table->foreign('id_utilisateur')->references('id')->on('users')->onDelete('set null');
            $table->foreign('id_utilisateur')->references('id_utilisateur')->on('utilisateurs')->onDelete('set null');
            
            $table->comment('Profil de l_enseignant (correcteur, surveillant)');
        });

        // -------------------------------------------
        // 2. Tables dépendantes (Niveau 1)
        // -------------------------------------------

        Schema::create('filieres', function (Blueprint $table) {
            $table->id('id_filiere');
            $table->unsignedBigInteger('id_faculte');
            $table->string('nom_filiere', 100)->unique()->comment('Ex: Médecine, Pharmacie');
            
            $table->foreign('id_faculte')->references('id_faculte')->on('facultes')->onDelete('restrict');
            $table->comment('Définit le diplôme principal (ex: Médecine)');
        });

        Schema::create('semestres', function (Blueprint $table) {
            $table->id('id_semestre');
            $table->unsignedBigInteger('id_niveau')->comment('Lien vers le niveau générique');
            $table->string('code_semestre', 20)->unique();
            $table->string('nom_semestre', 100)->comment('Générique: Semestre 1, Semestre 2...');
            $table->integer('ordre');
            
            $table->foreign('id_niveau')->references('id_niveau')->on('niveaux')->onDelete('cascade');
            $table->unique(['id_niveau', 'ordre']);
            $table->comment('Catalogue générique des semestres (ne se duplique pas)');
        });

        Schema::create('elements_module', function (Blueprint $table) {
            $table->id('id_element');
            $table->unsignedBigInteger('id_module')->comment('Lié au module du catalogue central');
            $table->unsignedBigInteger('id_element_parent')->nullable()->comment('Auto-référence pour les sous-unités (Cours -> TP)');
            $table->string('code_element', 20);
            $table->string('nom_element', 255);
            $table->enum('type_element', ['COURS', 'TP', 'PRE_CLINIQUE', 'STAGE_ELEMENT', 'AUTRE'])->default('COURS');
            $table->decimal('coefficient', 4, 2)->default(1.0);
            
            $table->unique(['id_module', 'code_element']);
            $table->foreign('id_module')->references('id_module')->on('modules')->onDelete('cascade');
            
            $table->comment('Éléments (cours, TP, stage) composant un module');
        });

        // -------------------------------------------
        // 3. Tables dépendantes (Niveau 2)
        // -------------------------------------------

        Schema::create('sections', function (Blueprint $table) {
            $table->id('id_section');
            $table->unsignedBigInteger('id_filiere');
            $table->string('nom_section', 100)->comment('Ex: Section Française, Section Anglaise');
            $table->enum('langue', ['FR', 'EN', 'AR']);
            
            $table->unique(['id_filiere', 'nom_section']);
            $table->foreign('id_filiere')->references('id_filiere')->on('filieres')->onDelete('cascade');
            $table->comment('Définit les voies (FR, EN...) d_une filière');
        });

        // -------------------------------------------
        // 4. Table "Pivot" / "Association" (Niveau 3)
        // -------------------------------------------

        Schema::create('offre_formation', function (Blueprint $table) {
            $table->id('id_offre');
            $table->unsignedBigInteger('id_module')->comment('QUOI: Le module du catalogue');
            $table->unsignedBigInteger('id_semestre')->comment('OÙ: Le semestre générique (S1, S2...)');
            $table->unsignedBigInteger('id_section')->comment('POUR QUI: La section (FR, EN...)');
            $table->unsignedBigInteger('id_annee')->comment('QUAND: L_année universitaire');
            $table->unsignedBigInteger('id_coordinateur')->nullable()->comment('PAR QUI: Le responsable (FK vers Enseignants)');
            $table->string('nom_affiche', 255)->nullable()->comment('Ex: "Anatomy 1" (si différent)');
            
            $table->unique(['id_module', 'id_semestre', 'id_section', 'id_annee'], 'offre_formation_unique_index');
            
            $table->foreign('id_module')->references('id_module')->on('modules')->onDelete('cascade');
            $table->foreign('id_semestre')->references('id_semestre')->on('semestres')->onDelete('cascade');
            $table->foreign('id_section')->references('id_section')->on('sections')->onDelete('cascade');
            $table->foreign('id_annee')->references('id_annee')->on('annees_universitaires')->onDelete('cascade');
            $table->foreign('id_coordinateur')->references('id_enseignant')->on('enseignants')->onDelete('set null');
            
            $table->comment('Instance annuelle d_un module pour une section/semestre');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // On supprime dans l'ordre inverse de la création pour respecter les clés étrangères
        Schema::dropIfExists('offre_formation');
        Schema::dropIfExists('sections');
        Schema::dropIfExists('elements_module');
        Schema::dropIfExists('semestres');
        Schema::dropIfExists('filieres');
        Schema::dropIfExists('enseignants');
        Schema::dropIfExists('modules');
        Schema::dropIfExists('annees_universitaires');
        Schema::dropIfExists('niveaux');
        Schema::dropIfExists('facultes');
    }
};