<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AnneeUniversitaire extends Model
{
    use HasFactory;

    protected $table = 'annees_universitaires';
    protected $primaryKey = 'id_annee';
    protected $guarded = [];
}

