<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFiliereAnnee extends Model
{
	protected $table = 'user_filiere_annee';
	protected $primaryKey = 'id';
	public $timestamps = true;
	protected $guarded = [];

	public function filiere(): BelongsTo
	{
		return $this->belongsTo(Filiere::class, 'id_filiere', 'id_filiere');
	}

	public function anneeUniv(): BelongsTo
	{
		return $this->belongsTo(AnneeUniversitaire::class, 'id_annee', 'id_annee');
	}

	public function user(): BelongsTo
	{
		return $this->belongsTo(User::class, 'user_id', 'id');
	}
}
