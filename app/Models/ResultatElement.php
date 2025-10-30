<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ResultatElement extends Model
{
    use HasFactory;

    protected $table = 'resultats_elements';
    protected $primaryKey = 'id_resultat_element';
    protected $guarded = [];
}

