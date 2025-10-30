<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Correcteur extends Model
{
    use HasFactory;

    protected $table = 'correcteurs';
    protected $primaryKey = 'id_correcteur';
    protected $guarded = [];
}

