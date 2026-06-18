<?php

namespace Tests\Unit;

use App\Models\FavoriteList;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for FavoriteList::normalizeName().
 *
 * This isolated logic warrants a unit test because it has branching behavior
 * (trim, lowercase, collapse whitespace) that is the foundation of the
 * case-insensitive uniqueness guarantee. DB/HTTP behavior is in feature tests.
 */
class FavoriteListNormalizationTest extends TestCase
{
    public function test_lowercases_name(): void
    {
        $this->assertSame('breaking bad', FavoriteList::normalizeName('Breaking Bad'));
    }

    public function test_trims_leading_and_trailing_whitespace(): void
    {
        $this->assertSame('weeknight watching', FavoriteList::normalizeName('  Weeknight Watching  '));
    }

    public function test_collapses_internal_whitespace(): void
    {
        $this->assertSame('weeknight watching', FavoriteList::normalizeName('Weeknight   Watching'));
    }

    public function test_trims_and_collapses_combined(): void
    {
        $this->assertSame('weeknight watching', FavoriteList::normalizeName('  Weeknight   Watching  '));
    }

    public function test_already_normalized_name_is_unchanged(): void
    {
        $this->assertSame('weeknight watching', FavoriteList::normalizeName('weeknight watching'));
    }

    public function test_single_word_name(): void
    {
        $this->assertSame('dramas', FavoriteList::normalizeName('DRAMAS'));
    }

    public function test_mixed_case_becomes_lowercase(): void
    {
        $this->assertSame('my top shows', FavoriteList::normalizeName('My TOP Shows'));
    }
}
