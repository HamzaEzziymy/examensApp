<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Filiere;
use App\Models\AnneeUniversitaire;
use App\Models\UserFiliereAnnee;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Relation to pivot table entries linking user -> filiere -> annee
     */
    public function userFiliereAnnees(): HasMany
    {
        return $this->hasMany(UserFiliereAnnee::class, 'user_id', 'id');
    }

    /**
     * Filieres associated with the user through pivot table `user_filiere_annee`.
     */
    public function filieres(): BelongsToMany
    {
        return $this->belongsToMany(Filiere::class, 'user_filiere_annee', 'user_id', 'id_filiere', 'id', 'id_filiere');
    }

    /**
     * Annees universitaires associated with the user through pivot table.
     */
    public function anneesUniv(): BelongsToMany
    {
        return $this->belongsToMany(AnneeUniversitaire::class, 'user_filiere_annee', 'user_id', 'id_annee', 'id', 'id_annee');
    }
}
