<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RepartitionEtudiant extends Model
{
    use HasFactory;

    protected $table = 'repartition_etudiants';
    protected $primaryKey = 'id_repartition';
    protected $guarded = [];
}

