<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ResultatModule extends Model
{
    use HasFactory;

    protected $table = 'resultats_modules';
    protected $primaryKey = 'id_resultat_module';
    protected $guarded = [];
}

