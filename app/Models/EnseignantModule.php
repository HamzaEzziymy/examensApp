<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EnseignantModule extends Model
{
    use HasFactory;

    protected $table = 'enseignant_module';
    protected $guarded = [];
}

