<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InscriptionAdministrative extends Model
{
    use HasFactory;

    protected $table = 'inscriptions_administratives';
    protected $primaryKey = 'id_inscription_admin';
    protected $guarded = [];
}

