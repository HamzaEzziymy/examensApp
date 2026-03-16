<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('capitalisations')) {
            return;
        }

        $legacyColumns = [];
        if (Schema::hasColumn('capitalisations', 'id_inscription_pedagogique')) {
            $legacyColumns[] = 'id_inscription_pedagogique';
        }
        if (Schema::hasColumn('capitalisations', 'id_module')) {
            $legacyColumns[] = 'id_module';
        }

        $dropLegacyInscriptionFk = in_array('id_inscription_pedagogique', $legacyColumns, true)
            && $this->foreignKeyExists('capitalisations', 'capitalisations_id_inscription_pedagogique_foreign');
        $dropLegacyModuleFk = in_array('id_module', $legacyColumns, true)
            && $this->foreignKeyExists('capitalisations', 'capitalisations_id_module_foreign');

        if ($dropLegacyInscriptionFk || $dropLegacyModuleFk || $legacyColumns !== []) {
            Schema::table('capitalisations', function (Blueprint $table) use ($dropLegacyInscriptionFk, $dropLegacyModuleFk, $legacyColumns) {
                if ($dropLegacyInscriptionFk) {
                    $table->dropForeign('capitalisations_id_inscription_pedagogique_foreign');
                }
                if ($dropLegacyModuleFk) {
                    $table->dropForeign('capitalisations_id_module_foreign');
                }
                if ($legacyColumns !== []) {
                    $table->dropColumn($legacyColumns);
                }
            });
        }

        $addIdInscriptionAdmin = ! Schema::hasColumn('capitalisations', 'id_inscription_admin');
        $addIdOffre = ! Schema::hasColumn('capitalisations', 'id_offre');
        $addNote = ! Schema::hasColumn('capitalisations', 'note');

        if ($addIdInscriptionAdmin || $addIdOffre || $addNote) {
            Schema::table('capitalisations', function (Blueprint $table) use ($addIdInscriptionAdmin, $addIdOffre, $addNote) {
                if ($addIdInscriptionAdmin) {
                    $table->unsignedBigInteger('id_inscription_admin')->nullable()->after('id_capitalisation');
                }
                if ($addIdOffre) {
                    $table->unsignedBigInteger('id_offre')->nullable()->after('id_inscription_admin');
                }
                if ($addNote) {
                    $table->decimal('note', 5, 2)->nullable()->after('id_offre');
                }
            });
        }

        $addInscriptionFk = Schema::hasColumn('capitalisations', 'id_inscription_admin')
            && ! $this->foreignKeyExists('capitalisations', 'capitalisations_id_inscription_admin_foreign');
        $addOffreFk = Schema::hasColumn('capitalisations', 'id_offre')
            && ! $this->foreignKeyExists('capitalisations', 'capitalisations_id_offre_foreign');

        if ($addInscriptionFk || $addOffreFk) {
            Schema::table('capitalisations', function (Blueprint $table) use ($addInscriptionFk, $addOffreFk) {
                if ($addInscriptionFk) {
                    $table->foreign('id_inscription_admin')->references('id_inscription_admin')->on('inscriptions_administratives')->onDelete('set null');
                }
                if ($addOffreFk) {
                    $table->foreign('id_offre')->references('id_offre')->on('offre_formation')->onDelete('set null');
                }
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('capitalisations')) {
            return;
        }

        $dropInscriptionAdminFk = Schema::hasColumn('capitalisations', 'id_inscription_admin')
            && $this->foreignKeyExists('capitalisations', 'capitalisations_id_inscription_admin_foreign');
        $dropOffreFk = Schema::hasColumn('capitalisations', 'id_offre')
            && $this->foreignKeyExists('capitalisations', 'capitalisations_id_offre_foreign');

        $columnsToDrop = [];
        if (Schema::hasColumn('capitalisations', 'id_inscription_admin')) {
            $columnsToDrop[] = 'id_inscription_admin';
        }
        if (Schema::hasColumn('capitalisations', 'id_offre')) {
            $columnsToDrop[] = 'id_offre';
        }
        if (Schema::hasColumn('capitalisations', 'note')) {
            $columnsToDrop[] = 'note';
        }

        if ($dropInscriptionAdminFk || $dropOffreFk || $columnsToDrop !== []) {
            Schema::table('capitalisations', function (Blueprint $table) use ($dropInscriptionAdminFk, $dropOffreFk, $columnsToDrop) {
                if ($dropInscriptionAdminFk) {
                    $table->dropForeign('capitalisations_id_inscription_admin_foreign');
                }
                if ($dropOffreFk) {
                    $table->dropForeign('capitalisations_id_offre_foreign');
                }
                if ($columnsToDrop !== []) {
                    $table->dropColumn($columnsToDrop);
                }
            });
        }

        $addLegacyInscription = ! Schema::hasColumn('capitalisations', 'id_inscription_pedagogique');
        $addLegacyModule = ! Schema::hasColumn('capitalisations', 'id_module');

        if ($addLegacyInscription || $addLegacyModule) {
            Schema::table('capitalisations', function (Blueprint $table) use ($addLegacyInscription, $addLegacyModule) {
                if ($addLegacyInscription) {
                    $table->unsignedBigInteger('id_inscription_pedagogique')->nullable();
                }
                if ($addLegacyModule) {
                    $table->unsignedBigInteger('id_module')->nullable();
                }
            });
        }

        $addLegacyInscriptionFk = Schema::hasColumn('capitalisations', 'id_inscription_pedagogique')
            && ! $this->foreignKeyExists('capitalisations', 'capitalisations_id_inscription_pedagogique_foreign');
        $addLegacyModuleFk = Schema::hasColumn('capitalisations', 'id_module')
            && ! $this->foreignKeyExists('capitalisations', 'capitalisations_id_module_foreign');

        if ($addLegacyInscriptionFk || $addLegacyModuleFk) {
            Schema::table('capitalisations', function (Blueprint $table) use ($addLegacyInscriptionFk, $addLegacyModuleFk) {
                if ($addLegacyInscriptionFk) {
                    $table->foreign('id_inscription_pedagogique')->references('id_inscription_pedagogique')->on('inscriptions_pedagogiques')->onDelete('set null');
                }
                if ($addLegacyModuleFk) {
                    $table->foreign('id_module')->references('id_module')->on('modules')->onDelete('set null');
                }
            });
        }
    }

    private function foreignKeyExists(string $table, string $constraintName): bool
    {
        if (DB::getDriverName() !== 'mysql') {
            return true;
        }

        $database = DB::getDatabaseName();
        $constraint = DB::selectOne(
            'SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = ? LIMIT 1',
            [$database, $table, $constraintName, 'FOREIGN KEY']
        );

        return $constraint !== null;
    }
};
