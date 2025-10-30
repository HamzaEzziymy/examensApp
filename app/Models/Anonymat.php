<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Anonymat extends Model
{
    use HasFactory;

    protected $table = 'anonymat';
    protected $primaryKey = 'id_anonymat';
    protected $guarded = [];
}

