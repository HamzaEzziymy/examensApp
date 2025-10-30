<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ElementModule extends Model
{
    use HasFactory;

    protected $table = 'elements_module';
    protected $primaryKey = 'id_element';
    protected $guarded = [];
}

