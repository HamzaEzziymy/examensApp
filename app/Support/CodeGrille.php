<?php

namespace App\Support;

final class CodeGrille
{
    public const LENGTH = 8;

    public const SEAT_LENGTH = 4;

    public const SALLE_DIGIT_INDEX = 3;

    public static function build(
        int $filiereCode,
        int $niveauCode,
        int $semestreCode,
        int $salleCode,
        int $seat
    ): int {
        return (int) sprintf(
            '%d%d%d%d%0'.self::SEAT_LENGTH.'d',
            $filiereCode,
            $niveauCode,
            $semestreCode,
            $salleCode,
            $seat
        );
    }

    public static function normalize($value): string
    {
        $digits = preg_replace('/\D+/', '', trim((string) ($value ?? '')));

        if ($digits === '') {
            return '';
        }

        return str_pad($digits, self::LENGTH, '0', STR_PAD_LEFT);
    }

    public static function salleIndex($value): int
    {
        $normalized = self::normalize($value);

        if ($normalized === '') {
            return 1;
        }

        $digit = (int) ($normalized[self::SALLE_DIGIT_INDEX] ?? 1);

        return $digit >= 1 ? $digit : 1;
    }

    public static function seatNumber($value): ?int
    {
        $normalized = self::normalize($value);

        if ($normalized === '') {
            return null;
        }

        return (int) substr($normalized, -self::SEAT_LENGTH);
    }
}
