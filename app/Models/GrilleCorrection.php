<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GrilleCorrection extends Model
{
    use HasFactory;

    protected $table = 'grilles_correction';
    protected $primaryKey = 'id_grille';
    protected $guarded = [];
}

